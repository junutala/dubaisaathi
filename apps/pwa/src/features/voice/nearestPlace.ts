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
 */

/**
 * How far apart two folded names may be and still be the same name. One edit per four
 * characters, capped — beyond three a shortlist stops being short.
 */
export function allowedEdits(length: number): number {
  return Math.min(3, Math.floor(length / 4));
}

/**
 * The shortest window worth comparing at all, and the number is measured rather than chosen.
 *
 * Short words collide with the language. "करना" — *to do*, one of the commonest verbs in Hindi —
 * folds to `karana`, which is **one edit** from `karama`. At six characters that is inside any
 * sane threshold, so "मेरा फ़ोन चार्ज करना है" was answered with "Karama: रास्ता or खाना?" — a
 * question about a neighbourhood, asked of somebody who wanted their phone charged.
 *
 * The real hearings that have to survive are longer, and were measured on the transcripts this
 * project actually produced:
 *
 *   barajaman      vs burajuman        2 edits at 9 characters   (whisper-base, BurJuman)
 *   mal ka emirets vs mol of emirets   3 edits at 14             (Google, Mall of the Emirates)
 *   karana         vs karama           1 edit at 6               (must never match)
 *
 * Eight separates them with room on both sides. It gives up one case — Vosk's "माला एमरेट्स" is
 * five edits away, which is far enough that matching it would be a guess rather than a hearing —
 * and Vosk is gone.
 */
export const NEAREST_MIN = 8;

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
): string | undefined {
  if (window.length < NEAREST_MIN) return undefined;
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
