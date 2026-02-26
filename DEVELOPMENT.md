# irlwork.ai Development Guide

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 18.0.0 | Required by both `api/` and `ui/` |
| npm | >= 9 | Lockfiles exist for root, api, and ui |
| Supabase account | - | Hosted PostgreSQL + Auth |
| Stripe account | - | Test mode keys are sufficient for dev |

Optional:
- Cloudflare R2 account (file uploads; falls back to base64 in DB)
- Resend account (transactional email; falls back to `console.log`)

> **Note:** The project uses pure JavaScript -- no TypeScript, no linting, and no test framework are configured.

---

## 2. Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd gallant-yonath

# Install all dependencies (root, api, ui)
npm install
cd api && npm install && cd ..
cd ui  && npm install && cd ..

# Create your env file from the template
cp .env.example .env
# Then open .env and fill in the required values (see section 6)
```

---

## 3. Project Structure

```
gallant-yonath/
├── api/                        # Express.js API server
│   ├── server.js               # Main entry point (~7,900 lines)
│   ├── mcp-server.js           # Claude MCP integration server
│   ├── package.json            # express, stripe, @supabase/supabase-js, bcrypt, etc.
│   ├── routes/                 # admin.js, stripe.js
│   ├── services/               # ratingVisibility.js (active)
│   │   └── _automated_disabled/ # Phase 1 background jobs (disabled)
│   ├── backend/
│   │   ├── services/           # stripeService, paymentService, withdrawalService, balancePromoter
│   │   └── lib/                # stripe.js, supabase.js
│   ├── middleware/             # adminAuth.js
│   ├── config/                # constants.js (PLATFORM_FEE_PERCENT = 15)
│   ├── utils/                 # distance.js (Haversine formula)
│   ├── lib/                   # supabase.js (backend client init)
│   └── migrations/            # JS-based migration runner
├── ui/                        # React 18 + Vite 5 + Tailwind CSS 3.3
│   ├── package.json           # react, vite, tailwindcss, @stripe/react-stripe-js, leaflet, lucide-react
│   ├── vite.config.js         # React plugin config
│   ├── tailwind.config.cjs
│   ├── src/
│   │   ├── App.jsx            # Main router/layout (~244 KB - very large)
│   │   ├── main.jsx           # Entry point
│   │   ├── pages/             # 14 page components
│   │   ├── components/        # 46 shared components
│   │   │   └── TaskDetail/    # 13 task-detail-specific components
│   │   ├── context/           # AuthContext.jsx, ToastContext.jsx
│   │   ├── utils/             # auth.js, analytics.js, avatarUrl.js, timezone.js, trackView.js
│   │   └── config/            # api.js
│   └── public/                # Static assets
├── sdk/                       # @irlwork/sdk NPM package (ES modules)
│   ├── lib/                   # agent.js, client.js, events.js
│   └── examples/              # basic.js, autonomous-agent.js, webhook-server.js
├── db/                        # 54 SQL migration files
├── samples/                   # Sample integrations (stripe-connect-v2)
├── branding/                  # Logos, icons, social media assets
├── Dockerfile                 # Node 18 Alpine - copies api/ only
├── Procfile                   # Heroku: web: node api/server.js
├── railway.json               # Railway deployment config
├── vercel.json                # Vercel frontend deployment config
├── wrangler.toml              # Cloudflare Workers frontend config
├── start.sh                   # Starts API (3002) + UI (3003) simultaneously
└── package.json               # Root monorepo scripts
```

---

## 4. Running Locally

### Frontend only

```bash
cd ui
npm run dev          # Vite dev server on http://localhost:5173
```

### Backend only

```bash
cd api
npm run dev          # node --watch server.js on http://localhost:3002
```

### Both simultaneously

```bash
# From project root
./start.sh           # API on :3002, UI dev on :3003
```

Or use the root package.json scripts:
```bash
npm run dev          # Runs Vite dev server (UI only)
npm run build        # Production build of UI
```

### All package.json scripts

| Package | Script | Command | Notes |
|---------|--------|---------|-------|
| root | `dev` | `cd ui && npm run dev` | Runs UI dev server only |
| root | `build` | `cd ui && npm install && npm run build` | Production build of UI |
| `api/` | `start` | `node server.js` | Production server start |
| `api/` | `dev` | `node --watch server.js` | Dev server with auto-restart (Node 18+) |
| `ui/` | `dev` | `vite` | Vite dev server on :5173 |
| `ui/` | `build` | `vite build` | Production build to `ui/dist` |
| `ui/` | `preview` | `vite preview` | Preview production build locally |
| `sdk/` | `test` | `node test.js` | Run SDK tests |
| `sdk/` | `example` | `node examples/basic.js` | Run basic SDK example |

### MCP Server

```bash
cd api
node mcp-server.js   # Starts on port 3004 (or MCP_PORT)
```

---

## 5. Database

### Connecting

The app uses **Supabase** (hosted PostgreSQL). Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your `.env`.

### Migrations

There are **54 SQL migration files** in `/db/`. They are applied via one of:

1. **Supabase SQL Editor** -- paste and run each migration file manually.
2. **Migration runner** -- `node api/migrate.js` (requires `SUPABASE_SERVICE_KEY`).

There is no Supabase CLI (`supabase/config.toml`) configured for this project.

### Supabase Studio

Access your project dashboard at `https://app.supabase.com` to browse tables, run SQL, and manage auth.

