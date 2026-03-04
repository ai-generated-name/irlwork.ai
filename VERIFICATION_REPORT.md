# VERIFICATION REPORT — irlwork.ai Final Regression Check

**Date:** 2026-03-01
**Branch:** claude/unruffled-cerf
**Tracks Verified:** A (Backend Lifecycle), B (Frontend UX), C (Auth & Email), D (MCP Parity)

---

## Summary

| Metric | Count |
|--------|-------|
| Total checks performed | 87 |
| Passed | 62 |
| Failed | 18 |
| Warnings | 7 |

---

## Phase 1: Build & Compile Verification

| Check | Status |
|-------|--------|
| `npm run build` (UI) | PASS — 0 errors, 35 assets |
| Build warnings | WARNING — 2 chunks >500KB (index-DKgAnobw.js: 809KB, OverviewTab: 361KB) |
| API dependencies install | PASS |
| UI dependencies install | PASS |

---

## Phase 2: Status Machine Integrity

### Valid Transitions — PASS (with caveats)

VALID_STATUS_TRANSITIONS defined at `api/server.js:453-464`. Postgres trigger backup at `db/migrations/002_escrow_and_cancellation.sql:103-127`.

### Atomic Safety

| Endpoint | Atomic `.eq('status', ...)` | Status |
|----------|----------------------------|--------|
| POST /api/tasks/:id/assign | `.eq('status', 'open')` | PASS |
| POST /api/tasks/:id/accept | `.eq('status', 'pending_acceptance')` | PASS |
| POST /api/tasks/:id/start | `.eq('status', 'assigned')` | PASS |
| POST /api/tasks/:id/submit-proof | **MISSING** — only `.eq('id', taskId)` | **FAIL** |
| POST /api/tasks/:id/approve | `.in('status', ['pending_review', 'disputed'])` | PASS |
| POST /api/tasks/:id/reject | `.eq('status', 'pending_review')` | PASS |
| POST /api/tasks/:id/dispute | `.in('status', [...])` | PASS |
| POST /api/tasks/:id/cancel | `.in('status', [...])` | PASS |

### MCP Atomic Safety

| Handler | Atomic Pattern | Status |
|---------|----------------|--------|
| assign_human | **MISSING** — only `.eq('id', task_id)` | **FAIL** |
| approve_task | `.in('status', ['pending_review', 'disputed'])` | PASS |
| dispute_task | Does NOT update task status (creates record only) | **FAIL** |

### Other Findings

| Issue | Severity |
|-------|----------|
| `validateStatusTransition()` defined but never called (dead code) | LOW |
| JS allows `assigned→open` and `in_progress→open` but Postgres trigger blocks them | MEDIUM |

---

## Phase 3: Data Privacy — Instructions Field

| Check | Status |
|-------|--------|
| Task creation accepts `description` + `instructions` separately | PASS |
| Browse endpoint (GET /api/tasks) excludes `instructions` from SELECT | PASS |
| Task detail (GET /api/tasks/:id) strips instructions for non-participants | PASS |
| **MCP `get_task_details`** — returns ALL fields including instructions, **NO auth check** | **FAIL — CRITICAL** |
| MCP `my_tasks` — gated to agent_id | PASS |
| MCP `assign_human` — doesn't return instructions | PASS |
| Frontend TaskHeader — trusts backend stripping | PASS |
| Email templates — no instructions included | PASS |
| Console logs — no instructions leaked | PASS |

---

## Phase 4: Payment Flow Integrity

| Check | Status | Notes |
|-------|--------|-------|
| Task creation verifies payment method | PASS | 402 if no card/wallet |
| Assignment creates auth hold | **FAIL** | Uses `chargeAgentForTask()` (immediate charge) instead of `authorizeEscrow()` (manual-capture) |
| Start work captures hold | PASS | But no-op since funds already captured at assignment |
| Approval releases escrow | PASS | Calls `releasePaymentToPending()` |
| Auto-approve (48h) | **FAIL** | No auto-approve background job exists |
| Cancellation tiers | PASS | T1-T3 refund, T4-T5 blocked |
| Dispute blocks auto-approve | PASS | Balance promoter checks for open disputes |
| Platform fee deducted | PASS | Tier-based fees (5-15%) correctly applied |
| Money in cents (no floats) | PASS | Integer cents throughout; `Math.round()` at boundaries |

