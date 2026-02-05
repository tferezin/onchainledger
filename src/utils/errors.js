// Secure error handling utilities
// Never expose stack traces, internal paths, or API keys

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Generic error messages for clients
const GENERIC_ERRORS = {
  INTERNAL: 'An internal error occurred. Please try again later.',
  EXTERNAL_API: 'Unable to fetch token data. Please try again.',
  VALIDATION: 'Invalid request parameters.',
  NOT_FOUND: 'Resource not found.',
  RATE_LIMIT: 'Too many requests. Please try again later.',
  PAYMENT: 'Payment required.',
  TIMEOUT: 'Request timed out. Please try again.'
};

// Sensitive patterns to redact from logs
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /auth/i,
  /bearer/i,
  /private/i,
  /credential/i
];

// Check if string contains sensitive data
function containsSensitiveData(str) {
  if (typeof str !== 'string') return false;
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(str));
}

// Redact sensitive information from error messages
function redactSensitive(message) {
  if (typeof message !== 'string') return message;

  // Redact API keys (common formats)
  let redacted = message.replace(/[a-f0-9]{32,}/gi, '[REDACTED]');
  redacted = redacted.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]');

  // Redact file paths
  redacted = redacted.replace(/\/[^\s]+\.(js|ts|json)/g, '[PATH]');

  // Redact URLs with potential secrets
  redacted = redacted.replace(/https?:\/\/[^\s]+api[^\s]*/gi, '[API_URL]');

  return redacted;
}

// Create safe error response for clients
export function createSafeError(error, type = 'INTERNAL') {
  const response = {
    error: type.replace(/_/g, ' '),
    message: GENERIC_ERRORS[type] || GENERIC_ERRORS.INTERNAL
  };

  // In development, add more details (but still redact sensitive data)
  if (!IS_PRODUCTION && error) {
    response.debug = {
      originalMessage: redactSensitive(error.message)
    };
  }

  return response;
}

// Log error securely (server-side only)
export function logError(error, context = {}) {
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    level: 'error',
    message: redactSensitive(error.message || 'Unknown error'),
    context: {
      path: context.path,
      method: context.method,
      statusCode: context.statusCode
    }
  };

  // Don't log stack traces in production
  if (!IS_PRODUCTION && error.stack) {
    logEntry.stack = redactSensitive(error.stack);
  }

  console.error(JSON.stringify(logEntry));
}

// Error handler middleware
export function secureErrorHandler(err, req, res, next) {
  // Log the error securely
  logError(err, {
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500
  });

  // Determine error type
  let type = 'INTERNAL';
  let statusCode = 500;

  if (err.message?.includes('timeout') || err.code === 'ETIMEDOUT') {
    type = 'TIMEOUT';
    statusCode = 504;
  } else if (err.message?.includes('validation') || err.statusCode === 400) {
    type = 'VALIDATION';
    statusCode = 400;
  } else if (err.statusCode === 404) {
    type = 'NOT_FOUND';
    statusCode = 404;
  } else if (err.statusCode === 429) {
    type = 'RATE_LIMIT';
    statusCode = 429;
  } else if (err.statusCode === 402) {
    type = 'PAYMENT';
    statusCode = 402;
  }

  // Send safe response
  res.status(statusCode).json(createSafeError(err, type));
}

// Wrap external API errors
export function wrapExternalError(error, apiName) {
  logError(error, { context: `External API: ${apiName}` });

  const wrapped = new Error(GENERIC_ERRORS.EXTERNAL_API);
  wrapped.statusCode = 502;
  wrapped.isExternal = true;

  return wrapped;
}
