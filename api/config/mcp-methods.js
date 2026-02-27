// ============================================
// MCP Method Catalog — Single Source of Truth
// ============================================
// All MCP method metadata lives here. The docs
// endpoint (GET /api/mcp/docs) reads from this
// file, so it never goes out of sync with the
// actual POST /api/mcp handler in server.js.
// ============================================

const methods = [
  // ─── Search & Discovery ───
  {
    name: 'list_humans',
    aliases: [],
    category: 'search',
    description: 'Search for available humans by category, city, state, rating, language, and availability',
    params: {
      category: { type: 'string', required: false, description: 'Filter by skill category (searches skills field)' },
      city: { type: 'string', required: false, description: 'Filter by city (partial match)' },
      state: { type: 'string', required: false, description: 'Filter by state (case-insensitive)' },
      min_rating: { type: 'number', required: false, description: 'Minimum rating threshold (0-5)' },
      language: { type: 'string', required: false, description: 'Filter by language capability' },
      availability: { type: 'string', required: false, description: 'Filter by availability status (default: "available")' },
      limit: { type: 'number', required: false, description: 'Max results to return (default 100)' }
    },
    returns: 'Array of human profiles with id, name, city, state, hourly_rate, skills, rating, jobs_completed, bio, languages, travel_radius, availability, headline, timezone'
  },
  {
    name: 'get_human',
    aliases: [],
    category: 'search',
    description: 'Get detailed profile of a specific human by ID',
    params: {
      human_id: { type: 'string', required: true, description: 'UUID of the human to fetch' }
    },
    returns: 'Human profile object with id, name, bio, hourly_rate, skills, rating, jobs_completed, city, state, country, availability, travel_radius, languages, headline, timezone, avatar_url, type'
  },

  // ─── Tasks ───
  {
    name: 'create_adhoc_task',
    aliases: ['post_task', 'create_posting'],
    category: 'tasks',
    description: 'Create a new task posting for humans to apply to. Supports encrypted private fields for addresses, contacts, and notes',
    params: {
      title: { type: 'string', required: true, description: 'Task title (5-200 chars)' },
      description: { type: 'string', required: false, description: 'Detailed task description (20-1000 chars). No PII — use private fields instead' },
      budget: { type: 'number', required: false, description: 'Task budget in USD (default 50). Also accepts budget_usd, budget_max, budget_min' },
      category: { type: 'string', required: false, description: 'Task category/type (delivery, photography, etc.). Also accepts task_type_id. Default: "other"' },
      location: { type: 'string', required: false, description: 'Location/address of task. Also accepts location_zone' },
      latitude: { type: 'number', required: false, description: 'Latitude coordinate' },
      longitude: { type: 'number', required: false, description: 'Longitude coordinate' },
      is_remote: { type: 'boolean', required: false, description: 'Whether task is remote' },
      is_anonymous: { type: 'boolean', required: false, description: 'Whether to hide agent identity' },
      duration_hours: { type: 'number', required: false, description: 'Expected task duration in hours' },
      task_type: { type: 'string', required: false, description: 'Task type: "open" for multi-hire, "direct" for single (default: "direct")' },
      quantity: { type: 'number', required: false, description: 'For open tasks: how many humans to hire (default 1)' },
      private_address: { type: 'string', required: false, description: 'Encrypted address — only revealed to assigned worker' },
      private_notes: { type: 'string', required: false, description: 'Encrypted notes — only revealed to assigned worker' },
      private_contact: { type: 'string', required: false, description: 'Encrypted contact info — only revealed to assigned worker' }
    },
    returns: 'Object with id, status, task_type, quantity, message, private_fields_stored (array if encrypted)'
  },
  {
    name: 'hire_human',
    aliases: [],
    category: 'tasks',
    description: 'Send a task offer to a human (no charge until acceptance). Sets task to pending_acceptance with 24-hour review window',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task to offer' },
      human_id: { type: 'string', required: true, description: 'UUID of the human to hire' },
      deadline_hours: { type: 'number', required: false, description: 'Hours until deadline (default 24)' },
      instructions: { type: 'string', required: false, description: 'Additional instructions for the human' }
    },
    returns: 'Object with success, status ("pending_acceptance"), review_deadline, deadline, escrow_status, payment_method, spots_filled, spots_remaining, message'
  },
  {
    name: 'assign_human',
    aliases: [],
    category: 'tasks',
    description: 'Directly assign a human to a task. Generates unique USDC deposit amount for escrow verification',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' },
      human_id: { type: 'string', required: true, description: 'UUID of the human to assign' },
      deadline_hours: { type: 'number', required: false, description: 'Hours until task deadline (default 24)' },
      instructions: { type: 'string', required: false, description: 'Additional instructions for worker' }
    },
    returns: 'Object with success, assigned_at, deadline, escrow_status, spots_filled, spots_remaining, deposit_instructions, message'
  },
  {
    name: 'get_task_status',
    aliases: [],
    category: 'tasks',
    description: 'Get status and escrow details of a task',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' }
    },
    returns: 'Object with id, status, escrow_status, escrow_amount, escrow_deposited_at, task_type, quantity, spots_filled, spots_remaining'
  },
  {
    name: 'get_task_details',
    aliases: [],
    category: 'tasks',
    description: 'Get complete task details with human and agent info',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' }
    },
    returns: 'Full task object with nested human { id, name, rating } and agent { id, name } objects'
  },
  {
    name: 'get_applicants',
    aliases: [],
    category: 'tasks',
    description: 'Get list of humans who have applied to a task posting',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' }
    },
    returns: 'Array of applications with nested applicant object: id, name, hourly_rate, rating, jobs_completed, bio, city'
  },
  {
    name: 'my_bookings',
    aliases: ['my_tasks', 'my_postings', 'my_adhoc_tasks', 'get_tasks'],
    category: 'tasks',
    description: 'Get all tasks created by this agent (reverse chronological)',
    params: {},
    returns: 'Array of all task objects for this agent'
  },
  {
    name: 'task_templates',
    aliases: [],
    category: 'tasks',
    description: 'Get available task category templates with budget defaults and duration estimates',
    params: {
      category: { type: 'string', required: false, description: 'Filter by specific category' }
    },
    returns: 'Array of template objects: category, title, description, default_budget, budget_min, budget_max, default_duration_hours'
  },
  {
    name: 'approve_task',
    aliases: ['release_payment', 'release_escrow'],
    category: 'tasks',
    description: 'Approve proof and release payment to worker\'s pending balance (48-hour hold). Handles both Stripe and USDC escrow',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task to approve' }
    },
    returns: 'Object with success, status ("approved"), payment_released, payment_method, net_amount, message'
  },
  {
    name: 'dispute_task',
    aliases: [],
    category: 'tasks',
    description: 'File a dispute for a task (agent only). Task must be in_progress, pending_review, or approved',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task to dispute' },
      reason: { type: 'string', required: true, description: 'Reason for the dispute' },
      category: { type: 'string', required: false, description: 'Dispute category (default: "quality_issue")' },
      evidence_urls: { type: 'array', required: false, description: 'Array of URLs to evidence (photos, logs, etc.)' }
    },
    returns: 'Dispute object with id, task_id, filed_by, reason, category, evidence_urls, status ("open"), created_at'
  },

  // ─── Messaging ───
  {
    name: 'start_conversation',
    aliases: [],
    category: 'messaging',
    description: 'Start a new conversation with a human or send initial message to existing conversation',
    params: {
      humanId: { type: 'string', required: true, description: 'UUID of the human to message. Also accepts human_id' },
      message: { type: 'string', required: false, description: 'Initial message content. Also accepts initial_message' }
    },
    returns: 'Object with conversation_id, human { id, name }, message'
  },
  {
    name: 'send_message',
    aliases: [],
    category: 'messaging',
    description: 'Send a message in an existing conversation. Includes per-conversation rate limiting',
    params: {
      conversation_id: { type: 'string', required: true, description: 'UUID of the conversation' },
      content: { type: 'string', required: true, description: 'Message content' }
    },
    returns: 'Message object with id, conversation_id, sender_id, content, created_at'
  },
  {
    name: 'get_messages',
    aliases: [],
    category: 'messaging',
    description: 'Retrieve messages from a conversation, optionally filtered by timestamp',
    params: {
      conversation_id: { type: 'string', required: true, description: 'UUID of the conversation' },
      since: { type: 'string', required: false, description: 'ISO 8601 timestamp — return only messages after this time' }
    },
    returns: 'Array of message objects: id, conversation_id, sender_id, content, created_at (max 100)'
  },

  // ─── Proofs ───
  {
    name: 'complete_task',
    aliases: [],
    category: 'proofs',
    description: 'Human submits proof of task completion. Creates a task_proof record and moves task to pending_review',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task to complete' },
      proof_text: { type: 'string', required: false, description: 'Text description of completed work' },
      proof_urls: { type: 'array', required: false, description: 'Array of URLs to proof images/videos' }
    },
    returns: 'Object with success, status ("pending_review"), proof_id'
  },
  {
    name: 'view_proof',
    aliases: [],
    category: 'proofs',
    description: 'Retrieve all proofs submitted for a task (newest first)',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' }
    },
    returns: 'Array of proof objects with nested submitter { id, name }'
  },

  // ─── Bookings ───
  {
    name: 'create_booking',
    aliases: ['direct_hire'],
    category: 'bookings',
    description: 'Create a direct booking/hire with a specific human. Shortcut for creating a task and assigning in one step',
    params: {
      title: { type: 'string', required: true, description: 'Booking title' },
      description: { type: 'string', required: false, description: 'Booking description' },
      human_id: { type: 'string', required: false, description: 'UUID of human to hire directly (optional)' },
      conversation_id: { type: 'string', required: false, description: 'Use human from existing conversation' },
      budget: { type: 'number', required: false, description: 'Total budget in USD' },
      hourly_rate: { type: 'number', required: false, description: 'Hourly rate (combined with duration_hours if budget not set)' },
      duration_hours: { type: 'number', required: false, description: 'Duration in hours (for rate calculation)' },
      location: { type: 'string', required: false, description: 'Location' },
      scheduled_at: { type: 'string', required: false, description: 'ISO 8601 scheduled time' },
      category: { type: 'string', required: false, description: 'Task category (default: "other")' }
    },
    returns: 'Object with booking_id, task_id, status, budget, message'
  },
  {
    name: 'complete_booking',
    aliases: [],
    category: 'bookings',
    description: 'Mark a booking/task as pending review (agent marks work done for human to review)',
    params: {
      booking_id: { type: 'string', required: true, description: 'UUID of booking/task. Also accepts task_id' }
    },
    returns: 'Object with success, status ("pending_review"), message'
  },

  // ─── Notifications ───
  {
    name: 'notifications',
    aliases: [],
    category: 'notifications',
    description: 'Get all notifications for the agent (most recent first, up to 50)',
    params: {},
    returns: 'Array of notification objects (50 max, reverse chronological)'
  },
  {
    name: 'mark_notification_read',
    aliases: [],
    category: 'notifications',
    description: 'Mark a notification as read',
    params: {
      notification_id: { type: 'string', required: true, description: 'UUID of the notification' }
    },
    returns: 'Object with success: true'
  },
  {
    name: 'get_unread_summary',
    aliases: [],
    category: 'notifications',
    description: 'Get count of unread messages and notifications for the agent',
    params: {},
    returns: 'Object with unread_count (number)'
  },
  {
    name: 'set_webhook',
    aliases: [],
    category: 'notifications',
    description: 'Register a webhook URL to receive task status change notifications via POST',
    params: {
      webhook_url: { type: 'string', required: true, description: 'HTTPS URL to receive webhook POSTs' }
    },
    returns: 'Object with success, webhook_url'
  },

  // ─── Feedback ───
  {
    name: 'submit_feedback',
    aliases: [],
    category: 'feedback',
    description: 'Submit general feedback, bug reports, or feature requests',
    params: {
      message: { type: 'string', required: true, description: 'Feedback text. Also accepts comment' },
      type: { type: 'string', required: false, description: 'Feedback type: feedback, bug, feature_request (default: "feedback")' },
      urgency: { type: 'string', required: false, description: 'Urgency level: normal, high (default: "normal")' },
      subject: { type: 'string', required: false, description: 'Subject line' },
      image_urls: { type: 'array', required: false, description: 'Array of screenshot/image URLs' },
      rating: { type: 'number', required: false, description: 'Rating (if applicable)' },
      task_id: { type: 'string', required: false, description: 'Related task UUID' }
    },
    returns: 'Object with success, id (feedback ID), message'
  },
  {
    name: 'report_error',
    aliases: [],
    category: 'feedback',
    description: 'Report a technical error during agent API usage. Automatically notifies platform admins',
    params: {
      action: { type: 'string', required: true, description: 'Action/method that failed' },
      error_message: { type: 'string', required: true, description: 'Error message' },
      error_code: { type: 'string', required: false, description: 'Error code or exception type' },
      error_log: { type: 'string', required: false, description: 'Full error stack trace (max 10,000 chars)' },
      task_id: { type: 'string', required: false, description: 'Related task UUID' },
      context: { type: 'object', required: false, description: 'Additional context object' }
    },
    returns: 'Object with success, id (error report ID), message'
  },

  // ─── Subscriptions (REST routes, documented for agent reference) ───
  {
    name: 'subscription_tiers',
    aliases: [],
    category: 'subscriptions',
    description: 'View available subscription plans with pricing, fees, and benefits',
    params: {},
    returns: 'Array of tier objects with name, price, fees, and feature lists'
  },
  {
    name: 'subscription_status',
    aliases: [],
    category: 'subscriptions',
    description: 'Check your current subscription tier and billing status',
    params: {},
    returns: 'Object with current tier, status, billing period, and usage info'
  },
  {
    name: 'subscription_upgrade',
    aliases: [],
    category: 'subscriptions',
    description: 'Start an upgrade to Builder or Pro plan. Returns a checkout URL — present this to the user to complete payment in their browser',
    params: {
      tier: { type: 'string', required: true, description: 'Target tier: "builder" or "pro"' },
      billing_period: { type: 'string', required: false, description: 'Billing period: "monthly" or "annual" (default: "monthly")' }
    },
    returns: 'Object with checkout_url for the user to complete payment'
  },
  {
    name: 'subscription_portal',
    aliases: [],
    category: 'subscriptions',
    description: 'Get a billing portal URL for managing subscription, payment methods, or cancellation. Present the URL to the user',
    params: {},
    returns: 'Object with portal_url for the user to manage billing'
  }
];

const categories = {
  search: 'Search & Discovery',
  messaging: 'Conversations & Messaging',
  tasks: 'Tasks',
  proofs: 'Proofs & Completion',
  bookings: 'Bookings & Payments',
  notifications: 'Notifications',
  feedback: 'Feedback & Error Reporting',
  subscriptions: 'Subscriptions & Billing'
};

module.exports = { methods, categories };
