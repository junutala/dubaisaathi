/**
 * Photographs the built app at phone size, so somebody can look at it.
 *
 * Every serious defect this project has had was found by a person holding a phone, and the
 * layout ones are invisible to every assertion we own: three tiles stretched to 230px of white
 * with a small drawing lost in the middle passes 263 tests and reads as unfinished at a glance.
 * This asserts nothing. It exists so the screens can be looked at before they are shipped.
 *
 *   npm run screens                  (builds, serves, shoots home)
 *   npm run screens -- '#/transport' (any route)
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '..', 'dist');
const out = resolve(here, '..', 'screenshots');
const routes = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['#/'];

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (request, response) => {
  const path = (request.url ?? '/').split('?')[0];
  const file = join(dist, path === '/' ? 'index.html' : path);
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    // Hash routing: anything unknown is the shell, exactly as nginx serves it.
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(await readFile(join(dist, 'index.html')));
  }
});
await new Promise((ready) => server.listen(4199, ready));
await mkdir(out, { recursive: true });

// The container ships Chromium already; Playwright's own headless shell is not installed.
const preinstalled = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);
// A cheap Android in portrait, which is the only screen this product is designed for.
const page = await browser.newPage({
  viewport: { width: 360, height: 740 },
  deviceScaleFactor: 2,
});

for (const route of routes) {
  await page.goto(`http://localhost:4199/${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const name = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
  const file = join(out, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${route}  →  ${file}`);
}

await browser.close();
server.close();