---

## Phase 5: Auth Flow Integrity

| Check | Status | Notes |
|-------|--------|-------|
| Signup creates user | PASS | bcrypt hashed, BCRYPT_ROUNDS=12 |
| Signup sends verification email | **FAIL** | Users auto-marked `verified: true` — no email verification required |
| Verification email endpoint | PASS | POST /api/auth/send-verification works |
| Verify email endpoint | PASS | POST /api/auth/verify-email with code expiry |
| Login with valid credentials | PASS | bcrypt comparison + legacy hash auto-migration |
| Login with invalid credentials | PASS | Returns 401 |
| Login rate limiting | PASS | 10 attempts / 15 min per IP |
| Password reset endpoint | **FAIL** | No custom forgot-password/reset-password endpoints — relies on Supabase built-in |
| 401 interceptor | PASS | AuthContext.jsx auto-logouts on 401 |
| ReturnTo redirect | PASS | Allowlisted to /dashboard paths only |
| Logout clears session | PASS | Clears state + Sentry context |
| Protected routes redirect | PASS | Redirects to /auth |
| Admin route guards | PASS | ADMIN_USER_IDS check with 403 |
| **Email template XSS** | **FAIL — CRITICAL** | No `sanitizeForEmail()` function exists; 5 inline HTML templates inject user data without escaping |

---

## Phase 6: Frontend Page Health

| Route | Loading | Error | Empty | Title | Navigation |
|-------|---------|-------|-------|-------|------------|
| `/` (Landing) | PASS | N/A | N/A | **FAIL** | **FAIL** |
| `/auth` | PASS | PASS | N/A | **FAIL** | PASS |
| `/onboard` | PASS | PASS | N/A | **FAIL** | PASS |
| `/dashboard/working` | PASS | PASS | PASS | **FAIL** | PASS |
| `/dashboard/hiring` | PASS | PASS | PASS | **FAIL** | PASS |
| `/tasks/:id` | PASS | PASS | PASS | **FAIL** | PASS |
| `/humans/:id` | PASS | PASS | N/A | **FAIL** | PASS |
| `/browse` | PASS | PASS | PASS | **FAIL** | PASS |
| `/premium` | PASS | PASS | N/A | **FAIL** | PASS |
| `/connect-agent` | PASS | N/A | N/A | **FAIL** | PASS |
| `/mcp` | PASS | N/A | N/A | **FAIL** | PASS |
| Static pages | PASS | N/A | N/A | **FAIL** | PASS |

**Key Findings:**
- **No pages set `document.title`** — all pages show generic browser default title
- **26+ `window.location.href` uses** instead of SPA routing — causes full page reloads
- No dead-end pages found (all have navigation back)

---

## Phase 7: MCP-REST Parity

| MCP Tool | REST Endpoint | Validation | Guards | Response | Notifications | Webhooks | Email | Overall |
|----------|---------------|-----------|--------|----------|--------------|----------|-------|---------|
| create_posting | POST /api/tasks | **FAIL** | PASS | PASS | N/A | N/A | N/A | **FAIL** |
| assign_human | POST /api/tasks/:id/assign | **FAIL** | PASS | PARTIAL | PASS | PASS | N/A | **FAIL** |
| approve_task | POST /api/tasks/:id/approve | PASS | PASS | PASS | PASS | PASS | DIFF | PARTIAL |
| dispute_task | POST /api/tasks/:id/dispute | PASS | **FAIL** | PASS | PARTIAL | PASS | DIFF | **FAIL** |
| send_message | POST /api/messages | PASS | PASS | PASS | PASS | PASS | SAME | PASS |
| rate_task | POST /api/tasks/:id/rate | PASS | PASS | PASS | PASS | N/A | DIFF | PARTIAL |
| complete_task | N/A (MCP-only) | PASS | PASS | PASS | PASS | MISSING | MISSING | PARTIAL |

