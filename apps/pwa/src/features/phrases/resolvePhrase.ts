import type { Phrase } from '@saathi/shared';
import { phraseById } from '../../db/content.js';
import { intentCorpus } from '../voice/intentPacks.js';
import { destinationPhrase, placeIdInPhrase } from './destinationPhrase.js';

/**
 * How every screen finds a sentence to show, whether it came from the pack or was composed for
 * a destination. One lookup, so 3.2 and 3.3 cannot disagree about what a phrase id means.
 */
export async function resolvePhrase(phraseId: string): Promise<Phrase | undefined> {
  const placeId = placeIdInPhrase(phraseId);
  if (placeId === null) return phraseById(phraseId);
  const place = intentCorpus.places.get(placeId);
  return place === undefined ? undefined : (destinationPhrase(place) ?? undefined);
}
