/**
 * The nearest place in the pack to something a recogniser produced.
 *
 * This exists because the transcript is the wrong thing to try to fix. Dubai place names are
 * English and Arabic proper nouns said in an Indian accent inside a Hindi sentence, and nothing
 * transcribes them reliably: Vosk returned "माला एमरेट्स" for Mall of the Emirates, whisper-base
 * ran three words into one, and Google's cloud recogniser — with a data centre behind it — gave
 * "माल का एमिरेट्स" on the same phone on the same afternoon. A larger model is not the answer to
 * that, and buying one twice has already been tried.
 *
 * What makes it tractable is that the answer is never open. A traveller is naming one of about
 * twenty places we ship, so this is not transcription but a nearest-match over a closed, small
 * list — and "बरजमान" is two edits from "बुरजुमान", which exact matching and consonant skeletons
 * both throw away. Rule 5 said it first: intent accuracy is the KPI, not a clean transcript.
 *
 * Deliberately not confident. A near match answers with the two-button question rather than
 * acting, which is what `placeBySkeleton` already does and for the same reason: being sent to
 * the wrong end of Dubai costs an hour and a fare, and being asked costs one tap.
 *
 * And it never reaches for a word that is the language rather than a name — the packs' own
 * keywords, the function words, the common verbs. Without that guard a nearest-match over twenty
 * names starts answering questions about neighbourhoods to people who asked about phone
 * chargers.
 */

/**
 * How far apart two folded names may be and still be the same name. One edit per four
 * characters, capped — beyond three a shortlist stops being short.
 */
export function allowedEdits(length: number): number {
  return Math.min(3, Math.floor(length / 4));
}

/**
 * The shortest window worth comparing. Below four almost anything is one edit from anything.
 *
 * It was eight, to keep "करना" — *to do* — from being read as "करामा" at one edit. That worked
 * and cost too much: Deira, Karama and Satwa are short names, and a phone that produced "dhira"
 * for Deira, two edits away, was refused a match it should have had. Length was the wrong tool.
 * The language is excluded by name instead (`ordinaryWords`), which is the actual rule.
 *
 * Measured against what this project's recognisers really produced:
 *
 *   dira           vs dera             2 edits at 4 characters   (whisper-base, Deira)
 *   bajuman        vs burajuman        2 edits at 7              (whisper-base, BurJuman)
 *   mal ka emirets vs mol of emirets   3 edits at 14             (Google, Mall of the Emirates)
 *   karana         vs karama           1 edit at 6               — refused, as a known verb
 *   brijamanaval   vs burajuman        7 edits                   — refused, and rightly
 */
export const NEAREST_MIN = 4;

/**
 * Levenshtein distance, stopping as soon as it cannot come in under `limit`.
 *
 * The bound is not an optimisation, it is the point: this runs over every alias in the pack for
 * every window of every sentence, on a cheap phone, while somebody waits.
 */
export function editsBetween(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  if (a === b) return 0;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i, ...Array.from({ length: b.length }, () => 0)];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (row[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      row[j] = value;
      best = Math.min(best, value);
    }
    // Every remaining path runs through this row, so if none of it is close enough, none of them
    // are. A whole pack of aliases is rejected in a few characters this way.
    if (best > limit) return limit + 1;
    previous = row;
  }
  return previous[b.length] ?? limit + 1;
}

/**
 * The single closest alias, or `undefined` when nothing is close or two places tie.
 *
 * A tie is not a near miss to be broken by ordering — it is two answers, and picking one would
 * be inventing the traveller's intention. Sending somebody to the wrong end of Dubai on a coin
 * toss is the failure this whole file exists to avoid.
 */
export function nearestPlace(
  window: string,
  aliases: ReadonlyMap<string, string>,
  ordinaryWords: ReadonlySet<string>,
): string | undefined {
  if (window.length < NEAREST_MIN) return undefined;
  // A word of the language is not a near miss for a name. This is the guard that lets short
  // names be matched at all, and it is checked before any distance is computed.
  if (ordinaryWords.has(window)) return undefined;
  const limit = allowedEdits(window.length);
  if (limit === 0) return undefined;

  let best = limit + 1;
  let winner: string | undefined;
  let tied = false;

  for (const [alias, placeId] of aliases) {
    if (alias.length < NEAREST_MIN) continue;
    const distance = editsBetween(window, alias, limit);
    if (distance > limit) continue;
    if (distance < best) {
      best = distance;
      winner = placeId;
      tied = false;
    } else if (distance === best && placeId !== winner) {
      tied = true;
    }
  }
  return tied ? undefined : winner;
}
