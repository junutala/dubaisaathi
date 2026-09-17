import { vi } from 'vitest';
import type { PassClaims, SignedPass } from './signedPass.js';

/**
 * Test-only: a fresh P-256 pair, the app's modules reloaded to trust its public half, and a
 * signer that produces exactly what `redeem` produces. No key here ever leaves the test run.
 */

function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function trustedSigner() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
  vi.stubEnv('VITE_PASS_PUBLIC_KEY', btoa(String.fromCharCode(...new Uint8Array(spki))));
  vi.resetModules();
  const signedPass = await import('./signedPass.js');

  const sign = async (
    claims: PassClaims,
    key: CryptoKey = pair.privateKey,
  ): Promise<SignedPass> => ({
    claims,
    signature: toBase64Url(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        signedPass.claimBytes(claims) as BufferSource,
      ),
    ),
  });

  /** A family of `slots` passes, as `redeem` would issue them, slot 1 first. */
  const family = async (slots: number, counterOffAt?: string): Promise<SignedPass[]> => {
    const familyId = crypto.randomUUID();
    const passes: SignedPass[] = [];
    for (let slot = 1; slot <= slots; slot += 1) {
      passes.push(
        await sign({
          passId: crypto.randomUUID(),
          familyId,
          slot,
          kind: 'paid',
          ...(counterOffAt === undefined ? {} : { counterOffAt }),
          hours: 336,
        }),
      );
    }
    return passes;
  };

  return { pair, sign, family, signedPass };
}

/** `fetch` that answers by the function called and the body sent. */
export function answer(
  reply: (path: string, body: Record<string, unknown>) => { status?: number; json: unknown },
) {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname.replace('/functions/v1/', '');
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as Record<
      string,
      unknown
    >;
    calls.push({ path, body });
    const { status = 200, json } = reply(path, body);
    return Promise.resolve(new Response(JSON.stringify(json), { status }));
  });
  return calls;
}

export const online = (yes: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value: yes, configurable: true });
};
