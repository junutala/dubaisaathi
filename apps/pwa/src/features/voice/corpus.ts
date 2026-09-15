import {
  FOOD_TAGS,
  TRANSPORT_MODES,
  type DubaiPlace,
  type FoodTag,
  type IntentKind,
  type TransportMode,
} from '@saathi/shared';
import { fold, skeleton, SKELETON_MIN } from './normalise.js';

/**
 * The parser's vocabulary, built once from `data/intents/`. Places and keywords are content,
 * not code (CLAUDE.md working conventions) — the learning loop's output is a new alias in the
 * JSON, never an edit here.
 */

export interface PlacePack {
  readonly contentVersion: number;
  readonly publishedAt: string;
  readonly places: readonly DubaiPlace[];
}

/** The keyword pack, as it sits on disk: a canonical value against the words that mean it. */
export interface KeywordPack {
  readonly contentVersion: number;
  readonly publishedAt: string;
  readonly intents: Readonly<Record<string, readonly string[]>>;
  readonly modes: Readonly<Record<string, readonly string[]>>;
  readonly foodTags: Readonly<Record<string, readonly string[]>>;
  readonly documents: Readonly<Record<string, readonly string[]>>;
  readonly phrases: Readonly<Record<string, readonly string[]>>;
  readonly hotel: readonly string[];
}

/** A keyword, folded once at build time so matching never folds in a loop. */
export interface Keyword<T extends string> {
  readonly folded: string;
  readonly value: T;
  /** Word count, so a longer keyword wins over a shorter one it contains. */
  readonly words: number;
}

export interface IntentCorpus {
  readonly places: ReadonlyMap<string, DubaiPlace>;
  /** Folded alias → place id. The confident match. */
  readonly placeByAlias: ReadonlyMap<string, string>;
  /** Consonant skeleton → place id, only where it is unambiguous. The "probably this" match. */
  readonly placeBySkeleton: ReadonlyMap<string, string>;
  /** Longest alias in words, so the matcher knows how wide a window to slide. */
  readonly longestPlace: number;
  readonly intents: readonly Keyword<IntentKind>[];
  readonly modes: readonly Keyword<TransportMode>[];
  readonly foodTags: readonly Keyword<FoodTag>[];
  readonly documents: readonly Keyword<string>[];
  readonly phraseIds: readonly Keyword<string>[];
  readonly hotel: readonly Keyword<'hotel'>[];
}

/** Intent kinds a keyword may name. `place` and `unknown` are conclusions, not keywords. */
const KEYWORD_INTENTS: readonly IntentKind[] = ['route', 'food', 'phrase', 'document'];

function keywords<T extends string>(
  table: Readonly<Record<string, readonly string[]>>,
  allowed: readonly T[] | null,
  label: string,
): readonly Keyword<T>[] {
  const out: Keyword<T>[] = [];
  for (const [value, words] of Object.entries(table)) {
    if (allowed && !(allowed as readonly string[]).includes(value)) {
      throw new Error(`keyword pack: ${label} "${value}" is not one we know about`);
    }
    for (const word of words) {
      const folded = fold(word);
      if (folded === '') throw new Error(`keyword pack: ${label} "${value}" has an empty keyword`);
      out.push({ folded, value: value as T, words: folded.split(' ').length });
    }
  }
  // Longest first, so "metro station le chalo" is tried before "le chalo".
  return out.sort((a, b) => b.folded.length - a.folded.length);
}

/**
 * Narrows both packs at the boundary and throws on anything malformed, so a bad pack fails
 * loudly at boot rather than quietly parsing every sentence as `unknown`.
 */
export function buildCorpus(rawPlaces: unknown, rawKeywords: unknown): IntentCorpus {
  const placePack = rawPlaces as PlacePack;
  const pack = rawKeywords as KeywordPack;

  const places = new Map<string, DubaiPlace>();
  const placeByAlias = new Map<string, string>();
  const skeletons = new Map<string, Set<string>>();
  let longestPlace = 1;

  for (const place of placePack.places) {
    places.set(place.id, place);
    // The Arabic name is a name, not decoration. It ships for the driver's card, and it is also
    // what the offline recogniser writes when it hears Hindi as Urdu: "برجمان" came back from a
    // real phone for a sentence about BurJuman, and we were holding that exact spelling and not
    // looking at it. Rule 4 says normalise before matching and never branch on script — this is
    // the third script.
    const aliases = [
      place.id,
      place.name.en,
      place.name.hi,
      ...(place.name.ar === undefined ? [] : [place.name.ar]),
      ...place.name.aliases,
    ];
    for (const alias of aliases) {
      const folded = fold(alias);
      if (folded === '') continue;
      longestPlace = Math.max(longestPlace, folded.split(' ').length);
      const existing = placeByAlias.get(folded);
      if (existing !== undefined && existing !== place.id) {
        throw new Error(`place pack: "${alias}" points at both ${existing} and ${place.id}`);
      }
      placeByAlias.set(folded, place.id);
      const bones = skeleton(alias);
      if (bones.length < SKELETON_MIN) continue;
      const owners = skeletons.get(bones) ?? new Set<string>();
      owners.add(place.id);
      skeletons.set(bones, owners);
    }
  }

  // A skeleton shared by two places tells us nothing, so it is dropped rather than guessed at.
  const placeBySkeleton = new Map<string, string>();
  for (const [bones, owners] of skeletons) {
    const [only] = owners;
    if (owners.size === 1 && only !== undefined) placeBySkeleton.set(bones, only);
  }

  return {
    places,
    placeByAlias,
    placeBySkeleton,
    longestPlace,
    intents: keywords<IntentKind>(pack.intents, KEYWORD_INTENTS, 'intent'),
    modes: keywords<TransportMode>(pack.modes, TRANSPORT_MODES, 'mode'),
    foodTags: keywords<FoodTag>(pack.foodTags, FOOD_TAGS, 'food tag'),
    documents: keywords<string>(pack.documents, null, 'document'),
    phraseIds: keywords<string>(pack.phrases, null, 'phrase'),
    hotel: keywords<'hotel'>({ hotel: pack.hotel }, ['hotel'], 'hotel'),
  };
}
