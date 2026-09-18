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
  /** "true" once paying is live; until then घर.4's buy buttons say so and do nothing. */
  readonly VITE_PURCHASE_LIVE?: string;
  /**
   * "true" once the gate may close on a trial that has run out. Separate from the one above on
   * purpose (decision 019): the owner buys a real pass on a live build long before any
   * traveller is turned away. Default off, and the only thing `isGated` reads.
   */
  readonly VITE_GATE_LIVE?: string;
  /**
   * "true" to show घर.4's "start again" — the one control that takes a pass off this phone.
   * It exists so the owner can buy the same pass a second time while the payment plumbing is
   * being proved, and it is its own switch rather than an inference from the two above, because
   * a release must never take something from a traveller's phone by accident (CLAUDE.md). Off
   * unless somebody deliberately sets it, and it never touches the hotel or the documents.
   */
  readonly VITE_TESTING_TOOLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
