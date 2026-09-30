/**
 * Publishing from a rows file adds to the pack; it never shrinks it.
 *
 * A rows file is whatever one desk had to hand — the day's new kitchens, or one outlet corrected —
 * and never the whole of what is published. On 30 September two sessions each held their own file:
 * one had published nine Karama kitchens the other's file had never seen, and a plain rewrite
 * from the second file would have taken those nine off every phone. So an outlet in the file
 * replaces the published one with its id, where it stood; a new one is added at the end; and every
 * outlet the file does not mention stays exactly as it was published.
 */
export function mergeOutlets<T extends { readonly id: string }>(
  published: readonly T[],
  fresh: readonly T[],
): T[] {
  const byId = new Map(fresh.map((outlet) => [outlet.id, outlet]));
  const merged = published.map((outlet) => byId.get(outlet.id) ?? outlet);
  const kept = new Set(published.map((outlet) => outlet.id));
  return [...merged, ...fresh.filter((outlet) => !kept.has(outlet.id))];
}
