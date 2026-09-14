/**
 * The half of the harness jsdom cannot do.
 *
 * Three of the defects found on a phone were invisible to every unit test: a service worker
 * answering a file URL with the app shell, a Content-Security-Policy that would have blocked
 * WebAssembly and the recogniser's blob worker, and browser APIs that answer only after the user
 * has touched the page. None of those exist in jsdom. All of them exist here.
 *
 * Runs against the built app with a real Chromium, a real service worker and a fake microphone.
 * Every probe reports rather than throws, so one failure does not hide the rest.
 *
 *   npm run verify:browser        (builds, serves, runs)
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const base = process.env.WALKTHROUGH_URL ?? 'http://localhost:4183';

/**
 * The fake microphone needs a file to play. Chromium's built-in fake device emits a beep, which a
 * voice-activity check can reject outright; this is two seconds of speech-shaped sound instead — a
 * moving pitch under a syllable-rate envelope. It is generated rather than committed so that the
 * next reader can see what the microphone is being fed, which a 64 KB binary does not tell them.
 */
function speechShapedWav(seconds = 2, rate = 16000) {
  const samples = seconds * rate;
  const body = Buffer.alloc(samples * 2);
  let phase = 0;
  for (let i = 0; i < samples; i += 1) {
    const t = i / rate;
    // Roughly a voice: a pitch wandering around 140 Hz, opened and closed four times a second.
    const pitch = 140 + 25 * Math.sin(2 * Math.PI * 1.7 * t);
    phase += (2 * Math.PI * pitch) / rate;
    const syllable = Math.max(0, Math.sin(2 * Math.PI * 4 * t));
    const harmonics = Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase);
    body.writeInt16LE(Math.round(9000 * syllable * harmonics), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + body.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(body.length, 40);
  return Buffer.concat([header, body]);
}

// Outside dist/, which is the served tree: a test fixture is not part of the app.
const audio = resolve(tmpdir(), 'saathi-spoken.wav');
writeFileSync(audio, speechShapedWav());

// The real model is 42 MB and is added to the image at build time, so it is never in dist/. A
// stub at the same path is enough for what is checked here: that nothing between the browser and
// the file turns it into the app shell.
mkdirSync(resolve(here, '../dist/models'), { recursive: true });
writeFileSync(
  resolve(here, '../dist/models/vosk-hi.tar.gz'),
  Buffer.from([0x1f, 0x8b, 0x08, 0, 0, 0, 0, 0]),
);

const failures = [];
const passes = [];
const check = (name, condition, detail = '') => {
  if (condition) passes.push(name);
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

/** Runs one probe in the page and turns a thrown error into a finding rather than an exit. */
const probe = async (page, fn) => {
  try {
    return await page.evaluate(fn);
  } catch (error) {
    return { error: String(error).split('\n')[0] };
  }
};

/**
 * Playwright's own download is what a developer's machine has, and it is found without help.
 * A CI image often pins a Chromium whose build number does not match the npm package, which makes
 * the default lookup miss a browser that is sitting right there — so a stable path or an explicit
 * override is used when one exists. Hardcoding a build number breaks everywhere but one container.
 */
const preinstalled = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].find(
  (path) => path && existsSync(path),
);

const browser = await chromium.launch({
  ...(preinstalled ? { executablePath: preinstalled } : {}),
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${audio}`,
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  // Location is granted here because 1.1 asks for it at first use and the routing screens need
  // an answer; a hotel in Bur Dubai is where this product's traveller actually wakes up.
  permissions: ['microphone', 'geolocation'],
  geolocation: { latitude: 25.2637, longitude: 55.2972 },
});
const page = await context.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
page.on('console', (m) => {
  const text = m.text();
  if (m.type() === 'error' && !text.includes('favicon')) errors.push(text);
});

await page.goto(`${base}/`, { waitUntil: 'networkidle' });

check(
  'service worker installs',
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(
      () => true,
      () => false,
    ),
  ),
);

// The bug: opening the model URL returned index.html, which then 404'd on its own assets.
const model = await probe(page, async () => {
  const res = await fetch('/models/vosk-hi.tar.gz');
  return {
    status: res.status,
    type: res.headers.get('content-type') ?? '',
    head: (await res.text()).slice(0, 40).toLowerCase(),
  };
});
check(
  'model URL is served as a file, not the app shell',
  !model.error && model.status < 400 && !model.head.includes('<!doctype'),
  model.error ?? `status=${String(model.status)} type=${model.type || 'none'}`,
);

const worklet = await probe(page, async () => {
  const ctx = new AudioContext();
  await ctx.audioWorklet.addModule('/mic-worklet.js');
  const node = new AudioWorkletNode(ctx, 'saathi-mic');
  await ctx.close();
  return node ? 'ok' : 'no node';
});
check('audio worklet loads under the CSP', worklet === 'ok', JSON.stringify(worklet));

const wasm = await probe(page, async () => {
  // The smallest valid module there is: it either compiles or the CSP forbade it.
  await WebAssembly.instantiate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
  return 'ok';
});
check('WebAssembly is permitted by the CSP', wasm === 'ok', JSON.stringify(wasm));

// vosk-browser builds its worker from a blob URL, which a default CSP forbids.
const worker = await probe(page, async () => {
  const url = URL.createObjectURL(
    new Blob(['self.postMessage("up")'], { type: 'text/javascript' }),
  );
  const w = new Worker(url);
  const said = await new Promise((r) => {
    w.onmessage = (e) => {
      r(e.data);
    };
    setTimeout(() => {
      r('timeout');
    }, 2000);
  });
  w.terminate();
  return said;
});
check('a blob worker can start under the CSP', worker === 'up', JSON.stringify(worker));

await page.goto(`${base}/#/listen/home`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const mic = await probe(page, () => {
  const flow = document.querySelector('.flow');
  return {
    text: flow?.textContent?.slice(0, 100) ?? '',
    controls: [...(flow?.querySelectorAll('button') ?? [])].filter((b) => !b.disabled).length,
  };
});
check(
  'the microphone screen offers a control in a real browser',
  !mic.error && mic.controls > 0,
  mic.error ?? mic.text,
);

/**
 * The landing page, which is the first thing a traveller ever sees and the only place the
 * offline pack is fetched (owner's instruction, 14 September). It gates on the download so the
 * 42 MB is never being fetched at the moment somebody needs it.
 */
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
await page.waitForTimeout(2500);
const landing = await probe(page, () => ({
  brand: document.querySelector('.landing-name')?.textContent ?? null,
  start: document.querySelector('.landing ~ button, .landing button.btn-primary') !== null,
  started: localStorage.getItem('saathi.started'),
}));
check(
  'the first open is the landing page, not the tiles',
  !landing.error && landing.brand !== null && landing.started === null,
  JSON.stringify(landing),
);

// Past it, the way a traveller goes past it: by pressing the button once it is live.
await probe(page, async () => {
  const start = document.querySelector('.landing button.btn-primary');
  for (let i = 0; i < 40 && start?.disabled; i += 1) {
    await new Promise((done) => setTimeout(done, 250));
  }
  document.querySelector('.landing button.btn-primary')?.click();
  await new Promise((done) => setTimeout(done, 300));
  return true;
});

await context.setOffline(true);
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
await page.waitForTimeout(1500);
const tiles = await probe(page, () => document.querySelectorAll('.tile').length);
// Three, not four: बोलना stopped being a tile when रास्ता began carrying both readings of a
// destination (decision 014). This said four for a day after that shipped, which is the harness
// asserting a design rather than the product.
check('the app opens with the network off', tiles === 3, `tiles=${JSON.stringify(tiles)}`);

/**
 * रास्ता, end to end, in a real browser with the radio off — the closest this container gets to
 * a person holding a phone. Type a destination, ask how to get there, and count the cards. If
 * the pack, IndexedDB, the planner or the permission dance breaks, this is what reports it.
 */
await page.goto(`${base}/#/transport`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
await page.waitForTimeout(1200);
const planned = await probe(page, async () => {
  const box = document.querySelector('input.askbar-input');
  if (!box) return { error: 'no box on 1.1' };
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(box, 'करामा जाना है');
  box.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((done) => setTimeout(done, 100));
  const buttons = [...document.querySelectorAll('.flow > .rows > button')];
  buttons[0]?.click();
  await new Promise((done) => setTimeout(done, 1200));
  return {
    hash: location.hash,
    options: document.querySelectorAll('.opt').length,
    fares: [...document.querySelectorAll('.opt')].filter((c) => /AED|\d/.test(c.textContent ?? ''))
      .length,
  };
});
check(
  'रास्ता plans a real journey with the network off',
  !planned.error && planned.hash === '#/options/karama' && planned.options > 0,
  JSON.stringify(planned),
);
await context.setOffline(false);

check('no page or CSP errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();

for (const name of passes) console.log(`  ok    ${name}`);
for (const name of failures) console.log(`  FAIL  ${name}`);
console.log(`\n${String(passes.length)} passed, ${String(failures.length)} failed`);
process.exit(failures.length === 0 ? 0 : 1);
