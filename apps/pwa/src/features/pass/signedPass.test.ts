import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The pass, verified the way a phone verifies it: with no network, against a key that shipped
 * inside the app (decision 005).
 *
 * The failure that matters is not a forged pass — it is a real one that will not verify, on a
 * cheap Android in a hotel room, because the bytes we signed and the bytes we check stopped
 * agreeing. Nobody finds that until a family of four is standing there with a QR that does
 * nothing, so the canonical form is pinned here rather than trusted to `JSON.stringify`.
 */

async function keypair() {
  return crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
}

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/** Loads the module with a public key we hold the private half of. */
async function withKey(publicKey: CryptoKey) {
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  vi.stubEnv('VITE_PASS_PUBLIC_KEY', toBase64(spki));
  vi.resetModules();
  return import('./signedPass.js');
}

const CLAIMS = {
  passId: '7c9e2b1a-0000-4000-8000-00000000abcd',
  familyId: '1f2e3d4c-0000-4000-8000-00000000beef',
  slot: 2,
  kind: 'paid',
  counterOffAt: '2026-10-01T06:00:00.000Z',
  hours: 336,
} as const;

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('a signed pass', () => {
  it('verifies offline against the key shipped in the app', async () => {
    const pair = await keypair();
    const mod = await withKey(pair.publicKey);
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.privateKey,
      mod.claimBytes(CLAIMS) as BufferSource,
    );
    expect(await mod.verifyPass({ claims: CLAIMS, signature: toBase64(signature) })).toBe(true);
  });

  /** The whole point: change a claim and the signature stops matching it. */
  it('refuses a pass whose claims were edited after signing', async () => {
    const pair = await keypair();
    const mod = await withKey(pair.publicKey);
    const signature = toBase64(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        pair.privateKey,
        mod.claimBytes(CLAIMS) as BufferSource,
      ),
    );
    const stretched = { ...CLAIMS, counterOffAt: '2027-01-01T00:00:00.000Z' };
    expect(await mod.verifyPass({ claims: stretched, signature })).toBe(false);
  });

  it('refuses a pass signed by anybody else', async () => {
    const ours = await keypair();
    const theirs = await keypair();
    const mod = await withKey(ours.publicKey);
    const signature = toBase64(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        theirs.privateKey,
        mod.claimBytes(CLAIMS) as BufferSource,
      ),
    );
    expect(await mod.verifyPass({ claims: CLAIMS, signature })).toBe(false);
  });

  it('says no rather than throwing on a QR from somewhere else', async () => {
    const pair = await keypair();
    const mod = await withKey(pair.publicKey);
    expect(await mod.verifyPass({ claims: CLAIMS, signature: 'not base64 at all !!' })).toBe(false);
    expect(mod.decodePass('a shop receipt')).toBeNull();
  });

  it('survives a round trip through a QR', async () => {
    const pair = await keypair();
    const mod = await withKey(pair.publicKey);
    const signature = toBase64(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        pair.privateKey,
        mod.claimBytes(CLAIMS) as BufferSource,
      ),
    );
    const scanned = mod.decodePass(mod.encodePass({ claims: CLAIMS, signature }));
    expect(scanned).not.toBeNull();
    expect(await mod.verifyPass(scanned!)).toBe(true);
  });

  /**
   * The canonical form is the contract with the server. If this test is ever "fixed" by updating
   * the expected string, every pass already on a traveller's phone stops verifying.
   */
  it('signs exactly these bytes, in exactly this order', async () => {
    const mod = await import('./signedPass.js');
    expect(new TextDecoder().decode(mod.claimBytes(CLAIMS))).toBe(
      '7c9e2b1a-0000-4000-8000-00000000abcd|1f2e3d4c-0000-4000-8000-00000000beef|2|paid|2026-10-01T06:00:00.000Z|336',
    );
  });
});
