# CLAUDE.md — Project Instructions for irlwork.ai

## Project Overview

irlwork.ai is a marketplace where AI agents hire humans for real-world tasks. Agents (task posters) create tasks with budgets, humans (workers) apply and complete them, and the platform handles escrow payments with a 15% fee. Core flow: agent posts task → human applies → agent assigns → human works → submits proof → agent approves → payment released.

---

## Reference Documentation — Read Before Making Changes

Before modifying code, read the relevant reference doc. These are the source of truth.

| When you're changing... | Read first |
|------------------------|------------|
| Any API endpoint (add/modify/remove) | `ARCHITECTURE.md` → `API_REFERENCE.md` |
| Task status transitions or lifecycle | `ARCHITECTURE.md` (Status Machine) + `API_REFERENCE.md` (Section 8.4) |
| Database schema, columns, tables | `DATABASE_SCHEMA.md` |
| Payment/escrow/payout logic | `ARCHITECTURE.md` (Payment & Escrow section) |
| Frontend components or styling | `BRAND_GUIDELINES.md` (colors, typography, component patterns) |
| Webhooks or notifications | `API_REFERENCE.md` (Section 7 — includes payload examples) |
| MCP tool handlers | `API_REFERENCE.md` (Section 9 — note behavioral differences from REST) |
| Environment variables | `.env.example` |
| Background jobs or cron tasks | `DEVELOPMENT.md` (Section 9 — Background Jobs) |
| Cancellation or dispute logic | `ARCHITECTURE.md` (Cancellation Policy) + `API_REFERENCE.md` (Disputes section) |

### After making changes, UPDATE the corresponding reference doc.

- Add an endpoint → update `API_REFERENCE.md`
- Add a database column → update `DATABASE_SCHEMA.md`
- Add an env var → update `.env.example`
- Change a status transition → update `ARCHITECTURE.md` AND `DATABASE_SCHEMA.md`
- Add a webhook event → update `API_REFERENCE.md` (include payload example)
- Add a background job → update `DEVELOPMENT.md`

---

## Architecture Rules

These are non-negotiable constraints enforced by the codebase:

1. **Status transitions** — Task status transitions are enforced at the **database level** by the `check_task_status_transition` trigger (see `db/enforce_status_transitions.sql`). Invalid transitions raise a PostgreSQL exception. The old `validateStatusTransition()` function has been removed. Always use atomic `.eq('status', currentStatus)` on UPDATEs to prevent TOCTOU races. Valid transitions:
   ```
   open → pending_acceptance | assigned | in_progress | cancelled
   pending_acceptance → in_progress | open | cancelled
   assigned → in_progress | cancelled
   in_progress → pending_review | disputed | cancelled
   pending_review → completed | approved | rejected | disputed
   approved → paid
   rejected → pending_review | disputed | cancelled
   disputed → paid | refunded | cancelled
   completed → paid
   ```

2. **Webhooks** — Every status change that should notify external systems MUST call `deliverWebhook()` (for task events, flat payload) or `dispatchWebhook()` (for messages, wrapped payload with `{event_type, task_id, data, timestamp}`). These two functions have DIFFERENT payload structures — see `API_REFERENCE.md` Section 7.

3. **Notifications** — Every status change that should notify a user MUST create a notification record via `createNotification()`. Cross-ref the Notification Matrix in `ARCHITECTURE.md`.

4. **MCP parity gaps** — MCP `send_message` skips email notifications, webhook dispatch, and `conversations.last_message`/`updated_at` updates compared to REST `POST /api/messages`. Any new MCP handlers should aim for parity with REST equivalents. Document gaps in `API_REFERENCE.md`.

5. **Money in cents** — Monetary amounts in the database use integer cents (`amount_cents`, `fee_cents`, `pending_cents`, `available_cents`). Convert to dollars only at the API response boundary. Never use floating-point for money storage.

6. **VITE_ prefix** — Environment variables prefixed with `VITE_` are embedded into the browser bundle at build time. NEVER put secrets in `VITE_` variables.

7. **RLS policies** — Supabase Row Level Security is active. Backend queries using the service role key (`SUPABASE_SERVICE_ROLE_KEY`) bypass RLS. Frontend/client queries using the anon key do not.

8. **Platform fee** — The 15% platform fee is hardcoded in `api/config/constants.js` as `PLATFORM_FEE_PERCENT`. The env var in `.env.example` is for documentation only.

---

## UI/UX Rules

Before creating or modifying any UI:
1. Read `ui/DESIGN_SYSTEM.md` — all colors, typography, spacing, component specs
2. Import shared components from `ui/src/components/ui/` — never create inline cards, buttons, or empty states
3. Run `cd ui && npm run lint` before committing — custom ESLint rules enforce UI consistency

### Shared Components
See `ui/src/components/ui/README.md` for usage guide.

### Color System
Use design system colors defined in `ui/tailwind.config.cjs` theme extension. Never use Tailwind default gray/slate/zinc palette — use the named tokens or hex values from DESIGN_SYSTEM.md instead.

---

## Known Issues & Tech Debt

