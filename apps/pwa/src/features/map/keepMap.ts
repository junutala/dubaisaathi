import { useEffect, useState } from 'react';
import { archiveOnPhone, downloadMap } from './mapFiles.js';

/**
 * Getting the street map onto the phone before it is needed (decision 035).
 *
 * A traveller opens नक्शा at a kerb in Karama, often with no data plan in Dubai at all — so the
 * map has to be there already. It downloads by itself the first time the app is open with a
 * signal, once, and is kept; if the signal goes mid-way, it starts again the moment the phone
 * says it is back, because a moment the app waits for needs a listener of its own (CLAUDE.md).
 */
export type MapStatus =
  | { readonly kind: 'checking' }
  | { readonly kind: 'kept'; readonly archive: File }
  | { readonly kind: 'absent' }
  | { readonly kind: 'downloading'; readonly done: number; readonly total: number }
  | { readonly kind: 'failed'; readonly why: string };

let status: MapStatus = { kind: 'checking' };
const listeners = new Set<(next: MapStatus) => void>();
let running: Promise<void> | null = null;

function set(next: MapStatus): void {
  status = next;
  for (const listener of listeners) listener(next);
}

/** Look for the map on the phone; download it if it is not there and there is a signal. */
export function ensureMap(): Promise<void> {
  if (status.kind === 'kept') return Promise.resolve();
  running ??= (async () => {
    const archive = await archiveOnPhone();
    if (archive) {
      set({ kind: 'kept', archive });
      return;
    }
    if (!navigator.onLine) {
      set({ kind: 'absent' });
      return;
    }
    const result = await downloadMap((done, total) => {
      set({ kind: 'downloading', done, total });
    });
    if (!result.ok) {
      set({ kind: 'failed', why: result.why });
      return;
    }
    const kept = await archiveOnPhone();
    set(
      kept ? { kind: 'kept', archive: kept } : { kind: 'failed', why: 'not kept after download' },
    );
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Called once from the shell: look now, and again whenever the signal returns. */
export function startMapKeeping(): () => void {
  const retry = (): void => {
    void ensureMap();
  };
  retry();
  window.addEventListener('online', retry);
  return () => {
    window.removeEventListener('online', retry);
  };
}

export function useMapStatus(): MapStatus {
  const [current, setCurrent] = useState<MapStatus>(status);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(status);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return current;
}
