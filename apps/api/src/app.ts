import express, { type Express } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { notFoundHandler } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { rootRouter } from './routes';

export function createApp(): Express {
  const app = express();

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  app.use(requestLogger);
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true);
        if (
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(requestOrigin) ||
          requestOrigin === 'http://localhost:3000' ||
          /^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(requestOrigin)
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '15mb' }));

  app.use(rootRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
