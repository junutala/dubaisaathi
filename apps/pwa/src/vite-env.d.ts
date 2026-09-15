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
  /** "true" once paying is live; until then the strip never gates anybody. */
  readonly VITE_PURCHASE_LIVE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
