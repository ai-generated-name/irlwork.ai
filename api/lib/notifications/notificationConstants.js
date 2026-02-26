/**
 * Notification event definitions, category mapping, default preferences, and email template mapping.
 *
 * Every notification type used in the codebase is mapped here. Unknown types default to 'system' category.
 */

// Category mapping for every known notification type
const EVENT_CATEGORIES = {
  // Tasks
  task_match:         { category: 'tasks',    defaultEmail: true,  defaultInApp: true },
  task_assigned:      { category: 'tasks',    defaultEmail: true,  defaultInApp: true },
  task_offered:       { category: 'tasks',    defaultEmail: true,  defaultInApp: true },
  task_accepted:      { category: 'tasks',    defaultEmail: true,  defaultInApp: true },
  task_declined:      { category: 'tasks',    defaultEmail: false, defaultInApp: true },
  task_cancelled:     { category: 'tasks',    defaultEmail: true,  defaultInApp: true },
  task_expired:       { category: 'tasks',    defaultEmail: false, defaultInApp: true },
  task_offer_expired: { category: 'tasks',    defaultEmail: false, defaultInApp: true },
  task_auto_hidden:   { category: 'tasks',    defaultEmail: false, defaultInApp: true },
  task_completed:     { category: 'tasks',    defaultEmail: true,  defaultInApp: true },

  // Proofs
  proof_submitted:    { category: 'tasks',    defaultEmail: true,  defaultInApp: true },
  proof_approved:     { category: 'tasks',    defaultEmail: true,  defaultInApp: true },
  proof_rejected:     { category: 'tasks',    defaultEmail: true,  defaultInApp: true },

  // Payments
  payment_released:   { category: 'payments', defaultEmail: true,  defaultInApp: true },
  payment_received:   { category: 'payments', defaultEmail: true,  defaultInApp: true },
  payment_pending:    { category: 'payments', defaultEmail: true,  defaultInApp: true },
  payment_failed:     { category: 'payments', defaultEmail: true,  defaultInApp: true },
  transfer_failed:    { category: 'payments', defaultEmail: true,  defaultInApp: true },
  payout_failed:      { category: 'payments', defaultEmail: true,  defaultInApp: true },
  payout_completed:   { category: 'payments', defaultEmail: true,  defaultInApp: true },
  deposit_confirmed:  { category: 'payments', defaultEmail: true,  defaultInApp: true },

  // Messages
  new_message:        { category: 'messages', defaultEmail: true,  defaultInApp: true, batchable: true, batchWindowMs: 300000 },

  // Reviews
  rating_received:    { category: 'reviews',  defaultEmail: true,  defaultInApp: true },
  rating_visible:     { category: 'reviews',  defaultEmail: false, defaultInApp: true },
  review_reminder:    { category: 'reviews',  defaultEmail: true,  defaultInApp: true },

  // Disputes
  dispute:            { category: 'disputes', defaultEmail: true,  defaultInApp: true },
  dispute_opened:     { category: 'disputes', defaultEmail: true,  defaultInApp: true },
  dispute_filed:      { category: 'disputes', defaultEmail: true,  defaultInApp: true },
  dispute_created:    { category: 'disputes', defaultEmail: true,  defaultInApp: true },
  dispute_resolved:   { category: 'disputes', defaultEmail: true,  defaultInApp: true },

  // System / Admin
  critical_feedback:  { category: 'system',   defaultEmail: false, defaultInApp: true },
  report_submitted:   { category: 'system',   defaultEmail: false, defaultInApp: true },
  new_task_report:    { category: 'system',   defaultEmail: false, defaultInApp: true },
  agent_error:        { category: 'system',   defaultEmail: false, defaultInApp: true },
};

