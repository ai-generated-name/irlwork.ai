# Stripe Connect V2 Sample Integration

A complete Stripe Connect V2 platform integration demonstrating:

- **Connected Accounts** — V2 API with platform-managed pricing & fees
- **Onboarding** — Account Links for seller identity verification
- **Products** — Platform-level product creation linked to sellers
- **Storefront** — Customer-facing catalog with all sellers and products
- **Destination Charges** — Checkout sessions with application fees
- **Thin Event Webhooks** — V2 account requirement and capability change notifications

## Quick Start

```bash
# 1. Install dependencies
cd samples/stripe-connect-v2
npm install

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your Stripe secret key and webhook secret

# 3. Start the server
npm run dev

# 4. Open in browser
open http://localhost:4242
```

## Webhook Setup (Local Development)

V2 Connected Accounts use **thin events**. Use the Stripe CLI to forward events:

```bash
stripe listen --thin-events \
  'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' \
  --forward-thin-to http://localhost:4242/webhook
```

The CLI will print a webhook signing secret (`whsec_...`) — add this to your `.env` file.

### Dashboard Webhook Setup (Production)

1. Go to **Stripe Dashboard > Developers > Webhooks > + Add destination**
2. Events from: **Connected accounts**
3. Click **Show advanced options** > Payload style: **Thin**
4. Select events:
   - `v2.core.account[requirements].updated`
   - `v2.core.account[.recipient].capability_status_updated`
5. Set the endpoint URL to `https://yourdomain.com/webhook`

## Architecture

```
samples/stripe-connect-v2/
├── server.js          # Express server with all API endpoints
├── public/
│   ├── index.html     # Platform dashboard (create accounts, products)
│   ├── onboarding.html # Onboarding return/status page
│   ├── storefront.html # Customer storefront (browse & buy)
│   └── success.html   # Post-checkout confirmation
├── .env.example       # Environment variable template
├── package.json
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/accounts` | Create a V2 Connected Account |
| `GET` | `/api/accounts` | List all connected accounts with status |
| `GET` | `/api/accounts/:id/status` | Get onboarding & capability status |
| `POST` | `/api/accounts/:id/onboard` | Generate an Account Link for onboarding |
| `POST` | `/api/products` | Create a product (platform level) |
| `GET` | `/api/products` | List all products |
| `POST` | `/api/checkout` | Create a Checkout Session (destination charge) |
| `GET` | `/api/checkout/success` | Retrieve Checkout Session details |
| `POST` | `/webhook` | Receive thin event webhooks |

## Key Concepts

### V2 Connected Accounts

The V2 API replaces the legacy `type: 'express'` / `type: 'standard'` pattern. Instead, you configure the account's dashboard, responsibilities, and capabilities explicitly:

```js
const account = await stripeClient.v2.core.accounts.create({
  display_name: 'Seller Name',
  contact_email: 'seller@example.com',
  identity: { country: 'us' },
  dashboard: 'express',
  defaults: {
    responsibilities: {
      fees_collector: 'application',
      losses_collector: 'application',
    },
  },
  configuration: {
    recipient: {
      capabilities: {
        stripe_balance: {
          stripe_transfers: { requested: true },
        },
      },
    },
  },
});
```

### Destination Charges with Application Fees

The platform creates Checkout Sessions where:
- Payment is collected on the **platform's** Stripe account
- Funds are automatically transferred to the seller (minus the fee)
- The `application_fee_amount` is the platform's revenue

```js
const session = await stripeClient.checkout.sessions.create({
  line_items: [{ price_data: { ... }, quantity: 1 }],
  payment_intent_data: {
    application_fee_amount: 200, // $2.00 platform fee
    transfer_data: {
      destination: 'acct_seller123', // Seller's connected account
    },
  },
  mode: 'payment',
  success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
});
```

### Thin Event Webhooks

V2 accounts use thin events — the webhook payload contains only the event ID and type. You must fetch the full event data separately:

```js
// 1. Parse and verify the thin event
const thinEvent = stripeClient.parseThinEvent(rawBody, signature, webhookSecret);

// 2. Fetch the full event data
const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

// 3. Handle by type
switch (event.type) {
  case 'v2.core.account[requirements].updated':
    // Prompt seller to complete new requirements
    break;
  case 'v2.core.account[.recipient].capability_status_updated':
    // Update seller status in your system
    break;
}
```