- **ARCHITECTURE.md is outdated** — References SQLite, bookings model, ad_hoc_tasks — all replaced. Use the reference docs (API_REFERENCE.md, DATABASE_SCHEMA.md) as the real source of truth instead.
- **Standalone MCP server broken** — `api/mcp-server.js` has 7 methods calling dead REST endpoints. Use the in-process MCP (`POST /api/mcp`) instead. See `API_REFERENCE.md` Section 9.
- **BRAND_GUIDELINES.md uses old name** — Still references "humanwork.ai" (pre-rebrand to irlwork.ai). Needs deliberate brand update.
- **`api/.env.example` is stale** — Has wrong R2 variable names. Root `.env.example` is comprehensive and correct.
- **`SUPABASE_SERVICE_KEY` vs `SUPABASE_SERVICE_ROLE_KEY`** — Both work due to fallback logic, but naming is inconsistent across files.
- **No escrow status docs** — `tasks.escrow_status` has its own state machine but it's not documented in API_REFERENCE.md.
- **No test framework** — No Jest, Vitest, or CI/CD. Three integration test scripts exist at the repo root (see Testing section).
- **Large monolithic files** — `api/server.js` (~7,900 lines) and `ui/src/App.jsx` (~244 KB). Use line-range reads and targeted search.

---

## Common Gotchas

- **VITE_ prefix required** — Frontend env vars MUST start with `VITE_` or Vite won't bundle them. `import.meta.env.SOMETHING` will be `undefined` without the prefix.
- **CORS** — Controlled by `CORS_ORIGINS` env var. If you get CORS errors locally, check `.env` includes `http://localhost:5173` (Vite default) and `http://localhost:3003` (start.sh port).
- **Two webhook functions** — `deliverWebhook` (flat payload, task events) vs `dispatchWebhook` (wrapped `{event_type, task_id, data}`, messages). Don't mix them up.
- **R2 variable names** — Code reads `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`. NOT `R2_BUCKET_NAME` or `R2_ACCESS_KEY_ID`. Multiple aliases exist (R2KEY, CLOUD_KEY, etc.) — see `.env.example`.
- **Hardcoded Supabase credentials** — `ui/src/App.jsx` and `ui/src/context/AuthContext.jsx` have hardcoded fallback Supabase URLs and anon keys. These point to a real project — known security concern.
- **start.sh port** — `start.sh` runs the UI on port 3003 (not Vite's default 5173). Update `CORS_ORIGINS` accordingly.
- **node --watch** — `api/npm run dev` uses `node --watch` (Node 18+). Only watches files in `api/` — changes outside won't trigger restart.
- **Service role key required** — Backend MUST use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. Using the anon key will return empty results.

---

## Project Structure

```
irlwork.ai/
├── api/                    # Express.js API server (Node 18+)
│   ├── server.js           # Main API (~7,900 lines, all endpoints)
│   ├── mcp-server.js       # Standalone MCP server (largely broken)
│   ├── routes/             # admin.js, stripe.js
│   ├── backend/services/   # stripeService, paymentService, withdrawalService
│   ├── services/           # ratingVisibility.js (active), _automated_disabled/
│   ├── config/             # constants.js (PLATFORM_FEE_PERCENT = 15)
│   └── middleware/         # adminAuth.js
├── ui/                     # React 18 + Vite 5 + Tailwind CSS 3.3
│   └── src/                # pages/, components/, context/, utils/, config/
├── sdk/                    # @irlwork/sdk NPM package (ES modules)
├── db/                     # 54 SQL migration files
├── branding/               # Logos, icons, social assets
├── samples/                # Stripe Connect sample integration
├── test_*.js               # 3 integration test scripts (repo root)
├── .env.example            # Comprehensive env var template
├── start.sh                # Starts API (:3002) + UI (:3003)
├── Dockerfile              # Node 18 Alpine (API only)
├── Procfile                # Heroku config
├── railway.json            # Railway deployment config
├── vercel.json             # Vercel frontend config
└── wrangler.toml           # Cloudflare Workers config
```

---

## Quick Start

```bash
cp .env.example .env         # Fill in required values (Supabase + Stripe)
npm install                  # Install root dependencies
cd api && npm install && cd ..  # Install API dependencies
cd ui && npm install && cd ..   # Install UI dependencies

# Start both
./start.sh                   # API on :3002, UI on :3003

# Or separately
cd api && npm run dev        # API with --watch
cd ui && npm run dev         # Vite dev server on :5173
```

See `DEVELOPMENT.md` for full setup including database migrations, Supabase config, and deployment.

---

## Testing

There is no test framework (no Jest, Vitest, CI/CD). Three integration test scripts exist at the **repo root**:

| Script | What It Tests |
|--------|---------------|
| `node test_system.js` | Database tables, balance calculations, service imports |
| `node test_pending_balance.js` | Pending balance system (`pending_transactions`, `withdrawals`) |
| `node test_page_views.js` | Page view tracking (`POST /api/views`, AI referrer detection) |

These require a running API server and valid Supabase credentials in `.env`. They hit the live database.

For everything else, test manually with `curl`, Postman, or the browser UI.
