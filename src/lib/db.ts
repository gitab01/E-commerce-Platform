import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'test' ? ['warn', 'error'] : ['error'],
  });

/**
 * Every money path is an interactive transaction, so it can queue behind another
 * writer for the same rows or wait for a free connection on the pooler. Prisma's
 * 2s acquire / 5s transaction defaults turn that queue into a transaction-start
 * error — which on a payment path means rejecting a webhook that was valid.
 */
export const MONEY_TX = { timeout: 15_000, maxWait: 15_000 } as const;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
