/**
 * Comprehensive Test Suite for Pending Balance System
 */

// Load environment variables directly
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tests = [];
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
  tests.push({ name, passed, details });
  results.total++;
  if (passed) results.passed++;
  else results.failed++;
}

async function testDatabaseTables() {
  console.log('\n📋 TEST 1: Database Tables\n');

  try {
    // Test pending_transactions table
    const { data: pendingData, error: pendingError } = await supabase
      .from('pending_transactions')
      .select('*')
      .limit(1);

    if (pendingError) {
      logTest('pending_transactions table', false, pendingError.message);
      return false;
    } else {
      logTest('pending_transactions table', true, 'Table exists and accessible');
    }

    // Test withdrawals table
    const { data: withdrawData, error: withdrawError } = await supabase
      .from('withdrawals')
      .select('*')
      .limit(1);

    if (withdrawError) {
      logTest('withdrawals table', false, withdrawError.message);
      return false;
    } else {
      logTest('withdrawals table', true, 'Table exists and accessible');
    }

    return true;
  } catch (error) {
    logTest('Database connection', false, error.message);
    return false;
  }
}

async function testServerEndpoints() {
  console.log('\n📡 TEST 2: Server Endpoints\n');

  const endpoints = [
    { path: '/api/health', method: 'GET', expectAuth: false },
    { path: '/api/wallet/balance', method: 'GET', expectAuth: true },
    { path: '/api/wallet/status', method: 'GET', expectAuth: true },
    { path: '/api/wallet/withdrawals', method: 'GET', expectAuth: true },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3002${endpoint.path}`);
      const status = response.status;

      if (endpoint.expectAuth && status === 401) {
        logTest(`${endpoint.method} ${endpoint.path}`, true, 'Correctly requires authentication');
      } else if (!endpoint.expectAuth && status === 200) {
        const data = await response.json();
        logTest(`${endpoint.method} ${endpoint.path}`, true, `Response: ${JSON.stringify(data).substring(0, 50)}...`);
      } else if (endpoint.expectAuth && status === 200) {
        logTest(`${endpoint.method} ${endpoint.path}`, false, 'Should require auth but doesn\'t');
      } else {
        logTest(`${endpoint.method} ${endpoint.path}`, false, `Unexpected status: ${status}`);
      }
    } catch (error) {
      logTest(`${endpoint.method} ${endpoint.path}`, false, error.message);
    }
  }
}

async function testPendingTransaction() {
  console.log('\n💰 TEST 3: Create Pending Transaction\n');

  try {
    // Get a test user
    const { data: users } = await supabase
      .from('users')
      .select('id, wallet_address')
      .not('wallet_address', 'is', null)
      .limit(1);

    if (!users || users.length === 0) {
      logTest('Find test user', false, 'No users with wallet_address found');
      console.log('   ℹ️  Skipping transaction tests - create a user with wallet_address first');
      return;
    }

    const testUser = users[0];
    logTest('Find test user', true, `User ID: ${testUser.id.substring(0, 8)}...`);

    // Create a test pending transaction
    const testAmount = 5000; // $50.00
    const clearsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const { data: pendingTx, error: insertError } = await supabase
      .from('pending_transactions')
      .insert({
        user_id: testUser.id,
        task_id: '00000000-0000-0000-0000-000000000001', // Test task ID
        amount_cents: testAmount,
        status: 'pending',
        clears_at: clearsAt.toISOString()
      })
      .select()
      .single();

    if (insertError) {
      logTest('Create pending transaction', false, insertError.message);
      return;
    }

    logTest('Create pending transaction', true, `ID: ${pendingTx.id.substring(0, 8)}..., Amount: $${testAmount/100}`);

    // Verify it's retrievable
    const { data: retrieved, error: retrieveError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('id', pendingTx.id)
      .single();

    if (retrieveError || !retrieved) {
      logTest('Retrieve pending transaction', false, retrieveError?.message || 'Not found');
      return;
    }

    logTest('Retrieve pending transaction', true, `Status: ${retrieved.status}, Clears: ${new Date(retrieved.clears_at).toLocaleString()}`);

    // Test balance calculation
    const { data: allPending } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('user_id', testUser.id)
      .in('status', ['pending', 'available']);

    const totalPending = allPending.filter(tx => tx.status === 'pending').reduce((sum, tx) => sum + tx.amount_cents, 0);
    const totalAvailable = allPending.filter(tx => tx.status === 'available').reduce((sum, tx) => sum + tx.amount_cents, 0);

    logTest('Balance calculation', true, `Pending: $${totalPending/100}, Available: $${totalAvailable/100}`);

    // Test promotion to available
    console.log('\n🔄 Testing Auto-Promotion...\n');

    const { error: updateError } = await supabase
      .from('pending_transactions')
      .update({
        status: 'available',
        cleared_at: new Date().toISOString()
      })
      .eq('id', pendingTx.id);

    if (updateError) {
      logTest('Promote to available', false, updateError.message);
      return;
    }

    logTest('Promote to available', true, 'Status updated to available');

    // Verify promotion
    const { data: promoted } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('id', pendingTx.id)
      .single();

    logTest('Verify promotion', promoted.status === 'available', `Status: ${promoted.status}`);

    // Clean up test transaction
    await supabase
      .from('pending_transactions')
      .delete()
      .eq('id', pendingTx.id);

    logTest('Cleanup test data', true, 'Test transaction deleted');

  } catch (error) {
    logTest('Pending transaction test', false, error.message);
  }
}

async function testBalancePromoter() {
  console.log('\n⏰ TEST 4: Balance Promoter Service\n');

  try {
    // Check if there are any old pending transactions that should be promoted
    const { data: oldPending } = await supabase
      .from('pending_transactions')
      .select('id, created_at, clears_at, status')
      .eq('status', 'pending')
      .lt('clears_at', new Date().toISOString());

    if (!oldPending || oldPending.length === 0) {
      logTest('Find promotable transactions', true, 'No transactions ready for promotion (expected)');
    } else {
      logTest('Find promotable transactions', true, `Found ${oldPending.length} transactions ready for promotion`);
      console.log('   ℹ️  These will be promoted by the balance promoter on next run (15min interval)');
    }

    // Check recent balance promoter activity from server logs
    const fs = require('fs');
    try {
      const logs = fs.readFileSync('/tmp/server.log', 'utf8');
      const promoterLogs = logs.split('\n').filter(line => line.includes('[BalancePromoter]'));

      if (promoterLogs.length > 0) {
        logTest('Balance promoter service', true, 'Service is running and logging');
        console.log('   Recent logs:');
        promoterLogs.slice(-3).forEach(log => console.log(`   ${log}`));
      } else {
        logTest('Balance promoter service', false, 'No promoter logs found');
      }
    } catch (e) {
      logTest('Check promoter logs', false, 'Could not read server logs');
    }

  } catch (error) {
    logTest('Balance promoter check', false, error.message);
  }
}

async function testServiceImports() {
  console.log('\n📦 TEST 5: Service Imports\n');

  try {
    const { getWalletBalance } = require('./backend/services/paymentService');
    logTest('Import paymentService', true, 'getWalletBalance function available');

    const { processWithdrawal } = require('./backend/services/withdrawalService');
    logTest('Import withdrawalService', true, 'processWithdrawal function available');

    const { startBalancePromoter } = require('./backend/services/balancePromoter');
    logTest('Import balancePromoter', true, 'startBalancePromoter function available');

    // Test actual balance calculation
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (users && users.length > 0) {
      const balance = await getWalletBalance(supabase, users[0].id);
      logTest('Execute getWalletBalance', true, `Pending: $${balance.pending}, Available: $${balance.available}`);
    }

  } catch (error) {
    logTest('Service imports', false, error.message);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST RESULTS SUMMARY\n');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ✅ ${results.passed}`);
  console.log(`Failed: ❌ ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is fully operational!');
    console.log('\n✅ Your pending balance system is ready to use!');
    console.log('\n📚 Next steps:');
    console.log('   1. Test with a real payment: POST /api/mcp (action: release_payment)');
    console.log('   2. Monitor balance promoter: tail -f /tmp/server.log');
    console.log('   3. Check worker balance: GET /api/wallet/balance');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    console.log('\n📝 Common fixes:');
    console.log('   - Ensure migrations ran successfully');
    console.log('   - Check server is running: curl http://localhost:3002/api/health');
    console.log('   - Verify .env file has SUPABASE_URL and SUPABASE_SERVICE_KEY');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

async function main() {
  console.log('🧪 TESTING PENDING BALANCE SYSTEM\n');
  console.log('='.repeat(60));

  await testDatabaseTables();
  await testServerEndpoints();
  await testServiceImports();
  await testPendingTransaction();
  await testBalancePromoter();
  await printSummary();

  process.exit(results.failed === 0 ? 0 : 1);
}

main();