**Critical MCP Gaps:**
1. `create_posting` skips subscription tier limit checks (free tier: 5/month)
2. `assign_human` doesn't validate that human has applied to task
3. `dispute_task` only allows agents to dispute (REST allows both agent AND human)
4. Missing MCP methods: `reject_task`, `start_work`, `cancel_task`

---

## Phase 8: Notification Completeness

| Lifecycle Event | In-App | Email | Webhook | Status |
|----------------|--------|-------|---------|--------|
| Task created | - | - | - | **MISSING** |
| Worker applies | PASS | PASS* | PASS | PARTIAL (*unsanitized HTML) |
| Agent assigns | PASS | - | PASS | PARTIAL (no email) |
| Rejected applicants | - | - | - | **MISSING** |
| Worker starts | PASS | - | PASS | PARTIAL |
| Proof submitted | PASS | - | PASS | PARTIAL |
| Proof rejected | PASS | - | PASS | PARTIAL |
| Proof approved | PASS | PASS* | PASS | COMPLETE (*unsanitized) |
| Auto-approve (48h) | - | - | - | **DISABLED** |
| Payment released | PASS | - | N/A | PARTIAL |
| Dispute opened | PASS | PASS* | PASS | COMPLETE (*unsanitized) |
| Dispute resolved | ? | ? | ? | UNKNOWN |

---

## Phase 9: Email Security

| Check | Status |
|-------|--------|
| `sanitizeForEmail()` function exists | **FAIL** — does not exist |
| Inline HTML templates with user data | **FAIL** — 5 locations with unsanitized interpolation |
| React-based email templates (auto-escaped) | PASS — 6 templates using @react-email/render |
| Email links point to production domain | PASS |
| Instructions field in emails | PASS — not included |
| Email throttling | PASS — 60-second per user |
| Email preferences check | PASS |

**Vulnerable inline HTML locations:**
1. `server.js:2758` — `${user.name}` in apply notification email
2. `server.js:4403` — `${task.title}` in approval email
3. `server.js:4719` — `${task.title}` and `${reason}` in dispute email
4. `server.js:9229` — `${user.name}` and `${task.title}` in accept email
5. `server.js:9330` — `${user.name}` and `${task.title}` in accept email

---

## Phase 10: Security Hardening

| Check | Status | Notes |
|-------|--------|-------|
| Hardcoded credentials | PASS | No production secrets in code |
| .env in .gitignore | PASS | Properly ignored |
| VITE_ vars expose secrets | PASS | Only public values |
| CORS configured | PASS | Allowlist from env var |
| Stripe webhook signature | PASS | `constructEvent()` enforced |
| Admin endpoints require admin | PASS | ADMIN_USER_IDS middleware |
| File upload validation | PASS | Extensions, MIME, magic bytes |
| eval()/Function() | PASS | None found |
| SQL injection (LIKE queries) | **FAIL** | 2 endpoints use unescaped LIKE patterns (`server.js:2122`, `5520`); `escapeLike()` exists elsewhere (`server.js:7728`) but not applied here |
| Rate limiting | PASS | Global (300/min auth, 100/min unauth), MCP (60/min), login (10/15min) |

---

## Phase 11: Cross-Track Conflict Check

| Track Pair | Status | Notes |
|-----------|--------|-------|
| A + B | MINOR CONFLICT | Frontend doesn't handle 409 status codes from new validation — falls back to generic error display |
| A + C | NO CONFLICT | Auth endpoints unaffected by status machine changes |
| B + C | NO CONFLICT | No route duplicates; `/forgot-password`, `/reset-password` not added |
| All + D | MODERATE CONFLICT | MCP missing `reject_task`, `start_work`, `cancel_task` methods; error response field inconsistency (`error` vs `code`) |

---

## Failures

