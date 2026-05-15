import "dotenv/config";
import type { SignOptions } from "jsonwebtoken";

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;

if (nodeEnv === "production" && !jwtAccessSecret) {
  throw new Error("JWT_ACCESS_SECRET must be set in production.");
}

const config = {
  nodeEnv,
  port: parseNumber(process.env.PORT, 5000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  bcryptSaltRounds: parseNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  rateLimit: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.RATE_LIMIT_MAX, 100),
  },
  jwt: {
    accessSecret: jwtAccessSecret ?? "development-only-secret",
    accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ??
      "1d") as SignOptions["expiresIn"],
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "refresh-secret",
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ??
      "7d") as SignOptions["expiresIn"],
    resetSecret: process.env.JWT_RESET_SECRET ?? "reset-secret",
    resetExpiresIn: (process.env.JWT_RESET_EXPIRES_IN ??
      "15m") as SignOptions["expiresIn"],
  },
  email: {
    host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
    port: parseNumber(process.env.EMAIL_PORT, 587),
    user: process.env.EMAIL_USER ?? "",
    password: process.env.EMAIL_PASSWORD ?? "",
    from: process.env.EMAIL_FROM ?? "noreply@surfshare.com",
    adminEmail: process.env.ADMIN_EMAIL ?? "admin@surfshare.com",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  otp: {
    expiryMinutes: parseNumber(process.env.OTP_EXPIRY_MINUTES, 15),
    maxAttempts: parseNumber(process.env.OTP_MAX_ATTEMPTS, 5),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  },
};

export default config;
