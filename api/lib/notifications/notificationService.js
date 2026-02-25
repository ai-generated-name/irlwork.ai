/**
 * NotificationService — Central notification orchestrator.
 *
 * Usage:
 *   const notificationService = createNotificationService(supabase, emailService);
 *
 *   // Fire a notification (backward compatible with existing createNotification signature)
 *   await notificationService.notify(userId, type, title, message, link, metadata);
 *
 *   // Seed default preferences for a new user
 *   await notificationService.seedDefaultPreferences(userId);
 */

const { v4: uuidv4 } = require('uuid');
const {
  getCategoryForType,
  getEmailTemplate,
  getEmailSubject,
  getDefaultPreference,
  isBatchable,
  getBatchWindowMs,
  DEFAULT_PREFERENCES,
  EVENT_CATEGORIES,
} = require('./notificationConstants');

function createNotificationService(supabase, emailService) {

  /**
   * Core notification method.
   * Backward compatible: first 5 args match the old createNotification(userId, type, title, message, link).
   * Optional 6th arg: metadata object for richer email templates.
   */
  async function notify(userId, type, title, message, link = null, metadata = {}) {
    if (!supabase || !userId) return null;

    const category = getCategoryForType(type);
    const actionUrl = link || null;

    // Look up user email
    let userEmail = null;
    try {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      userEmail = user?.email || null;
    } catch (e) {
      // User lookup failed — continue with in-app only
    }

    // Check user preferences
    const prefs = await _getUserPreferenceForType(userId, type);
    const inAppEnabled = prefs.in_app;
    const emailEnabled = prefs.email;

    let notificationId = null;

    // 1. In-app notification
    if (inAppEnabled) {
      const id = uuidv4();
      const { error } = await supabase.from('notifications').insert({
        id,
        user_id: userId,
        type,
        title,
        message,
        link: actionUrl,
        category,
        metadata: metadata || {},
        action_url: actionUrl,
        email_sent: false,
      });

      if (!error) {
        notificationId = id;
      } else {
        console.error('[NotificationService] Failed to insert notification:', error.message);
      }
    }

    // 2. Email notification
    if (emailEnabled && userEmail && emailService) {
      try {
        const templateName = getEmailTemplate(type);
        const subject = getEmailSubject(type, title, metadata);

        // Build unsubscribe URL
        const unsubToken = await emailService.getOrCreateUnsubscribeToken(userId, type);
        const unsubscribeUrl = unsubToken ? emailService.buildUnsubscribeUrl(unsubToken) : null;

        // Render email template
        const templateData = {
          ...metadata,
          title: metadata.title || title,
          message,
          actionUrl: actionUrl ? (actionUrl.startsWith('http') ? actionUrl : `${process.env.FRONTEND_URL || 'https://www.irlwork.ai'}${actionUrl}`) : null,
          unsubscribeUrl,
          notificationType: type,
          eventType: type,
        };

        const html = await emailService.renderTemplate(templateName, templateData);

        // Enqueue email
        const enqueueOptions = {};
        if (isBatchable(type)) {
          // For batchable events (e.g., new_message), set batch key and window
          const batchKey = `${type}_${userId}`;
          enqueueOptions.batchKey = batchKey;
          enqueueOptions.batchUntil = new Date(Date.now() + getBatchWindowMs(type));
        }

        await emailService.enqueueEmail(
          notificationId,
          userId,
          userEmail,
          subject,
          html,
          enqueueOptions
        );
      } catch (err) {
        console.error('[NotificationService] Email queueing failed:', err.message);
        // Email failure should never block the notification flow
      }
    }

    return notificationId;
  }

  /**
   * Get user preference for a specific event type.
   * Falls back to defaults if no DB row exists.
   */
  async function _getUserPreferenceForType(userId, eventType) {
    const defaults = getDefaultPreference(eventType);

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('in_app, email')
        .eq('user_id', userId)
        .eq('event_type', eventType)
        .single();

      if (error || !data) return defaults;
      return { in_app: data.in_app, email: data.email };
    } catch (e) {
      return defaults;
    }
  }

  /**
   * Get all preferences for a user, merged with defaults for any missing event types.
   */
  async function getPreferences(userId) {
    const { data: userPrefs } = await supabase
      .from('notification_preferences')
      .select('event_type, in_app, email')
      .eq('user_id', userId);

    const prefsMap = {};
    if (userPrefs) {
      for (const pref of userPrefs) {
        prefsMap[pref.event_type] = { in_app: pref.in_app, email: pref.email };
      }
    }

    // Merge with defaults for all known event types
    return DEFAULT_PREFERENCES.map(def => ({
      event_type: def.event_type,
      in_app: prefsMap[def.event_type]?.in_app ?? def.in_app,
      email: prefsMap[def.event_type]?.email ?? def.email,
    }));
  }

  /**
   * Get static default preferences (for the /preferences/defaults endpoint).
   */
  function getDefaultPreferences() {
    return DEFAULT_PREFERENCES.map(def => ({
      event_type: def.event_type,
      in_app: def.in_app,
      email: def.email,
    }));
  }

  /**
   * Update a single preference for a user. Uses upsert.
   */
  async function updatePreference(userId, eventType, updates) {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        event_type: eventType,
        in_app: updates.in_app,
        email: updates.email,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,event_type' });

    if (error) {
      console.error('[NotificationService] Failed to update preference:', error.message);
      throw error;
    }
  }

  /**
   * Bulk update preferences for a user.
   */
  async function updatePreferences(userId, preferences) {
    const rows = preferences.map(pref => ({
      user_id: userId,
      event_type: pref.event_type,
      in_app: pref.in_app,
      email: pref.email,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(rows, { onConflict: 'user_id,event_type' });

    if (error) {
      console.error('[NotificationService] Failed to bulk update preferences:', error.message);
      throw error;
    }
  }

  /**
   * Seed default notification preferences for a new user.
   * Idempotent — uses ON CONFLICT DO NOTHING behavior via ignoreDuplicates.
   */
  async function seedDefaultPreferences(userId) {
    if (!supabase || !userId) return;

    const rows = DEFAULT_PREFERENCES.map(def => ({
      user_id: userId,
      event_type: def.event_type,
      in_app: def.in_app,
      email: def.email,
    }));

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(rows, { onConflict: 'user_id,event_type', ignoreDuplicates: true });

    if (error) {
      console.error('[NotificationService] Failed to seed preferences:', error.message);
    }
  }

  /**
   * Mark a notification as read.
   */
  async function markRead(notificationId, userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Mark all notifications as read for a user.
   */
  async function markAllRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  }

  /**
   * Get paginated notifications for a user.
   */
  async function getNotifications(userId, { page = 1, limit = 20, category = null, unreadOnly = false } = {}) {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return { notifications: data || [], total: count || 0, page, limit };
  }

  /**
   * Get unread notification count for a user.
   */
  async function getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  }

  return {
    notify,
    getPreferences,
    getDefaultPreferences,
    updatePreference,
    updatePreferences,
    seedDefaultPreferences,
    markRead,
    markAllRead,
    getNotifications,
    getUnreadCount,
  };
}

module.exports = { createNotificationService };
