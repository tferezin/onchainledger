import crypto from 'crypto';

// Hash IP for privacy (one-way, can't reverse)
function hashIP(ip) {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip + 'salt').digest('hex').slice(0, 16);
}

// Fields to never log
const REDACT_HEADERS = [
  'authorization',
  'x-payment',
  'cookie',
  'x-api-key'
];

// Create safe request log entry
function createLogEntry(req, res, responseTime) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

  return {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ipHash: hashIP(ip),
    userAgent: req.headers['user-agent']?.slice(0, 100) || 'unknown',
    contentLength: res.get('content-length') || 0
  };
}

// Request logging middleware
export function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const logEntry = createLogEntry(req, res, responseTime);

    // Use appropriate log level based on status
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ level: 'error', ...logEntry }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ level: 'warn', ...logEntry }));
    } else {
      console.log(JSON.stringify({ level: 'info', ...logEntry }));
    }
  });

  next();
}

// Sanitize object for logging (remove sensitive fields)
export function sanitizeForLog(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Skip sensitive fields
    if (REDACT_HEADERS.some(h => lowerKey.includes(h))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Skip API keys
    if (lowerKey.includes('key') || lowerKey.includes('secret') || lowerKey.includes('token')) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value);
    } else if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.slice(0, 200) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export default requestLogger;
