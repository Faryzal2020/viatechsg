import { createApp } from './app.js';
import { config, isMailerConfigured } from './config/env.js';
import { initDatabase } from './db/index.js';

async function bootstrap() {
  // 1. Initialize SQLite Database
  initDatabase();

  // 2. Initialize App
  const app = createApp();

  // 3. Start HTTP Server
  const server = app.listen(config.port, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Backend server listening on http://localhost:${config.port}`);
    console.log(`📦 Database: SQLite (${config.dbPath})`);
    console.log(`✉️  Mailer status: ${isMailerConfigured() ? 'Configured ✅' : 'Not configured (check .env) ⚠️'}`);
    console.log(`📡 POST Endpoint: http://localhost:${config.port}/api/submissions`);
    console.log(`                  http://localhost:${config.port}/submit`);
    console.log(`==================================================\n`);
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
