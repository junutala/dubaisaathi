/**
 * Starts the production-like server, runs the walkthrough against it, and stops it again — so
 * the browser checks are one command rather than three and a remembered port.
 *
 * Kept out of `npm run verify` deliberately: it needs a Chromium and around ten seconds, and a
 * gate people skip is worse than one they run. Run it before anything reaches a phone.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const port = '4187';

const server = spawn(process.execPath, [resolve(here, 'serve-like-production.mjs')], {
  env: { ...process.env, PORT: port },
  stdio: 'inherit',
});

let code = 1;
try {
  // The server binds in well under a second; this is slack, not a race.
  await wait(1200);
  const walkthrough = spawn(process.execPath, [resolve(here, 'browser-walkthrough.mjs')], {
    env: { ...process.env, WALKTHROUGH_URL: `http://localhost:${port}` },
    stdio: 'inherit',
  });
  code = await new Promise((resolve_) => {
    walkthrough.on('exit', (c) => {
      resolve_(c ?? 1);
    });
  });
} finally {
  server.kill();
}
process.exit(code);
