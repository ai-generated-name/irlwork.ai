/**
 * Test Page Views Tracking
 *
 * This script tests:
 * 1. POST /api/views endpoint accepts tracking data
 * 2. Data is correctly stored in page_views table
 * 3. AI referrer detection works
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const API_URL = process.env.VITE_API_URL || 'http://localhost:3002';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a test UUID
function generateTestUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testPageViewTracking() {
  console.log('🧪 Testing Page View Tracking System\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  const testTaskId = generateTestUUID();
  const testProfileId = generateTestUUID();

  // Test 1: Track a task view (anonymous)
  console.log('📝 Test 1: Track anonymous task view...');
  try {
    const response = await fetch(`${API_URL}/api/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_type: 'task',
        target_id: testTaskId,
        referrer: 'https://chat.openai.com/',
        ai_source: 'chatgpt'
      })
    });

    if (response.status === 200) {
      console.log('   ✅ Task view tracked successfully\n');
    } else {
      console.log(`   ❌ Failed with status ${response.status}`);
      const error = await response.text();
      console.log(`   Error: ${error}\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }

  // Test 2: Track a profile view
  console.log('📝 Test 2: Track profile view...');
  try {
    const response = await fetch(`${API_URL}/api/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_type: 'profile',
        target_id: testProfileId,
        referrer: 'https://claude.ai/',
        ai_source: 'claude'
      })
    });

    if (response.status === 200) {
      console.log('   ✅ Profile view tracked successfully\n');
    } else {
      console.log(`   ❌ Failed with status ${response.status}\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }

  // Test 3: Test validation (should fail)
  console.log('📝 Test 3: Test validation (invalid page_type)...');
  try {
    const response = await fetch(`${API_URL}/api/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_type: 'invalid',
        target_id: testTaskId
      })
    });

    if (response.status === 400) {
      console.log('   ✅ Validation working correctly (rejected invalid page_type)\n');
    } else {
      console.log(`   ⚠️  Expected 400, got ${response.status}\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }

  // Wait a moment for database to process
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Query the page_views table
  console.log('📝 Test 4: Verify data in page_views table...');
  try {
    const { data, error } = await supabase
      .from('page_views')
      .select('*')
      .or(`target_id.eq.${testTaskId},target_id.eq.${testProfileId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.log(`   ❌ Database query failed: ${error.message}\n`);
    } else if (data && data.length > 0) {
      console.log(`   ✅ Found ${data.length} tracked view(s):`);
      data.forEach((view, i) => {
        console.log(`\n   View ${i + 1}:`);
        console.log(`   - Page Type: ${view.page_type}`);
        console.log(`   - Target ID: ${view.target_id}`);
        console.log(`   - AI Source: ${view.ai_source || 'none'}`);
        console.log(`   - Referrer: ${view.referrer || 'none'}`);
        console.log(`   - IP Hash: ${view.ip_hash}`);
        console.log(`   - Viewer ID: ${view.viewer_id || 'anonymous'}`);
        console.log(`   - Created: ${view.created_at}`);
      });
      console.log('');
    } else {
      console.log('   ⚠️  No views found in database (may take a moment to propagate)\n');
    }
  } catch (err) {
    console.log(`   ❌ Error querying database: ${err.message}\n`);
  }

  // Test 5: Get total view counts
  console.log('📝 Test 5: Get total view counts...');
  try {
    const { count: taskCount, error: taskError } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .eq('page_type', 'task');

    const { count: profileCount, error: profileError } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .eq('page_type', 'profile');

    if (!taskError && !profileError) {
      console.log(`   ✅ Total task views: ${taskCount}`);
      console.log(`   ✅ Total profile views: ${profileCount}\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }

  console.log('✅ Page view tracking test complete!\n');
  console.log('📊 Next steps:');
  console.log('   1. Visit a task detail page in your browser');
  console.log('   2. Check browser DevTools → Network tab for POST /api/views');
  console.log('   3. Query page_views table in Supabase to see real views');
}

testPageViewTracking();
