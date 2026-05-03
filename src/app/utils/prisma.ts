import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import config from '../config';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL must be set.');
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const createPrismaClient = (): PrismaClient => {
  const adapter = new PrismaPg({
    connectionString: config.databaseUrl
  });

  return new PrismaClient({
    adapter,
    log: config.nodeEnv === 'development' ? ['query', 'warn', 'error'] : ['error']
  });
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