```
FAIL-001: submit-proof missing atomic status check
Phase: 2 (Status Machine)
What's wrong: POST /api/tasks/:id/submit-proof uses .eq('id', taskId) without
  .eq('status', 'in_progress'), vulnerable to race condition
Root cause: api/server.js:4155-4162
Fix: Add .eq('status', 'in_progress') to the update query
Severity: P1
Track responsible: Track A

FAIL-002: MCP assign_human missing atomic status check
Phase: 2 (Status Machine)
What's wrong: MCP assign_human uses .eq('id', task_id) without .eq('status', 'open'),
  vulnerable to concurrent assignment race condition
Root cause: api/server.js:6090-6105
Fix: Add .eq('status', 'open') to the update query
Severity: P1
Track responsible: Track D

FAIL-003: MCP dispute_task incomplete implementation
Phase: 2 (Status Machine)
What's wrong: MCP dispute_task creates dispute record but does NOT update task status
  to 'disputed' (unlike REST which does both)
Root cause: api/server.js:6327-6390
Fix: Add task status update with atomic .in('status', [...]) precondition
Severity: P1
Track responsible: Track D

FAIL-004: MCP get_task_details leaks instructions
Phase: 3 (Data Privacy)
What's wrong: MCP get_task_details returns ALL task fields including private instructions
  without checking if caller is agent or assigned worker
Root cause: api/server.js:5825-5839
Fix: Add authorization check, strip instructions for non-participants
Severity: P0 — CRITICAL SECURITY
Track responsible: Track D

FAIL-005: No email HTML sanitization
Phase: 9 (Email Security)
What's wrong: 5 inline HTML email templates inject user-controlled data (names, titles,
  dispute reasons) without HTML entity escaping. No sanitizeForEmail() function exists.
Root cause: api/server.js:2758, 4403, 4719, 9229, 9330
Fix: Add escapeHtml() function and apply to all user data in email templates
Severity: P0 — CRITICAL SECURITY
Track responsible: Track C

FAIL-006: Stripe path uses immediate charge, not auth hold
Phase: 4 (Payment)
What's wrong: Assignment uses chargeAgentForTask() (immediate charge) instead of
  authorizeEscrow() (manual-capture hold). Agent is charged at assignment, not at work start.
Root cause: api/server.js:3153
Fix: Replace chargeAgentForTask() with authorizeEscrow() in assign flow
Severity: P1
Track responsible: Track A

FAIL-007: No auto-approve background job
Phase: 4 (Payment)
What's wrong: No 48-hour auto-approve mechanism exists. If agent never manually approves,
  task hangs in pending_review indefinitely.
Root cause: No job/cron found for auto-approval
Fix: Implement auto-approve background job (hourly check for pending_review > 48h)
Severity: P2
Track responsible: Track A

FAIL-008: Email verification not enforced on signup
Phase: 5 (Auth)
What's wrong: POST /api/auth/register/human sets verified: true immediately without
  requiring email verification
Root cause: api/server.js:1177-1178
Fix: Set verified: false, require email verification before full access
Severity: P2
Track responsible: Track C

FAIL-009: No password reset endpoints
Phase: 5 (Auth)
What's wrong: No custom /api/auth/forgot-password or /api/auth/reset-password endpoints.
  Relies entirely on Supabase built-in recovery.
Root cause: Missing endpoints
Fix: Implement password reset flow or document Supabase dependency
Severity: P2
Track responsible: Track C

FAIL-010: No document.title on any page
Phase: 6 (Frontend)
What's wrong: No pages set document.title dynamically. Browser tabs show generic title.
Root cause: All pages in ui/src/pages/
Fix: Add useEffect(() => { document.title = 'Page - irlwork.ai' }, []) to each page
Severity: P3
Track responsible: Track B

FAIL-011: window.location.href used instead of SPA routing
Phase: 6 (Frontend)
What's wrong: 26+ instances of window.location.href causing full page reloads instead
  of SPA navigation via React Router / onNavigate callbacks
Root cause: Multiple files (LandingPageV4, MyTasksPage, BrowsePage, HiringDashboard, etc.)
Fix: Replace window.location.href with onNavigate() callbacks
Severity: P3
Track responsible: Track B

FAIL-012: MCP create_posting bypasses subscription limits
Phase: 7 (MCP-REST Parity)
What's wrong: MCP create_posting does not check subscription tier posting limits
  (free tier: 5/month). REST POST /api/tasks enforces limits.
Root cause: api/server.js:5973-5987
Fix: Add subscription tier check matching REST endpoint (server.js:2391-2414)
Severity: P1
Track responsible: Track D

FAIL-013: MCP assign_human skips application check
Phase: 7 (MCP-REST Parity)
What's wrong: MCP assign_human does not verify human has applied to task.
  REST checks task_applications table.
Root cause: api/server.js:6052-6146
Fix: Add application verification matching REST (server.js:3048-3057)
Severity: P1
Track responsible: Track D

FAIL-014: MCP dispute_task blocks humans
Phase: 7 (MCP-REST Parity)
What's wrong: MCP dispute_task only allows agent_id to dispute. REST allows both
  agent AND human. Humans cannot dispute via MCP.
Root cause: api/server.js:6341
Fix: Add human_id check matching REST (server.js:4652-4654)
Severity: P1
Track responsible: Track D

FAIL-015: Missing MCP methods
Phase: 7 (MCP-REST Parity)
What's wrong: No MCP equivalents for: reject_task, start_work, cancel_task
Root cause: Missing case handlers in MCP switch block
Fix: Implement missing MCP methods with REST parity
Severity: P2
Track responsible: Track D

FAIL-016: Unescaped LIKE queries
Phase: 10 (Security)
What's wrong: GET /api/humans and MCP list_humans use unescaped LIKE patterns.
  escapeLike() function exists at server.js:7728 but not applied here.
Root cause: api/server.js:2122-2123, 5520-5522
Fix: Apply escapeLike() to category, city, state parameters
Severity: P2
Track responsible: Track D

FAIL-017: Missing notifications for task creation
Phase: 8 (Notifications)
What's wrong: No agent confirmation notification when task is created.
  No rejected applicant notifications when another worker is selected.
Root cause: POST /api/tasks endpoint, POST /api/tasks/:id/assign endpoint
Fix: Add createNotification() calls for these events
Severity: P3
Track responsible: Track D

FAIL-018: Frontend doesn't handle 409 status codes
Phase: 11 (Cross-track)
What's wrong: Backend returns 409 with error codes (task_not_open, max_revisions_reached,
  etc.) but frontend only checks res.ok — no 409-specific UX
Root cause: ui/src/components/ and ui/src/pages/ error handling
Fix: Add 409-specific error messaging in frontend API call handlers
Severity: P3
Track responsible: Track B
```

