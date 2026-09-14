/** Photographs the collectors' app at phone size, so somebody can look at it before it ships. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '..', 'dist');
const out = resolve(here, '..', 'screenshots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer(async (request, response) => {
  const path = (request.url ?? '/').split('?')[0];
  const file = join(dist, path === '/' ? 'index.html' : path);
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(await readFile(join(dist, 'index.html')));
  }
});
await new Promise((ready) => server.listen(4198, ready));
await mkdir(out, { recursive: true });

const preinstalled = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);
const page = await browser.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4198/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('saathi.collector', 'Ravi'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, 'capture.png'), fullPage: true });
console.log(`  capture → ${join(out, 'capture.png')}`);
await browser.close();
server.close();
