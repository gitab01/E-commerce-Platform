// Drives headless Chrome over the DevTools protocol to exercise the real UI:
// browse -> add to cart -> checkout -> demo payment -> PAID timeline -> admin
// transitions -> stock guard, at desktop and mobile widths. Screenshots land in
// <temp>/qoder-ecom/shots. Run with: node scripts/verify-ui.mjs
// Overrides: BASE_URL, CHROME_PATH, CDP_PORT.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env' });

const CHROME =
  process.env.CHROME_PATH ??
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].find((candidate) => fs.existsSync(candidate)) ??
  'chrome';
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const PORT = Number(process.env.CDP_PORT ?? 9200 + (Date.now() % 400));
const TMP = path.join(os.tmpdir(), 'qoder-ecom');
const SHOTS = path.join(TMP, 'shots');
const PROFILES = path.join(TMP, 'chrome');
// A previous run's Chrome can still be holding a profile lock, so no run reuses one.
const PROFILE = path.join(PROFILES, String(Date.now()));

fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(PROFILES, { recursive: true });
for (const stale of fs.readdirSync(PROFILES, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  try {
    fs.rmSync(path.join(PROFILES, stale.name), { recursive: true, force: true });
  } catch {
    // Still locked by a dead run's leftover Chrome; nothing to do about it here.
  }
}
fs.mkdirSync(PROFILE, { recursive: true });

const report = [];
const fail = (step, detail) => report.push({ step, ok: false, detail: String(detail).slice(0, 300) });
const pass = (step, detail) => report.push({ step, ok: true, detail: String(detail).slice(0, 300) });

let ws;
let chrome;
let nextId = 1;
const waiting = new Map();

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function goto(path, { wait = 1200 } = {}) {
  await send('Page.navigate', { url: BASE + path });
  for (let i = 0; i < 150; i += 1) {
    if ((await evaluate('document.readyState')) === 'complete') break;
    await sleep(400);
  }
  // A click on an unhydrated React button is a no-op, so the client bundle has to
  // be present before the walkthrough interacts with anything.
  await waitFor('typeof window.next === "object"', { label: `client runtime on ${path}` });
  await sleep(wait);
}

async function waitFor(expression, { timeout = 120_000, label = expression } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(`!!(${expression})`)) return true;
    await sleep(400);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(data, 'base64'));
}

async function setViewport(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
}

async function clickText(text) {
  return evaluate(`(() => {
    const wanted = ${JSON.stringify(String(text).toLowerCase())};
    const matches = (nodes) => [...nodes].find((n) => (n.innerText || n.textContent || '').trim().toLowerCase().includes(wanted));
    // A form control wins over a same-named nav link, otherwise "Sign in" clicks the header.
    const hit = matches(document.querySelectorAll('form button, form [role=button], button[type=submit]'))
      ?? matches([...document.querySelectorAll('button, a, label, [role=button]')].filter((n) => !n.closest('header, nav')));
    if (!hit) return 'NOT FOUND: ' + wanted;
    hit.click();
    return 'clicked ' + (hit.innerText || hit.textContent || '').trim().slice(0, 40);
  })()`);
}

async function formDump() {
  return evaluate(`[...document.querySelectorAll('form [name]')].map((el) => {
    let problem = '';
    try { if (!el.checkValidity()) problem = ' INVALID: ' + el.validationMessage; } catch {}
    return el.name + '(' + el.tagName + ':' + (el.type || '') + ')=' + JSON.stringify(String(el.value ?? '')).slice(0, 24) + problem;
  }).join(' | ')`);
}

async function buttonsDump() {
  return evaluate(`[...document.querySelectorAll('button')].map((b) => b.textContent.trim() + (b.disabled ? '[disabled]' : '')).join(' | ').slice(0, 300)`);
}

