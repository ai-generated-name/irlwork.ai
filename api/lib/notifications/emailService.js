/**
 * EmailService — Resend wrapper + email queue processor with batching.
 *
 * Usage:
 *   const emailService = createEmailService(supabase);
 *   emailService.startQueueProcessor(60000);
 *
 *   // Enqueue an email
 *   await emailService.enqueueEmail(notificationId, userId, 'user@example.com', 'Subject', '<html>...', {});
 *
 *   // Enqueue a batched email (for messages)
 *   await emailService.enqueueEmail(notificationId, userId, 'user@example.com', 'Subject', '<html>...', {
 *     batchKey: `msg_${userId}_${conversationId}`,
 *     batchUntil: new Date(Date.now() + 300000),
 *   });
 */

const crypto = require('crypto');
const { Resend } = require('resend');
const { render } = require('@react-email/render');

const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_BATCH_SIZE = 20; // Max emails per queue processing cycle

// Template registry — lazy loaded
let _templates = null;
function getTemplates() {
  if (!_templates) {
    _templates = {
      TaskMatch: require('../../templates/emails/TaskMatch'),
      TaskAccepted: require('../../templates/emails/TaskAccepted'),
      TaskCompleted: require('../../templates/emails/TaskCompleted'),
      PaymentReceived: require('../../templates/emails/PaymentReceived'),
      NewMessage: require('../../templates/emails/NewMessage'),
      ReviewReminder: require('../../templates/emails/ReviewReminder'),
      DisputeOpened: require('../../templates/emails/DisputeOpened'),
      Generic: require('../../templates/emails/Generic'),
    };
  }
  return _templates;
}

