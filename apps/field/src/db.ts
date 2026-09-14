import Dexie, { type EntityTable } from 'dexie';
import type { FieldReport } from '@saathi/shared';

/**
 * The queue, on the collector's phone.
 *
 * A report is written here the moment it is submitted and stays until the server has said it
 * holds it. That order matters: a collector in a basement in Deira is the normal case, not the
 * edge case, and losing a morning's visits is how a collector stops trusting the tool and starts
 * writing in a notebook instead.
 */

/** Photographs live apart from the report so a row stays small and a blob is fetched only once. */
export interface Photo {
  readonly id: string;
  readonly reportId: string;
  readonly kind: 'front' | 'menu';
  readonly bytes: Blob;
}

/** The report as it sits locally: the shared entity plus what the phone needs to track it. */
export type QueuedReport = FieldReport & { readonly uploaded: boolean };

export class FieldDb extends Dexie {
  reports!: EntityTable<QueuedReport, 'id'>;
  photos!: EntityTable<Photo, 'id'>;

  constructor(name = 'saathi-field') {
    super(name);
    this.version(1).stores({
      // `uploaded` is indexed because the only question that matters is what is still waiting.
      reports: 'id, capturedAt, uploaded',
      photos: 'id, reportId',
    });
  }
}

export const db = new FieldDb();

/** Ask the browser to keep this: a day's photographs must not be evicted for a cache. */
export async function keepOurData(): Promise<void> {
  // lib.dom overstates support; cheap Android WebViews do not all have it.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lib.dom overstates support
  if (!navigator.storage?.persist) return;
  try {
    await navigator.storage.persist();
  } catch {
    /* best effort, and nothing a collector should see */
  }
}
