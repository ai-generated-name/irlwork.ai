/**
 * Notification Routes — Listing, read/unread, preferences, unsubscribe.
 *
 * Follows the same dependency injection pattern as admin.js and stripe.js.
 */

const express = require('express');

/**
 * Initialize notification routes with dependencies.
 * @param {Object} supabase - Supabase client
 * @param {Function} getUserByToken - Token validation function
 * @param {Object} notificationService - NotificationService instance
 */
function initNotificationRoutes(supabase, getUserByToken, notificationService) {
  const router = express.Router();

  // Auth middleware
  const requireAuth = async (req, res, next) => {
    try {
      const token = req.headers.authorization || req.headers['x-api-key'];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      req.user = await getUserByToken(token);
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      next();
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // ============================================================
  // GET / — Paginated notifications
  // Query params: category, unread_only, page, limit
  // ============================================================
  router.get('/', requireAuth, async (req, res) => {
    try {
      const { category, unread_only, page = '1', limit = '20' } = req.query;
      const result = await notificationService.getNotifications(req.user.id, {
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 20, 100),
        category: category || null,
        unreadOnly: unread_only === 'true',
      });

      // Return backward-compatible array format when no query params
      // The existing frontend expects a plain array from GET /api/notifications
      if (!category && !unread_only && page === '1' && limit === '20') {
        return res.json(result.notifications);
      }

      res.json(result);
    } catch (error) {
      console.error('[Notifications] Error fetching:', error.message);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // ============================================================
  // GET /unread-count — Lightweight count for badge
  // ============================================================
  router.get('/unread-count', requireAuth, async (req, res) => {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('[Notifications] Error getting unread count:', error.message);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  });

  // ============================================================
  // GET /preferences — User notification preferences (merged with defaults)
  // ============================================================
  router.get('/preferences', requireAuth, async (req, res) => {
    try {
      const preferences = await notificationService.getPreferences(req.user.id);
      res.json({ preferences });
    } catch (error) {
      console.error('[Notifications] Error fetching preferences:', error.message);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  });

  // ============================================================
  // GET /preferences/defaults — Static default preferences
  // ============================================================
  router.get('/preferences/defaults', requireAuth, async (req, res) => {
    try {
      const defaults = notificationService.getDefaultPreferences();
      res.json({ preferences: defaults });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch default preferences' });
    }
  });

  // ============================================================
  // PUT /preferences — Bulk update preferences
  // Body: { preferences: [{ event_type, in_app, email }] }
  // ============================================================
  router.put('/preferences', requireAuth, async (req, res) => {
    try {
      const { preferences } = req.body;
      if (!Array.isArray(preferences)) {
        return res.status(400).json({ error: 'preferences must be an array' });
      }

      await notificationService.updatePreferences(req.user.id, preferences);
      const updated = await notificationService.getPreferences(req.user.id);
      res.json({ preferences: updated });
    } catch (error) {
      console.error('[Notifications] Error updating preferences:', error.message);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // ============================================================
  // POST /:id/read — Mark single notification as read
  // ============================================================
  router.post('/:id/read', requireAuth, async (req, res) => {
    try {
      await notificationService.markRead(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[Notifications] Error marking read:', error.message);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // ============================================================
  // POST /read-all — Mark all notifications as read
  // ============================================================
  router.post('/read-all', requireAuth, async (req, res) => {
    try {
      await notificationService.markAllRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error('[Notifications] Error marking all read:', error.message);
      res.status(500).json({ error: 'Failed to mark all as read' });
    }
  });

  // ============================================================
  // GET /unsubscribe/:token — Confirmation page (no auth required)
  // Does NOT process the unsubscribe — only renders a page.
  // This is safe against email client link pre-fetching.
  // ============================================================
  router.get('/unsubscribe/:token', async (req, res) => {
    try {
      const { token } = req.params;

      // Look up the token
      const { data: tokenData, error } = await supabase
        .from('email_unsubscribe_tokens')
        .select('user_id, event_type, used_at')
        .eq('token', token)
        .single();

      if (error || !tokenData) {
        return res.status(400).send(renderUnsubscribePage({
          title: 'Invalid Link',
          message: 'This unsubscribe link is invalid or has expired.',
          showButton: false,
        }));
      }

      if (tokenData.used_at) {
        return res.send(renderUnsubscribePage({
          title: 'Already Unsubscribed',
          message: tokenData.event_type
            ? `You are already unsubscribed from ${tokenData.event_type.replace(/_/g, ' ')} emails.`
            : 'You are already unsubscribed from all emails.',
          showButton: false,
        }));
      }

      const apiUrl = process.env.API_URL || 'https://api.irlwork.ai';
      res.send(renderUnsubscribePage({
        title: 'Unsubscribe',
        message: tokenData.event_type
          ? `Click the button below to unsubscribe from ${tokenData.event_type.replace(/_/g, ' ')} emails.`
          : 'Click the button below to unsubscribe from all IRL Work emails.',
        showButton: true,
        actionUrl: `${apiUrl}/api/notifications/unsubscribe/${token}`,
      }));
    } catch (error) {
      console.error('[Notifications] Unsubscribe page error:', error.message);
      res.status(500).send(renderUnsubscribePage({
        title: 'Error',
        message: 'Something went wrong. Please try again later.',
        showButton: false,
      }));
    }
  });

  // ============================================================
  // POST /unsubscribe/:token — Process the unsubscribe (no auth)
  // Only triggered by button click on the confirmation page.
  // ============================================================
  router.post('/unsubscribe/:token', async (req, res) => {
    try {
      const { token } = req.params;

      // Look up the token
      const { data: tokenData, error } = await supabase
        .from('email_unsubscribe_tokens')
        .select('id, user_id, event_type, used_at')
        .eq('token', token)
        .single();

      if (error || !tokenData) {
        return res.status(400).send(renderUnsubscribePage({
          title: 'Invalid Link',
          message: 'This unsubscribe link is invalid or has expired.',
          showButton: false,
        }));
      }

      if (tokenData.used_at) {
        return res.send(renderUnsubscribePage({
          title: 'Already Unsubscribed',
          message: 'You have already been unsubscribed.',
          showButton: false,
        }));
      }

      // Process the unsubscribe
      if (tokenData.event_type) {
        // Unsubscribe from a specific event type
        await supabase
          .from('notification_preferences')
          .upsert({
            user_id: tokenData.user_id,
            event_type: tokenData.event_type,
            email: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,event_type' });
      } else {
        // Unsubscribe from all emails
        const { data: allPrefs } = await supabase
          .from('notification_preferences')
          .select('event_type')
          .eq('user_id', tokenData.user_id);

        if (allPrefs?.length) {
          const updates = allPrefs.map(p => ({
            user_id: tokenData.user_id,
            event_type: p.event_type,
            email: false,
            updated_at: new Date().toISOString(),
          }));
          await supabase
            .from('notification_preferences')
            .upsert(updates, { onConflict: 'user_id,event_type' });
        }
      }

      // Mark token as used
      await supabase
        .from('email_unsubscribe_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      const frontendUrl = process.env.FRONTEND_URL || 'https://www.irlwork.ai';
      res.send(renderUnsubscribePage({
        title: 'Unsubscribed',
        message: tokenData.event_type
          ? `You have been unsubscribed from ${tokenData.event_type.replace(/_/g, ' ')} emails.`
          : 'You have been unsubscribed from all IRL Work emails.',
        showButton: false,
        footerLink: `${frontendUrl}/settings/notifications`,
        footerLinkText: 'Manage all notification preferences',
      }));
    } catch (error) {
      console.error('[Notifications] Unsubscribe error:', error.message);
      res.status(500).send(renderUnsubscribePage({
        title: 'Error',
        message: 'Something went wrong processing your unsubscribe. Please try again.',
        showButton: false,
      }));
    }
  });

  return router;
}

/**
 * Render a simple HTML page for the unsubscribe flow.
 */
function renderUnsubscribePage({ title, message, showButton, actionUrl, footerLink, footerLinkText }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - IRL Work</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F9F9F9; margin: 0; padding: 40px 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { font-size: 20px; font-weight: 700; color: #1A1A1A; margin-bottom: 24px; }
    h1 { font-size: 24px; color: #1A1A1A; margin: 0 0 12px 0; }
    p { font-size: 15px; color: #525252; line-height: 1.6; margin: 0 0 20px 0; }
    .btn { display: inline-block; background: #E07A5F; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; border: none; cursor: pointer; }
    .btn:hover { background: #C96B52; }
    .footer { margin-top: 24px; font-size: 13px; color: #8A8A8A; }
    .footer a { color: #E07A5F; text-decoration: underline; }
    form { display: inline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">IRL Work</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${showButton && actionUrl ? `
      <form method="POST" action="${actionUrl}">
        <button type="submit" class="btn">Unsubscribe</button>
      </form>
    ` : ''}
    ${footerLink ? `
      <div class="footer">
        <a href="${footerLink}">${footerLinkText || 'Manage preferences'}</a>
      </div>
    ` : ''}
  </div>
</body>
</html>`;
}

module.exports = initNotificationRoutes;
