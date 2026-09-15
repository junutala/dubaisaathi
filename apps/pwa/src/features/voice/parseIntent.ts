import {
  ROUTING_CONFIDENCE,
  type FoodTag,
  type IntentKind,
  type ParsedIntent,
  type PlaceRef,
  type TransportMode,
} from '@saathi/shared';
import type { IntentCorpus, Keyword } from './corpus.js';
import { nearestPlace } from './nearestPlace.js';
import { skeleton, tokenise, type Token } from './normalise.js';

/**
 * Hinglish in, `ParsedIntent` out — with no network, no model and no LLM (CLAUDE.md rule 3).
 *
 * The KPI is the intent, not the transcript (rule 5): "Bhai mujhe Karama jaana hai, metro se
 * kaise jaaun?" only has to yield `{route, karama, metro}`. So the parser looks for the few
 * things that change what happens — a place, a mode, a diet, a verb — and ignores everything
 * else in the sentence rather than trying to understand it.
 *
 * When it is not sure, it says so: a confidence below `ROUTING_CONFIDENCE` means the screen
 * asks instead of assuming, which is the two-button question, never a dead end.
 */

/**
 * Hindi's postposition for "from". "करामा से बुर दुबई" is two places and only one destination;
 * without this the parser would set off for where the traveller is already standing. There is
 * no matching list for "to", because a place with nothing after it is the destination anyway.
 */
const FROM_MARKERS = new Set(['se', 'sai']);

/** The parser never claims certainty, because the speech that fed it was not certain either. */
const CEILING = 0.95;

interface PlaceHit {
  readonly placeId: string;
  readonly spoken: string;
  readonly confidence: number;
  readonly from: number;
  readonly to: number;
}

/** The traveller's own words for a window of the sentence, with no repeats. */
function said(tokens: readonly Token[], from: number, to: number): string {
  const words: string[] = [];
  for (const token of tokens.slice(from, to)) {
    if (words.at(-1) !== token.raw) words.push(token.raw);
  }
  return words.join(' ');
}

/** Every non-overlapping place in the sentence, longest and most confident first. */
function findPlaces(tokens: readonly Token[], corpus: IntentCorpus): readonly PlaceHit[] {
  const hits: PlaceHit[] = [];
  const width = Math.min(corpus.longestPlace, tokens.length);

  for (let size = width; size >= 1; size--) {
    for (let start = 0; start + size <= tokens.length; start++) {
      const to = start + size;
      if (hits.some((h) => start < h.to && to > h.from)) continue;
      const window = tokens
        .slice(start, to)
        .map((token) => token.folded)
        .join(' ');
      const spoken = said(tokens, start, to);
      const exact = corpus.placeByAlias.get(window);
      if (exact !== undefined) {
        hits.push({ placeId: exact, spoken, confidence: 1, from: start, to });
        continue;
      }
      const near = corpus.placeBySkeleton.get(skeleton(window));
      if (near !== undefined) {
        hits.push({ placeId: near, spoken, confidence: 0.75, from: start, to });
        continue;
      }
      /**
       * Last, and on purpose: the nearest name in the pack to whatever was heard.
       *
       * Nothing transcribes Dubai place names reliably — not our model, and not Google's, which
       * returned "माल का एमिरेट्स" for Mall of the Emirates on the owner's own phone. But the
       * answer is never open. A traveller is naming one of about twenty places we ship, so a
       * hearing two edits away from a name we hold is almost certainly that name, and exact
       * matching and consonant skeletons were both throwing it away.
       *
       * Same confidence as a skeleton match, so it asks the two-button question rather than
       * acting on it. Being sent to the wrong end of Dubai costs an hour and a fare; being asked
       * costs one tap.
       */
      const closest = nearestPlace(window, corpus.placeByAlias);
      if (closest !== undefined) {
        hits.push({ placeId: closest, spoken, confidence: 0.75, from: start, to });
      }
    }
  }
  return hits;
}

function ref(hit: PlaceHit): PlaceRef {
  return { spoken: hit.spoken, placeId: hit.placeId, confidence: hit.confidence };
}

/** Every keyword whose words all appear, in order and adjacent, in the folded sentence. */
function matches<T extends string>(
  folded: string,
  list: readonly Keyword<T>[],
): readonly Keyword<T>[] {
  return list.filter((k) => ` ${folded} `.includes(` ${k.folded} `));
}

function first<T extends string>(folded: string, list: readonly Keyword<T>[]): T | undefined {
  return matches(folded, list)[0]?.value;
}

