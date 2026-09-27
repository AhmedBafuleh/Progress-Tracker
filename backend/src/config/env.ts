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
  OPENAI_API_KEY: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().min(20).optional(),
  ),
  OPENAI_MODEL: z.string().min(1).default('gpt-6-astra'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Environment configuration is invalid');
}

export const env = parsed.data;
