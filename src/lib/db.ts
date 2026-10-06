import { PrismaClient } from '@prisma/client';

/**
 * Neon sleeps after a few idle minutes and Vercel keeps a warm function alive
 * across it, so a client built before the wake-up reports every later query as
 * unreachable and the app stays broken until the process restarts. These two
 * codes are raised while *acquiring* a connection, before any statement runs, so
 * rebuilding the pool and running the call once more cannot double-apply a write.
 */
const STALE = new Set(['P1001', 'P2024']);

function isStale(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    STALE.has((error as { code: string }).code)
  );
}

function build(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'test' ? ['warn', 'error'] : ['error'],
  });
}

// Held on globalThis so dev module reloads share one pool instead of leaking a
// client per recompile.
const globalForPrisma = globalThis as unknown as { prismaHolder?: { client: PrismaClient } };
const holder = globalForPrisma.prismaHolder ?? (globalForPrisma.prismaHolder = { client: build() });

async function replace() {
  const dead = holder.client;
  holder.client = build();
  await dead.$disconnect().catch(() => undefined);
}

/** Resolves the path against the *current* client at call time, so a replaced
 *  pool is used by the retry. */
function call(path: string[], method: string) {
  return async (...args: unknown[]) => {
    for (let attempt = 0; ; attempt += 1) {
      const owner = path.reduce<Record<string, unknown>>(
        (node, key) => node[key] as Record<string, unknown>,
        holder.client as unknown as Record<string, unknown>,
      );
      try {
        return await (owner[method] as (...a: unknown[]) => unknown)(...args);
      } catch (error) {
        if (attempt > 0 || !isStale(error)) throw error;
        await replace();
      }
    }
  };
}

function delegate(path: string[]) {
  return new Proxy({} as Record<string, unknown>, {
    get: (_target, prop) => (typeof prop === 'string' ? call(path, prop) : undefined),
  });
}

export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop) => {
    if (typeof prop !== 'string' || prop === 'then') return undefined;
    const value = (holder.client as unknown as Record<string, unknown>)[prop];
    return value && typeof value === 'object' ? delegate([prop]) : call([], prop);
  },
});

/**
 * Every money path is an interactive transaction, so it can queue behind another
 * writer for the same rows or wait for a free connection on the pooler. Prisma's
 * 2s acquire / 5s transaction defaults turn that queue into a transaction-start
 * error — which on a payment path means rejecting a webhook that was valid.
 */
export const MONEY_TX = { timeout: 15_000, maxWait: 15_000 } as const;
