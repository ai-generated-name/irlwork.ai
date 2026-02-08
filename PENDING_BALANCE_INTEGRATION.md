# Pending/Available Dual Balance System - Integration Guide

This guide explains how to integrate the 48-hour dispute window feature into your irlwork.ai application.

## 📋 Overview

The new system adds a **48-hour dispute window** between payment release and withdrawal availability:

- ✅ Worker completes task → Agent approves
- ⏱️ Payment goes to **pending balance** (48-hour hold)
- 🔄 Cron job auto-promotes to **available balance** after 48 hours
- 💰 Worker withdraws from **available balance** to their wallet

## 🗂️ Files Created

### 1. Database Migrations
- **`db/add_pending_transactions.sql`** - Main pending_transactions table
- **`db/add_withdrawals.sql`** - Withdrawals tracking table

### 2. Backend Services
- **`backend/services/paymentService.js`** - Payment release and balance calculation
- **`backend/services/balancePromoter.js`** - Cron service to promote pending → available
- **`backend/services/withdrawalService.js`** - Withdrawal processing

### 3. API Endpoints
- **`api/wallet-endpoints.js`** - New wallet endpoints (copy into server.js)

## 🚀 Step-by-Step Integration

### Step 1: Run Database Migrations

```bash
# Connect to your Supabase database and run:
cd /Users/raffertytruong/irlwork.ai/db

# Run these in order:
psql -h [your-supabase-host] -U postgres -d postgres -f add_pending_transactions.sql
psql -h [your-supabase-host] -U postgres -d postgres -f add_withdrawals.sql
```

**OR** use Supabase Dashboard SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `add_pending_transactions.sql` → Run
3. Copy contents of `add_withdrawals.sql` → Run

### Step 2: Update `release_payment` Logic in `api/server.js`

**Option A: Use the Payment Service (Recommended)**

Find the `release_payment` case in `api/server.js` (around line 683) and replace it with:

```javascript
case 'release_payment': {
  const { task_id, human_id } = params;

  try {
    const { releasePaymentToPending } = require('../backend/services/paymentService');
    const result = await releasePaymentToPending(
      supabase,
      task_id,
      human_id,
      user.id, // agent_id
      createNotification
    );

    res.json(result);
  } catch (error) {
    console.error('Payment release error:', error);
    res.status(400).json({ error: error.message });
  }
  break;
}
```

**Option B: Manual Integration**

If you prefer to keep the logic inline, here are the key changes:

1. **Remove the immediate USDC transfer** (lines 714-727)
2. **Add pending_transaction insert**:
   ```javascript
   const clearsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

   await supabase.from('pending_transactions').insert({
     id: uuidv4(),
     user_id: human_id,
     task_id,
     amount_cents: Math.round(netAmount * 100),
     status: 'pending',
     clears_at: clearsAt.toISOString()
   });
   ```
3. **Update notification message** to mention 48-hour hold
4. **Set payout status to 'pending'** instead of 'completed'

### Step 3: Start Balance Promoter Service

Add to the bottom of `api/server.js` (before `app.listen()`):

```javascript
// Start balance promoter service (promotes pending → available after 48 hours)
const { startBalancePromoter } = require('../backend/services/balancePromoter');
startBalancePromoter(supabase, createNotification);
```

### Step 4: Add Wallet Endpoints

Copy the endpoints from `api/wallet-endpoints.js` into `api/server.js`:

```javascript
// Add these imports at the top of server.js:
const { getWalletBalance } = require('../backend/services/paymentService');
const { processWithdrawal, getWithdrawalHistory } = require('../backend/services/withdrawalService');

// Add these endpoints (see wallet-endpoints.js for full code):
app.get('/api/wallet/balance', async (req, res) => { /* ... */ });
app.post('/api/wallet/withdraw', async (req, res) => { /* ... */ });
app.get('/api/wallet/withdrawals', async (req, res) => { /* ... */ });

// REPLACE existing /api/wallet/status with the new version
app.get('/api/wallet/status', async (req, res) => { /* ... */ });
```

