/// <reference types="vite/client" />

/**
 * Vite's own `ImportMetaEnv` is an index signature of `any`, so every read of a build variable
 * arrives untyped and trips the strict rules. Declaring the ones this app actually uses turns
 * them back into strings, which is the fix — silencing the rule at each call site is not.
 */
interface ImportMetaEnv {
  /** The commit this bundle was built from, from Railway's build argument. Empty locally. */
  readonly VITE_BUILD_SHA?: string;
  /** When it was built, UTC, from the build clock. Empty locally. */
  readonly VITE_BUILD_TIME?: string;
  /** Supabase project URL — where the edge functions live. */
  readonly VITE_SUPABASE_URL?: string;
  /** Base64 SPKI of the pass-signing public key, set as a Railway variable. */
  readonly VITE_PASS_PUBLIC_KEY?: string;
  /** "true" once paying is live; until then घर.4's pay button says so and does nothing. */
  readonly VITE_PURCHASE_LIVE?: string;
  /**
   * "true" once the server side of "QR कोड" is deployed (decision 049): the `order` `link` action,
   * `payment_link.paid` in `webhook`, and migration 0024. Read only alongside the one above.
   */
  readonly VITE_QR_PAY_LIVE?: string;
  /**
   * "true" once the gate may close on a trial that has run out. Separate from the one above on
   * purpose (decision 019): the owner buys a real pass on a live build long before any
   * traveller is turned away. Default off, and the only thing `isGated` reads.
   */
  readonly VITE_GATE_LIVE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * The browser's own QR reader (Shape Detection API), which lib.dom does not describe yet. Declared
 * optional on `window` because many browsers lack it — the card's QR code is then read by the
 * decoder bundled with the app (features/info/readQr.ts), never declared unreadable.
 */
interface DetectedBarcode {
  readonly rawValue: string;
}
interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}
interface Window {
  readonly BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetector;
}