### RLS (Row Level Security)

The backend uses the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS. The frontend anon key is subject to RLS policies defined in the migration files.

---

## 6. Environment Variables

All environment variables are documented in **`.env.example`** at the project root.

Quick summary:

| Group | Required? | Notes |
|-------|-----------|-------|
| Supabase (backend) | Yes | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Supabase (frontend) | Yes | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Stripe | Yes | Secret key, publishable key, webhook secret |
| Cloudflare R2 | No | Falls back to base64 in DB |
| Email (Resend) | No | Falls back to `console.log` |
| Server | No | All have defaults (`PORT=3002`, etc.) |
| Admin | No | `ADMIN_USER_IDS` for admin panel access |

**Important**: Variables prefixed with `VITE_` are embedded into the frontend bundle at build time and are visible to end users. Never put secrets there.

---

## 7. Testing

### Current State

There is **no test framework** (no Jest, Vitest, Mocha, etc.) and **no CI/CD pipeline** (no `.github/workflows/`).

### Test Scripts

There are three test scripts at the **project root** (not in `api/`). They require a running API server and valid Supabase credentials in `.env`:

| Script | Command | What It Tests |
|--------|---------|---------------|
| `test_system.js` | `node test_system.js` | Comprehensive system test — database tables exist, balance calculations, service imports |
| `test_pending_balance.js` | `node test_pending_balance.js` | Pending balance system — `pending_transactions` and `withdrawals` tables, balance queries |
| `test_page_views.js` | `node test_page_views.js` | Page view tracking — `POST /api/views` endpoint, deduplication, AI referrer detection |

> **Note:** These are integration tests that hit the live database. They are not run in CI and there is no test framework (no Jest, Vitest, etc.).

### Manual Testing

For endpoints not covered by the test scripts, testing is manual:

1. Start the API server (`cd api && npm run dev`)
2. Start the UI (`cd ui && npm run dev`)
3. Test endpoints using `curl`, Postman, or the browser UI

### No Linting

There are no `.eslintrc`, `.prettierrc`, or similar config files. No code formatting is enforced.

---

## 8. Deployment

### Backend: Railway (primary)

- **Config**: `railway.json` and `Dockerfile` (Node 18 Alpine, copies `api/` only)
- Set all required env vars in the Railway dashboard.
- Railway auto-deploys on push to the configured branch.

### Backend: Heroku (alternative)

- **Config**: `Procfile` (`web: node api/server.js`)

### Frontend: Vercel (primary)

- **Config**: `vercel.json`
- Build command: `cd ui && npm run build`
- Output directory: `ui/dist`

### Frontend: Cloudflare Workers (alternative)

- **Config**: `wrangler.toml`

### Database: Supabase

- Hosted PostgreSQL. No self-hosting config is present.

---

## 9. Background Jobs

The `ARCHITECTURE.md` references several background jobs. Most are **not yet implemented** or are **disabled**.

| Job | Status | Location |
|-----|--------|----------|
| Rating visibility service | Active | `api/services/ratingVisibility.js` |
| Balance promoter | Disabled | `api/services/_automated_disabled/` |
| Auto-release payments | Disabled | `api/services/_automated_disabled/` |
| Deposit watcher | Disabled | `api/services/_automated_disabled/` |
| Withdrawal service | Disabled | `api/backend/services/withdrawalService.js` |
| Task expiry | Not implemented | - |
| Auth hold renewal | Not implemented | - |
| Auto-approve tasks | Not implemented | - |
| Proof deadline enforcement | Not implemented | - |
| Webhook retry queue | Not implemented | Fire-and-forget currently |

