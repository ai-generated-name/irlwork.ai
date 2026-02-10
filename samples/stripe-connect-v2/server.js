// =============================================================================
// Stripe Connect V2 Sample Integration
// =============================================================================
//
// This sample demonstrates a complete Stripe Connect V2 platform integration:
//
//   1. Creating Connected Accounts (V2 API) — platform-managed pricing & fees
//   2. Onboarding Connected Accounts — via Account Links
//   3. Creating Products — at the platform level with connected account metadata
//   4. Storefront — browsing products and purchasing via Checkout
//   5. Destination Charges — with application fees for platform monetization
//   6. Thin Event Webhooks — listening for V2 account requirement changes
//
// Quick start:
//   1. Copy .env.example to .env and fill in your Stripe keys
//   2. npm install
//   3. npm run dev
//   4. Open http://localhost:4242
//
// For webhooks, use the Stripe CLI:
//   stripe listen --thin-events \
//     'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' \
//     --forward-thin-to http://localhost:4242/webhook
//
// =============================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');

// =============================================================================
// STEP 1: Initialize the Stripe Client
// =============================================================================
//
// The Stripe Client is the main entry point for all Stripe API calls.
// We create a single instance and reuse it for every request.
//
// The SDK automatically uses the latest API version (2026-01-28.clover preview)
// so we do NOT need to set apiVersion manually.
//
// PLACEHOLDER: Replace with your Stripe secret key, or set STRIPE_SECRET_KEY
// in your .env file. You can find this in your Stripe Dashboard under
// Developers > API keys.
// =============================================================================

const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    '\n' +
    '==========================================================\n' +
    '  ERROR: STRIPE_SECRET_KEY is not set.\n' +
    '\n' +
    '  1. Copy .env.example to .env\n' +
    '  2. Add your Stripe secret key (starts with sk_test_)\n' +
    '  3. Find it at: https://dashboard.stripe.com/apikeys\n' +
    '==========================================================\n'
  );
  process.exit(1);
}

// Create a single Stripe client instance — use this for ALL Stripe API calls.
// The SDK automatically negotiates the API version with the server.
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);

// =============================================================================
// STEP 2: In-Memory Store (replace with a real database in production)
// =============================================================================
//
// For this sample, we store connected accounts and products in memory.
// In a real application, persist these in your database (e.g., Supabase,
// PostgreSQL, MongoDB) and map them to your user model.
// =============================================================================

// Maps our internal seller ID to their Stripe connected account ID
const sellers = new Map();
// seller: { id, name, email, stripeAccountId }

// Products created at the platform level, each linked to a connected account
const products = [];
// product: { stripeProductId, stripePriceId, name, description, priceInCents, currency, sellerStripeAccountId, sellerName }

// =============================================================================
// Express App Setup
// =============================================================================

const app = express();
const PORT = process.env.PORT || 4242;

// Parse JSON for all routes EXCEPT the webhook endpoint.
// Stripe webhook signature verification requires the raw body, so we handle
// that route separately with express.raw() middleware.
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    // Skip JSON parsing for webhooks — handled by express.raw() on that route
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Serve static HTML files from the /public directory
app.use(express.static(path.join(__dirname, 'public')));

// =============================================================================
// STEP 3: Create Connected Accounts (V2 API)
// =============================================================================
//
// When a seller signs up on your platform, create a Stripe Connected Account
// using the V2 API. This example uses a configuration where:
//
//   - The PLATFORM is responsible for pricing and fee collection
//     (fees_collector: 'application', losses_collector: 'application')
//   - The connected account uses the Express dashboard
//   - The account is configured as a 'recipient' with stripe_transfers capability
//
// IMPORTANT: Do NOT pass `type` at the top level (no type: 'express',
// type: 'standard', or type: 'custom'). The V2 API uses `dashboard` and
// `configuration` instead.
//
// In production, store the mapping from your user to the Stripe account ID
// in your database.
// =============================================================================

