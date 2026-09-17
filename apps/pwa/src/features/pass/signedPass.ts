import { PAID_HOURS } from './entitlement.js';

/**
 * A pass is a token our server signed, and the app verifies it **offline** with the public key
 * shipped inside the bundle (decision 005). Validity is never asked of a server: the strip reads
 * the signature. If the database is down, every traveller with a pass is unaffected.
 *
 * ECDSA P-256 rather than Ed25519, deliberately. Ed25519 is the nicer curve and WebCrypto has
 * only recently agreed on it; P-256 has been in every browser and every Android WebView for a
 * decade, and this product is aimed squarely at cheap phones. A pass that cannot be verified on
 * the phone it was bought for is not a pass.
 *
 * The QR a family member scans carries exactly this token. Scanning installs the pass with no
 * connection at all — a hotel room, a metro platform, a WhatsApp image on a later flight — which
 * is the whole reason the pass is a signature rather than a lookup.
 */

export interface PassClaims {
  /** `passes.id` on the server, so a sync can reconcile this device against its slot. */
  readonly passId: string;
  readonly familyId: string;
  /** 1 is the buyer's own phone; 2–4 are the QR codes on घर.2. */
  readonly slot: number;
  readonly kind: 'paid';
  /**
   * The master Counter Off Time, when the buyer had already landed. Absent for a pass bought in
   * India before the plane: then the phone's own landing starts the clock (decision 006).
   */
  readonly counterOffAt?: string;
  /** Hours the pass is worth from landing. Carried so the rule can change without stranding old passes. */
  readonly hours: number;
}

export interface SignedPass {
  readonly claims: PassClaims;
  /** Base64url of the P-256 signature over the exact claims bytes below. */
  readonly signature: string;
}

/**
 * The public key, base64 SPKI. Replaced at build time by the real one; the fallback is a
 * development key so the flow can be exercised end to end without the server.
 *
 * A pass signed by the development key is worthless in production and vice versa, which is the
 * property that matters: nobody can mint a pass for a real traveller with anything in this repo.
 */
const PUBLIC_KEY_SPKI: string =
  import.meta.env.VITE_PASS_PUBLIC_KEY ??
  'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE4sULnwiXBPxU4BhxVaIw7n6DXKx0jWAQWkr/8fvdY+bdr1rLvMEDqUUFj/9FtT3pF3l3JocqNZv+Kz1Afv6PAw==';

function fromBase64(value: string): Uint8Array {
  const normal = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normal);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * The exact bytes that were signed. Field order is fixed here and on the server; a signature
 * over "whatever JSON.stringify produced today" is a signature that stops verifying the day
 * somebody reorders an interface.
 */
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

let keyPromise: Promise<CryptoKey> | null = null;

function publicKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey(
    'spki',
    fromBase64(PUBLIC_KEY_SPKI) as BufferSource,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  return keyPromise;
}

/**
 * `false` for anything that is not ours. A bad signature is not an error to report to a
 * traveller — it is a QR from somewhere else, or a token somebody edited, and the honest answer
 * on screen is that this code did not work rather than a cryptographic complaint.
 */
export async function verifyPass(pass: SignedPass): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      await publicKey(),
      fromBase64(pass.signature) as BufferSource,
      claimBytes(pass.claims) as BufferSource,
    );
  } catch {
    return false;
  }
}

/** What a QR actually contains: the token, compact enough to scan from a phone screen. */
export function encodePass(pass: SignedPass): string {
  return btoa(JSON.stringify(pass)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * A QR code is bytes somebody pointed a camera at, and a server response is bytes somebody
 * sent, so nothing inside either is typed until this function says so. Every field is checked
 * here and nowhere else — after this the pass is a `SignedPass` and the rest of the app can
 * treat it as one.
 */
export function readPass(raw: unknown): SignedPass | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { claims, signature } = raw as { claims?: unknown; signature?: unknown };
  if (typeof signature !== 'string') return null;
  if (typeof claims !== 'object' || claims === null) return null;

  const c = claims as Record<string, unknown>;
  const hours = typeof c.hours === 'number' && Number.isFinite(c.hours) ? c.hours : PAID_HOURS;
  if (
    typeof c.passId !== 'string' ||
    typeof c.familyId !== 'string' ||
    typeof c.slot !== 'number' ||
    c.kind !== 'paid'
  ) {
    return null;
  }
  return {
    signature,
    claims: {
      passId: c.passId,
      familyId: c.familyId,
      slot: c.slot,
      kind: 'paid',
      hours: hours > 0 ? hours : PAID_HOURS,
      ...(typeof c.counterOffAt === 'string' ? { counterOffAt: c.counterOffAt } : {}),
    },
  };
}

/** What a scanned QR, or the link it carried, decodes to — or nothing, for anything else. */
export function decodePass(scanned: string): SignedPass | null {
  try {
    return readPass(JSON.parse(new TextDecoder().decode(fromBase64(scanned))));
  } catch {
    return null;
  }
}
