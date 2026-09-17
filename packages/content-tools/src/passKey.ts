/**
 * Makes the key pair a pass is signed with (decision 005), and prints it. Nothing is written
 * to disk: the private half goes straight into the edge-function secret and nowhere else.
 *
 *   npm run pass:key
 *
 * Prints two base64 lines with where each one goes:
 * - PKCS8 private → `PASS_SIGNING_KEY` on the `redeem` and `bind` functions (Supabase secrets).
 * - SPKI public → `VITE_PASS_PUBLIC_KEY` on the Railway `pwa` service, so the app verifies
 *   offline; optionally `PASS_PUBLIC_KEY` on `bind`.
 *
 * Run it once per key. Rotating the key strands every pass already on a phone, because the
 * app only ever holds one public key — so a rotation is a decision, not a routine.
 */
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;

function toBase64(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString('base64');
}

async function main(): Promise<void> {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const pkcs8 = toBase64(await subtle.exportKey('pkcs8', pair.privateKey));
  const spki = toBase64(await subtle.exportKey('spki', pair.publicKey));

  console.log('A fresh P-256 pair. Nothing was written to disk.');
  console.log('');
  console.log('1. PASS_SIGNING_KEY — set as a secret on the redeem and bind edge functions:');
  console.log(pkcs8);
  console.log('');
  console.log('2. VITE_PASS_PUBLIC_KEY — set on the Railway pwa service (and PASS_PUBLIC_KEY on');
  console.log('   bind, if the private key should stay on redeem alone):');
  console.log(spki);
  console.log('');
  console.log('Never paste the first line into the repo, a migration or a chat.');
}

await main();
