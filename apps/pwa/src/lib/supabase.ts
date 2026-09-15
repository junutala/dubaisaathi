/**
 * Where the backend is, and the key that names the project.
 *
 * **Publishable by design.** This key identifies the project, not a person, and it is what every
 * Supabase browser client ships. It grants nothing on its own: RLS is on with no policies, so the
 * tables are unreachable except through an edge function, which holds the service role.
 *
 * One home for both, because they were about to have two. `sync.ts` had them and `translate.ts`
 * reached for a `VITE_SUPABASE_URL` build variable that nobody had set — so the translator was
 * wired to an address that did not exist, and failed in the one way that looks like "no signal".
 */
export const PROJECT_URL = 'https://pixlnjmpksmfqheotinp.supabase.co';
export const PUBLISHABLE_KEY = 'sb_publishable_kPj5Kv8cbgwrkyp9tRfLRg_Wy4olS5H';

/** The headers every call to an edge function needs. */
export function supabaseHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${PUBLISHABLE_KEY}`,
    apikey: PUBLISHABLE_KEY,
  };
}