---

## Regressions

No regressions detected from the four-track fix cycle. All existing functionality verified as working. The failures listed above are **pre-existing issues** that the tracks did not address, or **incomplete implementations** within the tracks.

---

## Final Assessment

**Ready for production?** CONDITIONAL

### Must fix before production (P0):
1. **FAIL-004**: MCP `get_task_details` leaks private instructions — critical data privacy violation
2. **FAIL-005**: Email HTML injection — XSS via user names/task titles in 5 email templates

### Should fix before production (P1):
3. **FAIL-001**: submit-proof missing atomic check (race condition)
4. **FAIL-002**: MCP assign_human missing atomic check (race condition)
5. **FAIL-003**: MCP dispute_task doesn't update task status
6. **FAIL-006**: Stripe charges at assignment instead of auth hold
7. **FAIL-012**: MCP bypasses subscription limits
8. **FAIL-013**: MCP skips application validation
9. **FAIL-014**: MCP blocks humans from disputing

### Can defer (P2-P3):
10. FAIL-007 through FAIL-011, FAIL-015 through FAIL-018

---

## Fix Prompt

To fix all P0 and P1 issues in a single pass:

```
Fix the following 9 issues in api/server.js. Reference VERIFICATION_REPORT.md for details.

P0 CRITICAL:
1. MCP get_task_details (line ~5825): Add authorization check — if user is not
   task.agent_id or task.human_id, strip instructions + escrow fields from response
   (match the pattern at line 2561-2612).

2. Add escapeHtml() function and apply to ALL 5 inline email templates:
   - Line 2758: escapeHtml(user.name), escapeHtml(taskForApply.title)
   - Line 4403: escapeHtml(task.title)
   - Line 4719: escapeHtml(task.title), escapeHtml(reason)
   - Line 9229: escapeHtml(user.name), escapeHtml(task.title)
   - Line 9330: escapeHtml(user.name), escapeHtml(task.title)

P1:
3. POST /api/tasks/:id/submit-proof (line ~4162): Add .eq('status', 'in_progress')
   to the update query.

4. MCP assign_human (line ~6105): Add .eq('status', 'open') to the update query.

5. MCP dispute_task (line ~6327): Add task status update to 'disputed' with
   atomic .in('status', [...]) precondition (match REST at line 4668-4676).

6. MCP create_posting (line ~5973): Add subscription tier limit check
   (match REST at lines 2391-2414).

7. MCP assign_human (line ~6052): Add application validation check
   (match REST at lines 3048-3057).

8. MCP dispute_task (line ~6341): Allow human_id to dispute, not just agent_id
   (match REST at line 4652-4654).

9. Lines 2122-2123 and 5520-5522: Apply escapeLike() to LIKE query parameters.
```