app.post('/api/accounts', async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Create a V2 Connected Account via the Stripe Client.
    //
    // Key properties:
    //   display_name  — The seller's name shown in their Express dashboard
    //   contact_email — Email for Stripe to contact the seller
    //   identity      — The country where the seller is based
    //   dashboard     — 'express' gives sellers a Stripe-hosted dashboard
    //   defaults.responsibilities — Platform handles fees and losses
    //   configuration.recipient   — Enables receiving transfers from the platform
    const account = await stripeClient.v2.core.accounts.create({
      display_name: name,
      contact_email: email,
      identity: {
        country: 'us',
      },
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
              stripe_transfers: {
                requested: true,
              },
            },
          },
        },
      },
    });

    // Store the seller mapping in memory.
    // In production: INSERT INTO sellers (user_id, stripe_account_id) ...
    const seller = {
      id: account.id,
      name,
      email,
      stripeAccountId: account.id,
    };
    sellers.set(account.id, seller);

    console.log(`[Accounts] Created connected account: ${account.id} for ${name}`);

    res.json({
      accountId: account.id,
      seller,
    });
  } catch (error) {
    console.error('[Accounts] Error creating account:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STEP 4: Onboard Connected Accounts via Account Links
// =============================================================================
//
// After creating a connected account, the seller must complete Stripe's
// onboarding flow to verify their identity and add payout details.
//
// Account Links generate a short-lived URL that redirects the seller to
// Stripe's hosted onboarding form. You provide:
//
//   - refresh_url — Where to redirect if the link expires (generate a new one)
//   - return_url  — Where to redirect after onboarding completes
//
// The link expires quickly, so always generate a fresh one when the seller
// clicks "Onboard."
// =============================================================================

app.post('/api/accounts/:accountId/onboard', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Build the base URL for redirect URLs.
    // In production, use your actual domain (e.g., https://yourdomain.com).
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Create a V2 Account Link for onboarding.
    //
    // use_case.type: 'account_onboarding' — triggers the full onboarding flow
    // configurations: ['recipient'] — must match the configuration set during account creation
    // refresh_url — seller is sent here if the link expires; you should regenerate a new link
    // return_url  — seller is sent here after completing onboarding; include the accountId
    //               so you can look up their status
    const accountLink = await stripeClient.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient'],
          refresh_url: `${baseUrl}/onboarding?accountId=${accountId}&refresh=true`,
          return_url: `${baseUrl}/onboarding?accountId=${accountId}`,
        },
      },
    });

    console.log(`[Onboarding] Created account link for: ${accountId}`);

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('[Onboarding] Error creating account link:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STEP 5: Check Connected Account Status
// =============================================================================
//
// After a seller returns from onboarding (or at any time), check their account
// status to determine if they can receive payments.
//
// For this demo, we always fetch the status from the Stripe API directly
// rather than caching it in a database. In production, you may want to
// cache the status and update it via webhooks for performance.
//
// Key status checks:
//   - stripe_transfers.status === 'active' → can receive destination charges
//   - requirements.summary.minimum_deadline.status → onboarding completeness
//     ('currently_due' or 'past_due' means more info is needed)
// =============================================================================

app.get('/api/accounts/:accountId/status', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Retrieve the V2 account with the 'recipient' configuration and requirements
    // included. The `include` parameter tells the API to return these nested
    // objects in the response (they are not included by default).
    const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.recipient', 'requirements'],
    });

    // Check if the seller's stripe_transfers capability is active.
    // This means they can receive destination charges from the platform.
    const readyToReceivePayments =
      account?.configuration?.recipient?.capabilities?.stripe_balance
        ?.stripe_transfers?.status === 'active';

    // Check the requirements summary to determine if onboarding is complete.
    // 'currently_due' or 'past_due' means the seller still has outstanding requirements.
    const requirementsStatus =
      account.requirements?.summary?.minimum_deadline?.status;
    const onboardingComplete =
      requirementsStatus !== 'currently_due' &&
      requirementsStatus !== 'past_due';

    console.log(`[Status] Account ${accountId}: ready=${readyToReceivePayments}, onboarded=${onboardingComplete}`);

    res.json({
      accountId,
      displayName: account.display_name,
      contactEmail: account.contact_email,
      readyToReceivePayments,
      onboardingComplete,
      requirementsStatus: requirementsStatus || 'none',
    });
  } catch (error) {
    console.error('[Status] Error retrieving account:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STEP 6: List All Connected Accounts
// =============================================================================
//
// Returns all sellers stored in memory. In production, query your database.
// For each seller, we fetch their latest status from Stripe to show
// real-time onboarding progress.
// =============================================================================

app.get('/api/accounts', async (req, res) => {
  try {
    const accountList = [];

    for (const seller of sellers.values()) {
      // Fetch live status for each account from Stripe
      try {
        const account = await stripeClient.v2.core.accounts.retrieve(
          seller.stripeAccountId,
          { include: ['configuration.recipient', 'requirements'] }
        );

        const readyToReceivePayments =
          account?.configuration?.recipient?.capabilities?.stripe_balance
            ?.stripe_transfers?.status === 'active';
        const requirementsStatus =
          account.requirements?.summary?.minimum_deadline?.status;
        const onboardingComplete =
          requirementsStatus !== 'currently_due' &&
          requirementsStatus !== 'past_due';

        accountList.push({
          ...seller,
          readyToReceivePayments,
          onboardingComplete,
          requirementsStatus: requirementsStatus || 'none',
        });
      } catch (err) {
        // If we can't fetch the account, still include it with unknown status
        accountList.push({
          ...seller,
          readyToReceivePayments: false,
          onboardingComplete: false,
          requirementsStatus: 'unknown',
        });
      }
    }

    res.json(accountList);
  } catch (error) {
    console.error('[Accounts] Error listing accounts:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STEP 7: Create Products (Platform Level)
// =============================================================================
//
// Products are created at the PLATFORM level (not on the connected account).
// We store the connected account ID in the product's metadata so we know
// which seller to pay when a customer buys the product.
//
// Each product also has a default price. Stripe separates the concept of
// "Product" (what you sell) from "Price" (how much it costs), allowing
// multiple prices per product. Here we use default_price_data for simplicity.
//
// In production, also store the product-to-seller mapping in your database.
// =============================================================================

app.post('/api/products', async (req, res) => {
  try {
    const { name, description, priceInCents, currency, sellerAccountId } = req.body;

    // Validate required fields
    if (!name || !priceInCents || !sellerAccountId) {
      return res.status(400).json({
        error: 'name, priceInCents, and sellerAccountId are required',
      });
    }

    // Verify the seller exists in our store
    if (!sellers.has(sellerAccountId)) {
      return res.status(404).json({ error: 'Seller account not found' });
    }

    // Create the product at the platform level using the Stripe Client.
    //
    // metadata.connected_account_id — stores the seller's Stripe account ID
    //   so we know who to route payments to at checkout time.
    //
    // default_price_data — creates a Price object alongside the Product.
    //   unit_amount is in the smallest currency unit (e.g., cents for USD).
    const product = await stripeClient.products.create({
      name: name,
      description: description || '',
      metadata: {
        connected_account_id: sellerAccountId,
      },
      default_price_data: {
        unit_amount: priceInCents,
        currency: currency || 'usd',
      },
    });

    // Store in our in-memory product list.
    // In production: INSERT INTO products (stripe_product_id, seller_id, ...) ...
    const seller = sellers.get(sellerAccountId);
    const productRecord = {
      stripeProductId: product.id,
      stripePriceId: product.default_price,
      name: product.name,
      description: product.description,
      priceInCents,
      currency: currency || 'usd',
      sellerStripeAccountId: sellerAccountId,
      sellerName: seller.name,
    };
    products.push(productRecord);

    console.log(`[Products] Created product: ${product.id} (${name}) for seller ${sellerAccountId}`);

    res.json(productRecord);
  } catch (error) {
    console.error('[Products] Error creating product:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STEP 8: List All Products (Storefront API)
// =============================================================================
//
// Returns all products for the storefront. Each product includes the seller
// name and account ID so the UI can group by seller.
// =============================================================================

app.get('/api/products', (req, res) => {
  res.json(products);
});

// =============================================================================
// STEP 9: Process Charges via Stripe Checkout (Destination Charges)
// =============================================================================
//
// When a customer wants to buy a product, we create a Stripe Checkout Session
// with a Destination Charge. This means:
//
//   - The payment is processed on the PLATFORM's Stripe account
//   - Funds are automatically transferred to the connected account (seller)
//   - The platform keeps an application_fee_amount as revenue
//
// This is the simplest way to monetize a marketplace. The platform sets the
// price and takes a fee; the seller receives the remainder.
//
// Key parameters:
//   payment_intent_data.application_fee_amount — Platform's cut (in cents)
//   payment_intent_data.transfer_data.destination — Seller's connected account
//   mode: 'payment' — One-time payment (not subscription)
//   success_url / cancel_url — Where the customer goes after checkout
//
// PLACEHOLDER: The application_fee_amount below is set to a flat 200 cents ($2).
// In production, calculate this based on your pricing model (e.g., percentage).
// =============================================================================

app.post('/api/checkout', async (req, res) => {
  try {
    const { productIndex, quantity } = req.body;

    // Look up the product from our in-memory store
    const product = products[productIndex];
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate the application fee (platform revenue).
    // Example: 10% of the total, minimum 50 cents.
    //
    // PLACEHOLDER: Adjust this fee calculation to match your business model.
    const totalAmount = product.priceInCents * (quantity || 1);
    const applicationFee = Math.max(Math.round(totalAmount * 0.10), 50);

    // Build the base URL for success/cancel redirects
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Create a Checkout Session with a Destination Charge.
    //
    // line_items — What the customer is buying. We use price_data to pass
    //   the product details inline (alternatively, use an existing Price ID).
    //
    // payment_intent_data.application_fee_amount — The platform's fee in cents.
    //   This amount is deducted from the payment before transferring to the seller.
    //
    // payment_intent_data.transfer_data.destination — The seller's connected
    //   account ID. Stripe automatically transfers (total - fee) to this account.
    //
    // success_url — Include {CHECKOUT_SESSION_ID} so you can retrieve the
    //   session details on the success page.
    const session = await stripeClient.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
            unit_amount: product.priceInCents,
          },
          quantity: quantity || 1,
        },
      ],
      payment_intent_data: {
        // Platform fee — this is how the platform makes money
        application_fee_amount: applicationFee,
        // Destination charge — route the payment to the seller's connected account
        transfer_data: {
          destination: product.sellerStripeAccountId,
        },
      },
      mode: 'payment',
      // Stripe replaces {CHECKOUT_SESSION_ID} with the actual session ID
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/storefront`,
    });

    console.log(
      `[Checkout] Created session: ${session.id} — ` +
      `product=${product.name}, seller=${product.sellerStripeAccountId}, ` +
      `fee=${applicationFee}c`
    );

    // Return the Checkout URL so the frontend can redirect the customer
    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[Checkout] Error creating session:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STEP 10: Checkout Success — Retrieve Session Details
// =============================================================================
//
// After a successful payment, the customer is redirected to the success page
// with the session ID in the URL. We retrieve the session to show a
// confirmation with payment details.
// =============================================================================

app.get('/api/checkout/success', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // Retrieve the Checkout Session to confirm payment details.
    // expand: ['payment_intent'] gives us the full PaymentIntent object
    // so we can see the charge amount, fees, and transfer details.
    const session = await stripeClient.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });

    res.json({
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentIntentId: session.payment_intent?.id,
    });
  } catch (error) {
    console.error('[Checkout] Error retrieving session:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STEP 11: Webhook Handler for V2 Thin Events
// =============================================================================
//
// Connected account requirements can change at any time (e.g., due to
// regulatory changes). Stripe notifies you via webhooks so you can prompt
// sellers to update their information.
//
// V2 accounts use "thin events" — the webhook payload contains only the
// event ID and type, NOT the full event data. You must fetch the full event
// separately using client.v2.core.events.retrieve().
//
// Setup:
//   1. In Stripe Dashboard > Developers > Webhooks > + Add destination
//   2. Events from: "Connected accounts"
//   3. Show advanced options > Payload style: "Thin"
//   4. Select events:
//      - v2.core.account[requirements].updated
//      - v2.core.account[.recipient].capability_status_updated
//
// For local development, use the Stripe CLI:
//   stripe listen --thin-events \
//     'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' \
//     --forward-thin-to http://localhost:4242/webhook
//
// PLACEHOLDER: Set STRIPE_WEBHOOK_SECRET in your .env file.
// You can find this in the Stripe Dashboard webhook settings, or the
// Stripe CLI will print it when you run `stripe listen`.
// =============================================================================

app.post(
  '/webhook',
  // Use express.raw() to get the raw body as a Buffer.
  // Stripe needs the exact raw body (not parsed JSON) to verify the
  // webhook signature and prevent tampering.
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // Retrieve the webhook signing secret.
    // This is different from your API key — it's specific to each webhook endpoint.
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        '[Webhook] STRIPE_WEBHOOK_SECRET is not set.\n' +
        'Set it in .env, or use the Stripe CLI: stripe listen --print-secret'
      );
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Get the Stripe-Signature header. Stripe includes this on every webhook
    // delivery so you can verify the payload hasn't been tampered with.
    const sig = req.headers['stripe-signature'];

    let thinEvent;
    try {
      // Parse and verify the thin event.
      //
      // parseThinEvent() does two things:
      //   1. Verifies the signature using your webhook secret
      //   2. Parses the payload into a typed thin event object
      //
      // If the signature is invalid (e.g., the payload was tampered with
      // or the wrong secret was used), this throws an error.
      thinEvent = stripeClient.parseThinEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Respond with 200 immediately to acknowledge receipt.
    // Stripe will retry if it doesn't receive a 2xx within a few seconds,
    // so respond quickly and do processing async.
    res.sendStatus(200);

    // Process the event asynchronously after responding.
    // In production, consider using a job queue (e.g., Bull, SQS) for reliability.
    try {
      console.log(`[Webhook] Received thin event: ${thinEvent.type} (${thinEvent.id})`);

      // Fetch the full event data from Stripe.
      // Thin events only contain the event ID and type — you must retrieve
      // the full event to get the related object data.
      const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

      // Route to the appropriate handler based on event type
      switch (event.type) {
        // ---------------------------------------------------------------
        // Requirements Updated
        // ---------------------------------------------------------------
        // Fired when the connected account's requirements change.
        // This can happen when:
        //   - Stripe needs additional verification documents
        //   - Regulatory requirements change
        //   - Previously submitted information expires
        //
        // Action: Prompt the seller to complete updated onboarding requirements.
        case 'v2.core.account[requirements].updated': {
          const accountId = event.related_object?.id;
          console.log(
            `[Webhook] Requirements updated for account: ${accountId}`,
            JSON.stringify(event.data, null, 2)
          );

          // In production:
          //   1. Look up the seller in your database by accountId
          //   2. Send them an email/notification that they need to update their info
          //   3. Generate a new Account Link for them to complete requirements
          //   4. Update the seller's status in your database
          break;
        }

        // ---------------------------------------------------------------
        // Capability Status Updated
        // ---------------------------------------------------------------
        // Fired when a capability's status changes (e.g., from 'pending'
        // to 'active', or from 'active' to 'inactive').
        //
        // Action: Update the seller's status in your system. If capabilities
        // become inactive, notify the seller and pause their listings.
        case 'v2.core.account[.recipient].capability_status_updated': {
          const accountId = event.related_object?.id;
          console.log(
            `[Webhook] Capability status updated for account: ${accountId}`,
            JSON.stringify(event.data, null, 2)
          );

          // In production:
          //   1. Look up the seller in your database by accountId
          //   2. Check if stripe_transfers is still 'active'
          //   3. If inactive, disable the seller's product listings
          //   4. Notify the seller that their payout capability changed
          break;
        }

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      // Log but don't re-throw — we already sent a 200 response.
      // In production, push failed events to a dead letter queue for retry.
      console.error(`[Webhook] Error processing event ${thinEvent.id}:`, error.message);
    }
  }
);

// =============================================================================
// Serve HTML Pages
// =============================================================================
//
// Simple HTML pages for the demo UI. In production, these would be part of
// your React/Next.js frontend.
// =============================================================================

// Dashboard — manage sellers and products
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Onboarding return page — seller lands here after completing Stripe onboarding
app.get('/onboarding', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
});

// Storefront — customer-facing product catalog
app.get('/storefront', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'storefront.html'));
});

// Checkout success page
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// =============================================================================
// Start the Server
// =============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Stripe Connect V2 Sample running at http://localhost:${PORT}`);
  console.log(`   Dashboard:  http://localhost:${PORT}/`);
  console.log(`   Storefront: http://localhost:${PORT}/storefront`);
  console.log(`\n📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(
    `   Start the Stripe CLI listener:\n` +
    `   stripe listen --thin-events ` +
    `'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' ` +
    `--forward-thin-to http://localhost:${PORT}/webhook\n`
  );
});
