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
  | 'route' // "how do I get to X"
  | 'food' // "where do I find Jain food"
  | 'phrase' // "tell the driver ..."
  | 'emergency' // "I need a hospital"
  | 'place' // "what is X / where is X"
  | 'unknown'; // nothing matched — offer the traveller a menu, never a dead end

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
  /** Whatever the STT returned, verbatim. Kept so we can benchmark parse failures. */
  readonly transcript: string;
}

/** Where a transcript came from — recorded so the STT benchmark can compare engines. */
export type SpeechSource = 'offline-stt' | 'browser-stt' | 'cloud-stt' | 'typed';

export interface SpeechResult {
  readonly transcript: string;
  readonly source: SpeechSource;
  /** 0–1 as reported by the engine, when it reports one. */
  readonly confidence?: number;
  readonly latencyMs?: number;
}
