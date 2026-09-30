import { asDataUrl } from './dataUrl.js';
import { db } from './db.js';
import { ENDPOINT, outletHeaders } from './sync.js';

/**
 * Menus wanted (the owner, 27 September): the pinned forms that have no menu in the app, in number
 * order, each with its own name and cover, so a paper menu in the hand can be matched to its form;
 * and a way to add pages to that form without naming a file or re-pinning it.
 *
 * The list comes from the server (migration 0018) and is kept on the phone, so it can still be read
 * in a shop with no signal. Pages taken for a form wait in `wantedPages` until the server says the
 * form holds them.
 */

export interface WantedForm {
  readonly formSerial: string;
  /** The name read off the cover at review, when there is one. */
  readonly name: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly capturedAt: string;
  readonly notes: string | null;
  /** What review still needs, when the form has a menu that turned out incomplete. */
  readonly wanted: string | null;
  /** Whether the form has a picture of its own: the cover or page taken at the counter. */
  readonly picture: boolean;
  /**
   * The cover as the pin screen has taken it since 30 September — apart from the menu's pages, in
   * the pin's own slot — as a data URL, when the server has one.
   */
  readonly cover?: string | null;
}

interface Pin {
  readonly formSerial: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly capturedAt: string;
  readonly front: string | null;
}

/** Every pin still waiting on the desk, with its cover when it has one. */
async function fetchPins(): Promise<readonly Pin[]> {
  const answer = await fetch(ENDPOINT, { headers: outletHeaders() });
  if (!answer.ok) throw new Error(`server said ${String(answer.status)}`);
  return ((await answer.json()) as { pins: Pin[] }).pins;
}

/** A form number as it is printed: "81" and "0081" are the same form. */
export function normalSerial(typed: string): string {
  const trimmed = typed.trim();
  return /^\d{1,4}$/.test(trimmed) ? trimmed.padStart(4, '0') : trimmed;
}

/**
 * Any pinned form, by the number on its paper (the owner, 30 September): a form whose only picture
 * was its cover had left the Menus list, because the server counted that picture as a menu, and
 * there was then no way to reach it to add its pages. Null when no pin carries that number; a
 * thrown error when the server cannot be asked.
 */
export async function findForm(typed: string): Promise<WantedForm | null> {
  const serial = normalSerial(typed);
  const listed = keptList().find((form) => form.formSerial === serial);
  if (listed !== undefined) return listed;
  const pin = (await fetchPins()).find((one) => one.formSerial === serial);
  if (pin === undefined) return null;
  return {
    formSerial: serial,
    name: null,
    lat: pin.lat,
    lng: pin.lng,
    capturedAt: pin.capturedAt,
    notes: null,
    wanted: null,
    picture: true,
    cover: pin.front,
  };
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
  const { forms: open } = (await answer.json()) as { forms: WantedForm[] };
  // Covers taken apart from the pages (30 September) live in the pin's own slot, which the list
  // does not carry: they are joined on here, so a form can still be told from its neighbours.
  const covers = new Map<string, string>();
  try {
    for (const pin of await fetchPins()) {
      if (pin.formSerial !== null && pin.front !== null) covers.set(pin.formSerial, pin.front);
    }
  } catch {
    /* the list stands without its covers */
  }
  const forms = open.map((form) => {
    const cover = covers.get(form.formSerial);
    return cover === undefined ? form : { ...form, cover };
  });
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

/** A form's own first picture, for telling it from its neighbours: an object URL, or null. */
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

/** The event a page leaving the queue raises, so any screen showing counts can recount. */
export const PAGE_SENT = 'saathi:page-sent';

/**
 * How many menu pages the server holds for a form, asked of the server itself: the one number the
 * screen may call "on the server". Null when it cannot be asked (no signal).
 */
export async function serverPages(formSerial: string): Promise<number | null> {
  try {
    const answer = await fetch(`${ENDPOINT}?menu=${formSerial}`, { headers: outletHeaders() });
    if (!answer.ok) return null;
    return ((await answer.json()) as { pages: number[] }).pages.length;
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
/**
 * How long one page may take before it is given up for now (the owner, 27 September: 0049 sat on
 * "sending" while nothing reached the server). Pages go one at a time, so an upload that hangs on
 * a dropped signal held back every page after it, on every form, for as long as the phone kept the
 * request open. Given up, the page stays on the phone and goes again with the next send.
 */
export const PAGE_TIMEOUT_MS = 45_000;

/** A request that answers within `ms`, or is abandoned and counts as no connection. */
async function withinTime(url: string, init: RequestInit, ms: number): Promise<Response> {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      abort.abort();
      reject(new Error('timed out'));
    }, ms);
  });
  try {
    return await Promise.race([fetch(url, { ...init, signal: abort.signal }), late]);
  } finally {
    clearTimeout(timer);
  }
}

export function sendPages(formSerial: string, timeoutMs = PAGE_TIMEOUT_MS): Promise<SendPages> {
  // One send at a time: pages taken in quick succession each start a send, and two sends walking
  // one queue together would race each other for the same page.
  const next = inTurn.then(() => sendQueued(formSerial, timeoutMs));
  inTurn = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

let inTurn: Promise<void> = Promise.resolve();

async function sendQueued(formSerial: string, timeoutMs: number): Promise<SendPages> {
  const waiting = await db.wantedPages.where('formSerial').equals(formSerial).sortBy('takenAt');
  let pages = 0;
  try {
    for (const page of waiting) {
      const answer = await withinTime(
        `${ENDPOINT}?pages=${formSerial}`,
        {
          method: 'POST',
          headers: outletHeaders(),
          body: JSON.stringify({ photos: [{ id: page.id, dataUrl: await asDataUrl(page.bytes) }] }),
        },
        timeoutMs,
      );
      if (!answer.ok) return { ok: false, why: `server said ${String(answer.status)}` };
      pages = ((await answer.json()) as { pages: number }).pages;
      await db.wantedPages.delete(page.id);
      window.dispatchEvent(new CustomEvent(PAGE_SENT, { detail: formSerial }));
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