### Step 5: Test the Integration

#### Test 1: Payment Release
```bash
# 1. Create and fund a task
# 2. Complete the task
# 3. Approve the task (release payment)
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "release_payment",
    "params": {
      "task_id": "TASK_UUID",
      "human_id": "WORKER_UUID"
    }
  }'

# Expected: Payment goes to pending_transactions with status='pending'
```

#### Test 2: Check Balance
```bash
curl http://localhost:3000/api/wallet/balance \
  -H "Authorization: Bearer WORKER_TOKEN"

# Expected response:
{
  "pending": 42.50,        // Funds in 48-hour hold
  "available": 0,          // No funds ready yet
  "total": 42.50,
  "transactions": [...]
}
```

#### Test 3: Wait 48 Hours (or manually promote)
```javascript
// For testing, manually promote pending to available:
await supabase
  .from('pending_transactions')
  .update({ status: 'available', cleared_at: new Date().toISOString() })
  .eq('status', 'pending');
```

#### Test 4: Withdraw
```bash
curl -X POST http://localhost:3000/api/wallet/withdraw \
  -H "Authorization: Bearer WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: USDC sent to worker wallet, pending_transactions marked 'withdrawn'
```

## 🎯 API Reference

### GET `/api/wallet/balance`
Get wallet balance breakdown.

**Response:**
```json
{
  "user_id": "uuid",
  "wallet_address": "0x...",
  "pending": 42.50,
  "available": 50.00,
  "total": 92.50,
  "pending_cents": 4250,
  "available_cents": 5000,
  "total_cents": 9250,
  "transactions": [
    {
      "id": "uuid",
      "amount": 42.50,
      "status": "pending",
      "created_at": "2024-01-15T10:00:00Z",
      "clears_at": "2024-01-17T10:00:00Z",
      "task_id": "uuid"
    }
  ]
}
```

### POST `/api/wallet/withdraw`
Request withdrawal from available balance.

**Request:**
```json
{
  "amount_cents": 5000  // Optional: omit to withdraw all available
}
```

**Response:**
```json
{
  "success": true,
  "amount": 50.00,
  "amount_cents": 5000,
  "tx_hash": "0x...",
  "wallet_address": "0x...",
  "transactions_withdrawn": 2,
  "message": "Withdrawal processed successfully"
}
```

### GET `/api/wallet/withdrawals`
Get withdrawal history.

**Response:**
```json
[
  {
    "id": "uuid",
    "amount": 50.00,
    "status": "completed",
    "tx_hash": "0x...",
    "created_at": "2024-01-17T10:00:00Z",
    "wallet_address": "0x..."
  }
]
```

### GET `/api/wallet/status`
Get comprehensive wallet status (updated endpoint).

**Response:**
```json
{
  "wallet_address": "0x...",
  "has_wallet": true,
  "currency": "USDC",
  "pending": 42.50,
  "available": 50.00,
  "total": 92.50,
  "pending_cents": 4250,
  "available_cents": 5000,
  "total_cents": 9250,
  "on_chain_balance": 100.00,
  "transactions": [...]
}
```

## 🔧 Configuration

