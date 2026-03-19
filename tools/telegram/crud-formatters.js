/**
 * CRUD Response Formatters
 *
 * Formats CRUD operation results for Telegram display.
 * Handles pagination and character limits.
 */

const MAX_TELEGRAM_LENGTH = 4096;
const MAX_LIST_ITEMS = 50;

/**
 * Format CRUD operation response
 * @param {string} operation - Operation type
 * @param {string} resourceType - Resource type
 * @param {any} result - Operation result
 * @returns {string} Formatted message
 */
export function formatResponse(operation, resourceType, result) {
  switch (operation) {
    case 'create':
      return formatCreateResponse(resourceType, result);
    case 'read':
      return formatReadResponse(resourceType, result);
    case 'update':
      return formatUpdateResponse(resourceType, result);
    case 'delete':
      return formatDeleteResponse(resourceType, result);
    case 'list':
      return formatListResponse(resourceType, result);
    default:
      return `Unknown operation: ${operation}`;
  }
}

/**
 * Format CREATE response
 */
function formatCreateResponse(resourceType, resource) {
  if (!resource) {
    return `❌ Failed to create ${resourceType}`;
  }

  return `✅ Created ${resourceType} #${resource.id}

${formatSingleResource(resourceType, resource)}`;
}

/**
 * Format READ response
 */
function formatReadResponse(resourceType, resource) {
  if (!resource) {
    return `❌ ${resourceType} not found`;
  }

  return formatSingleResource(resourceType, resource);
}

/**
 * Format UPDATE response
 */
function formatUpdateResponse(resourceType, resource) {
  if (!resource) {
    return `❌ Failed to update ${resourceType}`;
  }

  return `✅ Updated ${resourceType} #${resource.id}

${formatSingleResource(resourceType, resource)}`;
}

/**
 * Format DELETE response
 */
function formatDeleteResponse(resourceType, result) {
  if (!result || !result.deleted) {
    return `❌ Failed to delete ${resourceType}`;
  }

  return `🗑️ Deleted ${resourceType} #${result.id || result.resourceId}`;
}

/**
 * Format LIST response
 */
function formatListResponse(resourceType, results) {
  if (!Array.isArray(results)) {
    return `❌ Invalid list results for ${resourceType}`;
  }

  if (results.length === 0) {
    return `No ${resourceType} found`;
  }

  const header = `📋 ${results.length} ${resourceType} found:\n\n`;
  const items = results.slice(0, MAX_LIST_ITEMS).map((item, idx) =>
    `${idx + 1}. ${formatListItem(resourceType, item)}`
  ).join('\n\n');

  let response = header + items;

  // Add truncation notice if exceeded limit
  if (results.length > MAX_LIST_ITEMS) {
    response += `\n\n... (showing first ${MAX_LIST_ITEMS} of ${results.length} results)`;
    response += `\n\nUse filters to narrow down: /list ${resourceType} key=value`;
  }

  // Paginate if exceeds Telegram limit
  if (response.length > MAX_TELEGRAM_LENGTH) {
    return paginateResponse(response, results.length, resourceType);
  }

  return response;
}

/**
 * Format single resource for display
 */
function formatSingleResource(resourceType, resource) {
  switch (resourceType) {
    case 'projects':
      return formatProject(resource);
    case 'tasks':
      return formatTask(resource);
    case 'phases':
      return formatPhase(resource);
    case 'inbox_items':
      return formatInboxItem(resource);
    case 'agent_memory':
      return formatMemory(resource);
    case 'telegram_users':
      return formatUser(resource);
    case 'properties':
      return formatProperty(resource);
    default:
      return JSON.stringify(resource, null, 2);
  }
}

/**
 * Format list item (compact version)
 */
function formatListItem(resourceType, item) {
  switch (resourceType) {
    case 'projects':
      return `#${item.id} **${item.name}** (${item.status})`;
    case 'tasks':
      return `#${item.id} ${item.description.substring(0, 60)}${item.description.length > 60 ? '...' : ''} [${item.status}]`;
    case 'phases':
      return `#${item.id} ${item.name} (Project #${item.project_id})`;
    case 'inbox_items':
      return `#${item.id} ${item.title} [${item.status}]`;
    case 'agent_memory':
      return `${item.agent_id}:${item.key} (${item.scope})`;
    case 'telegram_users':
      return `${item.username || item.first_name} (${item.role})`;
    case 'properties':
      return `#${item.id} ${item.name} - ${item.price} AED - ${item.location}`;
    default:
      return JSON.stringify(item);
  }
}

