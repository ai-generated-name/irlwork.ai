# Humanwork.ai - System Architecture & Escrow Flow

## Database Schema (SQLite)

```
users
├── id, email, password_hash, name, type (human/agent)
├── api_key (agents), stripe_account_id, stripe_customer_id
├── hourly_rate, location_city, timezone, availability
├── rating, review_count, jobs_completed, verified
└── created_at, updated_at

human_skills
├── id, user_id, skill, category

categories (14 total)
├── id, name, icon, description

task_templates
├── id, category_id, name, description, estimated_hours
└── base_price_range_min, base_price_range_max

ad_hoc_tasks
├── id, user_id, category, title, description
├── location, urgency, budget_min, budget_max
└── status (open/in_progress/completed), created_at

conversations
├── id, agent_id, human_id, subject
├── last_message, created_at, updated_at

messages
├── id, conversation_id, sender_id, content
├── type (text/booking_request/system), metadata (JSON)
├── read (0/1), created_at

bookings
├── id, conversation_id, agent_id, human_id, title
├── description, location, scheduled_at, duration_hours
├── hourly_rate, total_amount, status (pending/accepted/rejected/cancelled/completed/disputed)
├── created_at, updated_at

transactions (ESCROW SYSTEM)
├── id, booking_id, agent_id, human_id, amount
├── status (pending/held/released/refunded)
├── stripe_payment_id, stripe_transfer_id
├── created_at, updated_at

reviews
├── id, booking_id, reviewer_id, reviewee_id
├── rating (1-5), comment, type (agent_to_human / human_to_agent)
└── created_at

verifications
├── id, booking_id, human_id, type (completion_review/video)
├── status (pending/approved/rejected), proof_data (JSON)
├── verified_at, created_at

notifications
├── id, user_id, type, title, message
├── read (0/1), link, created_at

availability_slots
├── id, user_id, day_of_week, start_time, end_time, recurring
```

---

## Escrow Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ESCROW FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. AGENT CREATES BOOKING                                   │
│     POST /api/bookings                                      │
│     → Status: "pending"                                      │
│     → Transaction created with status: "pending"             │
│                                                             │
│  2. HUMAN ACCEPTS BOOKING                                   │
│     PATCH /api/bookings/:id (status: "accepted")            │
│     → Transaction status: "held" (escrow secured)          │
│                                                             │
│  3. WORK COMPLETED                                          │
│     POST /api/bookings/:id/complete                         │
│     → Booking status: "completed"                           │
│     → Verification record created                           │
│                                                             │
│  4. AGENT RELEASES ESCROW                                   │
│     POST /api/bookings/:id/release-escrow                   │
│     → Transaction status: "released"                        │
│     → Human's jobs_completed++                              │
│     → Stripe transfer initiated (mock mode)                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ALTERNATIVE FLOWS:                                          │
│                                                             │
│  • REJECTED: Transaction refunded                           │
│  • CANCELLED: Transaction refunded                          │
│  • DISPUTED: Manual review required                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## MCP Server Integration

```
MCP Server: http://localhost:3004
Endpoint: POST /mcp

Available Methods:
• list_humans(params)        → Search humans
• get_human(human_id)         → Profile details
• start_conversation(...)    → Begin outreach
• send_message(...)           → Send message
• create_booking(...)         → Request booking
• complete_booking(booking_id)→ Mark complete
• release_escrow(booking_id)  → Release payment
• my_bookings()               → List bookings
• notifications()             → Get alerts
```

---

## API Endpoints Quick Reference

```
AUTH
POST /api/auth/register/human
POST /api/auth/register-agent
POST /api/auth/login
GET  /api/auth/verify

HUMANS
GET  /api/humans (filters: category, city, rate, rating, skills)
GET  /api/humans/:id
PATCH /api/humans/:id (update profile)
GET  /api/humans/:id/portfolio
GET  /api/humans/:id/certifications
GET  /api/humans/:id/availability

MESSAGING
GET  /api/conversations
POST /api/conversations
POST /api/messages
GET  /api/conversations/:id/messages

BOOKINGS
POST /api/bookings
PATCH /api/bookings/:id (accept/reject/cancel)
POST /api/bookings/:id/complete
POST /api/bookings/:id/release-escrow
GET  /api/bookings

AD HOC TASKS
GET  /api/ad-hoc
POST /api/ad-hoc

TASK TEMPLATES
GET  /api/task-templates

NOTIFICATIONS
GET  /api/notifications
PATCH /api/notifications/:id/read

VERIFICATION
POST /api/verification/video
GET  /api/verifications/:booking_id

STRIPE (MOCK)
POST /api/stripe/connect
POST /api/stripe/payment-intent
```

---

## Missing Items for Full Functionality

| Feature | Status | Notes |
|---------|--------|-------|
| Stripe (real mode) | ❌ | Need real Stripe API keys |
| Email notifications | ❌ | Need SendGrid/SES integration |
| Push notifications | ❌ | Need service worker setup |
| Video verification UI | ❌ | Frontend for uploading proof |
| Google Analytics | ❌ | Not added yet |
| Stripe Connect onboarding | ❌ | Need OAuth flow |
| SMS notifications | ❌ | Twilio integration |
| Admin dashboard | ✅ | Phase 1 manual ops + BI tabs |
| Analytics dashboard | ✅ | Overview, Funnel, Financial tabs |
| Error tracking (Sentry) | ✅ | Backend + frontend integration |
| Structured logging (Pino) | ✅ | JSON logs in production, pretty in dev |

---

## Configuration Required

```bash
# Environment variables
HUMANWORK_API_KEY=hw_xxx           # Your API key
STRIPE_SECRET_KEY=sk_live_xxx      # Stripe secret
STRIPE_WEBHOOK_SECRET=whsec_xxx    # Webhooks
SENDGRID_API_KEY=SG.xxx            # Email
TWILIO_ACCOUNT_SID=ACxxx            # SMS
GA_TRACKING_ID=G-XXXXXXXXXX         # Google Analytics
SENTRY_DSN=https://xxx@sentry.io/xxx # Error tracking
LOG_LEVEL=info                       # Pino log level
```

---

## Admin Business Intelligence Endpoints

All BI endpoints require admin authentication (`ADMIN_USER_IDS` env var).

### GET /api/admin/financials
Financial overview with period filtering (`?period=7d|30d|90d|all`, default `30d`).
Returns: GMV, platform fees, payouts, outstanding escrow, refunds, disputes, premium revenue (MRR + subscriber counts by tier).

### GET /api/admin/growth
User and task growth metrics with period filtering.
Returns: total users (by type), signups by day, active users (DAU/WAU/MAU), total tasks, tasks by status, created/completed counts by period, created by day.

### GET /api/admin/funnel
Conversion funnel analysis with period filtering.
Returns: funnel counts (created → applied → assigned → started → completed → approved → paid), conversion rates between each stage, average lifecycle times (created-to-assigned, assigned-to-started, started-to-completed).

### Admin Auth
Backend uses `ADMIN_USER_IDS` env var (comma-separated UUIDs). Frontend receives `is_admin: true/false` in the `/api/auth/verify` response. The `users.role` column exists but is currently unused — admin auth should eventually migrate from env var to this database column.
