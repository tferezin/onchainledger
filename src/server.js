import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Security middleware
import { securityHeaders, rateLimiter, hppProtection, corsOptions, requestSizeLimit } from './middleware/security.js';
import { sanitizeAllInputs } from './middleware/validation.js';
import { requestTimeout } from './middleware/timeout.js';
import { requestLogger } from './middleware/logger.js';
import { secureErrorHandler } from './utils/errors.js';

// Routes
import healthRouter from './routes/health.js';
import analyzeRouter from './routes/analyze.js';
import scoreRouter from './routes/score.js';
import { createX402Middleware } from './middleware/x402.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer() {
  const app = express();

  // 1. Security headers (helmet) - first
  app.use(securityHeaders);

  // 2. Request logging
  app.use(requestLogger);

  // 3. CORS with whitelist
  app.use(cors(corsOptions));

  // 4. Rate limiting
  app.use(rateLimiter);

  // 5. Request timeout (30s)
  app.use(requestTimeout(30000));

  // 6. Body parser with size limit
  app.use(express.json(requestSizeLimit));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  // 7. HPP (HTTP Parameter Pollution) protection
  app.use(hppProtection);

  // 8. Input sanitization
  app.use(sanitizeAllInputs);

  // 9. Serve static files from public directory
  app.use(express.static(path.join(__dirname, '../public')));

  // 10. Routes
  // Health check - free, no payment required
  app.use('/health', healthRouter);

  // Free score endpoint - no payment required
  app.use('/score', scoreRouter);

  // x402 payment middleware for analyze routes
  const x402 = createX402Middleware();
  app.use('/analyze', x402, analyzeRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  });

  // Secure error handler (last)
  app.use(secureErrorHandler);

  return app;
}
