import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: false,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'progress-tracker-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