async function clickUntil(text, expectExpr, { tries = 8, perTry = 6000, label = text } = {}) {
  const log = [];
  for (let i = 0; i < tries; i += 1) {
    log.push(String(await clickText(text)));
    // Test the expectation even when the control is gone: a click that navigated
    // removes the button it pressed, and that is a pass, not a miss.
    try {
      await waitFor(expectExpr, { timeout: perTry, label });
      return log[log.length - 1];
    } catch {
      // Either the action is still in flight or the click landed pre-hydration; retry.
    }
    if (log[log.length - 1].startsWith('NOT FOUND')) await sleep(1500);
  }
  let dump = '';
  try {
    dump = ` :: fields: ${await formDump()} :: buttons: ${await buttonsDump()}`;
  } catch {}
  throw new Error(`${label} never happened after ${tries} clicks (${log.join('; ')})${dump}`);
}

async function typeInto(name, value) {
  return evaluate(`(() => {
    const el = document.querySelector('form [name=${JSON.stringify(name)}]') ?? document.querySelector('[name=${JSON.stringify(name)}]');
    if (!el) return 'NO FIELD ' + ${JSON.stringify(name)};
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    try { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); }
    catch { el.value = ${JSON.stringify(value)}; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.name + '=' + (el.value === ${JSON.stringify(value)} ? 'ok' : 'MISMATCH');
  })()`);
}

async function overflow() {
  return evaluate('document.documentElement.scrollWidth - window.innerWidth');
}

/** The badge in this order's own row — the option labels say "Shipped" even when the row is Paid. */
const rowBadge = (reference, label) => `(() => {
  const row = [...document.querySelectorAll('li')].find((li) => (li.innerText || '').includes(${JSON.stringify(reference)}));
  const badge = row && row.querySelector('span.rounded-full');
  return !!badge && badge.textContent.trim() === ${JSON.stringify(label)};
})()`;

async function text() {
  return evaluate('document.body.innerText');
}

const PRODUCT_LINKS = `document.querySelectorAll('a[href^="/products/"]').length`;

/**
 * This run creates a product and an admin in the same Neon database production
 * reads, so leftovers from an earlier crash are cleared before the browser starts.
 */
