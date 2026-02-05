import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import analyzeRouter from './routes/analyze.js';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/analyze', analyzeRouter);

  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  return app;
}
