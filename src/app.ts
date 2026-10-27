import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { submissionsRouter } from './routes/submissions.js';
import { isMailerConfigured } from './config/env.js';

export function createApp(): Express {
  const app = express();

  // Standard middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Basic request logger
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mailerConfigured: isMailerConfigured(),
    });
  });

  // Mount submissions router
  // Accessible at both POST /api/submissions and POST /submit for convenience
  app.use('/api/submissions', submissionsRouter);
  app.use('/submit', submissionsRouter);

  // Fallback 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      availableEndpoints: [
        'POST /api/submissions (or POST /submit)',
        'GET  /api/submissions',
        'GET  /api/submissions/:id',
        'GET  /health',
      ],
    });
  });

  // Global error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal Server Error',
    });
  });

  return app;
}