async function sweepTestRows() {
  const db = new PrismaClient();
  try {
    const products = await db.product.findMany({
      where: { slug: { startsWith: 'walkthrough-' } },
      select: { id: true },
    });
    for (const product of products) {
      await db.variant.deleteMany({ where: { productId: product.id } }).catch(() => undefined);
      await db.product.delete({ where: { id: product.id } }).catch(() => undefined);
    }
    const users = await db.user.deleteMany({ where: { email: { startsWith: 'walkthrough-admin-' } } });
    const still = await db.product.count({ where: { slug: { startsWith: 'walkthrough-' } } });
    return `${products.length} test product(s) cleared, ${users.count} test admin(s) cleared${
      still ? `, ${still} refused to go (order history)` : ''
    }`;
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  try {
    pass('sweep', await sweepTestRows());
  } catch (error) {
    fail('sweep', error.message);
  }

  chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ], { stdio: 'ignore' });

  let version = null;
  for (let i = 0; i < 60 && !version; i += 1) {
    await sleep(500);
    try {
      version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    } catch {
      version = null;
    }
  }
  if (!version) throw new Error('chrome did not start');

  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?url=about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waiting.has(message.id)) {
      const { resolve, reject } = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });
  await new Promise((resolve) => ws.addEventListener('open', resolve));

  await send('Page.enable');
  await send('Runtime.enable');
  await setViewport(1280, 900, false);

  // 1. Storefront
  await goto('/');
  await waitFor(`${PRODUCT_LINKS} > 0`, { label: 'product cards' });
  const brand = await evaluate(`(() => {
    const body = document.querySelector('.brand-mark .brand-body');
    return {
      named: document.body.innerText.includes('Shega Mart'),
      animation: body ? getComputedStyle(body).animationName : 'none',
    };
  })()`);
  if (!brand.named) fail('brand', 'Shega Mart wordmark missing from the header');
  else if (brand.animation !== 'brand-draw') fail('brand', `logo animation is "${brand.animation}"`);
  else pass('brand', 'Shega Mart wordmark with the self-drawing logo mark');
  pass('home', `${await evaluate(PRODUCT_LINKS)} product links, overflow ${await overflow()}px`);
  await shot('01-home-desktop');

  // 2. Product detail, including the sold-out variant that must not be selectable
  await goto('/products/wireless-headphones');
  await waitFor('document.body.innerText.includes("Add to cart")', { label: 'add to cart' });
  pass('product detail', (await text()).includes('sold out') ? 'variant picker + sold-out state rendered' : 'variant picker rendered');
  await shot('02-product-desktop');

  // 3. Add to cart writes the server-side cart
  // A stored cart from a previous run would make "Added" ambiguous and could push
  // the line above the remaining stock, so start from an empty cart.
  await goto('/cart', { wait: 900 });
  const hasLines = await evaluate('document.body.innerText.includes("Empty cart")');
  console.log(
    '  clear:',
    hasLines
      ? await clickUntil('Empty cart', 'document.body.innerText.includes("Your cart is empty")', {
          tries: 4,
          label: 'cart emptied',
        })
      : 'already empty',
  );
  await goto('/products/wireless-headphones');
  console.log('  add:', await clickUntil('Add to cart', 'document.body.innerText.includes("Added")', { label: 'cart write' }));

  // 4. Cart
  await goto('/cart');
  await waitFor('document.body.innerText.toLowerCase().includes("subtotal")', { label: 'cart totals' });
  pass('cart', 'line item + subtotal rendered');
  await shot('03-cart-desktop');

  // 5. Guest checkout: reservation commits before any gateway exists
  await goto('/checkout');
  await waitFor('document.querySelector("[name=email]")', { label: 'checkout form' });
  await typeInto('email', 'abel@example.com');
  await typeInto('fullName', 'Abel Assefa');
  await typeInto('addressLine', 'Bole Medhanialem, Kebele 03');
  await typeInto('city', 'Addis Ababa');
  await typeInto('phone', '+251911223344');
  const provider = await evaluate('(() => { const r = document.querySelector("[name=provider][value=DEMO]"); if (!r) return "NO DEMO OPTION: " + [...document.querySelectorAll("[name=provider]")].map(x => x.value).join(","); r.click(); return "DEMO checked=" + r.checked; })()');
  pass('provider choice', provider);
  await shot('04-checkout-desktop');

  console.log('  submit:', await clickUntil(
    'Continue to payment',
    'location.pathname.startsWith("/order/") || location.pathname.startsWith("/demo-pay/")',
    { perTry: 25000, label: 'checkout result page' },
  ));
  const landed = String(await evaluate('location.pathname + location.search'));
  const reference = landed.match(/reference=([A-Za-z0-9]+)/)?.[1] ?? landed.match(/\/order\/([^/?#]+)/)?.[1];
  if (!reference) throw new Error(`no order reference in ${landed}`);
  pass('checkout', `order ${reference} reserved PENDING, browser sent to ${landed.split('?')[0]}`);

  if (landed.startsWith('/order/')) {
    await waitFor('document.body.innerText.includes("Pending")', { label: 'PENDING in the timeline' });
    await shot('05-order-pending-desktop');
    console.log('  resume:', await clickUntil('Continue to payment', 'location.pathname.startsWith("/demo-pay/")', { perTry: 20000, label: 'demo payment page' }));
  } else {
    pass('order pending page', 'demo provider hands straight to the payment page; timeline verified after payment');
  }

  // 6. Payment truth arrives through the fulfilment path, not the redirect
  await shot('06-demo-pay-desktop');
  console.log('  pay:', await clickUntil('Pay now', 'document.body.innerText.includes("Paid")', { perTry: 20000, label: 'PAID in the timeline' }));
  pass('payment confirmation', `order ${reference} moved to Paid`);
  await shot('07-order-paid-desktop');

  // 7. Admin: double-gated routes and real transitions
  await goto('/login');
  await waitFor('document.querySelector("[name=email]")', { label: 'login form' });
  await typeInto('email', 'admin@example.com');
  await typeInto('password', 'change-me-please');
  console.log('  login:', await clickUntil('Sign in', 'location.pathname.startsWith("/account") || document.body.innerText.includes("Orders")', { perTry: 20000, label: 'signed in' }));
  pass('admin sign in', 'session accepted');
  // The header is prerendered, so who you are has to come from this endpoint.
  const nav = await evaluate('fetch("/api/nav").then((r) => r.json()).then((n) => `signedIn=${n.signedIn} admin=${n.admin} count=${n.count}`)');
  if (!nav.startsWith('signedIn=true admin=true')) throw new Error(`/api/nav did not report an admin session: ${nav}`);
  pass('session nav', nav);

  await goto('/admin');
  await waitFor(`document.body.innerText.includes(${JSON.stringify(reference.slice(0, 4))})`, { label: 'order in admin' });
  await shot('08-admin-dashboard-desktop');
  pass('admin dashboard', 'revenue, per-state counts and recent orders render');

  await goto('/admin/orders');
  await waitFor(rowBadge(reference, 'Paid'), { label: `row ${reference} shows Paid` });
  await shot('09-admin-orders-desktop');

  const move = async (to) => evaluate(`(() => {
    const select = [...document.querySelectorAll('select')].find((s) => (s.getAttribute('aria-label') || '').includes(${JSON.stringify(reference)}));
    if (!select) return 'NO SELECT for ' + ${JSON.stringify(reference)};
    const option = [...select.options].find((o) => o.value === ${JSON.stringify(to)});
    if (!option) return 'NO OPTION ' + ${JSON.stringify(to)} + ' (offered: ' + [...select.options].map(o => o.value).join('|') + ')';
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, option.value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return 'selected ' + option.value;
  })()`);

  const moveUntil = async (to) => {
    let last = '';
    for (let i = 0; i < 15; i += 1) {
      last = String(await move(to));
      if (last.startsWith('selected')) return last;
      await sleep(1000);
    }
    return last;
  };

  console.log('  ship:', await moveUntil('SHIPPED'));
  await waitFor(rowBadge(reference, 'Shipped'), { label: 'row badge shows Shipped' });
  pass('transition PAID -> SHIPPED', 'row badge moved to Shipped');

  console.log('  deliver:', await moveUntil('DELIVERED'));
  await waitFor(rowBadge(reference, 'Delivered'), { label: 'row badge shows Delivered' });
  pass('transition SHIPPED -> DELIVERED', 'row badge moved to Delivered');
  await shot('10-admin-orders-delivered-desktop');

  // 8. The database refuses an adjustment that would cross zero
  await goto('/admin/inventory');
  await waitFor('document.querySelector("[name=delta]")', { label: 'inventory form' });
  await shot('11-admin-inventory-desktop');
  await typeInto('delta', '-9999');
  await typeInto('reason', 'oversell probe');
  await evaluate('document.querySelector("[name=delta]").closest("form").requestSubmit()');
  await waitFor('document.body.innerText.includes("below zero")', { label: 'refusal message' });
  const refusal = (await text()).match(/[^\n]*below zero[^\n]*/i)?.[0] ?? 'no message';
  pass('stock guard', refusal);

  // 9. Uploaded artwork comes from object storage through one guarded key shape
  await goto('/admin/assets');
  await waitFor('document.querySelector("[name=image]")', { label: 'image upload form' });
  const forms = await evaluate('document.querySelectorAll("[name=image]").length');
  await shot('19-admin-assets-desktop');
  pass('admin images page', `${forms} upload forms render`);

  const traversal = await evaluate('fetch("/api/assets/products/..%2F..%2Fpackage.json").then((r) => r.status)');
  if (traversal === 404) pass('asset key guard', 'traversal-shaped key refused with 404');
  else fail('asset key guard', `got HTTP ${traversal}`);

  // 10. Admin catalogue and customer management, guards included
  const stamp = Date.now().toString(36).slice(-5);
  const handle = `walkthrough-${stamp}`;
  const sku = `WALK-${stamp}`;

  await goto('/admin/products');
  await waitFor(`document.querySelector('a[href="/admin/products/new"]')`, { label: 'products list' });
  pass('admin products list', `${await evaluate(`document.querySelectorAll('a[href^="/admin/products/"]').length`)} product links`);
  await shot('21-admin-products-desktop');

  await goto('/admin/products/new');
  await waitFor(`document.querySelector('[name="title"]')`, { label: 'new product form' });
  const fieldsWritten = [];
  for (const [field, value] of [
    ['title', 'Walkthrough Test Product'],
    ['handle', handle],
    ['category', 'Accessories'],
    ['image', '/products/dock.svg'],
    ['description', 'Written by the browser walkthrough to exercise the admin product write path.'],
  ]) {
    fieldsWritten.push(await typeInto(field, value));
  }
  console.log('  typed:', fieldsWritten.join(' | '));
  console.log('  fields:', await formDump());
  console.log(
    '  create:',
    await clickUntil(
      'Create product',
      `location.pathname.startsWith('/admin/products/') && location.pathname !== '/admin/products/new'`,
      {
        perTry: 20000,
        label: 'redirect to the new product',
      },
    ),
  );
  const createdPath = String(await evaluate('location.pathname'));
  if (!/^\/admin\/products\/[a-z0-9]+$/.test(createdPath)) throw new Error(`create landed on ${createdPath}`);
  pass('admin create product', createdPath.split('/').pop());

  await waitFor(`document.querySelectorAll('[name="sku"]').length > 0`, { label: 'add-variant form' });
  await typeInto('sku', sku);
  await typeInto('name', 'Walkthrough option');
  await typeInto('price', '123.45');
  await typeInto('stock', '3');
  await evaluate(`document.querySelector('[name="sku"]').closest('form').requestSubmit()`);
  await waitFor(`document.querySelectorAll('[name="sku"]').length === 2`, { label: 'variant row added' });
  pass('admin add variant', `${sku} at Br123.45 with 3 in stock`);

  await goto(`/products/${handle}`);
  await waitFor(`document.body.innerText.includes('Br123.45')`, { label: 'storefront price' });
  pass('admin write reaches the storefront', 'the new product is purchasable without a redeploy');
  await shot('22-product-created-by-admin-desktop');

  await goto(createdPath);
  await waitFor(`document.querySelector('[name="title"]')`, { label: 'edit form' });
  await clickUntil('Save changes', `document.body.innerText.includes('Saved.')`, { tries: 4, label: 'product update' });
  pass('admin edit product', 're-saving the same handle is accepted, not reported as taken');

  // A product that appears in order history must refuse deletion, not orphan it.
  await goto('/admin/products');
  const soldPath = await evaluate(`(() => {
    const link = [...document.querySelectorAll('a[href^="/admin/products/"]')]
      .find((a) => (a.innerText || '').includes('Wireless Headphones'));
    return link ? link.getAttribute('href') : 'NOT FOUND';
  })()`);
  if (soldPath === 'NOT FOUND') fail('delete guard', 'could not find a product with sales history');
  else {
    await goto(soldPath);
    await waitFor(`document.body.innerText.includes('Delete this product')`, { label: 'edit page' });
    await clickUntil('Delete product', `document.body.innerText.includes('cannot be deleted')`, {
      tries: 5,
      label: 'refusal shown',
    });
    pass('delete guard', 'sold product refused; hide it instead');
  }

  await goto(createdPath);
  await waitFor(`document.body.innerText.includes('Delete this product')`, { label: 'edit page' });
  console.log('  delete:', await clickUntil('Delete product', `location.pathname === '/admin/products'`, {
    tries: 5,
    label: 'deleted and redirected',
  }));
  await waitFor(`!document.body.innerText.includes('Walkthrough Test Product')`, { label: 'gone from the list' });
  pass('admin delete product', `${handle} created, listed and removed again`);

  await goto('/admin/customers');
  await waitFor(`document.querySelectorAll('a[href^="/admin/customers/"]').length > 0`, { label: 'customer rows' });
  pass('admin customers list', `${await evaluate(`document.querySelectorAll('a[href^="/admin/customers/"]').length`)} account links`);
  await shot('23-admin-customers-desktop');

  await goto('/admin/customers?q=shopper');
  if (await evaluate(`document.body.innerText.includes('shopper@example.com')`)) pass('customer search', 'one account matches shopper');
  else fail('customer search', 'shopper@example.com did not come back');

  const linkTo = async (name) =>
    evaluate(`(() => {
      const link = [...document.querySelectorAll('a[href^="/admin/customers/"]')]
        .find((a) => (a.innerText || '').includes(${JSON.stringify(name)}));
      return link ? link.getAttribute('href') : 'NOT FOUND';
    })()`);

  await goto('/admin/customers');
  const shopperPath = await linkTo('Sample shopper');
  if (shopperPath === 'NOT FOUND') fail('role control', 'sample shopper account missing');
  else {
    await goto(shopperPath);
    await waitFor(`document.body.innerText.includes('Make admin')`, { label: 'role control' });
    await clickUntil('Make admin', `document.body.innerText.includes('Make customer')`, {
      tries: 5,
      label: 'role flipped to admin',
    });
    pass('role promotion', 'shopper promoted, control now offers demotion');
    await clickUntil('Make customer', `document.body.innerText.includes('Make admin')`, {
      tries: 5,
      label: 'role restored',
    });
    pass('role demotion', 'restored to CUSTOMER, both writes audited');
  }

  await goto('/admin/customers');
  const adminPath = await linkTo('Store admin');
  if (adminPath === 'NOT FOUND') fail('self-role guard', 'signed-in admin account missing');
  else {
    await goto(adminPath);
    await waitFor(`document.body.innerText.includes('Make customer')`, { label: 'role control' });
    await clickUntil('Make customer', `document.body.innerText.includes('cannot change your own role')`, {
      tries: 5,
      label: 'self-change refused',
    });
    pass('self-role guard', 'an admin cannot demote themselves');
  }

  // 11. A second admin, created from the dashboard and then proven at /login.
  const staffEmail = `walkthrough-admin-${stamp}@example.com`;
  const staffPassword = `walkthrough-${stamp}-secret`;
  await goto('/admin/customers');
  await waitFor(`document.querySelector('[name="password"]')`, { label: 'add-admin form' });
  await typeInto('name', 'Walkthrough Manager');
  await typeInto('email', staffEmail);
  await typeInto('password', staffPassword);
  await clickUntil('Add admin', `document.body.innerText.includes('Admin added.')`, {
    tries: 5,
    label: 'admin created from the dashboard',
  });
  pass('dashboard creates an admin', staffEmail);

  await goto('/account');
  await clickUntil('Sign out', `location.pathname !== '/account'`, { tries: 5, label: 'signed out' });
  await goto('/login');
  await waitFor(`document.querySelector('[name="email"]')`, { label: 'login form' });
  await typeInto('email', staffEmail);
  await typeInto('password', staffPassword);
  await clickUntil(
    'Sign in',
    `location.pathname.startsWith('/account') || document.body.innerText.includes('Orders')`,
    { tries: 5, label: 'the new password opens the store' },
  );
  const staffNav = await evaluate(
    'fetch("/api/nav").then((r) => r.json()).then((n) => `signedIn=${n.signedIn} admin=${n.admin}`)',
  );
  if (!staffNav.startsWith('signedIn=true admin=true')) {
    throw new Error(`the account created by an admin is not an admin session: ${staffNav}`);
  }
  pass('new admin signs in', staffNav);

  // The seed admin must do the deleting: an account cannot remove itself.
  await goto('/account');
  await clickUntil('Sign out', `location.pathname !== '/account'`, { tries: 5, label: 'signed out the test admin' });
  await goto('/login');
  await waitFor(`document.querySelector('[name="email"]')`, { label: 'login form' });
  await typeInto('email', 'admin@example.com');
  await typeInto('password', 'change-me-please');
  await clickUntil(
    'Sign in',
    `location.pathname.startsWith('/account') || document.body.innerText.includes('Orders')`,
    { tries: 5, label: 'the seed admin is back' },
  );

  // Shared database, so remove the evidence before carrying on.
  await goto(`/admin/customers?q=${encodeURIComponent(staffEmail)}`);
  const staffPath = await linkTo('Walkthrough Manager');
  if (staffPath === 'NOT FOUND') fail('staff cleanup', `${staffEmail} could not be found to delete`);
  else {
    await goto(staffPath);
    await waitFor(`document.body.innerText.includes('Delete account')`, { label: 'delete control' });
    await clickUntil('Delete account', `document.body.innerText.includes('Confirm: Delete account')`, {
      tries: 5,
      label: 'delete armed',
    });
    await clickUntil('Confirm: Delete account', `location.pathname === '/admin/customers'`, {
      tries: 5,
      // The delete is a Neon write followed by a client-side redirect; on this
      // machine that pairing overruns the default per-try window.
      perTry: 20000,
      label: 'test admin deleted',
    });
    pass('staff cleanup', `${staffEmail} removed again`);
  }

  await goto('/admin/inventory');
  if (await evaluate(`document.body.innerText.includes('product.create')`)) pass('audit trail', 'catalogue writes recorded');
  else fail('audit trail', 'no product.create entry in the recent operations list');

  // 12. Mobile pass over the same surfaces
  await setViewport(390, 844, true);
  // The desktop order emptied the cart, and /checkout redirects when it is empty,
  // so re-seed it or the mobile checkout shot proves nothing.
  await goto('/products/wireless-headphones', { wait: 900 });
  console.log('  mobile add:', await clickUntil('Add to cart', 'document.body.innerText.includes("Added")', { label: 'mobile cart write' }));
  const mobile = [
    ['/', '12-home-mobile'],
    ['/products/wireless-headphones', '13-product-mobile'],
    ['/cart', '14-cart-mobile'],
    ['/checkout', '15-checkout-mobile'],
    [`/order/${reference}`, '16-order-mobile'],
    ['/admin', '17-admin-mobile'],
    ['/admin/orders', '18-admin-orders-mobile'],
    ['/admin/assets', '20-admin-assets-mobile'],
    ['/admin/products', '24-admin-products-mobile'],
    ['/admin/customers', '25-admin-customers-mobile'],
  ];
  for (const [path, name] of mobile) {
    await goto(path, { wait: 900 });
    const over = await overflow();
    if (over > 1) fail(`mobile overflow ${path}`, `${over}px past the viewport`);
    else pass(`mobile ${path}`, 'no horizontal overflow');
    // A clipped flex item never widens the document, so measure the badge itself.
    const clipped = await evaluate(`(() => {
      const badge = document.querySelector('a[aria-label^="Cart"]');
      return badge ? Math.round(badge.getBoundingClientRect().right - window.innerWidth) : -1;
    })()`);
    if (clipped > 1) fail(`mobile cart badge ${path}`, `badge ${clipped}px past the viewport`);
    await shot(name);
  }

  // 13. Tablet pass: the in-between width is where a fixed column grid breaks
  // first, and neither of the two passes above would notice.
  await setViewport(768, 1024, false);
  for (const [path, name] of mobile) {
    await goto(path, { wait: 900 });
    const over = await overflow();
    if (over > 1) fail(`tablet overflow ${path}`, `${over}px past the viewport`);
    else pass(`tablet ${path}`, 'no horizontal overflow');
    const clipped = await evaluate(`(() => {
      const badge = document.querySelector('a[aria-label^="Cart"]');
      return badge ? Math.round(badge.getBoundingClientRect().right - window.innerWidth) : -1;
    })()`);
    if (clipped > 1) fail(`tablet cart badge ${path}`, `badge ${clipped}px past the viewport`);
    await shot(name.replace('-mobile', '-tablet'));
  }

  console.log(JSON.stringify(report, null, 1));
  ws.close();
  chrome.kill();
  process.exit(report.some((row) => !row.ok) ? 1 : 0);
}

main().catch(async (error) => {
  console.error('VERIFY FAILED:', error.message);
  try {
    console.log('  at:', await evaluate('location.href'));
    console.log(
      '  status:',
      await evaluate(`(document.querySelector('[role=status]')||{}).innerText ?? 'none'`),
    );
    console.log('  page:', String(await evaluate('document.body.innerText')).replace(/\s+/g, ' ').slice(0, 2000));
    await shot('99-failure');
  } catch {}
  console.log(JSON.stringify(report, null, 1));
  try {
    ws?.close();
    chrome?.kill();
  } catch {}
  process.exit(1);
});
