# Stripe Go-Live Checklist

Pre-launch checklist for switching irlwork.ai from Stripe test mode to live.

---

## 1. Stripe Dashboard Settings

- [ ] Activate your Stripe account (complete identity verification)
- [ ] Enable Connect in Dashboard > Settings > Connect
- [ ] Set platform branding (name: "irlwork.ai", icon, support URL)
- [ ] Configure Express account settings (country, capabilities: `card_payments`, `transfers`)
- [ ] Set statement descriptor to "IRLWORK.AI" (Dashboard > Settings > Public details)
- [ ] Enable Radar for fraud protection (Dashboard > Radar)

## 2. Environment Variables

Replace test keys with live keys in your production environment:

```
STRIPE_SECRET_KEY=sk_live_...        # Live secret key
STRIPE_PUBLISHABLE_KEY=pk_live_...   # Live publishable key (NOT in VITE_ vars yet)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # Frontend publishable key
STRIPE_WEBHOOK_SECRET=whsec_...      # Live webhook signing secret (see step 4)
```

**Never** store `sk_live_*` in frontend code or `VITE_` prefixed vars.

## 3. Connect Configuration

- [ ] Set Connect application fee collection in Dashboard
- [ ] Verify platform fee (15%) matches `PLATFORM_FEE_PERCENT` in `api/config/constants.js`
- [ ] Test Express onboarding flow end-to-end with a real bank account
- [ ] Verify payout schedule (default: 2-day rolling) in Dashboard > Settings > Payouts

## 4. Webhook Endpoints

Register these webhook endpoints in Stripe Dashboard > Developers > Webhooks:

**Endpoint URL:** `https://your-domain.com/api/stripe/webhooks`

**Events to subscribe:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `account.updated` (Connect)
- `payout.paid`
- `payout.failed`
- `charge.dispute.created`
- `charge.dispute.closed`
- `charge.refunded`

Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

## 5. Testing Before Flip

- [ ] Run `node test_stripe_flow.js` with test keys — all tests pass
- [ ] Run `stripe listen --forward-to http://localhost:3002/api/stripe/webhooks` locally
- [ ] Test full flow: assign task → 3DS modal (card `4000002500003155`) → start work → capture
- [ ] Test declined card (`4000000000000002`) → verify error banner and retry
- [ ] Test refund flow: cancel assigned task → verify hold is released
- [ ] Verify card expiry warning cron runs (`checkExpiringCards`)
- [ ] Verify auth hold renewal cron runs (`renewExpiringAuthHolds`)
- [ ] Export CSV from both worker and agent dashboards

## 6. Monitoring Setup

- [ ] Enable Stripe email alerts for failed payments (Dashboard > Settings > Emails)
- [ ] Set up webhook failure alerts (Dashboard > Developers > Webhooks > alerting)
- [ ] Monitor logs for `[Stripe]` prefixed entries (structured JSON logs)
- [ ] Set up uptime monitoring on `/api/health` endpoint
- [ ] Review dispute notifications are working (test with `createNotification`)

## 7. Go-Live Steps

1. Deploy code with live Stripe keys to production
2. Register live webhook endpoint (see step 4)
3. Verify webhook connectivity (Stripe Dashboard shows 200 responses)
4. Create a test payment with a real card ($1 task)
5. Verify escrow hold appears on card statement
6. Complete the task flow through to payout
7. Verify worker receives payout in their bank

## 8. Post-Launch

- [ ] Monitor Stripe Dashboard for failed payments in first 24h
- [ ] Check webhook delivery logs for failures
- [ ] Verify auth hold renewal cron is running (check logs every 6h)
- [ ] Set up weekly review of Stripe fees vs platform revenue
- [ ] Document any Connect onboarding issues from first users
