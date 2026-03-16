/**
 * Test script para Context Builder
 *
 * Prueba buildAgentContext() con los 9 agentes activos de Emiralia
 * Verifica que el sistema construye correctamente el contexto para cada uno
 */

import { buildAgentContext, clearCache } from './context-builder.js';

// Lista de agentes activos (según AGENTS.md)
const ACTIVE_AGENTS = [
  'content-agent',
  'translation-agent',
  'data-agent',
  'frontend-agent',
  'dev-agent',
  'pm-agent',
  'marketing-agent',
  'research-agent',
  'wat-auditor-agent'
];

async function testAgent(agentId, channel = 'dashboard') {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing agent: ${agentId} (channel: ${channel})`);
  console.log('='.repeat(80));

  try {
    const context = await buildAgentContext(agentId, { channel });

    // Verificaciones básicas
    console.log('\n✅ Context built successfully!');
    console.log('\nAgent Definition:');
    console.log(`  - ID: ${context.agentDef.id}`);
    console.log(`  - Name: ${context.agentDef.name}`);
    console.log(`  - Role: ${context.agentDef.role}`);
    console.log(`  - Department: ${context.agentDef.department}`);
    console.log(`  - Skills: ${context.skills.length}`);
    console.log(`  - Tools: ${context.tools.length}`);

    console.log('\nMemory Entries:');
    console.log(`  - Shared entries loaded: ${context.memory.length}`);
    if (context.memory.length > 0) {
      context.memory.slice(0, 3).forEach(entry => {
        console.log(`    - ${entry.key}: ${JSON.stringify(entry.value).substring(0, 50)}...`);
      });
    }

    console.log('\nRecent Events:');
    console.log(`  - Events loaded: ${context.recentEvents.length}`);
    if (context.recentEvents.length > 0) {
      context.recentEvents.slice(0, 3).forEach(event => {
        console.log(`    - ${event.event_type}: ${JSON.stringify(event.content).substring(0, 50)}...`);
      });
    }

    console.log('\nSystem Prompt:');
    console.log(`  - Length: ${context.systemPrompt.length} characters`);
    console.log(`  - Preview (first 500 chars):`);
    console.log('  ---');
    console.log(context.systemPrompt.substring(0, 500));
    console.log('  ...');

    return { success: true, agentId, context };
  } catch (error) {
    console.error(`\n❌ Error testing ${agentId}:`, error.message);
    return { success: false, agentId, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n🧪 TESTING CONTEXT BUILDER FOR ALL ACTIVE AGENTS\n');

  const results = [];

  // Test en modo Dashboard
  console.log('\n📊 Testing in DASHBOARD mode...\n');
  for (const agentId of ACTIVE_AGENTS) {
    const result = await testAgent(agentId, 'dashboard');
    results.push(result);
  }

  // Test en modo Telegram (solo uno como ejemplo)
  console.log('\n\n📱 Testing in TELEGRAM mode (sample)...\n');
  const telegramResult = await testAgent('pm-agent', 'telegram');
  results.push({ ...telegramResult, channel: 'telegram' });

  // Resumen final
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed agents:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.agentId}: ${r.error}`);
    });
  }

  // Verificaciones adicionales
  console.log('\n\nAdditional Checks:');

  // Verificar que Telegram mode añade constraints
  const telegramContext = results.find(r => r.channel === 'telegram');
  if (telegramContext && telegramContext.success) {
    const hasTelegramConstraints = telegramContext.context.systemPrompt.includes('TELEGRAM CONSTRAINTS');
    console.log(`  - Telegram constraints present: ${hasTelegramConstraints ? '✅' : '❌'}`);
  }

  // Verificar que todos los agentes tienen system prompt
  const allHavePrompt = results.filter(r => r.success).every(r =>
    r.context && r.context.systemPrompt && r.context.systemPrompt.length > 100
  );
  console.log(`  - All agents have valid system prompt: ${allHavePrompt ? '✅' : '❌'}`);

  console.log('\n✅ Testing complete!\n');

  return results;
}

// Ejecutar automáticamente
runAllTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

export { testAgent, runAllTests };