function createEmailService(supabase) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'IRL Work <notifications@irlwork.ai>';
  const replyTo = process.env.RESEND_REPLY_TO || 'support@irlwork.ai';

  let _processorInterval = null;
  let _isProcessing = false;

  /**
   * Render an email template to HTML string.
   */
  async function renderTemplate(templateName, data) {
    const templates = getTemplates();
    const Template = templates[templateName] || templates.Generic;
    const React = require('react');
    const element = React.createElement(Template, data);
    const html = await render(element);
    return html;
  }

  /**
   * Enqueue an email for sending.
   * Options:
   *   batchKey - grouping key for batching (e.g., `msg_userId_conversationId`)
   *   batchUntil - Date: hold until this time before sending (for batching)
   *   scheduledFor - Date: don't send before this time
   */
  async function enqueueEmail(notificationId, userId, toEmail, subject, htmlBody, options = {}) {
    if (!supabase) return;

    const row = {
      notification_id: notificationId || null,
      user_id: userId,
      to_email: toEmail,
      subject,
      html_body: htmlBody,
      status: options.batchKey ? 'batched' : 'pending',
      batch_key: options.batchKey || null,
      batch_until: options.batchUntil ? options.batchUntil.toISOString() : null,
      scheduled_for: options.scheduledFor ? options.scheduledFor.toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase.from('email_queue').insert(row);
    if (error) {
      console.error('[EmailService] Failed to enqueue email:', error.message);
    }
  }

  /**
   * Get or create an unsubscribe token for a user/event combination.
   */
  async function getOrCreateUnsubscribeToken(userId, eventType = null) {
    if (!supabase) return null;

    // Check for existing token
    let query = supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('user_id', userId)
      .is('used_at', null);

    if (eventType) {
      query = query.eq('event_type', eventType);
    } else {
      query = query.is('event_type', null);
    }

    const { data: existing } = await query.single();
    if (existing?.token) return existing.token;

    // Create new token
    const token = crypto.randomBytes(32).toString('hex');
    const { error } = await supabase.from('email_unsubscribe_tokens').insert({
      user_id: userId,
      token,
      event_type: eventType || null,
    });

    if (error) {
      console.error('[EmailService] Failed to create unsubscribe token:', error.message);
      return null;
    }

    return token;
  }

  /**
   * Build unsubscribe URL for an email.
   */
  function buildUnsubscribeUrl(token) {
    const apiUrl = process.env.API_URL || 'https://api.irlwork.ai';
    return `${apiUrl}/api/notifications/unsubscribe/${token}`;
  }

  /**
   * Send a single email via Resend.
   */
  async function sendEmail(to, subject, html) {
    if (!resend) {
      console.log(`[EmailService] Would send to ${to}: ${subject}`);
      return { id: null };
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo,
      subject,
      html,
    });

    return result.data || result;
  }

  /**
   * Process pending emails in the queue.
   * Called on interval. Uses isProcessing flag to prevent overlapping cycles.
   */
  async function processQueue() {
    if (_isProcessing) return;
    _isProcessing = true;

    try {
      await _expireStaleItems();
      await _processBatchedEmails();
      await _processPendingEmails();
    } catch (err) {
      console.error('[EmailService] Queue processor error:', err.message);
    } finally {
      _isProcessing = false;
    }
  }

  /**
   * Mark queue items older than 24 hours as expired.
   */
  async function _expireStaleItems() {
    const cutoff = new Date(Date.now() - MAX_QUEUE_AGE_MS).toISOString();

    const { error } = await supabase
      .from('email_queue')
      .update({ status: 'expired', expired_at: new Date().toISOString() })
      .in('status', ['pending', 'batched'])
      .lt('created_at', cutoff);

    if (error) {
      console.error('[EmailService] Failed to expire stale items:', error.message);
    }
  }

  /**
   * Process batched emails whose batch window has elapsed.
   * Groups by batch_key, consolidates into a single digest email.
   */
  async function _processBatchedEmails() {
    const now = new Date().toISOString();

    // Find batch keys where the batch window has elapsed
    const { data: batchedItems, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'batched')
      .lt('batch_until', now)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error || !batchedItems?.length) return;

    // Group by batch_key
    const groups = {};
    for (const item of batchedItems) {
      const key = item.batch_key || item.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    for (const [batchKey, items] of Object.entries(groups)) {
      try {
        // For message batches, render a digest
        const firstItem = items[0];

        // Parse individual messages from metadata stored in html_body
        // Each batched item stores its own rendered HTML; for digest we re-render
        const messages = items.map(item => {
          // Try to parse metadata from the subject line
          return {
            senderName: item.subject.replace('New message from ', ''),
            preview: '', // Preview was in the individual HTML
          };
        });

        // Render a batched digest email
        const digestHtml = await renderTemplate('NewMessage', {
          messages,
          totalCount: items.length,
          unsubscribeUrl: null, // Will use existing unsub from items
        });

        // Create a single pending email for the batch
        await supabase.from('email_queue').insert({
          user_id: firstItem.user_id,
          to_email: firstItem.to_email,
          subject: `You have ${items.length} new messages`,
          html_body: digestHtml,
          status: 'pending',
          scheduled_for: now,
        });

        // Mark all batched items as sent (they've been consolidated)
        const ids = items.map(i => i.id);
        await supabase
          .from('email_queue')
          .update({ status: 'sent', sent_at: now })
          .in('id', ids);

      } catch (err) {
        console.error(`[EmailService] Failed to process batch ${batchKey}:`, err.message);
      }
    }
  }

  /**
   * Process individual pending emails.
   */
  async function _processPendingEmails() {
    const now = new Date().toISOString();

    // Fetch pending emails ready to send
    const { data: items, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('created_at', { ascending: true })
      .limit(MAX_BATCH_SIZE);

    if (error || !items?.length) return;

    for (const item of items) {
      try {
        // Mark as processing
        await supabase
          .from('email_queue')
          .update({ status: 'processing' })
          .eq('id', item.id)
          .eq('status', 'pending'); // Optimistic lock

        // Send via Resend
        const result = await sendEmail(item.to_email, item.subject, item.html_body);

        // Mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            resend_message_id: result?.id || null,
          })
          .eq('id', item.id);

        // Update the parent notification record if linked
        if (item.notification_id) {
          await supabase
            .from('notifications')
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString(),
              email_message_id: result?.id || null,
            })
            .eq('id', item.notification_id);
        }

      } catch (err) {
        const attempts = (item.attempts || 0) + 1;
        const maxAttempts = item.max_attempts || 3;

        await supabase
          .from('email_queue')
          .update({
            status: attempts >= maxAttempts ? 'failed' : 'pending',
            attempts,
            last_error: err.message,
          })
          .eq('id', item.id);

        console.error(`[EmailService] Failed to send email ${item.id} (attempt ${attempts}):`, err.message);
      }
    }
  }

  /**
   * Start the queue processor on an interval.
   */
  function startQueueProcessor(intervalMs = 60000) {
    if (_processorInterval) return;
    _processorInterval = setInterval(() => processQueue(), intervalMs);
    console.log(`[EmailService] Queue processor started (${intervalMs / 1000}s interval)`);
  }

  /**
   * Stop the queue processor.
   */
  function stopQueueProcessor() {
    if (_processorInterval) {
      clearInterval(_processorInterval);
      _processorInterval = null;
      console.log('[EmailService] Queue processor stopped');
    }
  }

  return {
    renderTemplate,
    enqueueEmail,
    getOrCreateUnsubscribeToken,
    buildUnsubscribeUrl,
    sendEmail,
    processQueue,
    startQueueProcessor,
    stopQueueProcessor,
  };
}

module.exports = { createEmailService };
