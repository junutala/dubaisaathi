import type { EmergencyPoint, LocalisedText, Timestamp } from '@saathi/shared';
import pack from '../../../../../data/emergency/consulate.v1.json';

/**
 * The consulate is a fact about the world, so it is content and not code (CLAUDE.md working
 * conventions): a seed file under `data/`, versioned, shipped in the bundle and precached, so
 * the row on 4.1 is there with the radio off.
 *
 * It is read straight out of the pack rather than loaded into IndexedDB, unlike the phrases.
 * One row, read on one screen, queried by nothing — a table would buy a migration and answer
 * no question.
 */
export interface ConsulatePack {
  readonly contentVersion: number;
  readonly publishedAt: Timestamp;
  /** `where` carries the district and the opening hours as one line, which is how 4.1 shows it. */
  readonly consulate: EmergencyPoint & { readonly where: LocalisedText };
}

/** The pack ships as JSON, so its type is not checked at build time. Narrowed once, here. */
export function parseConsulatePack(raw: unknown): ConsulatePack {
  const parsed = raw as ConsulatePack;
  if (parsed.consulate.kind !== 'consulate') {
    throw new Error(`the consulate pack holds a ${parsed.consulate.kind}`);
  }
  return parsed;
}

export const CONSULATE = parseConsulatePack(pack).consulate;
