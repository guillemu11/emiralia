/**
 * Emiralia — Tool Execution Validation (Spike 1)
 *
 * Valida que los tools existentes son ejecutables como módulos ES6
 * sin necesidad de subprocess/CLI.
 *
 * Tests:
 *   1. memory.js (DB write + read)
 *   2. query_properties.js (DB query)
 *   3. skill-tracker.js (tracking)
 *   4. wat-memory.js (cross-agent memory)
 *   5. save_project.js (complex DB operation)
 *
 * Usage:
 *   node tools/core/validate-tool-execution.js
 */

import { setMemory, getMemory, listMemory } from '../db/memory.js';
import { queryDB } from '../db/query_properties.js';
import { trackSkill } from '../workspace-skills/skill-tracker.js';
import { getSystemState } from '../db/wat-memory.js';
import pool from '../db/pool.js';

const TEST_AGENT_ID = 'test-agent-validation';
const RESET_COLOR = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

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
  console.log(`${YELLOW}  Tool Execution Validation (Spike 1)${RESET_COLOR}`);
  console.log(`${YELLOW}═══════════════════════════════════════════════════${RESET_COLOR}\n`);

  try {
    // Setup: Create test agent
    console.log(`${BLUE}Setting up test agent...${RESET_COLOR}`);
    await pool.query(`
      INSERT INTO agents (id, name, role, department, status)
      VALUES ($1, 'Test Agent', 'Validation', 'testing', 'online')
      ON CONFLICT (id) DO NOTHING
    `, [TEST_AGENT_ID]);
    console.log(`${GREEN}✓ Test agent ready${RESET_COLOR}\n`);
    // Test 1: Memory Write
    await runTest('Test 1: memory.setMemory()', async () => {
      const value = { test: 'validation', timestamp: Date.now() };
      const result = await setMemory(TEST_AGENT_ID, 'validation_test', value, 'private');
      if (!result.id) throw new Error('No ID returned');
      return result;
    });

    // Test 2: Memory Read
    await runTest('Test 2: memory.getMemory()', async () => {
      const result = await getMemory(TEST_AGENT_ID, 'validation_test');
      if (!result || !result.value) throw new Error('Memory not found');
      const parsed = typeof result.value === 'string' ? JSON.parse(result.value) : result.value;
      if (parsed.test !== 'validation') throw new Error('Value mismatch');
      return result;
    });

    // Test 3: Memory List
    await runTest('Test 3: memory.listMemory()', async () => {
      const result = await listMemory(TEST_AGENT_ID);
      if (!Array.isArray(result)) throw new Error('Result is not an array');
      if (result.length === 0) throw new Error('No memories found');
      return result;
    });

    // Test 4: Database Query
    await runTest('Test 4: query_properties.queryDB()', async () => {
      const result = await queryDB('SELECT COUNT(*) as total FROM agents');
      if (!Array.isArray(result)) throw new Error('Result is not an array');
      if (!result[0] || typeof result[0].total === 'undefined') throw new Error('Invalid result structure');
      return result;
    });

    // Test 5: Skill Tracking
    await runTest('Test 5: skill-tracker.trackSkill()', async () => {
      const result = await trackSkill(TEST_AGENT_ID, 'validation-test', 'testing', 'completed');
      // trackSkill might not return anything, check it doesn't throw
      return { tracked: true };
    });

    // Test 6: WAT Memory (cross-agent)
    await runTest('Test 6: wat-memory.getSystemState()', async () => {
      const result = await getSystemState();
      if (!result || !Array.isArray(result.agents)) throw new Error('Invalid result structure');
      return result;
    });

    // Summary
    console.log(`\n${YELLOW}═══════════════════════════════════════════════════${RESET_COLOR}`);
    console.log(`${YELLOW}  Summary${RESET_COLOR}`);
    console.log(`${YELLOW}═══════════════════════════════════════════════════${RESET_COLOR}\n`);

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = Math.round(totalDuration / results.length);

    console.log(`  Total tests:     ${results.length}`);
    console.log(`  ${GREEN}Passed:          ${passed}${RESET_COLOR}`);
    console.log(`  ${failed > 0 ? RED : GREEN}Failed:          ${failed}${RESET_COLOR}`);
    console.log(`  Total duration:  ${totalDuration}ms`);
    console.log(`  Avg duration:    ${avgDuration}ms`);

    // Performance check
    if (avgDuration > 2000) {
      console.log(`\n  ${YELLOW}⚠ Warning: Average latency > 2s${RESET_COLOR}`);
    } else if (avgDuration < 500) {
      console.log(`\n  ${GREEN}✓ Excellent: Average latency < 500ms${RESET_COLOR}`);
    } else {
      console.log(`\n  ${GREEN}✓ Good: Average latency < 2s${RESET_COLOR}`);
    }

    // Cleanup
    console.log(`\n${BLUE}Cleaning up test data...${RESET_COLOR}`);
    await pool.query('DELETE FROM agent_memory WHERE agent_id = $1', [TEST_AGENT_ID]);
    await pool.query('DELETE FROM raw_events WHERE agent_id = $1', [TEST_AGENT_ID]);
    await pool.query('DELETE FROM agents WHERE id = $1', [TEST_AGENT_ID]);
    console.log(`${GREEN}✓ Cleanup complete${RESET_COLOR}\n`);

    await pool.end();

    // Exit code
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(`\n${RED}Fatal error: ${error.message}${RESET_COLOR}\n`);
    await pool.end();
    process.exit(1);
  }
}

main();
