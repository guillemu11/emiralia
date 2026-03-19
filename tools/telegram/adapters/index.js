/**
 * CRUD Adapters Index
 *
 * Exports all resource adapters for CRUD operations.
 */

import projects from './projects.js';
import tasks from './tasks.js';
import memory from './memory.js';
import properties from './properties.js';
import inbox from './inbox.js';
import users from './users.js';

// Map resource types to adapters
const adapters = {
  projects,
  tasks,
  agent_memory: memory,
  properties,
  inbox_items: inbox,
  telegram_users: users
};

/**
 * Get adapter for resource type
 * @param {string} resourceType - Resource type
 * @returns {object|null} Adapter object
 */
export function getAdapter(resourceType) {
  return adapters[resourceType] || null;
}

/**
 * Check if adapter exists for resource type
 * @param {string} resourceType - Resource type
 * @returns {boolean}
 */
export function hasAdapter(resourceType) {
  return resourceType in adapters;
}

/**
 * Get list of supported resource types
 * @returns {string[]}
 */
export function getSupportedResources() {
  return Object.keys(adapters);
}

export default adapters;
