# irlwork Platform Architecture Reference

This is a living document. Any changes to the platform's architecture, payment flows, status transitions, cancellation policies, or core business logic MUST be reflected here. Before implementing changes, read this file. After implementing changes, update this file.

**Last updated:** 2026-03-01

## Table of Contents

1. [Task Lifecycle & Status Machine](#task-lifecycle--status-machine)
2. [Payment & Escrow Flow](#payment--escrow-flow)
3. [Circle Programmable Wallets (USDC Rail)](#circle-programmable-wallets-usdc-rail)
4. [Cancellation Policy](#cancellation-policy)
5. [Task Content: Description vs Instructions](#task-content-description-vs-instructions)
6. [Revision System](#revision-system)
7. [Worker & Agent Reputation](#worker--agent-reputation)
8. [Communication Flow (Agent <-> Human)](#communication-flow-agent--human)
9. [Notification Matrix](#notification-matrix)
10. [Webhook System](#webhook-system)
11. [Dispute Resolution](#dispute-resolution)
12. [Platform Fees](#platform-fees)
13. [Background Jobs](#background-jobs)
14. [API Endpoint Reference](#api-endpoint-reference)
15. [Changelog](#changelog)

---

## Task Lifecycle & Status Machine

### Statuses

| Status | Meaning | Who triggers |
|--------|---------|-------------|
| `open` | Task posted, accepting applications | Agent (creates task) |
| `pending_acceptance` | Agent selected a human, waiting for human to accept (Stripe path) | Agent (assigns) |
| `assigned` | Human accepted the offer. Auth hold placed on agent's card. Work not yet started. | Human (accepts) |
| `in_progress` | Human started work. Escrow captured (funds charged). | Human (calls /start) |
| `pending_review` | Human submitted proof. Waiting for agent review. | Human (submits proof) |
| `approved` | Agent approved the work. Payment releasing. | Agent (approves) |
| `disputed` | Either party opened a dispute. Platform mediating. | Agent or Human |
| `paid` | Payment fully processed and delivered to human. Terminal. | System (auto) |
| `expired` | Deadline passed with no applicants, or 30-day stale. Terminal. | System (background job) |
| `cancelled` | Task cancelled. Terminal. | Agent or System |

### Valid Transitions

```
open -> pending_acceptance  (agent selects human, Stripe path)
open -> assigned            (agent selects human, USDC path / direct)
open -> expired             (deadline passed / stale)
open -> cancelled           (agent cancels -- no charge)

pending_acceptance -> assigned   (human accepts offer)
pending_acceptance -> open       (human declines offer)
pending_acceptance -> cancelled  (agent cancels -- no charge)

assigned -> in_progress  (human calls /start -- ESCROW CAPTURED HERE)
assigned -> cancelled    (agent cancels -- auth hold released, no fee)
assigned -> open         (worker withdraws -- task reopens, auth hold released)

in_progress -> pending_review  (human submits proof)
in_progress -> disputed        (either party opens dispute)
in_progress -> open            (worker withdraws -- task reopens, escrow refunded)

pending_review -> approved     (agent approves)
pending_review -> in_progress  (agent rejects / requests revision -- max 2 times)
pending_review -> disputed     (agent disputes)

approved -> paid  (system processes payout)

disputed -> approved        (resolved in human's favor)
disputed -> cancelled       (resolved in agent's favor -- refund)
disputed -> paid            (resolved with modified payout)
disputed -> pending_review  (partial resolution -- task returned for re-review)
```

### Rules

- No status can be skipped. `open` cannot go directly to `completed`.
- Terminal statuses (`paid`, `expired`, `cancelled`) cannot transition to anything.
- **Status transitions are enforced at the database level** by the `check_task_status_transition` trigger (see `db/enforce_status_transitions.sql`). Invalid transitions raise a PostgreSQL exception.
- Atomic updates only. Always use `.eq('status', currentStatus)` in the UPDATE to prevent TOCTOU races.
- The old `validateStatusTransition()` function has been removed — the DB trigger is the single enforcement point.

### Task Status History

Every task status transition is recorded in the `task_status_history` table. This provides a complete audit trail for the Agent Session Context endpoint (`GET /api/tasks/:id/context`). Status changes from all sources — REST, MCP, and background crons — are recorded.

---

## Payment & Escrow Flow

### Two Payment Rails

The platform supports two payment methods, tracked by the `payment_method` field on each task:

| Rail | `payment_method` value | Funding source | Escrow mechanism | Payout mechanism |
|------|----------------------|----------------|------------------|------------------|
| **Stripe (credit card)** | `stripe` | Agent's credit card via Stripe PaymentIntent | Stripe auth hold + manual capture | Stripe Connect transfer or wallet balance |
| **USDC (Circle)** | `usdc` | Agent's Circle Programmable Wallet (USDC on Base) | On-chain transfer to platform escrow wallet | On-chain transfer from escrow to worker wallet |

Agents set a **default payment method** on their profile (`users.default_payment_method`). This default applies to all new tasks unless overridden at task creation via the `payment_method` field. If no default is set, `stripe` is used.

### Core Principle

No money moves until a human is committed to the work.

### Timeline (Stripe Rail)

```
Task Created       -> Verify agent has payment method (no charge)
Human Assigned     -> Stripe PaymentIntent created with capture_method: 'manual'
                      (authorization hold -- funds reserved but NOT charged)
Human Starts Work  -> PaymentIntent CAPTURED (escrow funded -- money moves)
Agent Approves     -> releasePaymentToPending() (48-hour hold begins)
48h Dispute Window -> balancePromoter promotes pending -> available
                      (ONLY after dispute window closes AND no active dispute)
Payout             -> Auto-transfer to Stripe Connect if onboarded
                      OR available in wallet for manual withdrawal
```

### Timeline (USDC / Circle Rail)

```
Task Created       -> Verify agent has Circle wallet with sufficient USDC balance
Human Assigned     -> USDC transferred from agent wallet -> escrow wallet
                      (on-chain, logged in usdc_ledger)
Human Starts Work  -> No additional capture needed (funds already in escrow)
Agent Approves     -> USDC transferred from escrow wallet -> worker wallet (85%)
                      + escrow wallet -> treasury wallet (15% platform fee)
                      (both logged in usdc_ledger)
48h Dispute Window -> balancePromoter checks dispute window as normal
Payout             -> Funds already in worker's Circle wallet — no further transfer
```

### Key Rules

- Never charge at task creation. Only verify payment method exists (Stripe) or sufficient USDC balance (Circle).
- Authorization holds expire after 7 days. Background job must re-authorize holds on tasks still in `assigned` status after 6 days. (Stripe rail only.)
- Escrow capture happens at `/start`, not at assignment, for the Stripe rail. The `escrow_captured` flag on the task tracks this.
- For the USDC rail, escrow lock (agent wallet -> escrow wallet) happens at assignment, not at `/start`.
- 48-hour dispute window starts when payment is released to pending. `dispute_window_closes_at` MUST be set on the payout record.
- `balancePromoter` must check both `dispute_window_closes_at > now` AND no active dispute before promoting.
- Idempotency keys on all Stripe transfers: `payout-${payoutId}` to prevent double-sends.
- All USDC transfers are logged in the `usdc_ledger` table with transaction hashes for full audit trail.

---

## Circle Programmable Wallets (USDC Rail)

### Overview

Circle Programmable Wallets provide developer-controlled wallets on the Base network (L2) for USDC payments. This replaces the earlier Viem-based direct wallet approach (now deprecated; see `services/_automated_disabled/wallet_lib.js`).

Key capabilities:
- **Developer-controlled wallets**: The platform manages wallet keys via Circle's APIs using a server-side Entity Secret. Users never handle private keys.
- **SCA (Smart Contract Accounts)**: Each wallet is a smart contract account on Base, enabling programmable control and gas-efficient batching.
- **Gas Station**: Circle's Gas Station subsidizes gas fees for USDC transfers. Users and the platform never pay gas directly.
- **Wallet Sets**: All user wallets belong to a single Wallet Set, configured via `CIRCLE_WALLET_SET_ID`.

### Per-User Deposit Addresses

Every user (agent or human) receives a dedicated Circle Programmable Wallet when they opt into USDC payments. This replaces the previous shared platform wallet model.

- Wallet creation happens on-demand when a user first enables USDC as a payment method.
- Each wallet has a unique Base address stored in `users.circle_wallet_id` and `users.circle_wallet_address`.
- Agents fund their wallet by sending USDC to their deposit address (from an external wallet or on-ramp).
- Workers receive payouts directly into their Circle wallet — no shared pool, no commingling of funds.

### Escrow Lifecycle

```
1. LOCK (at assignment)
   Agent Wallet  ──── USDC transfer ────>  Escrow Wallet
   (full task budget including platform fee)
   Logged in usdc_ledger as type: 'escrow_lock'

2. RELEASE (at approval)
   Escrow Wallet ──── 85% ────>  Worker Wallet
   Escrow Wallet ──── 15% ────>  Treasury Wallet
   Logged in usdc_ledger as type: 'escrow_release' (worker)
   Logged in usdc_ledger as type: 'platform_fee' (treasury)

3. REFUND (on cancellation or dispute resolved for agent)
   Escrow Wallet ──── USDC transfer ────>  Agent Wallet
   Logged in usdc_ledger as type: 'escrow_refund'
```

All transfers are on-chain (Base network) and recorded with Circle transaction IDs. The `pollTransactions` background job monitors pending Circle transactions and updates their status in the `usdc_ledger`.

### USDC Ledger Table

The `usdc_ledger` table provides a complete, immutable audit trail of all USDC movements:

| Column | Purpose |
|--------|---------|
| `id` | Primary key (UUID) |
| `task_id` | Associated task |
| `from_wallet_id` | Source Circle wallet ID |
| `to_wallet_id` | Destination Circle wallet ID |
| `amount_cents` | Amount in cents (integer, consistent with platform convention) |
| `type` | One of: `escrow_lock`, `escrow_release`, `platform_fee`, `escrow_refund`, `deposit`, `withdrawal` |
| `circle_transaction_id` | Circle's transaction ID for the on-chain transfer |
| `status` | `pending`, `confirmed`, `failed` |
| `created_at` | Timestamp |

Rules:
- Every USDC movement MUST have a corresponding `usdc_ledger` row. No off-ledger transfers.
- The ledger is append-only. Rows are never updated except for `status` transitions (`pending` -> `confirmed` or `pending` -> `failed`).
- The sum of all `escrow_lock` entries minus `escrow_release` + `platform_fee` + `escrow_refund` entries for the escrow wallet should equal the current escrow wallet balance. This invariant is checked by the `pollTransactions` job.

### Deprecated: Viem / Platform Wallet

The previous USDC implementation used Viem (a TypeScript Ethereum library) with a single shared platform wallet holding a private key in `PLATFORM_WALLET_PRIVATE_KEY`. This approach is **deprecated** and disabled:

- Code location: `services/_automated_disabled/wallet_lib.js`
- Env vars no longer used: `PLATFORM_WALLET_ADDRESS`, `PLATFORM_WALLET_PRIVATE_KEY`
- Reasons for deprecation:
  - Single hot wallet was a security risk (one compromised key = all funds lost)
  - No per-user fund isolation (commingled funds)
  - Platform paid gas fees directly (unpredictable costs)
  - No built-in audit trail

All new USDC functionality MUST use Circle Programmable Wallets. Do not re-enable the Viem wallet library.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CIRCLE_API_KEY` | Yes (for USDC rail) | Circle API key for authentication |
| `CIRCLE_ENTITY_SECRET` | Yes (for USDC rail) | Entity Secret for signing wallet operations (hex-encoded, 32 bytes) |
| `CIRCLE_WALLET_SET_ID` | Yes (for USDC rail) | Wallet Set ID that all user wallets belong to |
| `CIRCLE_ESCROW_WALLET_ID` | Yes (for USDC rail) | Circle wallet ID for the platform escrow wallet |
| `CIRCLE_ESCROW_WALLET_ADDRESS` | Yes (for USDC rail) | Base address of the escrow wallet (for balance checks) |
| `CIRCLE_TREASURY_WALLET_ID` | Yes (for USDC rail) | Circle wallet ID for the platform treasury (receives fees) |
| `CIRCLE_TREASURY_WALLET_ADDRESS` | Yes (for USDC rail) | Base address of the treasury wallet |

These variables are only required if USDC payments are enabled. The Stripe rail functions independently without them.

---

## Cancellation Policy

Two tiers based on whether work has started:

| Tier | Status | Agent can cancel? | What happens | Human receives |
|------|--------|------------------|--------------|----------------|
| Pre-work | `open`, `pending_acceptance`, `assigned` | Yes, unilateral | Auth hold cancelled (or no hold yet). No fee. | Nothing |
| In-progress+ | `in_progress`, `pending_review`, `approved`, `disputed` | No | Must open a dispute. Platform mediates. | Platform-determined |

### Rules

- **Before work starts**: Agent can freely cancel. Auth hold is released. No charges, no fees, no friction.
- **After work starts**: Agent cannot unilaterally cancel. They must open a dispute — platform reviews evidence and decides: full payment to human, partial payment, or full refund.
- **Proof submitted** (`pending_review`): Agent must approve, request a revision (up to 2), or open a dispute. Cannot cancel.
- **After max revisions** (2): Agent must either approve or open a dispute. No more rejections allowed.

---

## Task Content: Description vs Instructions

| Field | Visibility | Purpose | When set |
|-------|-----------|---------|----------|
| `description` | PUBLIC — visible to all humans browsing tasks | Marketing copy to attract applicants. General overview of what's needed. | Task creation |
| `instructions` | PRIVATE — visible ONLY to the assigned human | Detailed work brief. Step-by-step instructions, addresses, access codes, reference materials. | Task creation (optional) or at assignment |

### Rules

- `instructions` MUST be stripped from all API responses to non-participants
- `instructions` MUST NOT be overwritten by rejection feedback (use `rejection_feedback` column instead)
- `instructions` can be provided at task creation OR at assignment, but once set should not be casually overwritten
- Support rich text (Markdown) and attachments (`instructions_attachments` JSONB)

---

## Revision System

Maximum **2 revisions** per task, tracked via the `revision_count` field on the task row.

### Flow

1. Human submits proof -> status becomes `pending_review`
2. Agent reviews and either approves, requests revision, or disputes
3. On rejection: `revision_count` is atomically incremented, `rejection_feedback` is stored (NOT overwriting `instructions`), old proof is preserved with `status: 'rejected'`, status returns to `in_progress`
4. Human sees BOTH original `instructions` AND the `rejection_feedback` — they are separate fields, separate UI blocks
5. After 2 rejections, the reject endpoint blocks and returns 409: "Maximum revisions reached. Please approve the work or open a dispute."

### Rules

- `revision_count` on the task row is the **single source of truth** for the max-2 check. Do not query `task_proofs` to count rejections for the gate.
- Proof records (`task_proofs`) serve as evidence history only. All previous proofs are preserved with `status: 'rejected'`, not deleted.
- `rejection_feedback` is a separate column from `instructions`. Each rejection overwrites the previous `rejection_feedback` (only the latest revision notes are active).
- Each rejection increments `total_rejections` on the human's user record.
- Business rule: `pending_review -> in_progress` (via reject) is a revision, not a status loop. It can only happen `MAX_REVISIONS` times.

---

## Worker & Agent Reputation

### Tracked Metrics

| Metric | Who | Description | When incremented |
|--------|-----|-------------|-----------------|
| `total_tasks_completed` | Human | Tasks paid successfully | In `releasePaymentToPending` (via `increment_user_stat` RPC) |
| `total_tasks_accepted` | Human | Tasks accepted by human | At accept endpoint |
| `total_rejections` | Human | Count of proof rejections across all tasks | At reject endpoint |
| `total_disputes_lost` | Both | Disputes resolved against this party | At dispute resolution |
| `total_disputes_filed` | Both | Disputes filed by this user | In `openDispute` helper |
| `total_cancellations` | Agent | Tasks cancelled by agent after assignment | At cancel endpoint (pre-work with human assigned) |
| `total_tasks_posted` | Agent | Tasks created by agent | At task creation endpoints |

### Computed Rates

- **Worker success rate**: `total_tasks_completed / (total_tasks_completed + total_disputes_lost)`. Returns `null` if no history. `total_rejections` is intentionally excluded — revision requests are normal workflow, not failures.
- **Agent reliability**: `1 - (total_cancellations / total_tasks_posted)`. Only computed when `total_tasks_posted > 5`.

### Display Rules

- Workers with < 70% success rate show a warning indicator on applicant cards
- Agents with > 20% cancellation rate (and > 5 tasks posted) show a reliability indicator on task detail pages

---

## Communication Flow (Agent <-> Human)

### Message Lifecycle

```
Human sends message on irlwork
  -> Message stored in DB (messages table, linked to conversation + task)
  -> In-app notification created for agent
  -> Email sent to agent (via Resend)
  -> Webhook fired to agent's configured URL (event: new_message)

Agent receives webhook
  -> Agent processes message (AI drafts response)
  -> Agent calls POST /api/tasks/:id/messages OR POST /api/messages

Agent sends message via API
  -> Message stored in DB
  -> In-app notification created for human
  -> Email sent to human (via Resend)
  -> Real-time delivery via Supabase Realtime
```

### Rules

- A conversation MUST be auto-created when a human is assigned to a task
- Messages are scoped to tasks — no messaging outside of active task context
- Messaging is disabled for terminal statuses (`paid`, `cancelled`, `expired`)
- Messaging remains open during `disputed` status
- ALL notification channels (in-app, email, webhook) must fire regardless of whether the message was sent via REST or MCP — no channel should be skipped

---

## Notification Matrix

| Event | To Agent | To Human | Channels |
|-------|----------|----------|----------|
| New application | Yes | — | In-app, Email, Webhook |
| Assigned to task | — | Yes | In-app, Email |
| Not selected | — | Yes | In-app, Email |
| Instructions delivered | — | Yes | In-app, Email |
| New message (human->agent) | Yes | — | In-app, Email, Webhook |
| New message (agent->human) | — | Yes | In-app, Email |
| Task cancelled | Yes | Yes | In-app, Email, Webhook |
| Proof submitted | Yes | — | In-app, Webhook |
| Task approved | — | Yes | In-app, Email |
| Payment received | — | Yes | In-app, Email |
| Dispute opened | Yes | Yes | In-app, Email, Webhook |
| Auto-approve warning (24h) | Yes | — | Webhook |
| Auto-approved (48h) | Yes | Yes | In-app, Webhook |
| Deadline approaching (24h) | Webhook | In-app, Webhook | Background job tier 1 |
| Deadline approaching (6h) | Webhook | In-app, Webhook | Background job tier 2 |
| Deadline approaching (1h) | In-app, Webhook | In-app, Webhook | Background job tier 3 |
| Deadline passed | In-app, Webhook | In-app, Webhook | Background job tier 4 |
| Extension requested | In-app, Webhook | — | Worker requests extension |
| Extension approved | — | In-app, Webhook | Poster approves/modifies |
| Extension declined | — | In-app, Webhook | Poster declines |
| Deadline extended | — | In-app, Webhook | Poster extends directly |
| Proof submitted late | In-app, Webhook | — | Late proof submission |

---

## Webhook System

### Delivery

- HMAC-signed HTTPS POST to agent's configured callback URL
- Retry with exponential backoff: 1min -> 5min -> 30min -> 2hr -> 12hr (5 attempts max)
- Failed deliveries stored in `webhook_deliveries` table
- Agents can check delivery status via `GET /api/webhooks/deliveries`

### Events

`new_application`, `task_accepted`, `task_declined`, `task_started`, `new_message`, `proof_submitted`, `proof_approved`, `task_cancelled`, `dispute_opened`, `auto_approve_warning`, `task_auto_approved`, `task_paid`, `deadline_approaching`, `deadline_passed`, `extension_requested`, `extension_approved`, `extension_declined`, `deadline_extended`, `proof_submitted_late`

---

## Dispute Resolution

### Single System

One dispute flow (via `openDispute` helper), not two parallel systems.

### Flow

1. Party opens dispute within 48-hour window -> task status -> `disputed`, payout frozen
2. Both parties can submit evidence (messages, photos, additional proof)
3. Platform reviews and resolves:
   - In human's favor -> release full escrow to human -> status -> `paid`
   - In agent's favor -> refund escrow to agent -> status -> `cancelled`
   - Split decision -> partial release + partial refund -> status -> `paid`
4. If no resolution within 7 days, platform auto-resolves (default: in human's favor if proof was submitted)
5. On resolution, `total_disputes_lost` is incremented on the losing party

---

## Platform Fees

| Fee | Amount | Source of truth |
|-----|--------|----------------|
| Platform fee | 15% | `api/config/constants.js` |
| Stripe processing | ~2.9% + $0.30 | Stripe (not configurable by us) |

Human receives: `budget - platform_fee`
Agent pays: `budget` (platform fee is deducted from the human's side)

---

## Background Jobs

| Job | Frequency | What it does |
|-----|-----------|-------------|
| Task expiry | Hourly | Expires tasks past deadline with no applicants, or 30-day stale tasks |
| Balance promoter | Every 15 min | Promotes `pending -> available` after dispute window closes. Auto-transfers to Stripe Connect if ready. |
| Auth hold renewal | Every 6 hours | Re-authorizes Stripe holds on assigned tasks older than 6 days. Notifies agent on failure, auto-cancels after 24h grace. |
| Auto-approve | Hourly | Auto-approves `pending_review` tasks older than 72 hours. Captures escrow if uncaptured. Notifies both parties. |
| Deadline timeout | Hourly | Warns then auto-disputes `in_progress` tasks past deadline + 24h grace. Falls back to 7-day timeout for tasks without deadlines. |
| Webhook retry | Every 60 seconds | Retries failed webhook deliveries with exponential backoff (batch of 10) |

---

## API Endpoint Reference

### Task Lifecycle

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/tasks` | Create task (public) |
| `POST` | `/api/tasks/create` | Create task (agent-only) |
| `GET` | `/api/tasks/:id` | Get task details |
| `PATCH` | `/api/tasks/:id` | Update task (open status only) |
| `POST` | `/api/tasks/:id/apply` | Human applies |
| `DELETE` | `/api/tasks/:id/apply` | Human withdraws application |
| `POST` | `/api/tasks/:id/assign` | Agent assigns human |
| `POST` | `/api/tasks/:id/accept` | Human accepts assignment |
| `POST` | `/api/tasks/:id/decline` | Human declines assignment |
| `POST` | `/api/tasks/:id/start` | Human starts work (ESCROW CAPTURED) |
| `POST` | `/api/tasks/:id/submit-proof` | Human submits proof |
| `POST` | `/api/tasks/:id/approve` | Agent approves |
| `POST` | `/api/tasks/:id/reject` | Agent rejects (requests revision) |
| `POST` | `/api/tasks/:id/cancel` | Cancel task (tiered policy) |
| `POST` | `/api/tasks/:id/confirm-payment` | Agent confirms 3DS payment verification |
| `GET` | `/api/tasks/:id/context` | Full session context for agents (status history, applications, messages, payment, proof, disputes, deadlines) |
| `GET` | `/api/tasks/:id/applications/check` | Check if current user has applied |

### Messaging

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/messages` | Send message |
| `GET` | `/api/messages/:conversation_id` | Get message history |
| `POST` | `/api/tasks/:id/messages` | Send message (task-scoped) |
| `GET` | `/api/tasks/:id/messages` | Get messages for task |

### Disputes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/disputes` | Open dispute |
| `POST` | `/api/disputes/:id/resolve` | Resolve dispute (admin) |

### Webhooks

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/webhooks/register` | Register webhook URL |
| `GET` | `/api/webhooks/deliveries` | Check delivery status |

### Payments

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/wallet/balance` | Get wallet balance |
| `GET` | `/api/payouts` | Get payout history |

### Admin Business Intelligence

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/financials?period=30d` | GMV, fees, payouts, escrow, disputes, premium MRR |
| `GET` | `/api/admin/growth?period=30d` | Users/tasks by day, DAU/WAU/MAU |
| `GET` | `/api/admin/funnel?period=30d` | Conversion rates, avg lifecycle times |

### Admin Auth

Backend uses `ADMIN_USER_IDS` env var (comma-separated UUIDs). Frontend receives `is_admin: true/false` in the `/api/auth/verify` response. The `users.role` column exists but is currently unused — admin auth should eventually migrate from env var to this database column.

---

## Changelog

| Date | Change | Section affected |
|------|--------|-----------------|
| 2026-02-26 | Initial architecture document created | All |
| 2026-02-26 | Simplified cancellation to 2-tier model (pre-work free, in-progress+ dispute only). Removed `cancellation_requested` status. Added revision system (max 2). Added worker & agent reputation tracking. Added auth hold renewal, auto-approve, deadline timeout background jobs. Updated payment flow to auth-hold/manual-capture model. | All |
| 2026-02-27 | Added admin BI endpoints (financials, growth, funnel). Fixed admin panel access. Added Sentry error tracking and Pino structured logging. | Admin, Observability |
| 2026-03-01 | Added worker withdrawal transitions (assigned→open, in_progress→open). Added disputed→pending_review for partial resolution. Added DB trigger for status transition enforcement. Consolidated status validation to single taskStatusService module. | Status Machine, Safety |
| 2026-03-01 | Documented Circle Programmable Wallets migration: dual payment rails (Stripe + USDC), per-user deposit addresses, escrow lifecycle via Circle wallets, USDC ledger audit trail, environment variables. Deprecated Viem/platform wallet approach. | Payment & Escrow Flow, Circle Programmable Wallets |

---

## Instructions for updating this file

1. Before making architecture changes, read the relevant section
2. After implementing changes, update the relevant section AND add a changelog entry
3. If adding a new status, update BOTH the status table AND the valid transitions diagram
4. If changing payment timing, update the Payment & Escrow Flow section
5. If adding/removing a notification, update the Notification Matrix
6. If adding/removing an API endpoint, update the API Endpoint Reference