---

## Manual QA Checklist

### SETUP
- [ ] Open https://www.irlwork.ai in Chrome
- [ ] Open DevTools console (watch for errors throughout)

### SIGNUP & VERIFY
- [ ] 1. Click "Sign Up"
- [ ] 2. Fill form, submit
- [ ] 3. Check email — verification received
- [ ] 4. Click link — redirected to dashboard
- [ ] 5. No console errors

### TASK CREATION (HIRING MODE)
- [ ] 6. Switch to Hiring Mode
- [ ] 7. Click "Create Task"
- [ ] 8. Fill: title, description, instructions (SEPARATE), budget, location, category
- [ ] 9. Submit — created, shows in "My Tasks"
- [ ] 10. View detail — both description and instructions visible (you're creator)

### TASK DISCOVERY (WORKING MODE)
- [ ] 11. Incognito window, create worker account
- [ ] 12. Browse tasks — task appears
- [ ] 13. View detail — ONLY description, NO instructions
- [ ] 14. Click "Apply" — submitted
- [ ] 15. Button changes/disables

### ASSIGNMENT
- [ ] 16. Agent account — notification received
- [ ] 17. View applicant, click "Assign"
- [ ] 18. Payment hold created
- [ ] 19. Status = assigned
- [ ] 20. Task gone from public browse

### WORK CYCLE
- [ ] 21. Worker account — notification received
- [ ] 22. View task — instructions NOW visible
- [ ] 23. "Start Work" — status = in_progress
- [ ] 24. Submit proof
- [ ] 25. Status = submitted / pending_review

### APPROVAL & PAYMENT
- [ ] 26. Agent — notification received
- [ ] 27. View proof, "Approve"
- [ ] 28. Payment releases
- [ ] 29. Status = completed / approved
- [ ] 30. Both can leave reviews

### PASSWORD RESET
- [ ] 31. Logout
- [ ] 32. "Forgot password?" on login
- [ ] 33. Enter email, submit
- [ ] 34. Check email — reset link
- [ ] 35. Set new password
- [ ] 36. Login with new password

### CANCELLATION
- [ ] 37. New task -> cancel before applications -> full refund
- [ ] 38. New task -> get application -> cancel -> refund + applicant notified
- [ ] 39. New task -> assign -> cancel before start -> refund + worker notified

### ERROR HANDLING
- [ ] 40. Clear auth token -> load dashboard -> redirects to login
- [ ] 41. Re-login -> returns to dashboard
- [ ] 42. Empty title on task creation -> validation error
- [ ] 43. Double-apply to same task -> prevented

### MOBILE
- [ ] 44. Open on phone / mobile emulation
- [ ] 45. Landing -> browse -> detail -> dashboard
- [ ] 46. Forms usable
- [ ] 47. No horizontal scroll
