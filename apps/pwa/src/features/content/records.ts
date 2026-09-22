/**
 * A pack as it sits on the phone (decision 030).
 *
 * The body is kept exactly as it was published — unparsed — so that the feature that reads it
 * applies its own parser, the same one it applies to the copy compiled into the bundle. A pack
 * that a new build parses differently is then a parsing question and never a storage one.
 */
export interface StoredPack {
  readonly id: string;
  readonly version: number;
  readonly publishedAt: string;
  readonly sha: string;
  readonly downloadedAt: string;
  readonly body: unknown;
}

/** One line of the manifest: what exists on the server and how big it is. */
export interface PackSummary {
  readonly id: string;
  readonly version: number;
  readonly publishedAt: string;
  readonly bytes: number;
  readonly sha: string;
}

/** The packs a phone knows how to read. A name outside this list is ignored, never guessed at. */
export const PACK_IDS = ['restaurants', 'attractions', 'transport', 'fares'] as const;
export type PackId = (typeof PACK_IDS)[number];

export function isPackId(id: string): id is PackId {
  return (PACK_IDS as readonly string[]).includes(id);
}
