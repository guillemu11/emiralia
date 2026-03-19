/**
 * CRUD Argument Parsers
 *
 * Parses and validates arguments for CRUD operations from Telegram commands.
 * Supports key=value format with type coercion.
 */

// Resource schemas with required/optional fields and enums
const RESOURCE_SCHEMAS = {
  projects: {
    required: ['name', 'status'],
    optional: ['problem', 'solution', 'department', 'sub_area', 'estimated_timeline', 'estimated_budget', 'priority'],
    enums: {
      status: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      department: ['product', 'engineering', 'marketing', 'sales', 'operations'],
      priority: ['low', 'medium', 'high', 'critical']
    }
  },
  tasks: {
    required: ['description'],
    optional: ['agent', 'effort', 'status', 'priority', 'type', 'dependencies', 'phase_id', 'project_id'],
    enums: {
      status: ['pending', 'in_progress', 'blocked', 'completed', 'cancelled'],
      priority: ['low', 'medium', 'high', 'critical'],
      type: ['development', 'research', 'design', 'testing', 'deployment', 'documentation']
    }
  },
  phases: {
    required: ['name', 'project_id'],
    optional: ['objective', 'order_index'],
    enums: {}
  },
  inbox_items: {
    required: ['title'],
    optional: ['description', 'status', 'department', 'summary', 'conversation', 'structured_data', 'project_id', 'weekly_session_id'],
    enums: {
      status: ['new', 'in_review', 'accepted', 'rejected', 'converted'],
      department: ['product', 'engineering', 'marketing', 'sales', 'operations']
    }
  },
  agent_memory: {
    required: ['key', 'value'],
    optional: ['scope'],
    enums: {
      scope: ['private', 'shared']
    }
  },
  telegram_users: {
    required: [],
    optional: ['username', 'first_name', 'last_name', 'language_code', 'active_agent_id', 'is_authorized', 'role'],
    enums: {
      role: ['viewer', 'operator', 'admin']
    }
  },
  properties: {
    required: [],
    optional: ['name', 'price', 'location', 'status', 'developer'],
    enums: {
      status: ['active', 'sold', 'off_market']
    }
  }
};

/**
 * Parse CRUD command arguments
 * @param {string} commandText - Full command text (e.g., "create project name=Test status=active")
 * @returns {object} { operation, resourceType, resourceId, data, filters }
 */
export function parseArguments(commandText) {
  const parts = commandText.trim().split(/\s+/);

  if (parts.length < 2) {
    throw new Error('Invalid command format. Usage: /create <resource> key=value ...');
  }

  const [operation, resourceType, ...args] = parts;

  let resourceId = null;
  const data = {};
  const filters = {};

  // For read/update/delete, second arg after resource type is ID
  if (['read', 'update', 'delete'].includes(operation) && args.length > 0) {
    const firstArg = args[0];

    // Check if first arg is an ID (number or doesn't contain '=')
    if (!firstArg.includes('=')) {
      resourceId = args.shift();
    }
  }

  // Parse key=value pairs
  args.forEach(arg => {
    const match = arg.match(/^(\w+)=(.+)$/);
    if (!match) {
      // Skip malformed arguments
      console.warn(`Skipping malformed argument: ${arg}`);
      return;
    }

    const [, key, rawValue] = match;
    let value = parseValue(rawValue);

    // For list operation, treat as filters
    if (operation === 'list') {
      filters[key] = value;
    } else {
      data[key] = value;
    }
  });

  return {
    operation,
    resourceType,
    resourceId,
    data,
    filters
  };
}

/**
 * Parse and coerce value based on format
 * @param {string} rawValue - Raw string value
 * @returns {any} Parsed value
 */
function parseValue(rawValue) {
  // Boolean
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;

  // Null
  if (rawValue === 'null') return null;

  // Number (integer)
  if (/^\d+$/.test(rawValue)) {
    return parseInt(rawValue, 10);
  }

  // Number (float)
  if (/^\d+\.\d+$/.test(rawValue)) {
    return parseFloat(rawValue);
  }

  // Quoted string (remove quotes)
  if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
    return rawValue.slice(1, -1);
  }

  if (rawValue.startsWith("'") && rawValue.endsWith("'")) {
    return rawValue.slice(1, -1);
  }

  // JSON object or array (attempt parse)
  if ((rawValue.startsWith('{') && rawValue.endsWith('}')) ||
      (rawValue.startsWith('[') && rawValue.endsWith(']'))) {
    try {
      return JSON.parse(rawValue);
    } catch (e) {
      // If parse fails, return as-is
      return rawValue;
    }
  }

  // Default: return as string
  return rawValue;
}

/**
 * Validate data against resource schema
 * @param {string} resourceType - Resource type
 * @param {string} operation - Operation (create/update)
 * @param {object} data - Data object
 * @throws {Error} If validation fails
 */
export function validateData(resourceType, operation, data) {
  const schema = RESOURCE_SCHEMAS[resourceType];

  if (!schema) {
    throw new Error(`Unknown resource type: ${resourceType}`);
  }

  // Check required fields (only for CREATE)
  if (operation === 'create') {
    const missing = schema.required.filter(field => !(field in data));
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  // Validate enum values
  for (const [field, allowedValues] of Object.entries(schema.enums || {})) {
    if (data[field] && !allowedValues.includes(data[field])) {
      throw new Error(`Invalid ${field}: must be one of [${allowedValues.join(', ')}]`);
    }
  }

  // Validate field names (prevent SQL injection via field names)
  const allFields = [...schema.required, ...schema.optional];
  for (const field of Object.keys(data)) {
    if (!allFields.includes(field)) {
      throw new Error(`Unknown field: ${field}. Allowed fields: ${allFields.join(', ')}`);
    }
  }

  return true;
}

/**
 * Validate filters for list operation
 * @param {string} resourceType - Resource type
 * @param {object} filters - Filters object
 * @returns {boolean}
 */
export function validateFilters(resourceType, filters) {
  const schema = RESOURCE_SCHEMAS[resourceType];

  if (!schema) {
    throw new Error(`Unknown resource type: ${resourceType}`);
  }

  const allFields = [...schema.required, ...schema.optional];

  for (const field of Object.keys(filters)) {
    if (!allFields.includes(field)) {
      throw new Error(`Unknown filter field: ${field}. Allowed: ${allFields.join(', ')}`);
    }
  }

  return true;
}

/**
 * Get schema for resource type
 * @param {string} resourceType - Resource type
 * @returns {object|null}
 */
export function getSchema(resourceType) {
  return RESOURCE_SCHEMAS[resourceType] || null;
}

/**
 * Format data for display (help text)
 * @param {string} resourceType - Resource type
 * @returns {string}
 */
export function getSchemaHelp(resourceType) {
  const schema = RESOURCE_SCHEMAS[resourceType];

  if (!schema) {
    return `Unknown resource type: ${resourceType}`;
  }

  let help = `**${resourceType}** schema:\n\n`;

  if (schema.required.length > 0) {
    help += `Required fields: ${schema.required.join(', ')}\n`;
  }

  if (schema.optional.length > 0) {
    help += `Optional fields: ${schema.optional.join(', ')}\n`;
  }

  if (Object.keys(schema.enums).length > 0) {
    help += '\nEnum constraints:\n';
    for (const [field, values] of Object.entries(schema.enums)) {
      help += `  ${field}: ${values.join(' | ')}\n`;
    }
  }

  return help;
}
