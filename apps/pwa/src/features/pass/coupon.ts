import {
  isCouponCode,
  normaliseCouponCode,
  type CouponKind,
  type CouponTerms,
} from '@saathi/shared';
import { PROJECT_URL, supabaseHeaders } from '../../lib/supabase.js';
import { deviceId, platform } from '../../lib/device.js';
import { BUILD } from '../../app/version.js';
import { entitlement, installPass, keepFamilyPasses } from './entitlement.js';
import { readPass, type SignedPass } from './signedPass.js';

/**
 * A coupon code on the phone: where it came from, what it is waiting for, and the one call
 * that turns it into a price or a pass (decision 018).
 *
 * A code arrives typed into घर.4 or on the URL from an advertisement (`?code=SS7K3M2X`). It
 * is remembered here until it has been redeemed or replaced — through a reload, and through
 * the afternoon with no signal — because a traveller who tapped an ad in the airport and opened
 * the app in the hotel has done everything right, and the app owes them the code back.
 *
 * Redeeming needs a connection for a moment: the server decides what the code is worth and
 * signs the pass. Nothing else about the pass ever does; once issued it is verified offline
 * like any other (decision 005).
 */

const KEY = 'saathi.coupon';
const REDEEM = `${PROJECT_URL}/functions/v1/redeem`;

/** What the server said the code is worth, kept so घर.4 can show it without asking again. */
export interface CouponQuote {
  readonly payable: number;
  readonly listPrice: number;
  readonly kind: CouponKind;
  readonly discount: CouponTerms;
}

export interface PendingCoupon {
  readonly code: string;
  /** The phones the traveller chose when the code was last applied. */
  readonly slots: number;
  /** Known once the server has answered: a `single` code locks the phones to one. */
  readonly kind?: CouponKind;
  /** Present once the server has quoted a balance above ₹0. */
  readonly quote?: CouponQuote;
}

/** The one-word refusals `redeem` sends, each with its own line on घर.4. */
export type CouponRefusal = 'unknown' | 'not-yet' | 'ended' | 'exhausted' | 'already-redeemed';

export type CouponOutcome =
  | { readonly kind: 'issued'; readonly slots: number }
  | { readonly kind: 'quoted'; readonly quote: CouponQuote }
  | { readonly kind: 'refused'; readonly reason: CouponRefusal }
  | { readonly kind: 'offline' }
  | { readonly kind: 'failed' };

export function pendingCoupon(): PendingCoupon | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCoupon>;
    if (typeof parsed.code !== 'string' || !isCouponCode(parsed.code)) return null;
    return {
      code: parsed.code,
      slots: typeof parsed.slots === 'number' ? parsed.slots : 1,
      ...(parsed.kind === 'family' || parsed.kind === 'single' ? { kind: parsed.kind } : {}),
      ...(typeof parsed.quote === 'object' ? { quote: parsed.quote } : {}),
    };
  } catch {
    return null;
  }
}

export function rememberCoupon(pending: PendingCoupon): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* private mode: the code lives as long as the screen does */
  }
}

export function forgetCoupon(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to forget */
  }
}

/**
 * `?code=…` on the URL an advertisement opened — in the query string, or after the hash the
 * way a shared link often carries it. Read once, remembered, and taken off the URL so a reload
 * or a bookmark does not apply it twice.
 */
export function takeCodeFromUrl(): string | null {
  const { search, hash, pathname } = window.location;
  const query = new URLSearchParams(search);
  const [hashPath, hashQuery = ''] = hash.split('?');
  const inHash = new URLSearchParams(hashQuery);
  const raw = query.get('code') ?? inHash.get('code');
  if (raw === null) return null;

  query.delete('code');
  inHash.delete('code');
  const cleanSearch = query.size === 0 ? '' : `?${query.toString()}`;
  const cleanHash = inHash.size === 0 ? (hashPath ?? '') : `${hashPath ?? ''}?${inHash.toString()}`;
  try {
    window.history.replaceState(null, '', `${pathname}${cleanSearch}${cleanHash}`);
  } catch {
    /* an origin that will not let us: the code is still remembered below */
  }

  const code = normaliseCouponCode(raw);
  if (!isCouponCode(code)) return null;
  const current = pendingCoupon();
  if (current?.code !== code) rememberCoupon({ code, slots: 1 });
  return code;
}

function asRefusal(reason: unknown): CouponRefusal | null {
  return reason === 'unknown' ||
    reason === 'not-yet' ||
    reason === 'ended' ||
    reason === 'exhausted' ||
    reason === 'already-redeemed'
    ? reason
    : null;
}

/**
 * One call at a time, and never the wrong answer to the wrong tap.
 *
 * A traveller whose code is taking a moment presses the button again — which is not their
 * mistake, it is a screen that said nothing. The screen now says a request is in and holds
 * its buttons, and this queue is the second half of that promise: a repeat of the call that
 * is already running shares its answer, and a different call waits its turn rather than
 * riding on the first one's reply. The one that mattered: an `issue` tap arriving while the
 * background retry's `quote` was in flight used to be handed the quote, so the traveller was
 * told a price and never given the pass.
 */
