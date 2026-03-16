/**
 * Emiralia — Tool Executor Integration Tests
 *
 * Validates:
 *   1. Tool execution (success path)
 *   2. Permission validation
 *   3. Timeout enforcement
 *   4. Event logging
 *   5. Error handling
 *
 * Usage:
 *   node tools/core/test-tool-executor.js
 */

import { executeToolForAgent, getAvailableTools, getToolMetadata, clearToolCache } from './tool-executor.js';
import pool from '../db/pool.js';

const RESET_COLOR = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

const TEST_AGENT_ID = 'test-executor-validation';
const results = [];

async function runTest(name, fn) {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    console.log(`${GREEN}✓${RESET_COLOR} ${name} ${BLUE}(${duration}ms)${RESET_COLOR}`);
    results.push({ name, status: 'pass', duration, result });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`${RED}✗${RESET_COLOR} ${name} ${BLUE}(${duration}ms)${RESET_COLOR}`);
    console.log(`  ${RED}Error: ${error.message}${RESET_COLOR}`);
    results.push({ name, status: 'fail', duration, error: error.message });
    throw error;
  }
}

async function main() {
  console.log(`\n${YELLOW}═══════════════════════════════════════════════════${RESET_COLOR}`);
  console.log(`${YELLOW}  Tool Executor Integration Tests${RESET_COLOR}`);
  console.log(`${YELLOW}═══════════════════════════════════════════════════${RESET_COLOR}\n`);

  try {
    // Setup: Create test agent
    console.log(`${BLUE}Setting up test agent...${RESET_COLOR}`);
    await pool.query(`
      INSERT INTO agents (id, name, role, department, status)
      VALUES ($1, 'Test Executor Agent', 'Validation', 'testing', 'online')
      ON CONFLICT (id) DO NOTHING
    `, [TEST_AGENT_ID]);
    console.log(`${GREEN}✓ Test agent ready${RESET_COLOR}\n`);

    // Test 1: Execute tool with wildcard permissions (memory.set)
    await runTest('Test 1: Execute tool (wildcard permission)', async () => {
      const result = await executeToolForAgent(
        TEST_AGENT_ID,
        'memory.set',
        [TEST_AGENT_ID, 'executor_test', { foo: 'bar' }, 'private']
      );
      if (!result || !result.id) throw new Error('Invalid result');
      return result;
    });

    // Test 2: Execute tool with specific permissions (query.properties)
    await runTest('Test 2: Execute tool (should fail - no permission)', async () => {
      try {
        await executeToolForAgent(
          TEST_AGENT_ID, // Not in permissions list for query.properties
          'query.properties',
          ['SELECT COUNT(*) FROM agents']
        );
        throw new Error('Should have thrown PERMISSION_DENIED');
      } catch (error) {
        if (error.code !== 'PERMISSION_DENIED') {
          throw new Error(`Expected PERMISSION_DENIED, got: ${error.code || error.message}`);
        }
        return { permissionDenied: true };
      }
    });

    // Test 3: Execute with allowed permission
    await runTest('Test 3: Execute tool (allowed permission)', async () => {
      // data-agent has permission for query.properties
      const result = await executeToolForAgent(
        'data-agent',
        'query.properties',
        ['SELECT COUNT(*) as total FROM agents']
      );
      if (!Array.isArray(result)) throw new Error('Expected array result');
      if (!result[0] || typeof result[0].total === 'undefined') throw new Error('Invalid result structure');
      return result;
    });

    // Test 4: Check event logging
    await runTest('Test 4: Verify event logging', async () => {
      const events = await pool.query(`
        SELECT event_type, content
        FROM raw_events
        WHERE agent_id = $1
          AND event_type = 'tool_execution'
        ORDER BY timestamp DESC
        LIMIT 5
      `, [TEST_AGENT_ID]);

      if (events.rows.length === 0) {
        throw new Error('No tool_execution events found');
      }

      // Check for 'started' and 'completed' events
      const statuses = events.rows.map(r => r.content.status);
      if (!statuses.includes('started')) {
        throw new Error('No "started" event found');
      }
      if (!statuses.includes('completed')) {
        throw new Error('No "completed" event found');
      }

      return { eventsLogged: events.rows.length, statuses };
    });

    // Test 5: Get available tools for agent
    await runTest('Test 5: Get available tools', async () => {
      const tools = await getAvailableTools(TEST_AGENT_ID);
      if (!Array.isArray(tools)) throw new Error('Expected array');
      if (tools.length === 0) throw new Error('No tools available');

      // Should include wildcard tools like memory.*
      const hasMemorySet = tools.some(t => t.name === 'memory.set');
      if (!hasMemorySet) throw new Error('memory.set should be available');

      return { toolCount: tools.length };
    });

    // Test 6: Get tool metadata
    await runTest('Test 6: Get tool metadata', async () => {
      const meta = await getToolMetadata('memory.set');
      if (!meta.name || !meta.description) throw new Error('Invalid metadata');
      if (!meta.args || !Array.isArray(meta.args)) throw new Error('Missing args');
      return meta;
    });

    // Test 7: Execute with custom timeout (should succeed quickly)
    await runTest('Test 7: Execute with custom timeout', async () => {
      const result = await executeToolForAgent(
        TEST_AGENT_ID,
        'memory.get',
        [TEST_AGENT_ID, 'executor_test'],
        { timeout: 1000 } // Very short timeout, but query is fast
      );
      if (!result || !result.value) throw new Error('Memory not found');
      return result;
    });

    // Test 8: Disable event logging
    await runTest('Test 8: Execute without logging', async () => {
      const beforeCount = await pool.query(`
        SELECT COUNT(*) as count FROM raw_events
        WHERE agent_id = $1 AND event_type = 'tool_execution'
      `, [TEST_AGENT_ID]);

      await executeToolForAgent(
        TEST_AGENT_ID,
        'memory.list',
        [TEST_AGENT_ID],
        { logEvents: false }
      );

      const afterCount = await pool.query(`
        SELECT COUNT(*) as count FROM raw_events
        WHERE agent_id = $1 AND event_type = 'tool_execution'
      `, [TEST_AGENT_ID]);

      if (Number(afterCount.rows[0].count) !== Number(beforeCount.rows[0].count)) {
        throw new Error('Events were logged despite logEvents: false');
      }

      return { noNewEvents: true };
    });

    // Test 9: Invalid tool name
    await runTest('Test 9: Invalid tool name (should fail)', async () => {
      try {
        await executeToolForAgent(TEST_AGENT_ID, 'nonexistent.tool', []);
        throw new Error('Should have thrown error');
      } catch (error) {
        if (!error.message.includes('not found in registry')) {
          throw new Error(`Expected "not found" error, got: ${error.message}`);
        }
        return { errorCaught: true };
      }
    });

    // Test 10: Verify performance (20 tools executed)
    await runTest('Test 10: Performance test (20 executions)', async () => {
      const start = Date.now();
      const promises = [];

      for (let i = 0; i < 20; i++) {
        promises.push(
          executeToolForAgent(
            TEST_AGENT_ID,
            'memory.set',
            [TEST_AGENT_ID, `perf_test_${i}`, { index: i }, 'private'],
            { logEvents: false } // Disable logging to focus on execution speed
          )
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - start;
      const avgPerExecution = Math.round(duration / 20);

      if (avgPerExecution > 100) {
        throw new Error(`Performance issue: avg ${avgPerExecution}ms per execution (target: <100ms)`);
      }

      return { totalDuration: duration, avgPerExecution };
    });

    // Summary
    console.log(`\n${YELLOW}═══════════════════════════════════════════════════${RESET_COLOR}`);
    console.log(`${YELLOW}  Summary${RESET_COLOR}`);
    console.log(`${YELLOW}═══════════════════════════════════════════════════${RESET_COLOR}\n`);

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`  Total tests:     ${results.length}`);
    console.log(`  ${GREEN}Passed:          ${passed}${RESET_COLOR}`);
    console.log(`  ${failed > 0 ? RED : GREEN}Failed:          ${failed}${RESET_COLOR}`);
    console.log(`  Total duration:  ${totalDuration}ms`);

    if (passed === results.length) {
      console.log(`\n  ${GREEN}✓ All tests passed! Tool Executor ready for production.${RESET_COLOR}`);
    }

    // Cleanup
    console.log(`\n${BLUE}Cleaning up test data...${RESET_COLOR}`);
    await pool.query('DELETE FROM agent_memory WHERE agent_id = $1', [TEST_AGENT_ID]);
    await pool.query('DELETE FROM raw_events WHERE agent_id = $1', [TEST_AGENT_ID]);
    await pool.query('DELETE FROM agents WHERE id = $1', [TEST_AGENT_ID]);
    clearToolCache();
    console.log(`${GREEN}✓ Cleanup complete${RESET_COLOR}\n`);

    await pool.end();

    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(`\n${RED}Fatal error: ${error.message}${RESET_COLOR}\n`);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

main();
