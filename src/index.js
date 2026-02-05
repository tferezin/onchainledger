import 'dotenv/config';
import { createServer } from './server.js';
import { validateConfig, config } from './utils/config.js';

// Validate configuration before starting
validateConfig();

const PORT = config.port;

const app = createServer();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions (log but don't expose details)
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

app.listen(PORT, () => {
  console.log(`OnChainLedger API running on port ${PORT}`);
  console.log(`Environment: ${config.isProduction ? 'production' : 'development'}`);
});
