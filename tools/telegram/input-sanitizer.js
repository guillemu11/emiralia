/**
 * Input Sanitizer
 *
 * Prevents command injection, XSS, and other injection attacks
 * by stripping dangerous characters from user input.
 *
 * Part of Feature 11: Security & Auth (Agent Command Center)
 */

// Dangerous patterns to remove
const DANGEROUS_PATTERNS = [
  /[;&|`]/g,              // Shell injection characters
  /<script/gi,            // XSS
  /\.\.\//g,              // Path traversal
  /\$\{/g,                // Template injection
  /\$\(/g,                // Command substitution $()
  /eval\(/gi,             // Code execution
  /exec\(/gi,             // Code execution
  /require\(/gi,          // Module injection (Node.js)
  /import\(/gi,           // Dynamic import injection
];

/**
 * Sanitize a single string input
 *
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return input;

  let cleaned = input;

  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Trim whitespace
  cleaned = cleaned.trim();

  // Limit length to prevent DoS
  if (cleaned.length > 2000) {
    cleaned = cleaned.substring(0, 2000);
  }

  return cleaned;
}

/**
 * Sanitize arguments (string, array, or object)
 *
 * @param {string|Array|Object} args - Arguments to sanitize
 * @returns {string|Array|Object} Sanitized arguments
 */
export function sanitizeArguments(args) {
  if (typeof args === 'string') {
    return sanitizeInput(args);
  }

  if (Array.isArray(args)) {
    return args.map(sanitizeInput);
  }

  if (typeof args === 'object' && args !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(args)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitized;
  }

  return args;
}

/**
 * Sanitize command text (removes command prefix first)
 *
 * @param {string} commandText - Full command text with args
 * @returns {string} Sanitized command text
 */
export function sanitizeCommand(commandText) {
  if (!commandText || typeof commandText !== 'string') return commandText;

  // Split command and args
  const parts = commandText.split(' ');
  const command = parts[0]; // Keep command as-is
  const args = parts.slice(1).map(sanitizeInput);

  return [command, ...args].join(' ');
}