export function parseIntent(transcript: string, corpus: IntentCorpus): ParsedIntent {
  const tokens = tokenise(transcript);
  const folded = tokens.map((token) => token.folded).join(' ');
  if (folded === '') {
    return { kind: 'unknown', confidence: 0, transcript };
  }

  const places = findPlaces(tokens, corpus);
  const verbs = new Set(matches(folded, corpus.intents).map((k) => k.value));
  const mode = first(folded, corpus.modes);
  const tags = [...new Set(matches(folded, corpus.foodTags).map((k) => k.value))];
  const document = first(folded, corpus.documents);
  const phraseId = first(folded, corpus.phraseIds);
  const hotel = matches(folded, corpus.hotel).length > 0;

  // A place followed by "से" is where they stand; the one they are heading to is the other.
  const origins = places.filter((h) => FROM_MARKERS.has(tokens[h.to]?.folded ?? ''));
  const destinations = places.filter((h) => !origins.includes(h));
  const destination = destinations[0] ?? origins.slice(1)[0];
  const origin = origins[0] === destination ? undefined : origins[0];

  const kind = decide({
    verbs,
    places: places.length > 0,
    tags,
    document,
    phraseId,
    hotel,
    mode: mode !== undefined,
  });
  const confidence = score(kind, { destination, mode, tags, document, phraseId, hotel, verbs });

  return {
    kind,
    confidence,
    transcript,
    ...(origin ? { origin: ref(origin) } : {}),
    ...(destination ? { destination: ref(destination) } : {}),
    ...(mode ? { mode } : {}),
    ...(tags.length > 0 ? { foodTags: tags } : {}),
    ...(kind === 'phrase' && phraseId !== undefined ? { phraseId } : {}),
    ...(kind === 'document' && document !== undefined ? { documentName: document } : {}),
  };
}

interface Signals {
  readonly verbs: ReadonlySet<IntentKind>;
  readonly places: boolean;
  readonly mode: boolean;
  readonly tags: readonly FoodTag[];
  readonly document: string | undefined;
  readonly phraseId: string | undefined;
  readonly hotel: boolean;
}

/**
 * Most specific first. A traveller who says "ड्राइवर को बोलो होटल ले चलो" wants the card shown
 * to the driver, not a route plan, even though the sentence mentions a hotel and a journey.
 */
function decide(s: Signals): IntentKind {
  if (s.verbs.has('document') && s.document !== undefined) return 'document';
  if (s.verbs.has('phrase')) return 'phrase';
  if (s.verbs.has('food') || s.tags.length > 0) return 'food';
  if (s.verbs.has('route')) return 'route';
  // No verb at all. A phrase the app can say, a hotel, a document — each is unambiguous on its
  // own. A bare place name is not: "Karama" could be a route or a restaurant, so it asks.
  if (s.phraseId !== undefined) return 'phrase';
  if (s.document !== undefined) return 'document';
  if (s.hotel) return 'phrase';
  // A means of travel and somewhere to travel to is a journey, however the sentence is phrased:
  // "पैदल जुमेरा" has no verb in it and is not ambiguous either.
  if (s.mode && s.places) return 'route';
  if (s.places) return 'place';
  return 'unknown';
}

interface Slots {
  readonly destination: PlaceHit | undefined;
  readonly mode: TransportMode | undefined;
  readonly tags: readonly FoodTag[];
  readonly document: string | undefined;
  readonly phraseId: string | undefined;
  readonly hotel: boolean;
  readonly verbs: ReadonlySet<IntentKind>;
}

/**
 * A verb alone is enough to open the tile — that is what `ROUTING_CONFIDENCE` is set at. The
 * slot that makes the screen useful (where to, which diet, which sentence) is what lifts it
 * above; a guessed place name drags it back down, because a wrong destination is worse than
 * a question.
 */
function score(kind: IntentKind, s: Slots): number {
  if (kind === 'unknown') return 0;
  // No verb, just a noun: the screen has to ask which of two things they meant.
  if (kind === 'place') return 0.5;

  let confidence = s.verbs.has(kind) ? ROUTING_CONFIDENCE : 0.55;
  if (kind === 'route' && s.destination) confidence += 0.2 * s.destination.confidence;
  if (kind === 'route' && s.mode) confidence += 0.1;
  if (kind === 'food' && s.tags.length > 0) confidence += 0.2;
  if (kind === 'food' && s.destination) confidence += 0.1;
  if (kind === 'phrase' && s.phraseId !== undefined) confidence += 0.25;
  else if (kind === 'phrase' && s.hotel) confidence += 0.15;
  if (kind === 'document' && s.document !== undefined) confidence += 0.25;

  return Math.min(CEILING, Math.round(confidence * 100) / 100);
}

/** Whether the parser is sure enough to open a screen rather than ask a question. */
export function isConfident(intent: ParsedIntent): boolean {
  return intent.confidence >= ROUTING_CONFIDENCE;
}