Disabled jobs are in `api/services/_automated_disabled/` and are not loaded by the server.

---

## 10. SDK (`@irlwork/sdk`)

The `sdk/` directory contains a standalone NPM package (`@irlwork/sdk`) for AI agents to interact with the irlwork.ai API.

- **Type**: ES Module (`"type": "module"`)
- **Entry point**: `sdk/index.js`
- **Core files**: `sdk/lib/client.js` (HTTP client), `sdk/lib/agent.js` (high-level agent API), `sdk/lib/events.js` (webhook event handling)

### Usage

```javascript
import { IRLWorkAgent } from '@irlwork/sdk';

const agent = new IRLWorkAgent({
  apiKey: 'irl_sk_...',
  apiUrl: 'https://api.irlwork.ai'
});
```

### Running examples

```bash
cd sdk
npm run example    # Runs examples/basic.js
npm run test       # Runs test.js
```

See `sdk/README.md` for full SDK documentation and `sdk/examples/` for usage patterns including `autonomous-agent.js` and `webhook-server.js`.

---

## 11. Code Conventions

These patterns have been observed in the codebase (not enforced by tooling):

- **No TypeScript** -- pure `.js` / `.jsx` throughout.
- **No barrel exports** -- imports reference files directly.
- **React functional components** with hooks (`useState`, `useEffect`, `useContext`).
- **Tailwind CSS** for all styling; no CSS modules or styled-components.
- **Express.js** routes defined inline in `server.js` and split into `routes/` files.
- **Supabase client** initialized in `api/lib/supabase.js` (backend) and `ui/src/context/AuthContext.jsx` (frontend).
- **Lucide React** for icons.
- **Leaflet** for maps.
- **Date handling**: Native `Date` -- no date library (moment, dayjs, etc.).
- **Error handling**: Try/catch blocks returning `{ error }` JSON responses; no global error handler middleware.
- **Large files**: `api/server.js` (~7,900 lines) and `ui/src/App.jsx` (~244 KB) are monolithic. Future work should decompose these.

---

## 12. Common Issues and Gotchas

### CORS errors in development

The API checks `CORS_ORIGINS` for allowed origins. If you see CORS errors:
```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:3003
```
Make sure every origin your browser uses is listed.

### VITE_ variables not updating

Vite embeds `VITE_*` variables at **build time**, not runtime. After changing them:
```bash
cd ui && npm run build   # or restart `npm run dev`
```

### Hardcoded Supabase credentials

`ui/src/App.jsx` and `ui/src/context/AuthContext.jsx` contain hardcoded fallback Supabase URLs and anon keys. These are used when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set. This is a **known security concern** -- the fallbacks point to a real project.

### start.sh port mismatch

`start.sh` runs the UI dev server on port **3003** (not the Vite default of 5173). Update `CORS_ORIGINS` accordingly if you use this script.

### Supabase RLS bypass

The backend **must** use `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) to bypass Row Level Security. If API calls return empty results unexpectedly, check that the service role key is set.

### R2 env var aliases

The R2 configuration accepts multiple aliases (`R2_ACCOUNT_ID` / `R2ID` / `CLOUD_ID`). Only one set needs to be defined; the code checks all aliases with fallback.

### No hot reload on server.js

`npm run dev` in `api/` uses `node --watch` (Node 18+). Changes to files outside `api/` won't trigger a restart.

### Large monolithic files

`api/server.js` is approximately 7,900 lines and `ui/src/App.jsx` is approximately 244 KB. Editors may slow down on these files. Consider using line-range reads or targeted search when working in them.

---

## 13. Reference Docs

| Resource | Location / URL |
|----------|----------------|
| Environment variables | `.env.example` (project root) |
| Architecture overview | `ARCHITECTURE.md` (project root) |
| Database migrations | `db/` directory (54 SQL files) |
| SDK documentation | `sdk/README.md` |
| SDK examples | `sdk/examples/` |
| Stripe sample integration | `samples/stripe-connect-v2/` |
| Branding assets | `branding/` |
| Deployment (Railway) | `railway.json`, `Dockerfile` |
| Deployment (Vercel) | `vercel.json` |
| Deployment (Cloudflare) | `wrangler.toml` |
| Supabase dashboard | `https://app.supabase.com` |
| Stripe dashboard | `https://dashboard.stripe.com` |
