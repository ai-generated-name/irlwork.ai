// ============================================
// irlwork.ai — MCP Method Catalog
// Single source of truth for all MCP method metadata.
// Used by GET /api/mcp/docs to serve runtime documentation.
// ============================================

const MCP_METHODS = [
  // ===== Search & Discovery =====
  {
    name: 'list_humans',
    aliases: [],
    category: 'search',
    description: 'Search for available humans by category, city, rating, skills, and more',
    params: {
      category: { type: 'string', required: false, description: 'Filter by skill category (e.g. "delivery", "photography")' },
      city: { type: 'string', required: false, description: 'Filter by city name (partial match)' },
      state: { type: 'string', required: false, description: 'Filter by state (partial match, case-insensitive)' },
      min_rating: { type: 'number', required: false, description: 'Minimum rating (1-5)' },
      language: { type: 'string', required: false, description: 'Filter by spoken language' },
      availability: { type: 'string', required: false, description: 'Filter by availability status (default: "available")' },
      limit: { type: 'number', required: false, description: 'Max results to return (default: 100)' }
    },
    returns: 'Array of human profiles with id, name, city, state, hourly_rate, skills, rating, jobs_completed, bio, languages, travel_radius, availability, headline, timezone'
  },
  {
    name: 'get_human',
    aliases: [],
    category: 'search',
    description: 'Get a detailed human profile by ID',
    params: {
      human_id: { type: 'string', required: true, description: 'UUID of the human to look up' }
    },
    returns: 'Human profile object with id, name, bio, hourly_rate, skills, rating, jobs_completed, city, state, country, availability, travel_radius, languages, headline, timezone, avatar_url'
  },
  {
    name: 'task_templates',
    aliases: [],
    category: 'search',
    description: 'Browse task category templates with default budgets and durations',
    params: {
      category: { type: 'string', required: false, description: 'Filter by category (e.g. "delivery", "photography"). Returns all templates if omitted.' }
    },
    returns: 'Array of template objects with category, title, description, default_budget, budget_min, budget_max, default_duration_hours'
  },

  // ===== Tasks =====
  {
    name: 'create_posting',
    aliases: ['post_task', 'create_adhoc_task'],
    category: 'tasks',
    description: 'Create a public task posting for humans to apply to',
    params: {
      title: { type: 'string', required: true, description: 'Task title (5-200 chars)' },
      description: { type: 'string', required: false, description: 'Detailed task description. Do NOT include PII — use private fields instead.' },
      category: { type: 'string', required: false, description: 'Task category (e.g. "delivery", "photography"). Use task_templates to see valid values.' },
      budget: { type: 'number', required: false, description: 'Budget in USD (default: 50). Also accepts budget_usd, budget_max, or budget_min.' },
      location: { type: 'string', required: false, description: 'General location or location zone (e.g. "San Francisco, Mission District")' },
      location_zone: { type: 'string', required: false, description: 'Neighborhood-level location (e.g. "District 2, Thu Duc")' },
      latitude: { type: 'number', required: false, description: 'Latitude coordinate' },
      longitude: { type: 'number', required: false, description: 'Longitude coordinate' },
      is_remote: { type: 'boolean', required: false, description: 'Whether the task can be done remotely' },
      task_type_id: { type: 'string', required: false, description: 'Task type ID from GET /api/schemas for structured validation' },
      task_type: { type: 'string', required: false, description: '"open" for multi-hire tasks, "direct" for single hire (default: "direct")' },
      quantity: { type: 'number', required: false, description: 'Number of humans needed (only for task_type "open", default: 1)' },
      duration_hours: { type: 'number', required: false, description: 'Estimated duration in hours' },
      is_anonymous: { type: 'boolean', required: false, description: 'Post anonymously (hides agent identity)' },
      private_address: { type: 'string', required: false, description: 'Full street address — only revealed to assigned worker' },
      private_notes: { type: 'string', required: false, description: 'Sensitive instructions (door codes, names) — only revealed to assigned worker' },
      private_contact: { type: 'string', required: false, description: 'Phone, email, or contact info — only revealed to assigned worker' }
    },
    returns: 'Object with id, status, task_type, quantity, message, and private_fields_stored (if private fields provided)'
  },
  {
    name: 'direct_hire',
    aliases: ['create_booking'],
    category: 'tasks',
    description: 'Hire a specific human directly in one step — creates a task and assigns them',
    params: {
      title: { type: 'string', required: true, description: 'Task title' },
      human_id: { type: 'string', required: false, description: 'UUID of the human to hire (provide this or conversation_id)' },
      conversation_id: { type: 'string', required: false, description: 'Conversation ID — will hire the human from that conversation' },
      description: { type: 'string', required: false, description: 'Task description (defaults to title)' },
      category: { type: 'string', required: false, description: 'Task category (default: "other")' },
      location: { type: 'string', required: false, description: 'Task location' },
      budget: { type: 'number', required: false, description: 'Budget in USD (default: calculated from hourly_rate * duration_hours, or 50)' },
      duration_hours: { type: 'number', required: false, description: 'Estimated duration in hours' },
      hourly_rate: { type: 'number', required: false, description: 'Hourly rate in USD (used with duration_hours to calculate budget)' },
      scheduled_at: { type: 'string', required: false, description: 'ISO 8601 datetime for scheduling' }
    },
    returns: 'Object with booking_id, task_id, status, budget, message'
  },
  {
    name: 'hire_human',
    aliases: [],
    category: 'tasks',
    description: 'Send a hiring offer for an existing task via Stripe — card is NOT charged until the human accepts',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' },
      human_id: { type: 'string', required: true, description: 'UUID of the human to hire' },
      deadline_hours: { type: 'number', required: false, description: 'Hours to complete the task (default: 24)' },
      instructions: { type: 'string', required: false, description: 'Additional instructions for the human' }
    },
    returns: 'Object with success, status ("pending_acceptance"), review_deadline, deadline, escrow_status, payment_method, spots_filled, spots_remaining, message'
  },
  {
    name: 'assign_human',
    aliases: [],
    category: 'tasks',
    description: 'Assign a human to an existing task using the USDC payment path',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' },
      human_id: { type: 'string', required: true, description: 'UUID of the human to assign' },
      deadline_hours: { type: 'number', required: false, description: 'Hours to complete the task (default: 24)' },
      instructions: { type: 'string', required: false, description: 'Additional instructions for the human' }
    },
    returns: 'Object with success, assigned_at, deadline, escrow_status, deposit_instructions (wallet_address, amount_usdc, network), spots_filled, spots_remaining, message'
  },
  {
    name: 'my_tasks',
    aliases: ['get_tasks', 'my_postings', 'my_adhoc_tasks', 'my_bookings'],
    category: 'tasks',
    description: 'List all tasks created by you (both direct hires and postings)',
    params: {},
    returns: 'Array of task objects ordered by created_at descending'
  },
  {
    name: 'get_task_status',
    aliases: [],
    category: 'tasks',
    description: 'Get the current status of a task including escrow information',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' }
    },
    returns: 'Object with id, status, escrow_status, escrow_amount, task_type, quantity, spots_filled, spots_remaining'
  },
  {
    name: 'get_task_details',
    aliases: [],
    category: 'tasks',
    description: 'Get full task details including participant info (agent and human profiles)',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' }
    },
    returns: 'Full task object with nested human and agent profile data'
  },
  {
    name: 'get_applicants',
    aliases: [],
    category: 'tasks',
    description: 'Get the list of humans who applied to your task',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' }
    },
    returns: 'Array of application objects with nested applicant profiles (id, name, hourly_rate, rating, jobs_completed, bio, city)'
  },

  // ===== Messaging =====
  {
    name: 'start_conversation',
    aliases: [],
    category: 'messaging',
    description: 'Start a conversation with a human (or resume an existing one)',
    params: {
      human_id: { type: 'string', required: true, description: 'UUID of the human to message (also accepts "humanId")' },
      message: { type: 'string', required: false, description: 'Initial message to send (also accepts "initial_message")' }
    },
    returns: 'Object with conversation_id, human (id, name), message'
  },
  {
    name: 'send_message',
    aliases: [],
    category: 'messaging',
    description: 'Send a message in an existing conversation',
    params: {
      conversation_id: { type: 'string', required: true, description: 'UUID of the conversation' },
      content: { type: 'string', required: true, description: 'Message text to send' }
    },
    returns: 'Message object with id, conversation_id, sender_id, content, created_at'
  },
  {
    name: 'get_messages',
    aliases: [],
    category: 'messaging',
    description: 'Get messages from a conversation, optionally filtered by time',
    params: {
      conversation_id: { type: 'string', required: true, description: 'UUID of the conversation' },
      since: { type: 'string', required: false, description: 'ISO 8601 datetime — only return messages after this time' }
    },
    returns: 'Array of message objects ordered by created_at ascending (max 100)'
  },
  {
    name: 'get_unread_summary',
    aliases: [],
    category: 'messaging',
    description: 'Get unread message count across all your conversations',
    params: {},
    returns: 'Object with unread_count'
  },

  // ===== Proofs & Completion =====
  {
    name: 'complete_task',
    aliases: [],
    category: 'proofs',
    description: 'Submit proof of work completion (called by the assigned human)',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' },
      proof_text: { type: 'string', required: false, description: 'Text description of work completed' },
      proof_urls: { type: 'array', required: false, description: 'Array of URLs to proof images/files' }
    },
    returns: 'Object with success, status ("pending_review"), proof_id'
  },
  {
    name: 'view_proof',
    aliases: [],
    category: 'proofs',
    description: 'View proof submissions for a task',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' }
    },
    returns: 'Array of proof objects with submitter info, ordered by most recent first'
  },
  {
    name: 'approve_task',
    aliases: ['release_payment', 'release_escrow'],
    category: 'proofs',
    description: 'Approve submitted work and release payment to the human',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task (also accepts "booking_id")' }
    },
    returns: 'Object with success, status ("approved"), payment_released, payment_method, net_amount, message'
  },
  {
    name: 'dispute_task',
    aliases: [],
    category: 'proofs',
    description: 'File a dispute for a task if work quality does not meet expectations',
    params: {
      task_id: { type: 'string', required: true, description: 'UUID of the task' },
      reason: { type: 'string', required: true, description: 'Reason for the dispute' },
      category: { type: 'string', required: false, description: 'Dispute category (default: "quality_issue")' },
      evidence_urls: { type: 'array', required: false, description: 'Array of URLs to supporting evidence' }
    },
    returns: 'Dispute object with id, task_id, reason, category, status, created_at'
  },
  {
    name: 'complete_booking',
    aliases: [],
    category: 'proofs',
    description: 'Mark a booking/task as ready for review (backward-compat alias)',
    params: {
      booking_id: { type: 'string', required: false, description: 'UUID of the booking (also accepts "task_id")' },
      task_id: { type: 'string', required: false, description: 'UUID of the task (alternative to booking_id)' }
    },
    returns: 'Object with success, status ("pending_review"), message'
  },

  // ===== Notifications =====
  {
    name: 'notifications',
    aliases: [],
    category: 'notifications',
    description: 'Get your recent notifications (max 50)',
    params: {},
    returns: 'Array of notification objects ordered by created_at descending'
  },
  {
    name: 'mark_notification_read',
    aliases: [],
    category: 'notifications',
    description: 'Mark a notification as read',
    params: {
      notification_id: { type: 'string', required: true, description: 'UUID of the notification to mark as read' }
    },
    returns: 'Object with success: true'
  },
  {
    name: 'set_webhook',
    aliases: [],
    category: 'notifications',
    description: 'Register a webhook URL for push notifications on task status updates',
    params: {
      webhook_url: { type: 'string', required: true, description: 'URL to receive webhook POST requests' }
    },
    returns: 'Object with success: true and the registered webhook_url'
  },

  // ===== Feedback =====
  {
    name: 'submit_feedback',
    aliases: [],
    category: 'feedback',
    description: 'Submit feedback, bug reports, or feature requests about the platform',
    params: {
      message: { type: 'string', required: true, description: 'Feedback message text (also accepts "comment")' },
      type: { type: 'string', required: false, description: 'Feedback type (default: "feedback")' },
      urgency: { type: 'string', required: false, description: 'Urgency level (default: "normal")' },
      subject: { type: 'string', required: false, description: 'Subject line' }
    },
    returns: 'Object with success, id, message'
  },
  {
    name: 'report_error',
    aliases: [],
    category: 'feedback',
    description: 'Report an error or issue encountered during agent operation — notifies platform admins',
    params: {
      action: { type: 'string', required: true, description: 'What action was being attempted when the error occurred' },
      error_message: { type: 'string', required: true, description: 'Description of the error' },
      error_code: { type: 'string', required: false, description: 'Error code if available' },
      error_log: { type: 'string', required: false, description: 'Full error log or stack trace (max 10,000 chars)' },
      task_id: { type: 'string', required: false, description: 'Related task ID if applicable' },
      context: { type: 'string', required: false, description: 'Additional context about what happened' }
    },
    returns: 'Object with success, id, message'
  },

  // ===== Subscriptions & Billing =====
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
    description: 'Start an upgrade to Builder or Pro plan. Returns a checkout URL for the user to complete payment',
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
    description: 'Get a billing portal URL for managing subscription, payment methods, or cancellation',
    params: {},
    returns: 'Object with portal_url for the user to manage billing'
  }
];

const CATEGORIES = {
  search: 'Search & Discovery',
  tasks: 'Tasks',
  messaging: 'Conversations & Messaging',
  proofs: 'Proofs & Completion',
  notifications: 'Notifications',
  feedback: 'Feedback',
  subscriptions: 'Subscriptions & Billing'
};

function getMethodByName(name) {
  return MCP_METHODS.find(m => m.name === name || (m.aliases && m.aliases.includes(name)));
}

function getMethodsByCategory(category) {
  return MCP_METHODS.filter(m => m.category === category);
}

function getAllMethodNames() {
  const names = [];
  for (const m of MCP_METHODS) {
    names.push(m.name);
    if (m.aliases) names.push(...m.aliases);
  }
  return names;
}

module.exports = { MCP_METHODS, CATEGORIES, getMethodByName, getMethodsByCategory, getAllMethodNames };
