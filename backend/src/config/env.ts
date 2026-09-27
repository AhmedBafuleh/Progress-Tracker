import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(24),
  JWT_EXPIRES_IN: z.string().default('8h'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  PASSWORD_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'PASSWORD_ENCRYPTION_KEY must be exactly 64 hexadecimal characters'),
  LOCAL_AI_BASE_URL: z.string().url().default('http://127.0.0.1:11434'),
  LOCAL_AI_MODEL: z.string().min(1).default('gpt-oss:20b'),
  LOCAL_AI_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Environment configuration is invalid');
}

export const env = parsed.data;
