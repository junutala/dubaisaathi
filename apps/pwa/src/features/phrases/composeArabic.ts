import type { FoodTag, ParsedIntent, Phrase } from '@saathi/shared';
import pack from '../../../../../data/phrases/arabic.v1.json';

/**
 * Arabic built from an intent and its slots, rather than looked up sentence by sentence.
 *
 * The sixteen ready phrases are a menu. This is a grammar: one template for "I want to go to X"
 * serves every destination in Dubai, and one for food serves every combination of what a
 * traveller will and will not eat. `{food, [jain, no-onion]}` composes a sentence nobody typed
 * in advance, which is the difference between a translator and a parrot.
 *
 * **What it does when it cannot resolve something.** The traveller's own words go through
 * untouched. A place we do not know, a dish we have no Arabic for — the English or Hinglish
 * word sits inside an Arabic sentence, and a driver reads the frame and the name. That is how
 * the destination template has always worked, and it is why a closed list of places never
 * limited where anybody could go. Inventing a translation is the one thing we never do: it was
 * a guess that turned "Burjuman" into "Dubai Mall" on a driver's screen.
 *
 * **What it refuses.** An intent with no template returns `null` rather than something vague.
 * That is the NO branch of the agreed design — the on-device model takes it from there, and a
 * wrong sentence delivered confidently is worse than no sentence at all.
 *
 * Grammar is not the bar. The owner settled it: conveying the meaning beats chaste Arabic,
 * because the alternative on a Dubai street is sign language at 50°C.
 */

type TemplateKey = keyof typeof pack.templates;

/** A slot value in every language, so each sentence is built in its own. */
interface Trilingual {
  readonly ar: string;
  readonly hi: string;
  readonly en: string;
}
type Lang = keyof Trilingual;

/** Tags a traveller is asking *for*, and tags they are asking to avoid, kept apart. */
const WANT: Readonly<Record<string, Trilingual>> = pack.food.want;
const AVOID: Readonly<Record<string, Trilingual>> = pack.food.avoid;

function fill(template: string, slots: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => slots[name] ?? whole);
}

/**
 * Builds each language from its own words.
 *
 * The first attempt filled all three templates from the Arabic slot, which produced
 * "मुझे طعام جايني चाहिए" — a Hindi sentence with an Arabic word wedged into it. A traveller has
 * to be able to read what they are about to hold up to a stranger; a sentence they cannot check
 * is one they cannot trust.
 */
function compose(
  key: TemplateKey,
  slots: Readonly<Record<string, Trilingual>>,
): Omit<Phrase, 'id'> {
  const t: Trilingual = pack.templates[key];
  const inLang = (lang: Lang): string =>
    fill(t[lang], Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, v[lang]])));
  return {
    situation: key.startsWith('food') ? 'restaurant' : 'taxi',
    ar: inLang('ar'),
    hi: inLang('hi'),
    hinglish: inLang('en'),
    en: inLang('en'),
  };
}

/**
 * The Arabic for a food tag, or the tag's own words when we have none.
 *
 * A tag with no entry is passed through rather than dropped: "I want {sattvik}" with the English
 * word in it still gets a traveller most of the way, and silently losing the one word that
 * mattered is how somebody ends up eating what they cannot eat.
 */
function foodWords(
  tags: readonly FoodTag[],
  table: Readonly<Record<string, Trilingual>>,
): Trilingual[] {
  // A tag with no entry keeps its own name in all three languages rather than vanishing:
  // silently dropping the one word that mattered is how somebody eats what they cannot eat.
  return tags.map((tag) => table[tag] ?? { ar: tag, hi: tag, en: tag });
}

/**
 * The destination exactly as the traveller wrote it, with the travelling verb taken off the end.
 *
 * The parser resolves "Satwa building 7" to the place `satwa`, keeping only the tokens that
 * matched — which is right for opening a screen and wrong for a taxi door. Shown to a driver it
 * becomes "take me to Satwa", a neighbourhood of tens of thousands of people, and the building
 * number the traveller actually typed is gone. The owner's words when a curated list did this
 * before: _"the driver will say that either our app is stupid or the tourist is stupid."_
 *
 * So for anything a driver reads, the traveller's own words win over our resolution.
 */
export function destinationWords(transcript: string): string {
  let words = transcript.trim();
  const verbs: readonly string[] = pack.routeVerbs;
  // Longest first, so "ko jaana hai" is taken off before "jaana hai" can match inside it.
  for (const verb of [...verbs].sort((a, b) => b.length - a.length)) {
    const tail = words.toLowerCase();
    if (tail.endsWith(verb.toLowerCase())) {
      words = words.slice(0, words.length - verb.length).trim();
      break;
    }
  }
  // "mujhe X jaana hai" — the lead-in is not part of the address either.
  return words.replace(/^(?:mujhe|mereko|main|hume|मुझे|मैं|हमें)\s+/i, '').trim();
}

/** Joins slot values per language, so each sentence reads with its own "and". */
function joinAll(parts: readonly Trilingual[], join: Trilingual): Trilingual {
  return {
    ar: parts.map((p) => p.ar).join(join.ar),
    hi: parts.map((p) => p.hi).join(join.hi),
    en: parts.map((p) => p.en).join(join.en),
  };
}

/**
 * `arabicForPlace` is passed in rather than imported so this file stays pure and testable, and
 * so the place pack is the caller's business. It returns undefined for a place we do not know —
 * which is the common case, and not a failure.
 */
export function composeArabic(
  intent: ParsedIntent,
  arabicForPlace?: (placeId: string) => string | undefined,
): Omit<Phrase, 'id'> | null {
  if (intent.kind === 'route' || intent.kind === 'place') {
    const place = intent.destination;
    if (place === undefined) return null;
    // The place's own Arabic name when the pack has one; otherwise exactly what they typed,
    // carried through untouched. A driver reads the Arabic frame and the name he knows.
    const written = destinationWords(intent.transcript);
    // Did they write more than the place we matched? "Satwa building 7" against "Satwa". If so
    // their words are the address and our resolution is a summary of it.
    const saidMore =
      written !== '' && written.toLowerCase().replace(/\s+/g, ' ') !== place.spoken.toLowerCase();
    const known = place.placeId === undefined ? undefined : arabicForPlace?.(place.placeId);
    const shown = saidMore ? written : (known ?? place.spoken);
    const mine = saidMore ? written : place.spoken;
    if (shown.trim() === '') return null;
    return compose('route', { place: { ar: shown, hi: mine, en: mine } });
  }

  if (intent.kind === 'food') {
    const tags = intent.foodTags ?? [];
    if (tags.length === 0) return null;
    const wants = foodWords(
      tags.filter((tag) => !(tag in AVOID)),
      WANT,
    );
    const avoids = foodWords(
      tags.filter((tag) => tag in AVOID),
      AVOID,
    );
    const and: Trilingual = pack.join;

    if (wants.length > 0 && avoids.length > 0) {
      return compose('food.wantAvoid', {
        want: joinAll(wants, and),
        avoid: joinAll(avoids, and),
      });
    }
    if (wants.length > 0) return compose('food.want', { want: joinAll(wants, and) });
    if (avoids.length > 0) return compose('food.avoid', { avoid: joinAll(avoids, and) });
    return null;
  }

  // Everything else has no template. The model takes it, or the traveller is told plainly.
  return null;
}