// Individual resource formatters

function formatProject(project) {
  return `📁 **Project #${project.id}**
Name: ${project.name}
Status: ${project.status}
${project.priority ? `Priority: ${project.priority}` : ''}
${project.department ? `Department: ${project.department}` : ''}
${project.estimated_timeline ? `Timeline: ${project.estimated_timeline}` : ''}
${project.estimated_budget ? `Budget: ${project.estimated_budget}` : ''}
Created: ${formatDate(project.created_at)}

${project.problem ? `**Problem:**\n${project.problem}\n\n` : ''}${project.solution ? `**Solution:**\n${project.solution}` : ''}`.trim();
}

function formatTask(task) {
  return `✓ **Task #${task.id}**
Description: ${task.description}
Status: ${task.status}
${task.agent ? `Agent: ${task.agent}` : ''}
${task.priority ? `Priority: ${task.priority}` : ''}
${task.effort ? `Effort: ${task.effort}` : ''}
${task.type ? `Type: ${task.type}` : ''}
${task.phase_id ? `Phase: #${task.phase_id}` : ''}
${task.project_id ? `Project: #${task.project_id}` : ''}
${task.dependencies ? `Dependencies: ${task.dependencies}` : ''}
Created: ${formatDate(task.created_at)}`.trim();
}

function formatPhase(phase) {
  return `📌 **Phase #${phase.id}**
Name: ${phase.name}
Project: #${phase.project_id}
${phase.objective ? `Objective: ${phase.objective}` : ''}
${phase.order_index ? `Order: ${phase.order_index}` : ''}
Created: ${formatDate(phase.created_at)}`.trim();
}

function formatInboxItem(item) {
  return `📥 **Inbox Item #${item.id}**
Title: ${item.title}
Status: ${item.status}
${item.department ? `Department: ${item.department}` : ''}
${item.project_id ? `Project: #${item.project_id}` : ''}
Created: ${formatDate(item.created_at)}

${item.description ? `**Description:**\n${item.description}\n\n` : ''}${item.summary ? `**Summary:**\n${item.summary}` : ''}`.trim();
}

function formatMemory(memory) {
  const valueStr = typeof memory.value === 'object'
    ? JSON.stringify(memory.value, null, 2)
    : String(memory.value);

  return `💾 **Memory #${memory.id}**
Agent: ${memory.agent_id}
Key: ${memory.key}
Scope: ${memory.scope}
Updated: ${formatDate(memory.updated_at)}

**Value:**
\`\`\`
${valueStr}
\`\`\``.trim();
}

function formatUser(user) {
  return `👤 **User #${user.user_id}**
${user.username ? `Username: @${user.username}` : ''}
Name: ${user.first_name || ''} ${user.last_name || ''}
Role: ${user.role}
Authorized: ${user.is_authorized ? '✅' : '❌'}
${user.active_agent_id ? `Active Agent: ${user.active_agent_id}` : ''}
Language: ${user.language_code || 'N/A'}
Last Active: ${formatDate(user.last_interaction_at)}`.trim();
}

function formatProperty(property) {
  return `🏢 **Property #${property.id}**
Name: ${property.name}
Price: ${property.price} AED
Location: ${property.location}
${property.developer ? `Developer: ${property.developer}` : ''}
${property.bedrooms ? `Bedrooms: ${property.bedrooms}` : ''}
${property.bathrooms ? `Bathrooms: ${property.bathrooms}` : ''}
${property.area_sqft ? `Area: ${property.area_sqft} sqft` : ''}
Status: ${property.status}
Created: ${formatDate(property.created_at)}`.trim();
}

/**
 * Format date in readable format
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-GB');
    }
  } catch (e) {
    return dateString;
  }
}

/**
 * Paginate response if too long
 */
function paginateResponse(fullText, totalCount, resourceType) {
  const maxLength = MAX_TELEGRAM_LENGTH - 300; // Reserve space for footer
  const truncated = fullText.substring(0, maxLength);

  return `${truncated}

... (message truncated, showing first ~10 items)

Total: ${totalCount} ${resourceType}

Use filters to narrow down: /list ${resourceType} key=value`;
}

/**
 * Format error message
 */
export function formatError(operation, resourceType, error) {
  return `❌ **CRUD Error**
Operation: ${operation}
Resource: ${resourceType}
Error: ${error.message || error}`;
}