// Which event types map to which email template
// Types not listed here use 'Generic'
const EMAIL_TEMPLATES = {
  task_match:         'TaskMatch',
  task_assigned:      'TaskAccepted',
  task_offered:       'TaskAccepted',
  task_accepted:      'TaskAccepted',
  task_completed:     'TaskCompleted',
  proof_approved:     'TaskCompleted',
  payment_released:   'PaymentReceived',
  payment_received:   'PaymentReceived',
  payout_completed:   'PaymentReceived',
  new_message:        'NewMessage',
  review_reminder:    'ReviewReminder',
  dispute_opened:     'DisputeOpened',
  dispute_filed:      'DisputeOpened',
  dispute:            'DisputeOpened',
};

// Email subject generators per event type
// Falls back to the notification title if not defined here
const EMAIL_SUBJECTS = {
  task_match:         (data) => `New task match: ${data.title || 'New Task'}`,
  task_accepted:      (data) => `Task accepted: ${data.title || 'Your Task'}`,
  task_assigned:      (data) => `You've been assigned: ${data.title || 'New Task'}`,
  task_offered:       (data) => `New task offer: ${data.title || 'New Task'}`,
  task_completed:     (data) => `Task completed: ${data.title || 'Your Task'}`,
  proof_approved:     (data) => `Work approved: ${data.title || 'Your Task'}`,
  payment_released:   (data) => `Payment received: ${data.title || 'Your Task'}`,
  payment_received:   (data) => `Payment received: ${data.title || 'Your Task'}`,
  payout_completed:   (data) => `Payout completed`,
  new_message:        (data) => `New message from ${data.senderName || 'someone'}`,
  review_reminder:    (data) => `Reminder: Review ${data.title || 'a task'}`,
  dispute_opened:     (data) => `Dispute opened: ${data.title || 'a task'}`,
  dispute_filed:      (data) => `Dispute filed: ${data.title || 'a task'}`,
  dispute:            (data) => `Dispute update: ${data.title || 'a task'}`,
};

// Default preferences used for seeding new users and as fallback
const DEFAULT_PREFERENCES = Object.entries(EVENT_CATEGORIES).map(([eventType, config]) => ({
  event_type: eventType,
  in_app: config.defaultInApp,
  email: config.defaultEmail,
}));

// All valid categories
const CATEGORIES = ['tasks', 'payments', 'messages', 'reviews', 'disputes', 'system'];

/**
 * Get the category for a notification type. Unknown types default to 'system'.
 */
function getCategoryForType(type) {
  return EVENT_CATEGORIES[type]?.category || 'system';
}

/**
 * Get the email template name for a notification type. Falls back to 'Generic'.
 */
function getEmailTemplate(type) {
  return EMAIL_TEMPLATES[type] || 'Generic';
}

/**
 * Get the email subject for a notification type.
 * Falls back to the notification title.
 */
function getEmailSubject(type, title, metadata) {
  const generator = EMAIL_SUBJECTS[type];
  if (generator && metadata) {
    try {
      return generator(metadata);
    } catch (e) {
      // Fall through to title
    }
  }
  return title;
}

/**
 * Get default preference for an event type.
 */
function getDefaultPreference(eventType) {
  const config = EVENT_CATEGORIES[eventType];
  if (!config) return { in_app: true, email: false };
  return { in_app: config.defaultInApp, email: config.defaultEmail };
}

/**
 * Check if an event type supports batching.
 */
function isBatchable(type) {
  return EVENT_CATEGORIES[type]?.batchable || false;
}

/**
 * Get the batch window in ms for a batchable event type.
 */
function getBatchWindowMs(type) {
  return EVENT_CATEGORIES[type]?.batchWindowMs || 300000; // default 5 min
}

module.exports = {
  EVENT_CATEGORIES,
  EMAIL_TEMPLATES,
  EMAIL_SUBJECTS,
  DEFAULT_PREFERENCES,
  CATEGORIES,
  getCategoryForType,
  getEmailTemplate,
  getEmailSubject,
  getDefaultPreference,
  isBatchable,
  getBatchWindowMs,
};
