// Test API Keys System End-to-End
// Usage: node test_api_keys.js

const API_URL = process.env.API_URL || 'http://localhost:3002';

async function testApiKeySystem() {
  console.log('=== Testing API Key System ===\n');
  console.log(`API URL: ${API_URL}\n`);

  const testEmail = `test-agent-${Date.now()}@example.com`;
  const testPassword = 'secure_test_password_123';
  let apiKey = null;
  let userId = null;
  let keyId = null;

  // Test 1: Headless Agent Registration
  console.log('1. Testing Headless Agent Registration...');
  try {
    const response = await fetch(`${API_URL}/api/auth/register-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        agent_name: 'Test Agent'
      })
    });

    const data = await response.json();

    if (response.ok && data.api_key) {
      console.log('   ✅ Registration successful');
      console.log(`   User ID: ${data.user_id}`);
      console.log(`   API Key: ${data.api_key.substring(0, 20)}...`);
      apiKey = data.api_key;
      userId = data.user_id;
    } else {
      console.log(`   ❌ Registration failed: ${data.error || JSON.stringify(data)}`);
      return;
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return;
  }

  // Test 2: Use API Key to Post a Task
  console.log('\n2. Testing Task Creation with API Key...');
  try {
    const response = await fetch(`${API_URL}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        method: 'post_task',
        params: {
          title: 'Test Task from API',
          description: 'This is a test task created via API key',
          category: 'delivery',
          location: 'San Francisco, CA',
          budget_max: 50
        }
      })
    });

    const data = await response.json();

    if (response.ok && data.id) {
      console.log('   ✅ Task created successfully');
      console.log(`   Task ID: ${data.id}`);
    } else {
      console.log(`   ❌ Task creation failed: ${data.error || JSON.stringify(data)}`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 3: List API Keys
  console.log('\n3. Testing List API Keys...');
  try {
    const response = await fetch(`${API_URL}/api/keys`, {
      headers: { 'Authorization': userId }
    });

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      console.log('   ✅ Keys listed successfully');
      console.log(`   Found ${data.length} key(s)`);
      if (data.length > 0) {
        keyId = data[0].id;
        console.log(`   First key: ${data[0].key_prefix} (${data[0].name})`);
      }
    } else {
      console.log(`   ❌ List keys failed: ${data.error || JSON.stringify(data)}`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 4: Generate Additional Key
  console.log('\n4. Testing Generate New API Key...');
  try {
    const response = await fetch(`${API_URL}/api/keys/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': userId
      },
      body: JSON.stringify({ name: 'Production Key' })
    });

    const data = await response.json();

    if (response.ok && data.api_key) {
      console.log('   ✅ Key generated successfully');
      console.log(`   New Key: ${data.api_key.substring(0, 20)}...`);
      console.log(`   Key ID: ${data.id}`);

      // Test 5: Use new key
      console.log('\n5. Testing New Key Authentication...');
      const testResponse = await fetch(`${API_URL}/api/keys`, {
        headers: { 'Authorization': `Bearer ${data.api_key}` }
      });

      if (testResponse.ok) {
        console.log('   ✅ New key works for authentication');
      } else {
        console.log('   ❌ New key failed authentication');
      }
    } else {
      console.log(`   ❌ Key generation failed: ${data.error || JSON.stringify(data)}`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 6: Rotate Key
  if (keyId) {
    console.log('\n6. Testing Key Rotation...');
    try {
      const response = await fetch(`${API_URL}/api/keys/${keyId}/rotate`, {
        method: 'POST',
        headers: { 'Authorization': userId }
      });

      const data = await response.json();

      if (response.ok && data.api_key) {
        console.log('   ✅ Key rotated successfully');
        console.log(`   New Key: ${data.api_key.substring(0, 20)}...`);

        // Test old key should fail
        const oldKeyTest = await fetch(`${API_URL}/api/keys`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (oldKeyTest.status === 401) {
          console.log('   ✅ Old key correctly revoked');
        } else {
          console.log('   ⚠️  Old key may still work (unexpected)');
        }
      } else {
        console.log(`   ❌ Key rotation failed: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }

  // Test 7: Revoke Key
  console.log('\n7. Testing Key Revocation...');
  try {
    // First get current keys
    const listResponse = await fetch(`${API_URL}/api/keys`, {
      headers: { 'Authorization': userId }
    });
    const keys = await listResponse.json();
    const activeKey = keys.find(k => k.is_active);

    if (activeKey) {
      const response = await fetch(`${API_URL}/api/keys/${activeKey.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': userId }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('   ✅ Key revoked successfully');
      } else {
        console.log(`   ❌ Key revocation failed: ${data.error || JSON.stringify(data)}`);
      }
    } else {
      console.log('   ⚠️  No active key to revoke');
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 8: Rate Limiting
  console.log('\n8. Testing Rate Limiting...');
  console.log('   (Skipping - would require multiple registrations)');

  console.log('\n=== Test Summary ===');
  console.log('All API key system tests completed!');
  console.log(`\nTest agent email: ${testEmail}`);
  console.log('You can log into the dashboard with this email to verify the keys appear correctly.\n');
}

testApiKeySystem().catch(console.error);
