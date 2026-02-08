/**
 * Test Script for Pending Balance System
 *
 * Usage:
 *   node test_pending_balance.js
 *
 * Tests:
 *   1. Database tables exist
 *   2. Balance calculation works
 *   3. Services are properly imported
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseTables() {
  console.log('\n📋 Test 1: Checking database tables...');

  try {
    // Check pending_transactions table
    const { data: pendingData, error: pendingError } = await supabase
      .from('pending_transactions')
      .select('*')
      .limit(1);

    if (pendingError) {
      console.log('   ❌ pending_transactions table missing or inaccessible');
      console.log(`      Error: ${pendingError.message}`);
      return false;
    } else {
      console.log('   ✅ pending_transactions table exists');
    }

    // Check withdrawals table
    const { data: withdrawData, error: withdrawError } = await supabase
      .from('withdrawals')
      .select('*')
      .limit(1);

    if (withdrawError) {
      console.log('   ❌ withdrawals table missing or inaccessible');
      console.log(`      Error: ${withdrawError.message}`);
      return false;
    } else {
      console.log('   ✅ withdrawals table exists');
    }

    return true;
  } catch (error) {
    console.log('   ❌ Database test failed:', error.message);
    return false;
  }
}

async function testServices() {
  console.log('\n📦 Test 2: Checking service imports...');

  try {
    const { getWalletBalance } = require('./backend/services/paymentService');
    console.log('   ✅ paymentService imported');

    const { processWithdrawal } = require('./backend/services/withdrawalService');
    console.log('   ✅ withdrawalService imported');

    const { startBalancePromoter } = require('./backend/services/balancePromoter');
    console.log('   ✅ balancePromoter imported');

    return true;
  } catch (error) {
    console.log('   ❌ Service import failed:', error.message);
    return false;
  }
}

async function testBalanceCalculation() {
  console.log('\n🧮 Test 3: Testing balance calculation...');

  try {
    const { getWalletBalance } = require('./backend/services/paymentService');

    // Get first user for testing
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (!users || users.length === 0) {
      console.log('   ⚠️  No users in database to test with');
      return true; // Not a failure, just no data
    }

    const userId = users[0].id;
    const balance = await getWalletBalance(supabase, userId);

    console.log('   ✅ Balance calculation successful');
    console.log(`      Pending: $${balance.pending.toFixed(2)}`);
    console.log(`      Available: $${balance.available.toFixed(2)}`);
    console.log(`      Total: $${balance.total.toFixed(2)}`);

    return true;
  } catch (error) {
    console.log('   ❌ Balance calculation failed:', error.message);
    return false;
  }
}

async function checkServerIntegration() {
  console.log('\n🔧 Test 4: Checking server.js integration...');

  try {
    const fs = require('fs');
    const serverJs = fs.readFileSync('./api/server.js', 'utf8');

    const checks = [
      { name: 'releasePaymentToPending import', pattern: 'releasePaymentToPending' },
      { name: 'getWalletBalance import', pattern: 'getWalletBalance' },
      { name: 'processWithdrawal import', pattern: 'processWithdrawal' },
      { name: 'startBalancePromoter import', pattern: 'startBalancePromoter' },
      { name: '/api/wallet/balance endpoint', pattern: "app.get('/api/wallet/balance'" },
      { name: '/api/wallet/withdraw endpoint', pattern: "app.post('/api/wallet/withdraw'" },
      { name: 'Balance promoter start', pattern: 'startBalancePromoter(supabase' }
    ];

    let allPassed = true;
    for (const check of checks) {
      if (serverJs.includes(check.pattern)) {
        console.log(`   ✅ ${check.name}`);
      } else {
        console.log(`   ❌ ${check.name} - NOT FOUND`);
        allPassed = false;
      }
    }

    return allPassed;
  } catch (error) {
    console.log('   ❌ Server check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Pending Balance System Integration\n');
  console.log('=' .repeat(60));

  const results = [];

  results.push(await testDatabaseTables());
  results.push(await testServices());
  results.push(await testBalanceCalculation());
  results.push(await checkServerIntegration());

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results:');

  const passed = results.filter(r => r).length;
  const total = results.length;

  if (passed === total) {
    console.log(`✅ All tests passed (${passed}/${total})`);
    console.log('\n🎉 Pending balance system is properly integrated!');
    console.log('\n📚 Next steps:');
    console.log('   1. Restart your API server: node api/server.js');
    console.log('   2. Test payment release via /api/mcp');
    console.log('   3. Check balance via GET /api/wallet/balance');
    console.log('   4. Monitor logs for [BalancePromoter] messages');
  } else {
    console.log(`⚠️  ${passed}/${total} tests passed`);
    console.log('\n❌ Some tests failed. Please check the errors above.');
    console.log('\n📚 Troubleshooting:');
    console.log('   1. Run migrations: node db/run_migrations.js');
    console.log('   2. Check service file paths');
    console.log('   3. Verify server.js integration');
    console.log('   4. See PENDING_BALANCE_INTEGRATION.md for details');
  }

  process.exit(passed === total ? 0 : 1);
}

main();
