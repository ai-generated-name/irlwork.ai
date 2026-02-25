# ✅ Pending Balance System - Integration Complete

The pending/available dual balance system with 48-hour dispute window has been successfully integrated into your `server.js` file.

## 🎯 What Was Changed

### 1. **New Imports Added** (server.js:14-17)
```javascript
// Payment and wallet services
const { releasePaymentToPending, getWalletBalance } = require('../backend/services/paymentService');
const { processWithdrawal, getWithdrawalHistory } = require('../backend/services/withdrawalService');
const { startBalancePromoter } = require('../backend/services/balancePromoter');
```

### 2. **Updated `release_payment` Logic** (server.js:~1667)
**Before:** Immediately sent USDC to worker's wallet
**After:** Creates pending_transaction with 48-hour hold

The entire `release_payment` case was replaced with:
```javascript
case 'release_payment': {
  const { task_id, human_id } = params;

  try {
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

### 3. **New Wallet Endpoints Added** (server.js:~2390)

#### `GET /api/wallet/balance`
Returns pending/available balance breakdown
```json
{
  "pending": 42.50,
  "available": 50.00,
  "total": 92.50,
  "transactions": [...]
}
```

#### `POST /api/wallet/withdraw`
Process withdrawal from available balance
```json
{
  "amount_cents": 5000  // optional
}
```

#### `GET /api/wallet/withdrawals`
Get withdrawal history

#### `GET /api/wallet/status` (Updated)
Now includes pending/available breakdown along with on-chain balance

#### `GET /api/admin/pending-stats`
Admin endpoint to monitor pending balances system-wide

### 4. **Background Service Started** (server.js:~2586)
```javascript
// Start balance promoter (promotes pending → available after 48 hours)
startBalancePromoter(supabase, createNotification);
console.log('   ✅ Balance promoter started (15min interval)');
```

This service runs every 15 minutes and automatically promotes pending balances to available after 48 hours.

## 📋 Next Steps

### Step 1: Run Database Migrations

**Option A: Automatic (Recommended)**
```bash
cd /Users/raffertytruong/irlwork.ai
node db/run_migrations.js
```

**Option B: Manual (via Supabase Dashboard)**
1. Go to https://supabase.com/dashboard → SQL Editor
2. Copy contents of `db/add_pending_transactions.sql` → Run
3. Copy contents of `db/add_withdrawals.sql` → Run

### Step 2: Test the Integration

```bash
# Run the test script
node test_pending_balance.js
```

This will verify:
- ✅ Database tables exist
- ✅ Services are properly imported
- ✅ Balance calculation works
- ✅ Server.js integration is complete

### Step 3: Restart Your API Server

```bash
# Kill existing server (if running)
# Then start fresh:
cd api
node server.js
```

Look for these startup messages:
```
🔄 Starting background services...
   ✅ Auto-release service started (48h threshold)
   ✅ Balance promoter started (15min interval)
```

### Step 4: Test Payment Flow

#### 1. Release a Payment
```bash
curl -X POST http://localhost:3002/api/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "release_payment",
    "params": {
      "task_id": "TASK_UUID",
      "human_id": "WORKER_UUID"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "amount": 50,
  "platform_fee": 5.0,
  "net_amount": 45.0,
  "status": "pending",
  "clears_at": "2024-01-17T10:00:00Z",
  "message": "Payment released to pending balance with 48-hour dispute window"
}
```

#### 2. Check Worker's Balance
```bash
curl http://localhost:3002/api/wallet/balance \
  -H "Authorization: Bearer WORKER_TOKEN"
