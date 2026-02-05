import { validationResult, param, body } from 'express-validator';

// Solana base58 alphabet
const BASE58_ALPHABET = /^[1-9A-HJ-NP-Za-km-z]+$/;

// Dangerous patterns to reject
const DANGEROUS_PATTERNS = [
  /[<>]/,                          // HTML/XSS
  /javascript:/i,                   // JS injection
  /on\w+\s*=/i,                    // Event handlers
  /'.*--/,                         // SQL comment
  /;\s*drop\s/i,                   // SQL drop
  /;\s*delete\s/i,                 // SQL delete
  /;\s*insert\s/i,                 // SQL insert
  /;\s*update\s/i,                 // SQL update
  /union\s+select/i,               // SQL union
  /\.\.\//,                        // Path traversal
  /\x00/,                          // Null bytes
];

// Validate Solana token address
export function isValidSolanaAddress(address) {
  if (typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  if (!BASE58_ALPHABET.test(address)) return false;
  return true;
}

// Check for dangerous patterns
export function containsDangerousPattern(input) {
  if (typeof input !== 'string') return false;
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
}

// Sanitize string input
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .slice(0, 100) // Max length for any input
    .replace(/[<>'"]/g, ''); // Remove potentially dangerous chars
}

// Token address validation middleware
export const validateTokenAddress = [
  param('tokenAddress')
    .trim()
    .notEmpty()
    .withMessage('Token address is required')
    .isLength({ min: 32, max: 44 })
    .withMessage('Token address must be 32-44 characters')
    .matches(BASE58_ALPHABET)
    .withMessage('Invalid token address format')
    .custom((value) => {
      if (containsDangerousPattern(value)) {
        throw new Error('Invalid characters in token address');
      }
      return true;
    })
];

// Validation error handler
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request parameters',
      details: errors.array().map(e => ({
        field: e.path,
        message: e.msg
      }))
    });
  }
  next();
}

// General input sanitization middleware
export function sanitizeAllInputs(req, res, next) {
  // Check URL path for dangerous patterns (before params are parsed)
  if (req.path && containsDangerousPattern(decodeURIComponent(req.path))) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid characters detected in request'
    });
  }

  // Sanitize params (if already parsed)
  if (req.params) {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        // Check for dangerous patterns first
        if (containsDangerousPattern(req.params[key])) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid characters detected in request'
          });
        }
      }
    }
  }

  // Sanitize query
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        if (containsDangerousPattern(req.query[key])) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid characters detected in request'
          });
        }
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        if (containsDangerousPattern(req.body[key])) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid characters detected in request'
          });
        }
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }

  next();
}
