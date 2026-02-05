import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import analyzeRouter from './routes/analyze.js';
import { createX402Middleware } from './middleware/x402.js';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check - free, no payment required
  app.use('/health', healthRouter);

  // x402 payment middleware for analyze routes
  const x402 = createX402Middleware();
  app.use('/analyze', x402, analyzeRouter);

  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  return app;
}