```

**Expected Response:**
```json
{
  "user_id": "uuid",
  "wallet_address": "0x...",
  "pending": 42.5,        // ← Funds in 48-hour hold
  "available": 0,         // ← No funds ready yet
  "total": 42.5,
  "transactions": [{
    "id": "uuid",
    "amount": 42.5,
    "status": "pending",
    "clears_at": "2024-01-17T10:00:00Z"
  }]
}
```

#### 3. Wait 48 Hours (or Test Manually)

**For Testing - Manually Promote:**
```javascript
// In Supabase SQL Editor or via code:
UPDATE pending_transactions
SET status = 'available', cleared_at = NOW()
WHERE status = 'pending';
```

**In Production:**
Just wait 48 hours. The balancePromoter service will automatically promote it.

#### 4. Withdraw Funds
```bash
curl -X POST http://localhost:3002/api/wallet/withdraw \
  -H "Authorization: Bearer WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "amount": 42.5,
  "tx_hash": "0x...",
  "wallet_address": "0x...",
  "message": "Withdrawal processed successfully"
}
```

## 🔍 Monitoring

### Check Balance Promoter Status

The balance promoter logs to console every 15 minutes:
```
[BalancePromoter] Checking for cleared transactions...
[BalancePromoter] Found 3 transactions to promote
[BalancePromoter] Promoted transaction abc-123 - $42.50 now available for user-xyz
[BalancePromoter] Promotion cycle complete
```

### Admin Monitoring Dashboard

```bash
curl http://localhost:3002/api/admin/pending-stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "pending": { "count": 5, "total": 250.00 },
  "available": { "count": 3, "total": 150.00 },
  "frozen": { "count": 0, "total": 0 },
  "grand_total": 400.00
}
```

## 📊 New Database Tables

### `pending_transactions`
Tracks payments in the 48-hour dispute window
```sql
- id (UUID)
- user_id (UUID → users)
- task_id (UUID → tasks)
- amount_cents (INTEGER)
- status ('pending', 'available', 'frozen', 'withdrawn')
- created_at (TIMESTAMPTZ)
- clears_at (TIMESTAMPTZ)  -- When it becomes available
- cleared_at (TIMESTAMPTZ)  -- When it was actually cleared
- withdrawn_at (TIMESTAMPTZ)
```

### `withdrawals`
Audit trail of all withdrawals
```sql
- id (UUID)
- user_id (UUID → users)
- amount_cents (INTEGER)
- wallet_address (VARCHAR)
- tx_hash (VARCHAR)
- status ('pending', 'completed', 'failed')
- transaction_ids (UUID[])  -- References to pending_transactions
- created_at (TIMESTAMPTZ)
```

## 🎨 Frontend Integration

Update your frontend to show the new balance structure:

```javascript
// Fetch balance
const response = await fetch('/api/wallet/balance', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const balance = await response.json();

// Display:
// Pending: $42.50 (Available on Jan 17, 2024)
// Available: $50.00
// Total: $92.50

// Show transactions with countdown
balance.transactions.forEach(tx => {
  if (tx.status === 'pending') {
    const timeUntilClear = new Date(tx.clears_at) - new Date();
    // Show countdown timer
  }
});
```

## 🐛 Troubleshooting

### Issue: "Table pending_transactions does not exist"
**Solution:** Run migrations
```bash
node db/run_migrations.js
```

### Issue: "Balance promoter not running"
**Check:**
1. Server logs for startup message
2. `grep "BalancePromoter" api/server.js` - should show import and start call

### Issue: "Payments still immediate"
**Check:**
1. Verify `release_payment` case uses `releasePaymentToPending`
2. Check database - should see rows in `pending_transactions`
3. Old code might still be cached - restart server

### Issue: "Cannot withdraw"
**Check:**
1. Worker has `status='available'` funds (not pending)
2. Worker has `wallet_address` set
3. Check logs for error details

## 📚 Documentation

- **Full Integration Guide:** `PENDING_BALANCE_INTEGRATION.md`
- **Service Documentation:** See comments in:
  - `backend/services/paymentService.js`
  - `backend/services/balancePromoter.js`
  - `backend/services/withdrawalService.js`

## ✨ Summary

### What Changed
- ✅ Payments go to **pending balance** (48-hour hold)
- ✅ Auto-promotion to **available balance** via cron
- ✅ Workers **withdraw** from available balance
- ✅ Full **audit trail** with pending_transactions + withdrawals tables

### Benefits
- 🛡️ **Dispute window** for agents to raise issues
- 💰 **Better cash flow** management
- 📊 **Platform retains custody** until withdrawal
- 🔍 **Full transparency** with pending/available breakdown

### Flow Comparison

**Old:**
```
Task Approved → USDC Sent Immediately → Worker Has Funds
```

**New:**
```
Task Approved → Pending (48h) → Available → Worker Withdraws → USDC Sent
```

---

## 🎉 You're All Set!

Run the test script to verify everything is working:
```bash
node test_pending_balance.js
```

If all tests pass, you're ready to go! 🚀
