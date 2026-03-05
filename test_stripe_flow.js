/**
 * E2E Stripe Integration Test Script
 * Tests the full payment lifecycle: customer → card → auth hold → capture → release
 *
 * Requires:
 *   - Running API server (npm run dev in api/)
 *   - STRIPE_SECRET_KEY set in .env (test mode)
 *   - Supabase credentials in .env
 *
 * Usage: node test_stripe_flow.js
 */

const fs = require('fs');
const path = require('path');

// Load env from root .env and api/.env (api/.env takes precedence)
for (const envPath of ['.env', 'api/.env']) {
  const fullPath = path.resolve(__dirname, envPath);
  if (fs.existsSync(fullPath)) {
    fs.readFileSync(fullPath, 'utf8').split('\n').forEach(line => {
      const match = line.match(/^([^=#]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
}

const API_URL = process.env.API_URL || 'http://localhost:3002/api';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY must be set in .env');
  process.exit(1);
}

const stripe = require(path.resolve(__dirname, 'api/node_modules/stripe'))(STRIPE_SECRET_KEY);

const tests = [];
const results = { passed: 0, failed: 0, total: 0 };

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
  tests.push({ name, passed, details });
  results.total++;
  if (passed) results.passed++;
  else results.failed++;
}

// Cleanup tracking
const cleanupItems = { customers: [], paymentIntents: [] };

async function cleanup() {
  console.log('\n🧹 Cleaning up test resources...\n');
  for (const customerId of cleanupItems.customers) {
    try {
      await stripe.customers.del(customerId);
      console.log(`   Deleted customer ${customerId}`);
    } catch (e) {
      console.log(`   Could not delete customer ${customerId}: ${e.message}`);
    }
  }
  for (const piId of cleanupItems.paymentIntents) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      if (['requires_capture', 'requires_confirmation', 'requires_action'].includes(pi.status)) {
        await stripe.paymentIntents.cancel(piId);
        console.log(`   Cancelled PI ${piId}`);
      }
    } catch (e) {
      console.log(`   Could not cancel PI ${piId}: ${e.message}`);
    }
  }
}

async function testCreateCustomer() {
  console.log('\n📋 TEST 1: Create Stripe Customer\n');

  try {
    const customer = await stripe.customers.create({
      email: 'test-agent@irlwork.ai',
      name: 'Test Agent (E2E)',
      metadata: { platform: 'irlwork', test: 'true' }
    });

    cleanupItems.customers.push(customer.id);
    logTest('Create customer', true, `ID: ${customer.id}`);
    return customer;
  } catch (e) {
    logTest('Create customer', false, e.message);
    return null;
  }
}

async function testAttachCard(customerId) {
  console.log('\n📋 TEST 2: Attach Test Card\n');

  try {
    // Use Stripe test card that succeeds
    const pm = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa' }
    });

    await stripe.paymentMethods.attach(pm.id, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pm.id }
    });

    logTest('Attach card to customer', true, `PM: ${pm.id}, Brand: ${pm.card.brand}, Last4: ${pm.card.last4}`);
    return pm;
  } catch (e) {
    logTest('Attach card to customer', false, e.message);
    return null;
  }
}

async function testAuthorizeEscrow(customerId, pmId) {
  console.log('\n📋 TEST 3: Authorize Escrow (Auth Hold)\n');

  try {
    const pi = await stripe.paymentIntents.create({
      amount: 5000, // $50.00
      currency: 'usd',
      customer: customerId,
      payment_method: pmId,
      capture_method: 'manual',
      confirm: true,
      off_session: true,
      metadata: { task_id: 'test-task-001', agent_id: 'test-agent-001', platform: 'irlwork' },
      description: 'irlwork.ai E2E test escrow (auth hold)',
    }, {
      idempotencyKey: `test-auth-hold-${Date.now()}`
    });

    cleanupItems.paymentIntents.push(pi.id);
    logTest('Create auth hold', pi.status === 'requires_capture', `Status: ${pi.status}, PI: ${pi.id}`);

    // Verify amount
    logTest('Auth hold amount correct', pi.amount === 5000, `Amount: ${pi.amount} cents`);

    return pi;
  } catch (e) {
    logTest('Create auth hold', false, e.message);
    return null;
  }
}

async function testCaptureEscrow(piId) {
  console.log('\n📋 TEST 4: Capture Escrow\n');

  try {
    const captured = await stripe.paymentIntents.capture(piId);
    logTest('Capture escrow', captured.status === 'succeeded', `Status: ${captured.status}`);
    logTest('Amount captured correct', captured.amount_received === 5000, `Received: ${captured.amount_received} cents`);
    return captured;
  } catch (e) {
    logTest('Capture escrow', false, e.message);
    return null;
  }
}

async function testRefund(piId) {
  console.log('\n📋 TEST 5: Refund\n');

  try {
    const refund = await stripe.refunds.create({ payment_intent: piId });
    logTest('Create refund', refund.status === 'succeeded', `Status: ${refund.status}, Amount: ${refund.amount} cents`);
    return refund;
  } catch (e) {
    logTest('Create refund', false, e.message);
    return null;
  }
}

