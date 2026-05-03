import 'dotenv/config';
import type { SignOptions } from 'jsonwebtoken';

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;

if (nodeEnv === 'production' && !jwtAccessSecret) {
  throw new Error('JWT_ACCESS_SECRET must be set in production.');
}

const config = {
  nodeEnv,
  port: parseNumber(process.env.PORT, 5000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  bcryptSaltRounds: parseNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  rateLimit: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.RATE_LIMIT_MAX, 100)
  },
  jwt: {
    accessSecret: jwtAccessSecret ?? 'development-only-secret',
    accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '1d') as SignOptions['expiresIn']
  }
};

export default config;
