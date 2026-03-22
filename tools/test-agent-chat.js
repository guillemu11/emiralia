/**
 * Test agent chat endpoints
 */

import 'dotenv/config';

const API_URL = process.env.DASHBOARD_URL || 'http://localhost:3001';
const API_KEY = process.env.DASHBOARD_API_KEY;

async function testEndpoints() {
  console.log('Testing agent chat endpoints...\n');
  console.log('API_URL:', API_URL);
  console.log('API_KEY configured:', !!API_KEY, '\n');

  const agentId = 'pm-agent';
  const userId = 'dashboard-user';

  // Test 1: Load conversation
  console.log('1. Testing GET /api/agents/:agentId/conversation');
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    const url = `${API_URL}/api/agents/${agentId}/conversation?userId=${userId}`;
    console.log('   URL:', url);

    const res = await fetch(url, { headers });

    console.log('   Status:', res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text();
      console.log('   Error:', text);
    } else {
      const data = await res.json();
      console.log('   Success:', data);
    }
  } catch (err) {
    console.error('   Error:', err.message);
  }

  console.log('\n2. Testing POST /api/agents/:agentId/chat');
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    const url = `${API_URL}/api/agents/${agentId}/chat`;
    console.log('   URL:', url);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Test message',
        userId
      })
    });

    console.log('   Status:', res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text();
      console.log('   Error:', text);
    } else {
      console.log('   Success: SSE stream started');
    }
  } catch (err) {
    console.error('   Error:', err.message);
  }
}

testEndpoints();
