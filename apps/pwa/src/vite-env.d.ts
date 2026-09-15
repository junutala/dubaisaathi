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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
