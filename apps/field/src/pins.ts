import { ENDPOINT, outletHeaders } from './sync.js';

/**
 * The pins a rider has dropped, waiting for their paper (decision 029).
 *
 * Read at the desk, not in the street: this is the list the owner picks from with a stack of
 * forms in his hand. Each one already holds the fix the rider was standing on and, usually, a
 * photograph of the shop front — which is how he knows the paper and the pin are the same shop
 * before he types a word.
 */
export interface WaitingPin {
  readonly id: string;
  readonly formSerial: string;
  readonly lat: number;
  readonly lng: number;
  readonly capturedAt: string;
  readonly collector: string;
  /** A data URL, or null where the rider could not raise his camera. */
  readonly front: string | null;
}

export async function waitingPins(): Promise<readonly WaitingPin[]> {
  try {
    const response = await fetch(ENDPOINT, { headers: outletHeaders() });
    if (!response.ok) return [];
    const body = (await response.json()) as { pins?: WaitingPin[] };
    return body.pins ?? [];
  } catch {
    // No signal at the desk is not an error worth a red screen: the list is simply empty and
    // the form still works on what the phone is standing on.
    return [];
  }
}
