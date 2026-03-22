/**
 * Test POST chat endpoint
 */

const API_URL = 'http://localhost:3001';

async function testChat() {
  try {
    console.log('Testing POST /api/agents/pm-agent/chat...\n');

    const res = await fetch(`${API_URL}/api/agents/pm-agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hola, soy un test desde Node.js',
        userId: 'dashboard-user'
      })
    });

    console.log('Status:', res.status, res.statusText);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const text = await res.text();
      console.log('Error:', text);
      return;
    }

    // Read SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    console.log('\nStreaming response:');
    console.log('-------------------');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);

        if (data === '[DONE]') {
          console.log('\n[Stream ended]');
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            console.error('Error:', parsed.error);
          }
          if (parsed.text) {
            process.stdout.write(parsed.text);
            fullResponse += parsed.text;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    console.log('\n-------------------');
    console.log('✅ Test completed successfully!');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err.stack);
  }
}

testChat();
