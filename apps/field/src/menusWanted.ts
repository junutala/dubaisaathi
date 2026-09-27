import { asDataUrl } from './dataUrl.js';
import { db } from './db.js';
import { ENDPOINT, outletHeaders } from './sync.js';

/**
 * Menus wanted (the owner, 27 September): the pinned forms that have no menu in the app, and a way
 * to add pages to one of them without naming a file or re-pinning it.
 *
 * The list comes from the server (migration 0018) and is kept on the phone, so it can still be read
 * in a shop with no signal. Pages taken for a form wait in `wantedPages` until the server says the
 * form holds them.
 */

export interface WantedForm {
  readonly formSerial: string;
  readonly lat: number;
  readonly lng: number;
  readonly capturedAt: string;
  readonly notes: string | null;
  /** What review still needs, when the form has a menu that turned out incomplete. */
  readonly wanted: string | null;
  /** The nearest forms pinned before and after it that have a picture to recognise it by. */
  readonly before: string | null;
  readonly after: string | null;
}

const KEPT = 'saathi.menusWanted';

export function keptList(): readonly WantedForm[] {
  try {
    const raw = localStorage.getItem(KEPT);
    return raw === null ? [] : (JSON.parse(raw) as WantedForm[]);
  } catch {
    return [];
  }
}

export async function fetchList(): Promise<readonly WantedForm[]> {
  const answer = await fetch(`${ENDPOINT}?open=1`, { headers: outletHeaders() });
  if (!answer.ok) throw new Error(`server said ${String(answer.status)}`);
  const { forms } = (await answer.json()) as { forms: WantedForm[] };
  try {
    localStorage.setItem(KEPT, JSON.stringify(forms));
  } catch {
    /* the list is fetched again next time */
  }
  return forms;
}

/** Metres between two points, near enough for "which is closest" on one street. */
export function metresBetween(
  a: { readonly lat: number; readonly lng: number },
  b: { readonly lat: number; readonly lng: number },
): number {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.round(Math.sqrt(x * x + y * y) * 6_371_000);
}

/** Nearest first when the phone knows where it is; in pinned order when it does not. */
export function nearestFirst(
  forms: readonly WantedForm[],
  here: { readonly lat: number; readonly lng: number } | null,
): readonly WantedForm[] {
  if (here === null) return forms;
  return [...forms].sort((a, b) => metresBetween(here, a) - metresBetween(here, b));
}

/** The first page of a form, for recognising the shop: an object URL, or null if it has none. */
export async function firstPage(formSerial: string): Promise<string | null> {
  try {
    const answer = await fetch(`${ENDPOINT}?menu=${formSerial}&page=0`, {
      headers: outletHeaders(),
    });
    if (!answer.ok) return null;
    return URL.createObjectURL(await answer.blob());
  } catch {
    return null;
  }
}

export type SendPages =
  { readonly ok: true; readonly pages: number } | { readonly ok: false; readonly why: string };

/**
 * Sends one form's waiting pages, one request per page, and removes each only once the server has
 * answered for it. The answer is how many pages the form now holds on the server.
 */
export async function sendPages(formSerial: string): Promise<SendPages> {
  const waiting = await db.wantedPages.where('formSerial').equals(formSerial).sortBy('takenAt');
  let pages = 0;
  try {
    for (const page of waiting) {
      const answer = await fetch(`${ENDPOINT}?pages=${formSerial}`, {
        method: 'POST',
        headers: outletHeaders(),
        body: JSON.stringify({ photos: [{ id: page.id, dataUrl: await asDataUrl(page.bytes) }] }),
      });
      if (!answer.ok) return { ok: false, why: `server said ${String(answer.status)}` };
      pages = ((await answer.json()) as { pages: number }).pages;
      await db.wantedPages.delete(page.id);
    }
  } catch {
    return { ok: false, why: 'no connection' };
  }
  return { ok: true, pages };
}

/** Every form with pages still waiting, sent in turn: on launch and when the signal returns. */
export async function sendAllPages(): Promise<void> {
  const forms = new Set((await db.wantedPages.toArray()).map((page) => page.formSerial));
  for (const form of forms) await sendPages(form);
}
