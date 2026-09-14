import type { VoiceEvent, VoiceFailure } from '@saathi/shared';
import { db } from '../../db/schema.js';

/**
 * The learning loop, from day one (CLAUDE.md, "Learning loop"). Every voice interaction is
 * recorded on the device; the failures are what retrain the aliases and intents. Nothing is
 * uploaded here — a sync job does that when there is a connection, and never blocks anyone.
 */
export interface VoiceEventInput {
  readonly transcript: string;
  /** What the engine heard, when the traveller corrected it before sending. See `VoiceEvent`. */
  readonly correctedFrom?: string;
  /** The unbiased reading of the same audio, when the engine produced one. See `VoiceEvent`. */
  readonly unconstrainedTranscript?: string;
  readonly intent: string;
  readonly confidence: number;
  readonly landedOn: string;
  readonly failure?: VoiceFailure | null;
  readonly sttEngine?: string;
  readonly sttModel?: string;
  readonly clarifierChoice?: string;
  /** How many results were shown. Zero is the row that says what to go and collect. */
  readonly resultCount?: number;
  /** The place the parser resolved, so demand for it can be counted across spellings. */
  readonly resolvedPlaceId?: string;
}

/** Devanagari, Roman, or the mix a real traveller actually speaks. */
export function detectScript(text: string): VoiceEvent['script'] {
  const devanagari = /[ऀ-ॿ]/.test(text);
  const roman = /[A-Za-z]/.test(text);
  if (devanagari && roman) return 'mixed';
  return devanagari ? 'devanagari' : 'roman';
}

function deviceId(): string {
  const key = 'saathi.deviceId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function recordVoiceEvent(input: VoiceEventInput): Promise<VoiceEvent> {
  const event: VoiceEvent = {
    id: crypto.randomUUID(),
    deviceId: deviceId(),
    at: new Date().toISOString(),
    sttEngine: input.sttEngine ?? 'none',
    sttModel: input.sttModel ?? 'none',
    transcript: input.transcript,
    ...(input.correctedFrom === undefined || input.correctedFrom === input.transcript
      ? {}
      : { correctedFrom: input.correctedFrom }),
    // Stored only when it differs: a duplicate of the transcript teaches the review nothing and
    // is one more copy of a traveller's sentence than the product needs to keep.
    ...(input.unconstrainedTranscript === undefined ||
    input.unconstrainedTranscript === input.transcript
      ? {}
      : { unconstrainedTranscript: input.unconstrainedTranscript }),
    script: detectScript(input.transcript),
    intent: input.intent,
    confidence: input.confidence,
    landedOn: input.landedOn,
    failure: input.failure ?? null,
    ...(input.clarifierChoice === undefined ? {} : { clarifierChoice: input.clarifierChoice }),
    // Recorded for every search, serviced or not — the owner's rule for version 1: a record of
    // all interactions, so version 2 is decided by what travellers actually asked for.
    ...(input.resultCount === undefined ? {} : { resultCount: input.resultCount }),
    ...(input.resolvedPlaceId === undefined ? {} : { resolvedPlaceId: input.resolvedPlaceId }),
    synced: false,
  };
  await db.voiceEvents.add(event);
  return event;
}

/** What a sync job would send. Exposed now so the queue is visible before there is a server. */
export async function pendingVoiceEvents(): Promise<VoiceEvent[]> {
  return db.voiceEvents.filter((e) => !e.synced).toArray();
}
