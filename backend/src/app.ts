import express from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import contentRoutes from './modules/content/content.routes.js';
import managementRoutes from './modules/management/management.routes.js';
import progressRoutes from './modules/progress/progress.routes.js';
import operationsRoutes from './modules/operations/operations.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: false,
  }),
);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'progress-tracker-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
