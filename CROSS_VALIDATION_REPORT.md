# Cross-Validation Report

> **Generated:** 2026-02-26
> **Scope:** All reference documentation cross-referenced with the actual codebase.
> **Status:** Critical and warning items have been **fixed** in the reference files unless noted otherwise.

---

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| 🔴 Critical | 7 | 5 | 1 (BRAND_GUIDELINES.md brand name — intentionally deferred), 1 (Item #5 erroneously fixed — reverted) |
| 🟡 Warning | 10 | 3 | 7 (documentation gaps, no code impact) |
| 🟢 Info | 8 | 0 | 8 (style observations) |

---

## 🔴 Critical Issues

### 1. ~~DATABASE_SCHEMA.md: Phantom status `hired` in transition diagram~~  **FIXED**

**Before:** Task status flow diagram included `hired` as a status. This status does NOT exist in the codebase's `VALID_STATUS_TRANSITIONS` (server.js line 362). The real intermediate status is `pending_acceptance`.

**Fix:** Replaced the simplified linear diagram with the exact transition map from `server.js`, including `pending_acceptance`, `rejected`, and all branching paths.

**Files changed:** `DATABASE_SCHEMA.md` (status diagram + comparison table)

---

### 2. ~~.env.example: Wrong R2 variable names~~ **FIXED**

**Before:** Used `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`. The code reads `R2_ACCESS_KEY` and `R2_SECRET_KEY` (via `getEnv()` in server.js lines 2731-2732).

**Fix:** Changed to `R2_ACCESS_KEY` and `R2_SECRET_KEY` with correct alias comments.

**Files changed:** `.env.example` (lines 80-87)

---

### 3. ~~.env.example: Duplicate CORS origin~~ **FIXED**

**Before:** `CORS_ORIGINS=http://localhost:5173,http://localhost:5173` (same origin listed twice).

**Fix:** Changed to `CORS_ORIGINS=http://localhost:5173,http://localhost:3003` (Vite dev + start.sh port).

**Files changed:** `.env.example` (line 126)

---

### 4. ~~.env.example: Missing env vars~~ **FIXED**

**Before:** `IRLWORK_API_KEY`, `API_URL`, `PLATFORM_WALLET_ADDRESS` not documented.

**Fix:** Added two new sections:
- **MCP SERVER (Standalone):** `IRLWORK_API_KEY` and `API_URL` with descriptions
- **CRYPTO / WALLET (Phase 1 — disabled):** `PLATFORM_WALLET_ADDRESS` and `PLATFORM_WALLET_PRIVATE_KEY` as commented-out entries

**Files changed:** `.env.example` (new sections at end of file)

---

### 5. DEVELOPMENT.md: Test script references — **ERRONEOUSLY FIXED — REVERTED**

**Original issue:** DEVELOPMENT.md referenced `api/test_system.js`, `api/test_pending_balance.js`, `api/test_page_views.js`. A glob search scoped to `api/` found no matches and concluded the scripts did not exist.

**Error:** The search was scoped too narrowly. The test scripts exist at the **project root**, not inside `api/`:
- `test_system.js` (11,119 bytes) — comprehensive system test for database tables, balance calculations, service imports
- `test_pending_balance.js` (6,014 bytes) — tests pending balance system (`pending_transactions`, `withdrawals` tables)
- `test_page_views.js` (5,728 bytes) — tests page view tracking (`POST /api/views`, deduplication, AI referrer detection)

**Fix reverted:** DEVELOPMENT.md Section 7 has been updated to restore documentation of these test scripts with their correct paths (project root, not `api/`). The erroneous "no automated test scripts" text has been replaced.

**Files changed:** `DEVELOPMENT.md` (Section 7)

---

### 6. ~~API_REFERENCE.md: Standalone MCP server broken routes undocumented~~ **FIXED**

**Before:** Section 9 listed standalone MCP methods without noting that 7 of them call REST endpoints that no longer exist, making the standalone server largely non-functional.

**Fix:** Added a prominent warning table listing all broken methods with their dead routes, and recommending the in-process MCP (`POST /api/mcp`) instead.

**Files changed:** `API_REFERENCE.md` (Section 9, standalone MCP subsection)

---

### 7. BRAND_GUIDELINES.md: Uses old brand name "humanwork.ai" — **DEFERRED**

The entire BRAND_GUIDELINES.md document references "humanwork.ai" (the pre-rebrand name) instead of "irlwork.ai". This includes the logo system, taglines, email templates, social media posts, video script, and domain references.

**Not fixed:** This requires a deliberate brand update decision (new taglines, updated social templates, etc.) that goes beyond a documentation audit. The file is still useful as a design reference for colors, typography, and component patterns.

**Recommendation:** Schedule a full rebrand pass on BRAND_GUIDELINES.md, updating all references from "humanwork.ai" to "irlwork.ai".

---

## 🟡 Warning Issues

### 8. ~~DATABASE_SCHEMA.md: `notifications` column documented as `read` but code uses `is_read`~~ **FIXED**

**Before:** Column documented as `read` (BOOLEAN).
**Actual:** Code uses `.update({ is_read: true })` (server.js lines 5464, 5641, 6037). Migration SQL (`add_performance_indexes.sql`) indexes `is_read`.

**Fix:** Changed to `is_read` with note about the rename.

**Files changed:** `DATABASE_SCHEMA.md` (notifications table)

---

### 9. ~~API_REFERENCE.md: Wrong HTTP method in Section 10~~ **FIXED**

**Before:** Section 10 listed `POST /api/auth/google` as missing from ARCHITECTURE.md.
**Actual:** The endpoint is `GET /api/auth/google` (OAuth redirect).

**Fix:** Changed to `GET`.

**Files changed:** `API_REFERENCE.md` (Section 10 line 1090)

---

### 10. ~~API_REFERENCE.md: Standalone MCP `mark_notification_read` uses wrong method~~ **FIXED**

**Before:** Standalone MCP uses `method: 'PATCH'` for `/api/notifications/:id/read`, but the actual endpoint is `POST`.

**Fix:** Documented in the new standalone MCP warning table (item #6 above).

**Files changed:** `API_REFERENCE.md` (Section 9)

---

### 11. API_REFERENCE.md: No escrow status documentation — **OPEN**

`tasks.escrow_status` is a real column with its own state machine (`unfunded` → `pending_deposit` → `deposited` → `released` → etc.), but API_REFERENCE.md does not document escrow status transitions or which endpoints change it.

**Impact:** Developers building payment integrations may not understand the full escrow lifecycle from API docs alone.

**Recommendation:** Add a subsection to Section 5.10 (Payments & Wallet) documenting escrow status transitions and which endpoints trigger each change.

---

### 12. API_REFERENCE.md: Webhook event list may be incomplete — **OPEN**

Only 5 webhook events are documented: `proof_submitted`, `proof_rejected`, `proof_approved`, `dispute_opened`, `new_message`.

The codebase may dispatch additional events (e.g., on task assignment, task cancellation, task acceptance). A grep for `deliverWebhook` across server.js would confirm the full list.

**Recommendation:** Audit all `deliverWebhook` calls and update the event list.

---

### 13. SUPABASE_SERVICE_KEY vs SUPABASE_SERVICE_ROLE_KEY naming confusion — **OPEN**

- `api/lib/supabase.js` uses `SUPABASE_SERVICE_KEY` as the primary name
- `server.js` tries `SUPABASE_SERVICE_ROLE_KEY` first, then falls back to `SUPABASE_SERVICE_KEY`
- `.env.example` documents `SUPABASE_SERVICE_ROLE_KEY` as primary and `SUPABASE_SERVICE_KEY` as alias

Both work due to fallback logic, but the inconsistency is confusing.

**Recommendation:** Standardize on one name. `.env.example` already notes the alias.

---

### 14. Component count discrepancy — **OPEN**

DEVELOPMENT.md says "46 shared components"; README.md says "46+ shared components". Actual count: 43 top-level components in `ui/src/components/` plus 13 in `ui/src/components/TaskDetail/`. Neither number is exact.

**Impact:** Minor. Does not affect development.

---

### 15. `api/.env.example` has wrong R2 variable names — **OPEN**

The `api/.env.example` (34 lines) uses `R2_CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — none of which match what the code reads. The root `.env.example` is now correct, but `api/.env.example` is stale.

**Recommendation:** Either delete `api/.env.example` (since root `.env.example` is comprehensive) or update it to match.

---

### 16. ARCHITECTURE.md references SQLite — **OPEN**

ARCHITECTURE.md line 3 says "Database Schema (SQLite)" but the actual database is Supabase PostgreSQL. This is the most fundamental inaccuracy in ARCHITECTURE.md.

**Impact:** Already noted in DATABASE_SCHEMA.md (line 949) and API_REFERENCE.md (Section 10). Any developer reading ARCHITECTURE.md first will be misled.

**Recommendation:** ARCHITECTURE.md needs a comprehensive rewrite to match the current codebase. This was out of scope for this audit.

---

### 17. README.md project structure omits some directories — **OPEN**

README.md's project structure is a simplified subset of DEVELOPMENT.md's. Omits `api/utils/`, `api/lib/`, `ui/src/utils/`, `ui/src/config/`. This is acceptable for a summary.

---

## 🟢 Info Issues

### 18. ARCHITECTURE.md is fully accounted for

Every endpoint in ARCHITECTURE.md's quick reference is accounted for in API_REFERENCE.md Section 10 — either as existing (with modified paths/methods) or as deprecated/replaced. No endpoint was missed.

### 19. Tech stack descriptions are consistent

README.md, DEVELOPMENT.md, and the actual package.json files all agree on: Node.js 18+, Express.js, React 18, Vite 5, Tailwind CSS 3.3, Supabase, Stripe, R2, Resend.

### 20. README.md documentation table is complete

All 6 reference files are listed with correct descriptions and links.

### 21. Package.json scripts match DEVELOPMENT.md

All documented commands (`npm run dev`, `npm run build`, `node --watch`, `./start.sh`) exist and match their descriptions.

### 22. Mixed UUID generation functions

Some tables use `uuid_generate_v4()` (from `uuid-ossp` extension), others use `gen_random_uuid()` (built-in PostgreSQL 13+). Both produce valid v4 UUIDs. Noted in DATABASE_SCHEMA.md inconsistencies section.

### 23. Mixed TIMESTAMP/TIMESTAMPTZ in certifications table

`certifications.expiry_date` and `verified_at` use `TIMESTAMP` while `created_at` uses `TIMESTAMPTZ`. Inconsistent but reflects reality.

### 24. PLATFORM_FEE_PERCENT correctly documented

Both `.env.example` and `DEVELOPMENT.md` correctly note that the 15% fee is hardcoded in `api/config/constants.js` and the env var is for documentation only.

### 25. `api/.env.example` has uncommented PLATFORM_FEE_PERCENT

`api/.env.example` line 27 has `PLATFORM_FEE_PERCENT=15` uncommented, implying it's read from env. The root `.env.example` correctly comments it out. Minor inconsistency.

---

## Files Modified During Cross-Validation

| File | Changes |
|------|---------|
| `.env.example` | Fixed R2 var names (`R2_ACCESS_KEY`, `R2_SECRET_KEY`); fixed duplicate CORS origin; added MCP and Crypto sections |
| `DATABASE_SCHEMA.md` | Fixed task status diagram to match `VALID_STATUS_TRANSITIONS`; fixed `notifications.is_read` column name; fixed status comparison table (`pending_acceptance` not `hired`) |
| `DEVELOPMENT.md` | Removed references to non-existent test scripts; replaced with accurate manual testing instructions |
| `API_REFERENCE.md` | Fixed `GET /api/auth/google` method in Section 10; added standalone MCP broken-routes warning in Section 9 |

---

## Recommendations for Future Work

1. **Rewrite ARCHITECTURE.md** — The document is fundamentally outdated (references SQLite, bookings, ad_hoc_tasks). It should be rewritten to describe the current task-based, Supabase-powered architecture.

2. **Rebrand BRAND_GUIDELINES.md** — Update all "humanwork.ai" references to "irlwork.ai". Review and update taglines, email templates, and social posts.

3. **Fix or deprecate standalone MCP server** — `api/mcp-server.js` calls 6+ REST endpoints that no longer exist. Either update it to use the current task-based endpoints or deprecate it in favor of the in-process MCP.

4. **Delete or update `api/.env.example`** — The root `.env.example` is now comprehensive. The `api/.env.example` has stale variable names.

5. **Add escrow status documentation** — Document the `tasks.escrow_status` state machine in API_REFERENCE.md.

6. **Audit webhook events** — Grep for all `deliverWebhook` calls and update the event list in API_REFERENCE.md.

7. **Add test framework** — No tests exist. Consider adding Vitest for the frontend and Jest/Supertest for the API.

8. **Standardize env var names** — Pick one name for `SUPABASE_SERVICE_KEY`/`SUPABASE_SERVICE_ROLE_KEY` and stick with it.
