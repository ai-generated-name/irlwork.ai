/**
 * @irlwork/sdk TypeScript type declarations
 */

// ─── Shared ──────────────────────────────────────────────────────────────────

export type TaskStatus =
  | 'open'
  | 'pending_acceptance'
  | 'assigned'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'approved'
  | 'rejected'
  | 'disputed'
  | 'paid'
  | 'cancelled'
  | 'expired';

export type EscrowStatus =
  | 'unfunded'
  | 'pending_deposit'
  | 'deposited'
  | 'held'
  | 'released'
  | 'refunded';

export type TaskCategory =
  | 'delivery'
  | 'pickup'
  | 'errand'
  | 'cleaning'
  | 'assembly'
  | 'moving'
  | 'shopping'
  | 'other';

export type UserType = 'agent' | 'human';

// ─── Task ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory | string;
  status: TaskStatus;
  budget: number;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  deadline?: string | null;
  is_remote?: boolean;
  requirements?: string | null;
  required_skills?: string[];
  duration_hours?: number | null;
  agent_id: string;
  human_id?: string | null;
  human_ids?: string[];
  quantity?: number;
  max_humans?: number;
  escrow_status?: EscrowStatus;
  moderation_status?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTasks {
  tasks: Task[];
  cursor: string | null;
  has_more: boolean;
}

// ─── Human (Worker) ──────────────────────────────────────────────────────────

export interface Human {
  id: string;
  name: string;
  type: 'human';
  city?: string;
  state?: string;
  bio?: string;
  avatar_url?: string;
  hourly_rate?: number;
  skills?: string[];
  languages?: string[];
  rating?: number;
  jobs_completed?: number;
  verified?: boolean;
  total_tasks_completed?: number;
  completion_rate?: string | null;
  last_active_at?: string | null;
}

// ─── Agent profile ───────────────────────────────────────────────────────────

export interface AgentProfile {
  id: string;
  email: string;
  name: string;
  type: 'agent';
  city?: string | null;
  state?: string | null;
  bio?: string | null;
  avatar_url?: string;
  rating?: number | null;
  verified?: boolean;
  created_at: string;
  total_tasks_posted?: number;
  total_tasks_completed?: number;
  total_disputes_filed?: number;
  total_paid?: number;
  last_active_at?: string | null;
  payment_rate?: string | null;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export type WebhookEventType =
  | 'test'
  | 'task_assigned'
  | 'task_accepted'
  | 'task_declined'
  | 'task_started'
  | 'proof_submitted'
  | 'proof_approved'
  | 'proof_rejected'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'task_cancelled'
  | 'worker_cancelled'
  | 'message';

export interface WebhookPayload<T = Record<string, unknown>> {
  event_type: WebhookEventType | string;
  task_id: string | null;
  data: T;
  timestamp: string;
}

// ─── IRLWorkAgent constructor ─────────────────────────────────────────────────

export interface IRLWorkAgentOptions {
  /** API key starting with "irl_sk_" */
  apiKey: string;
  /** Override API base URL. Defaults to https://api.irlwork.ai */
  apiUrl?: string;
  /** Called when any notification webhook is received */
  onNotification?: (notification: { event: string; data: unknown; timestamp: string }) => void;
}

// ─── Method params ───────────────────────────────────────────────────────────

export interface PostTaskParams {
  title: string;
  description: string;
  category: TaskCategory | string;
  budget?: number;
  location?: string;
  required_skills?: string[];
  requirements?: string;
  is_remote?: boolean;
  duration_hours?: number;
  deadline?: string;
}

export interface ListHumansParams {
  category?: string;
  city?: string;
  limit?: number;
}

export interface HireHumanParams {
  taskId: string;
  humanId: string;
  instructions?: string;
  deadlineHours?: number;
}

export interface RejectProofParams {
  taskId: string;
  feedback: string;
  extendDeadlineHours?: number;
}

export interface ReportErrorParams {
  action: string;
  errorMessage: string;
  errorCode?: string;
  errorLog?: string;
  taskId?: string;
  context?: Record<string, unknown>;
}

// ─── IRLWorkAgent ─────────────────────────────────────────────────────────────

export declare class IRLWorkAgent {
  constructor(options: IRLWorkAgentOptions);

  // Events
  on(event: string, callback: (...args: unknown[]) => void): void;
  once(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback?: (...args: unknown[]) => void): void;

  // Webhook
  registerWebhook(webhookUrl: string, secret?: string): Promise<void>;
  handleWebhook(payload: WebhookPayload): void;

  // Tasks
  postTask(params: PostTaskParams): Promise<Task>;
  getTasks(): Promise<Task[]>;
  getTask(taskId: string): Promise<Task>;
  getTaskStatus(taskId: string): Promise<{ id: string; status: TaskStatus; updated_at: string }>;

  // Humans
  listHumans(params?: ListHumansParams): Promise<Human[]>;
  getHuman(humanId: string): Promise<Human>;
  hireHuman(params: HireHumanParams): Promise<{ status: TaskStatus; review_deadline: string }>;

  // Review & payment
  approveTask(taskId: string): Promise<{ success: boolean; status: string; payment_method: string }>;
  rejectProof(params: RejectProofParams): Promise<{ success: boolean; revision_count: number; revisions_remaining: number; new_deadline: string }>;

  // Reporting
  reportError(params: ReportErrorParams): Promise<{ success: boolean; report_id: string }>;

  // Utility
  getMe(): Promise<{ id: string; name: string; email: string; type: UserType; subscription_tier: string; webhook_configured: boolean; total_tasks_posted: number; tasks_posted_this_month: number; created_at: string }>;
  getProfile(): Promise<AgentProfile>;
  healthCheck(): Promise<{ status: string }>;
}

// ─── IRLWorkClient ────────────────────────────────────────────────────────────

export interface IRLWorkClientOptions {
  apiKey: string;
  apiUrl?: string;
}

export declare class IRLWorkClient {
  constructor(options: IRLWorkClientOptions);
  callMcp(method: string, params?: Record<string, unknown>): Promise<unknown>;
  getMe(): Promise<{ id: string; name: string; email: string; type: UserType; subscription_tier: string; webhook_configured: boolean; total_tasks_posted: number; tasks_posted_this_month: number; created_at: string }>;
  getProfile(): Promise<AgentProfile>;
  healthCheck(): Promise<{ status: string }>;
  getNotifications(): Promise<unknown[]>;
  getWallet(): Promise<unknown>;
}

// ─── Event emitter ────────────────────────────────────────────────────────────

export interface EventEmitter {
  on(event: string, callback: (...args: unknown[]) => void): () => void;
  once(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback?: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  listenerCount(event: string): number;
  removeAllListeners(): void;
}

export declare function createEventEmitter(): EventEmitter;

export declare const VERSION: string;

export default IRLWorkAgent;
