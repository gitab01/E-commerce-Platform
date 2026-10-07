// Rotates an account's password from the terminal and signs out its old sessions.
// The new password is typed at the prompt, so it stays out of shell history.
// Run with: npm run admin:password -- admin@example.com
import 'dotenv/config';
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';
import { PrismaClient } from '@prisma/client';

const email = process.argv[2];
if (!email || !email.includes('@')) {
  console.error('usage: node scripts/set-admin-password.mjs <email>');
  process.exit(1);
}

/** Same derivation as src/lib/auth.ts, so the account can sign in unchanged. */
function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
}

// One interface for the whole run, reading from the start: with piped stdin both
// lines arrive before the second question is asked, so anything not yet claimed
// has to be queued rather than dropped.
const rl = createInterface({ input: process.stdin });
const queued = [];
const waiting = [];
rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : queued.push(line)));
const ask = (question) => {
  process.stdout.write(question);
  if (queued.length) return Promise.resolve(queued.shift());
  return new Promise((resolve) => waiting.push(resolve));
};

const first = await ask(`New password for ${email}: `);
if (first.length < 8) {
  console.error('refused: a store admin password must be at least 8 characters.');
  process.exitCode = 1;
} else if (await ask('Repeat it: ') !== first) {
  console.error('refused: the two entries did not match.');
  process.exitCode = 1;
} else {
  const db = new PrismaClient();
  try {
    const user = await db.user.update({
      where: { email },
      data: { passwordHash: hashPassword(first) },
      select: { id: true, role: true },
    });
    // A rotated password must not leave sessions issued under the old one alive.
    const sessions = await db.session.deleteMany({ where: { userId: user.id } });
    console.log(`password updated for ${email} (${user.role}); ${sessions.count} active session(s) signed out.`);
    if (email === 'admin@example.com') {
      console.log('note: scripts/verify-ui.mjs signs in as this account. Put the new password in .env as SEED_ADMIN_PASSWORD or the walkthrough fails at login.');
    }
  } catch (error) {
    if (error?.code === 'P2025') console.error(`refused: no account with that email (${email}).`);
    else throw error;
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

rl.close();
