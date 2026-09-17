/**
 * Signing and verifying a pass — the server half of decision 005.
 *
 * The app verifies a pass offline against the public key in its bundle
 * (`apps/pwa/src/features/pass/signedPass.ts`). What is signed is exactly `claimBytes` there:
 * the claims joined with `|` in a fixed order. This file MUST produce the same bytes, which is
 * why the canonical form is written out here rather than derived from a JSON object, and why
 * `apps/pwa/src/features/pass/signedPass.test.ts` pins the string.
 *
 * The private key exists only as the edge-function secret `PASS_SIGNING_KEY` (base64 PKCS8,
 * P-256). It is never in the repo, a migration or the bundle. `npm run pass:key` makes a pair.
 */

export interface PassClaims {
  readonly passId: string;
  readonly familyId: string;
  readonly slot: number;
  readonly kind: 'paid';
  readonly counterOffAt?: string;
  readonly hours: number;
}

export interface SignedPass {
  readonly claims: PassClaims;
  readonly signature: string;
}

/** Byte-for-byte what the app signs over — see `claimBytes` in signedPass.ts. */
export function claimBytes(claims: PassClaims): Uint8Array {
  const canonical = [
    claims.passId,
    claims.familyId,
    String(claims.slot),
    claims.kind,
    claims.counterOffAt ?? '',
    String(claims.hours),
  ].join('|');
  return new TextEncoder().encode(canonical);
}

export function fromBase64(value: string): Uint8Array {
  const normal = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normal);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIG = { name: 'ECDSA', hash: 'SHA-256' } as const;

export function importPrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', fromBase64(pkcs8Base64), ALG, true, ['sign']);
}

export function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', fromBase64(spkiBase64), ALG, false, ['verify']);
}

/**
 * The public half of the signing key, so `bind` needs no second secret. A P-256 private JWK
 * carries its own public coordinates; dropping `d` is all it takes.
 */
export async function publicKeyOf(privateKey: CryptoKey): Promise<CryptoKey> {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  const { d: _d, ...publicJwk } = jwk;
  return crypto.subtle.importKey('jwk', { ...publicJwk, key_ops: ['verify'] }, ALG, false, [
    'verify',
  ]);
}

export async function signPass(claims: PassClaims, privateKey: CryptoKey): Promise<SignedPass> {
  const signature = await crypto.subtle.sign(SIG, privateKey, claimBytes(claims));
  return { claims, signature: toBase64Url(signature) };
}

export async function verifyPass(pass: SignedPass, publicKey: CryptoKey): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      SIG,
      publicKey,
      fromBase64(pass.signature),
      claimBytes(pass.claims),
    );
  } catch {
    return false;
  }
}