let queue: Promise<unknown> = Promise.resolve();
let current: { key: string; promise: Promise<CouponOutcome> } | null = null;

/**
 * Applies the code for `slots` phones. `quote` asks what the code is worth and remembers the
 * answer — the field's लगाएँ; `issue` takes a ₹0 pass on the spot and installs it — the button.
 * A balance above ₹0 is remembered either way and never charged here: UPI is not live. A code
 * the server says is dead is forgotten.
 */
export function applyCoupon(
  typed: string,
  slots: number,
  mode: 'quote' | 'issue',
): Promise<CouponOutcome> {
  const key = `${normaliseCouponCode(typed)}|${String(slots)}|${mode}`;
  if (current?.key === key) return current.promise;
  const promise = queue.then(() => redeem(typed, slots, mode));
  queue = promise.catch(() => undefined);
  current = { key, promise };
  void promise.finally(() => {
    if (current?.key === key) current = null;
  });
  return promise;
}

async function redeem(
  typed: string,
  slots: number,
  mode: 'quote' | 'issue',
): Promise<CouponOutcome> {
  const code = normaliseCouponCode(typed);
  if (!isCouponCode(code)) return { kind: 'refused', reason: 'unknown' };
  const pending = pendingCoupon();
  const wanted = pending?.code === code && pending.kind === 'single' ? 1 : slots;
  rememberCoupon({
    code,
    slots: wanted,
    ...(pending?.code === code ? { kind: pending.kind } : {}),
  });

  if (typeof navigator !== 'undefined' && !navigator.onLine) return { kind: 'offline' };

  const state = entitlement();
  let body: Record<string, unknown>;
  let status: number;
  try {
    const response = await fetch(REDEEM, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({
        deviceId: deviceId(),
        code,
        slots: wanted,
        quoteOnly: mode === 'quote',
        platform: platform(),
        appVersion: BUILD,
        // The master cut-off only from a real landing; a test landing from India is not one.
        ...(state.landedAt !== undefined && state.pretendingDubai !== true
          ? { landedAt: state.landedAt }
          : {}),
      }),
    });
    status = response.status;
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    return { kind: 'failed' };
  }

  if (body.reason === 'single' && wanted !== 1) {
    // The traveller picked more phones than the code allows. Lock it to one and ask again,
    // rather than making them find that out and tap twice.
    rememberCoupon({ code, slots: 1, kind: 'single' });
    return redeem(code, 1, mode);
  }
  const refusal = asRefusal(body.reason);
  if (refusal !== null) {
    forgetCoupon();
    return { kind: 'refused', reason: refusal };
  }
  if (status >= 400) return { kind: 'failed' };

  const kind: CouponKind = body.kind === 'single' ? 'single' : 'family';
  if (body.issued === true && Array.isArray(body.passes)) {
    const passes = body.passes
      .map(readPass)
      .filter((pass): pass is SignedPass => pass !== null)
      .sort((a, b) => a.claims.slot - b.claims.slot);
    const own = passes[0];
    if (own === undefined || !(await installPass(own))) return { kind: 'failed' };
    keepFamilyPasses(wanted, passes.slice(1));
    forgetCoupon();
    return { kind: 'issued', slots: wanted };
  }

  const payable = typeof body.payable === 'number' ? body.payable : NaN;
  const discount = body.discount as Partial<CouponTerms> | undefined;
  if (!Number.isFinite(payable) || payable < 0) return { kind: 'failed' };
  const quote: CouponQuote = {
    payable,
    listPrice: typeof body.listPrice === 'number' ? body.listPrice : payable,
    kind,
    discount: {
      discountPercent: typeof discount?.discountPercent === 'number' ? discount.discountPercent : 0,
      ...(typeof discount?.priceOverrideInr === 'number'
        ? { priceOverrideInr: discount.priceOverrideInr }
        : {}),
    },
  };
  rememberCoupon({ code, slots: wanted, kind, quote });
  return { kind: 'quoted', quote };
}

/**
 * A code that was applied with no signal is applied the moment the phone has some — wired
 * here, on boot and on the browser's own `online` event, so a traveller who typed it in the
 * metro finds the answer waiting when they surface. A code already quoted is left alone: the
 * traveller takes a free pass with the button, and a balance is payable when buying opens.
 */
export function startCouponRetry(): () => void {
  const attempt = () => {
    const pending = pendingCoupon();
    if (pending === null || pending.quote !== undefined) return;
    if (entitlement().paid === true) {
      // A code left over from before the pass arrived: nothing to buy any more.
      forgetCoupon();
      return;
    }
    if (!navigator.onLine) return;
    void applyCoupon(pending.code, pending.slots, 'quote');
  };
  attempt();
  window.addEventListener('online', attempt);
  return () => {
    window.removeEventListener('online', attempt);
  };
}
