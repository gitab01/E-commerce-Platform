// Proves whether the database is reachable from this machine.
// Prints no credentials: every URL is masked before it is displayed.
import { createConnection } from 'node:net';
import { promises as dns } from 'node:dns';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env' });

const TIMEOUT_MS = 10_000;

function mask(url) {
  if (!url) return '(not set)';
  return url.replace(/\/\/[^@/]*@/, '//****@');
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function tcpConnect(host, port = 5432) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: TIMEOUT_MS });
    const fail = (why) => {
      socket.destroy();
      resolve(`FAIL ${why}`);
    };
    socket.once('connect', () => {
      socket.destroy();
      resolve('OK');
    });
    socket.once('timeout', () => fail('timed out'));
    socket.once('error', (err) => fail(err.code || err.message));
  });
}

async function probe(label, url) {
  console.log(`\n=== ${label} ===`);
  console.log(`url      : ${mask(url)}`);
  if (!url) {
    console.log('VERDICT  : missing env var');
    return;
  }
  const host = hostOf(url);
  console.log(`host     : ${host}`);
  try {
    const addresses = await dns.resolve4(host);
    console.log(`dns      : OK (${addresses.join(', ')})`);
  } catch (err) {
    console.log(`dns      : FAIL ${err.code || err.message}`);
    console.log('VERDICT  : this machine cannot resolve the host - network or DNS problem');
    return;
  }
  const tcp = await tcpConnect(host);
  console.log(`tcp:5432 : ${tcp}`);
  if (tcp !== 'OK' && label.startsWith('app')) {
    console.log('VERDICT  : the port is closed to us - Neon has paused the instance, blocked');
    console.log('           this IP, or the host is wrong.');
  }
}

await probe('app (pooled) DATABASE_URL', process.env.DATABASE_URL);
await probe('direct DIRECT_DATABASE_URL', process.env.DIRECT_DATABASE_URL);

const sameHost =
  hostOf(process.env.DATABASE_URL) === hostOf(process.env.DIRECT_DATABASE_URL);
console.log(`\nhosts identical: ${sameHost ? 'YES - the app URL is not pooled, migrations may stall' : 'no'}`);

console.log('\n=== SELECT 1 through the app URL ===');
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
try {
  const rows = await prisma.$queryRaw`select 1 as ok`;
  console.log(`query    : OK (${JSON.stringify(rows)})`);
  const products = await prisma.product.count();
  const variants = await prisma.variant.count();
  const orders = await prisma.order.count();
  console.log(`data     : ${products} products, ${variants} variants, ${orders} orders`);
  console.log('\nVERDICT  : the database answers. Any 500 in the browser is stale code or a');
  console.log('           hung dev server, not connectivity - restart it.');
} catch (err) {
  const message = String(err.message || err);
  // Belt and braces: never let a URL with a password reach the terminal.
  console.log(`query    : FAIL ${mask(message).replace(/npg_\w+/g, '****')}`);
  if (/authentication failed/i.test(message)) {
    console.log('\nVERDICT  : the password in .env does not match Neon. Reissue the key.');
  } else if (/can't reach|connection terminated|timed out/i.test(message)) {
    console.log('\nVERDICT  : network-level failure. Open the Neon console and resume the');
    console.log('           project, then check Settings -> Network -> IP blocklist.');
  } else {
    console.log('\nVERDICT  : unexpected error, read the line above.');
  }
} finally {
  await prisma.$disconnect();
}
