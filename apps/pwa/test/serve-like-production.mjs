/**
 * Serves the built app the way nginx does, so a browser test of the CSP tests the real CSP.
 *
 * `vite preview` sends no Content-Security-Policy, so every CSP assertion run against it passes
 * by checking nothing — which is how a harness ends up agreeing with its author. The policy is
 * read out of `deploy/nginx.conf` rather than copied, so the two cannot drift apart.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../dist');

const conf = readFileSync(resolve(here, '../../../deploy/nginx.conf'), 'utf8');
const csp = /add_header Content-Security-Policy "([^"]+)"/.exec(conf)?.[1];
if (!csp) throw new Error('no Content-Security-Policy found in deploy/nginx.conf');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.gz': 'application/gzip',
};

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = join(root, decodeURIComponent(url.pathname));
    try {
      const found = await stat(path).catch(() => null);
      if (!found?.isFile()) {
        // nginx falls back to the shell for screens, and to 404 for real files — the
        // navigateFallbackDenylist in the service worker mirrors this.
        if (url.pathname.startsWith('/models/')) {
          res.writeHead(404).end('not found');
          return;
        }
        path = join(root, 'index.html');
      }
      const body = await readFile(path);
      res.writeHead(200, {
        'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
        'content-security-policy': csp,
        'x-content-type-options': 'nosniff',
        'cache-control': extname(path) === '.html' ? 'no-cache' : 'public, max-age=31536000',
      });
      res.end(body);
    } catch {
      res.writeHead(500).end('error');
    }
  })();
});

const port = Number(process.env.PORT ?? 4183);
server.listen(port, () => {
  console.log(`serving dist with the production CSP on http://localhost:${String(port)}`);
});
