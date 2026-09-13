import type { VoiceEvent, VoiceFailure } from '@saathi/shared';
import { db } from '../../db/schema.js';

/**
 * The learning loop, from day one (CLAUDE.md, "Learning loop"). Every voice interaction is
 * recorded on the device; the failures are what retrain the aliases and intents. Nothing is
 * uploaded here — a sync job does that when there is a connection, and never blocks anyone.
 */
export interface VoiceEventInput {
  readonly transcript: string;
  readonly intent: string;
  readonly confidence: number;
  readonly landedOn: string;
  readonly failure?: VoiceFailure | null;
  readonly sttEngine?: string;
  readonly sttModel?: string;
  readonly clarifierChoice?: string;
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
    script: detectScript(input.transcript),
    intent: input.intent,
    confidence: input.confidence,
    landedOn: input.landedOn,
    failure: input.failure ?? null,
    ...(input.clarifierChoice === undefined ? {} : { clarifierChoice: input.clarifierChoice }),
    synced: false,
  };
  await db.voiceEvents.add(event);
  return event;
}

/** What a sync job would send. Exposed now so the queue is visible before there is a server. */
export async function pendingVoiceEvents(): Promise<VoiceEvent[]> {
  return db.voiceEvents.filter((e) => !e.synced).toArray();
}