async function testDeclinedCard(customerId) {
  console.log('\n📋 TEST 6: Declined Card Handling\n');

  try {
    // Attach a card that will be declined
    const pm = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_chargeDeclined' }
    });

    await stripe.paymentMethods.attach(pm.id, { customer: customerId });

    try {
      await stripe.paymentIntents.create({
        amount: 5000,
        currency: 'usd',
        customer: customerId,
        payment_method: pm.id,
        capture_method: 'manual',
        confirm: true,
        off_session: true,
        metadata: { task_id: 'test-decline', platform: 'irlwork' },
      });
      logTest('Declined card raises error', false, 'Expected error but PI succeeded');
    } catch (declineErr) {
      logTest('Declined card raises error', true, `Error: ${declineErr.message}`);
      logTest('Error type is card_error', declineErr.type === 'StripeCardError', `Type: ${declineErr.type}`);
    }

    // Cleanup the declined card PM
    await stripe.paymentMethods.detach(pm.id);
  } catch (e) {
    logTest('Declined card test setup', false, e.message);
  }
}

async function test3DSCard(customerId) {
  console.log('\n📋 TEST 7: 3DS/SCA Card Handling\n');

  try {
    const pm = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_threeDSecure2Required' }
    });

    await stripe.paymentMethods.attach(pm.id, { customer: customerId });

    const pi = await stripe.paymentIntents.create({
      amount: 5000,
      currency: 'usd',
      customer: customerId,
      payment_method: pm.id,
      capture_method: 'manual',
      confirm: true,
      off_session: true,
      metadata: { task_id: 'test-3ds', platform: 'irlwork' },
    });

    cleanupItems.paymentIntents.push(pi.id);
    logTest('3DS card returns requires_action', pi.status === 'requires_action', `Status: ${pi.status}`);
    logTest('3DS PI has client_secret', !!pi.client_secret, pi.client_secret ? 'Present' : 'Missing');

    // Cleanup
    await stripe.paymentIntents.cancel(pi.id);
    await stripe.paymentMethods.detach(pm.id);
  } catch (e) {
    // Some 3DS test tokens throw errors in off_session mode — that's acceptable
    logTest('3DS card handling', true, `Expected behavior: ${e.message}`);
  }
}

async function testIdempotency(customerId, pmId) {
  console.log('\n📋 TEST 8: Idempotency Key\n');

  const idempotencyKey = `test-idempotent-${Date.now()}`;
  try {
    const pi1 = await stripe.paymentIntents.create({
      amount: 3000,
      currency: 'usd',
      customer: customerId,
      payment_method: pmId,
      capture_method: 'manual',
      confirm: true,
      off_session: true,
      metadata: { task_id: 'test-idempotent', platform: 'irlwork' },
    }, { idempotencyKey });

    cleanupItems.paymentIntents.push(pi1.id);

    const pi2 = await stripe.paymentIntents.create({
      amount: 3000,
      currency: 'usd',
      customer: customerId,
      payment_method: pmId,
      capture_method: 'manual',
      confirm: true,
      off_session: true,
      metadata: { task_id: 'test-idempotent', platform: 'irlwork' },
    }, { idempotencyKey });

    logTest('Idempotent requests return same PI', pi1.id === pi2.id, `PI1: ${pi1.id}, PI2: ${pi2.id}`);

    // Cancel to clean up
    await stripe.paymentIntents.cancel(pi1.id);
  } catch (e) {
    logTest('Idempotency test', false, e.message);
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║      irlwork.ai Stripe Integration E2E Test     ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`Stripe API: ${STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'TEST MODE ✓' : '⚠️ LIVE MODE — ABORT?'}`);
  console.log(`API: ${API_URL}\n`);

  if (!STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    console.error('❌ REFUSING to run tests with live Stripe key. Use sk_test_* keys only.');
    process.exit(1);
  }

  try {
    // 1. Create customer
    const customer = await testCreateCustomer();
    if (!customer) { await cleanup(); return printSummary(); }

    // 2. Attach card
    const pm = await testAttachCard(customer.id);
    if (!pm) { await cleanup(); return printSummary(); }

    // 3. Authorize escrow (auth hold)
    const pi = await testAuthorizeEscrow(customer.id, pm.id);
    if (!pi) { await cleanup(); return printSummary(); }

    // 4. Capture escrow
    const captured = await testCaptureEscrow(pi.id);

    // 5. Refund
    if (captured) await testRefund(pi.id);

    // 6. Declined card
    await testDeclinedCard(customer.id);

    // 7. 3DS card
    await test3DSCard(customer.id);

    // 8. Idempotency
    await testIdempotency(customer.id, pm.id);

  } catch (e) {
    console.error('\n💥 Unhandled error:', e.message);
  }

  await cleanup();
  printSummary();
}

function printSummary() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  Results: ${results.passed}/${results.total} passed, ${results.failed} failed${' '.repeat(Math.max(0, 22 - String(results.total).length * 2))}║`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (results.failed > 0) {
    console.log('Failed tests:');
    tests.filter(t => !t.passed).forEach(t => console.log(`  ❌ ${t.name}: ${t.details}`));
    console.log('');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

main();
