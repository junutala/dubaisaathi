/**
 * The intent contract.
 *
 * Per CLAUDE.md, intent accuracy matters more than transcription accuracy: "Bhai mujhe Karama
 * jaana hai, metro se kaise jaaun?" only has to yield destination=Karama, mode=metro,
 * intent=route. This type is what the voice pipeline produces and what every feature consumes,
 * so it is the seam between speech and the rest of the app.
 */

import type { FoodTag, TransportMode } from './entities.js';

export type IntentKind =
  | 'route' // "Marina Mall jaana hai" → 1.3 with the options
  | 'food' // "Jain khana kahaan milega" → 2.1 with the filter on
  | 'phrase' // "driver ko bolo hotel le chalo" → 3.3 with the hotel card
  | 'document' // "beema dikhao" → 4.4, the document
  | 'place' // a place, but not clear what to do with it → a two-button question
  | 'unknown'; // nothing matched — offer the traveller a menu, never a dead end

/** How sure the parser has to be before it opens a screen rather than asking. */
export const ROUTING_CONFIDENCE = 0.6;

/** A place reference the parser extracted, resolved against local data where possible. */
export interface PlaceRef {
  /** The words the traveller actually used, kept for display and debugging. */
  readonly spoken: string;
  /** Resolved `DubaiPlace.id`, absent when the parser could not resolve it confidently. */
  readonly placeId?: string;
  /** 0–1. Low confidence means ask, do not guess. */
  readonly confidence: number;
}

export interface ParsedIntent {
  readonly kind: IntentKind;
  /** 0–1 confidence in `kind` itself. */
  readonly confidence: number;
  readonly origin?: PlaceRef;
  readonly destination?: PlaceRef;
  readonly mode?: TransportMode;
  readonly foodTags?: readonly FoodTag[];
  /** For a phrase intent: which ready sentence, when one matched. */
  readonly phraseId?: string;
  /** For a document intent: what the traveller called it. */
  readonly documentName?: string;
  /** Whatever the STT returned, verbatim. Kept so we can benchmark parse failures. */
  readonly transcript: string;
}
