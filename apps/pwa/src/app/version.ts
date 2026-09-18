/**
 * Which build this is.
 *
 * Put on the screen because for a whole morning there was no way to answer the only question
 * that mattered after a deploy — "am I looking at the new one?" — without reading server logs.
 * A traveller will never care. The two people who have to trust that a fix shipped care a great
 * deal, and asking them to take it on faith is how a release that was live sat unseen for a day.
 *
 * Vite substitutes any VITE_-prefixed variable at build time; the Dockerfiles fill these from
 * Railway's own commit argument and the build clock. A local build has neither and says so.
 */
const sha = import.meta.env.VITE_BUILD_SHA ?? '';
const at = import.meta.env.VITE_BUILD_TIME ?? '';

/** The commit, short, and when it was built. Both are what `version.json` is compared against. */
export const BUILD_SHA = sha.slice(0, 7);
export const BUILD_AT = at;

export const BUILD = sha === '' ? 'dev' : `${at} · ${sha.slice(0, 7)}`.trim();
