# Dispute System Testing Guide

## Prerequisites
1. Start the API server with proper Supabase credentials
2. Have test users: one agent and one human
3. Have a completed task to test disputes on

## Test Scenario: Complete Dispute Flow

### Step 1: Setup - Create and Complete a Task
```bash
# 1. Agent creates a task
POST /api/tasks
{
  "title": "Test Task for Dispute",
  "description": "Test task",
  "budget": 50,
  "category": "delivery"
}

# 2. Human accepts and completes the task
POST /api/tasks/:task_id/accept
POST /api/tasks/:task_id/complete
{
  "proof_description": "Task completed successfully"
}

# 3. Agent approves the task (payment goes to pending with 48hr window)
POST /api/tasks/:task_id/approve
```

**Expected Result:** Payment created with:
- `status: 'pending'`
- `dispute_window_closes_at`: 48 hours from now
- Human notified about pending payment

### Step 2: File a Dispute (Within 48 Hours)
```bash
# Agent files dispute
curl -X POST http://localhost:3002/api/disputes \
  -H "Authorization: Bearer AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "TASK_UUID",
    "reason": "Work was incomplete - missing key deliverables as specified",
    "category": "incomplete",
    "evidence_urls": ["https://example.com/evidence.jpg"]
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "dispute": {
    "id": "dispute-uuid",
    "task_id": "task-uuid",
    "payout_id": "payout-uuid",
    "filed_by": "agent-uuid",
    "filed_against": "human-uuid",
    "reason": "Work was incomplete...",
    "category": "incomplete",
    "status": "open",
    "created_at": "2024-..."
  },
  "message": "Dispute filed successfully. Payment has been frozen pending review."
}
```

**Side Effects:**
- ✅ Payout status changed from `pending` to `frozen`
- ✅ Worker receives notification: "Task [title] is under review. $XX.XX is on hold."
- ✅ Agent receives notification: "Your dispute has been submitted for review."
- ✅ Agent's `total_disputes_filed` incremented

### Step 3: View Disputes
```bash
# List all disputes for authenticated user
curl http://localhost:3002/api/disputes \
  -H "Authorization: Bearer TOKEN"

# View specific dispute details
curl http://localhost:3002/api/disputes/DISPUTE_UUID \
  -H "Authorization: Bearer TOKEN"
```

**Expected Result:**
- Agent can see disputes they filed
- Worker can see disputes filed against them
- Includes full task and payout details

### Step 4: Resolve Dispute (Admin/Arbiter)
```bash
# Scenario A: Approve dispute (agent wins, gets refund)
curl -X POST http://localhost:3002/api/disputes/DISPUTE_UUID/resolve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "approved",
    "resolution_notes": "Evidence supports agent claim. Work was incomplete.",
    "refund_agent": true
  }'

# Scenario B: Reject dispute (worker wins, payment released)
curl -X POST http://localhost:3002/api/disputes/DISPUTE_UUID/resolve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "rejected",
    "resolution_notes": "Work meets agreed standards. Releasing payment to worker."
  }'
```

**Expected Results:**

**If Approved (Agent Wins):**
- ✅ Dispute status → `resolved`
- ✅ Payout status → `refunded`
- ✅ Task escrow_status → `refunded`
- ✅ Agent notified: "Your dispute was approved. A refund has been issued."
- ✅ Worker notified: "Dispute resolved against you. Payment withheld."

**If Rejected (Worker Wins):**
- ✅ Dispute status → `resolved`
- ✅ Payout status → `available` (funds released)
- ✅ Worker notified: "Dispute resolved in your favor. Payment released."
- ✅ Agent notified: "Dispute resolved in favor of the worker."

## Edge Cases to Test

### Test 1: Dispute After 48-Hour Window
```bash
# Try to file dispute after 48 hours have passed
POST /api/disputes
{
  "task_id": "old-task-uuid",
  "reason": "Late dispute",
  "category": "incomplete"
}
```
**Expected:** `400 Error - "Dispute window has closed. You had 48 hours..."`

### Test 2: Duplicate Dispute
```bash
# Try to file second dispute on same task
POST /api/disputes
{
  "task_id": "already-disputed-task-uuid",
  "reason": "Another issue",
  "category": "poor_quality"
}
```
**Expected:** `400 Error - "A dispute already exists for this task"`

### Test 3: Non-Agent Files Dispute
```bash
# Human tries to file dispute (only agents can file)
POST /api/disputes (with HUMAN_TOKEN)
```
**Expected:** `403 Error - "Only the task agent can file a dispute"`

### Test 4: Dispute on Incomplete Task
```bash
# Try to dispute a task that's still in progress
POST /api/disputes
{
  "task_id": "in-progress-task-uuid",
  "reason": "Not ready",
  "category": "incomplete"
}
```
**Expected:** `400 Error - "Can only dispute completed tasks"`

## Dispute Categories
- `incomplete` - Work not finished as agreed
- `poor_quality` - Below expected standards
- `no_show` - Worker didn't show up
- `wrong_task` - Different task completed than agreed
- `other` - Other reason (specify in reason field)

## Database Verification Queries

### Check payout status after dispute filed:
```sql
SELECT id, task_id, status, dispute_window_closes_at
FROM payouts
WHERE task_id = 'TASK_UUID';
```

### Check dispute record:
```sql
SELECT d.*, t.title as task_title, p.status as payout_status
FROM disputes d
JOIN tasks t ON d.task_id = t.id
JOIN payouts p ON d.payout_id = p.id
WHERE d.id = 'DISPUTE_UUID';
```

### Check notifications sent:
```sql
SELECT user_id, type, title, message, created_at
FROM notifications
WHERE link LIKE '%TASK_UUID%'
ORDER BY created_at DESC;
```

## Success Criteria
✅ Disputes can only be filed within 48 hours of payment release
✅ Payment automatically freezes when dispute is filed
✅ Duplicate disputes are prevented
✅ Both parties receive notifications at each stage
✅ Admin can resolve disputes with proper outcomes
✅ Refunds or releases happen based on resolution
✅ Agent's dispute count increments correctly
✅ Access control prevents unauthorized dispute viewing

## Notes
- Current implementation has no admin role check on `/api/disputes/:id/resolve`
- You may want to add admin authentication before production use
- Consider adding dispute appeal functionality in future iterations