### Environment Variables (unchanged)
```env
PLATFORM_WALLET_PRIVATE_KEY=your_private_key
BASE_RPC_URL=https://mainnet.base.org
USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### Balance Promoter Settings
Edit `backend/services/balancePromoter.js`:
```javascript
const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes (default)
// Change to check more/less frequently
```

### Dispute Window Duration
Default: 48 hours. To change, edit:
- `paymentService.js` line 51: `48 * 60 * 60 * 1000`
- Update to `24 * 60 * 60 * 1000` for 24 hours, etc.

## 📊 Database Schema Reference

### `pending_transactions` Table
```sql
id                  UUID PRIMARY KEY
user_id            UUID REFERENCES users(id)
task_id            UUID REFERENCES tasks(id)
amount_cents       INTEGER NOT NULL
status             VARCHAR(20)  -- 'pending', 'available', 'frozen', 'withdrawn'
created_at         TIMESTAMPTZ DEFAULT NOW()
clears_at          TIMESTAMPTZ NOT NULL
cleared_at         TIMESTAMPTZ
withdrawn_at       TIMESTAMPTZ
notes              TEXT
```

### `withdrawals` Table
```sql
id                  UUID PRIMARY KEY
user_id            UUID REFERENCES users(id)
amount_cents       INTEGER NOT NULL
wallet_address     VARCHAR(64)
tx_hash            VARCHAR(128)
status             VARCHAR(20)  -- 'pending', 'completed', 'failed'
transaction_ids    UUID[]       -- Array of pending_transaction IDs
created_at         TIMESTAMPTZ DEFAULT NOW()
completed_at       TIMESTAMPTZ
error_message      TEXT
```

## 🔍 Monitoring & Admin

### Check System Status
```javascript
// Get balance promoter status
const { getStatus } = require('./backend/services/balancePromoter');
console.log(getStatus());
// { isRunning: true, pollInterval: 900000, pollIntervalSeconds: 900 }
```

### Admin Stats Endpoint
```bash
GET /api/admin/pending-stats
Authorization: Bearer ADMIN_TOKEN

Response:
{
  "pending": { "count": 5, "total": 250.00 },
  "available": { "count": 3, "total": 150.00 },
  "frozen": { "count": 0, "total": 0 },
  "grand_total": 400.00
}
```

### Manual Operations (for testing/debugging)
```javascript
// Manually promote a transaction
await supabase
  .from('pending_transactions')
  .update({ status: 'available', cleared_at: new Date().toISOString() })
  .eq('id', 'TRANSACTION_ID');

// Freeze a transaction (dispute filed)
await supabase
  .from('pending_transactions')
  .update({ status: 'frozen', notes: 'Dispute filed by agent' })
  .eq('id', 'TRANSACTION_ID');

// Get all pending transactions clearing in next hour
const { data } = await supabase
  .from('pending_transactions')
  .select('*')
  .eq('status', 'pending')
  .lt('clears_at', new Date(Date.now() + 60 * 60 * 1000).toISOString());
```

## 🐛 Troubleshooting

### Issue: Payments stuck in pending
**Check:**
1. Is balancePromoter running? Check logs for `[BalancePromoter] Starting...`
2. Is `clears_at` in the past? `SELECT * FROM pending_transactions WHERE status='pending' AND clears_at < NOW()`
3. Manually promote for testing: Update status to 'available'

### Issue: Withdrawal fails
**Check:**
1. User has `wallet_address` set
2. User has `status='available'` funds
3. Platform wallet has sufficient USDC
4. RPC endpoint is working

### Issue: Balance mismatch
**Check:**
```sql
-- Get user's balance breakdown
SELECT
  status,
  COUNT(*) as count,
  SUM(amount_cents) / 100.0 as total_usd
FROM pending_transactions
WHERE user_id = 'USER_ID'
GROUP BY status;
```

## 🎉 Summary

After integration, your payment flow will be:

1. **Old Flow:** Task approved → USDC sent immediately → Worker has funds
2. **New Flow:** Task approved → Pending balance (48h) → Available balance → Worker withdraws → USDC sent

This gives agents a 48-hour window to file disputes before workers can withdraw their earnings.

## 📚 Next Steps

1. **Frontend Updates:**
   - Update dashboard to show pending vs available balance
   - Add withdrawal button (calls `/api/wallet/withdraw`)
   - Show countdown timer for pending payments

2. **Dispute System:**
   - Add dispute filing endpoint
   - Update status to 'frozen' when dispute filed
   - Build dispute resolution flow

3. **Notifications:**
   - Email/SMS when payment clears
   - Push notifications for withdrawal confirmations

4. **Analytics:**
   - Track average time to withdrawal
   - Monitor frozen transaction volume
   - Alert on high pending balances
