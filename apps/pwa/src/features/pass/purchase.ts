import { PROJECT_URL, supabaseHeaders } from '../../lib/supabase.js';
import { deviceId, platform } from '../../lib/device.js';
import { BUILD } from '../../app/version.js';
import { entitlement, installPass, keepFamilyPasses } from './entitlement.js';
import { forgetCoupon } from './coupon.js';
import { readPass, type SignedPass } from './signedPass.js';

/**
 * Buying a pass, from the phone's side (decision 019).
 *
 * Four steps, and only the third one involves us at all: the `order` function prices the pass
 * and asks Razorpay for an order; Razorpay's own Checkout collects the money; Razorpay tells
 * our `webhook` it arrived; the phone asks `order` for the status and installs what comes back.
 * The phone never decides it has paid — Checkout closing is not a payment, and a callback on a
 * page is script anyone can edit. The webhook is the authority, and the pass it signs is
 * verified offline here like every other (decision 005).
 *
 * Checkout itself is a script on Razorpay's origin, and this app must install and run with the
 * network off — so it is never a build dependency and never loaded at boot. It is fetched when
 * घर.4 opens with buying possible (unpaid, buying live, a signal), so it is already in the page
 * when the traveller taps, and a phone that cannot fetch it gets one honest line rather than a
 * thrown error.
 */

const ORDER = `${PROJECT_URL}/functions/v1/order`;
const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/** The open order, so a traveller who closed the app mid-payment is polled again next open. */
const KEY = 'saathi.order';

/** The app's marigold, so Checkout does not arrive in somebody else's blue. */
const THEME = '#E8871E';

/**
 * A phone that will not fetch the script must not hang on it: a captive portal answers a
 * request by never answering it, and a spinner with no end is worse than a line saying so.
 */
const SCRIPT_TIMEOUT_MS = 20_000;

/**
 * How long the phone waits for the webhook, and how it waits: a short first look because most
 * payments settle in a second, then longer gaps, about sixty seconds in all. After that the
 * order is still remembered and still recoverable — the pass is not lost, it is late.
 */
export const POLL_DELAYS_MS = [2000, 3000, 5000, 8000, 12000, 15000, 15000] as const;

/** A traveller who closed Checkout without paying is not made to watch the full minute. */
const GLANCE = 2;

/** What `order` `create` handed back. The key is the publishable half; the secret stays there. */
export interface OpenOrder {
  readonly orderId: string;
  readonly aggregatorOrderId: string;
  readonly keyId: string;
  readonly amountInr: number;
  readonly slots: number;
  readonly code?: string;
}

/** The one-word refusals `order` sends that घर.4 has a line for. */
export type PurchaseRefusal =
  'unknown' | 'not-yet' | 'ended' | 'exhausted' | 'already-redeemed' | 'free';

export type OrderCreated =
  | { readonly kind: 'order'; readonly order: OpenOrder }
  | { readonly kind: 'refused'; readonly reason: PurchaseRefusal }
  | { readonly kind: 'offline' }
  | { readonly kind: 'failed' };

/** `unreachable` is our own: the server could not be asked, which is not a state it reported. */
export type OrderStatus = 'created' | 'paid' | 'failed' | 'expired' | 'unknown' | 'unreachable';

export interface OrderState {
  readonly status: OrderStatus;
  readonly passes?: readonly SignedPass[];
}

export type PurchaseOutcome =
  | { readonly kind: 'paid'; readonly slots: number }
  /** Checkout closed with nothing paid. Not an error: a traveller may change their mind. */
  | { readonly kind: 'closed' }
  /** Paid, or possibly paid, and the webhook has not caught up. The order is kept. */
  | { readonly kind: 'pending' }
  /** The payment screen itself never opened. */
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'refused'; readonly reason: PurchaseRefusal }
  | { readonly kind: 'offline' }
  | { readonly kind: 'failed' };

/** What Razorpay's Checkout is, to the small extent this app uses it. */
interface CheckoutOptions {
  readonly key: string;
  readonly order_id: string;
  readonly amount: number;
  readonly currency: string;
  readonly name: string;
  readonly description: string;
  readonly prefill: Record<string, string>;
  readonly theme: { readonly color: string };
  readonly handler: () => void;
  readonly modal: { readonly ondismiss: () => void };
}

interface CheckoutInstance {
  open: () => void;
}

type Checkout = new (options: CheckoutOptions) => CheckoutInstance;

declare global {
  interface Window {
    // The aggregator's script puts itself here. An external boundary, hence the optional.
    readonly Razorpay?: Checkout;
  }
}

export function openOrder(): OpenOrder | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? null : readOrder(JSON.parse(raw));
  } catch {
    return null;
  }
}

function rememberOrder(order: OpenOrder): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    /* private mode: the order lives as long as the screen does */
  }
}

export function forgetOrder(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to forget */
  }
}

/** Nothing from the server or from storage is an `OpenOrder` until this says so. */
function readOrder(raw: unknown): OpenOrder | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.orderId !== 'string' ||
    typeof row.aggregatorOrderId !== 'string' ||
    typeof row.keyId !== 'string' ||
    typeof row.amountInr !== 'number' ||
    !Number.isFinite(row.amountInr) ||
    row.amountInr <= 0 ||
    typeof row.slots !== 'number' ||
    !Number.isInteger(row.slots)
  ) {
    return null;
  }
  return {
    orderId: row.orderId,
    aggregatorOrderId: row.aggregatorOrderId,
    keyId: row.keyId,
    amountInr: row.amountInr,
    slots: row.slots,
    ...(typeof row.code === 'string' ? { code: row.code } : {}),
  };
}

function asRefusal(reason: unknown): PurchaseRefusal | null {
  return reason === 'unknown' ||
    reason === 'not-yet' ||
    reason === 'ended' ||
    reason === 'exhausted' ||
    reason === 'already-redeemed' ||
    reason === 'free'
    ? reason
    : null;
}

/** The landing only when it is a real one; a test landing from India never starts a counter. */
function landing(): { landedAt?: string } {
  const state = entitlement();
  return state.landedAt !== undefined && state.pretendingDubai !== true
    ? { landedAt: state.landedAt }
    : {};
}

/** No signal, by the phone's own word: nothing here goes out, and each caller says so. */
const offline = () => typeof navigator !== 'undefined' && !navigator.onLine;

export async function createOrder(slots: number, code?: string): Promise<OrderCreated> {
  if (offline()) return { kind: 'offline' };

  let body: Record<string, unknown>;
  let status: number;
  try {
    const response = await fetch(ORDER, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({
        action: 'create',
        deviceId: deviceId(),
        slots,
        ...(code === undefined || code === '' ? {} : { code }),
        platform: platform(),
        appVersion: BUILD,
        ...landing(),
      }),
    });
    status = response.status;
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    return { kind: 'failed' };
  }

  const refusal = asRefusal(body.reason);
  if (refusal !== null) return { kind: 'refused', reason: refusal };
  if (status >= 400) return { kind: 'failed' };
  const order = readOrder(body);
  return order === null ? { kind: 'failed' } : { kind: 'order', order };
}

export async function orderStatus(orderId: string): Promise<OrderState> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { status: 'unreachable' };

  let body: Record<string, unknown>;
  try {
    const response = await fetch(ORDER, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ action: 'status', deviceId: deviceId(), orderId }),
    });
    if (!response.ok) return { status: 'unreachable' };
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    return { status: 'unreachable' };
  }

  const status = body.status;
  if (status === 'created' || status === 'failed' || status === 'expired' || status === 'unknown') {
    return { status };
  }
  if (status !== 'paid' || !Array.isArray(body.passes)) return { status: 'unreachable' };
  const passes = body.passes
    .map(readPass)
    .filter((pass): pass is SignedPass => pass !== null)
    .sort((a, b) => a.claims.slot - b.claims.slot);
  return { status: 'paid', passes };
}

/**
 * The script, fetched when घर.4 opens with buying possible (`preloadCheckout`), because the wait
 * at the tap was the owner's complaint (30 September); a tap that finds it not yet there starts
 * it alongside the order. A failure resolves to nothing rather than throwing: the screen owes
 * them a line, not a stack trace. A failed load is forgotten so a phone that regains signal may
 * try again. Never at boot: only a screen that is about to take money asks for it.
 */
let loading: Promise<Checkout | null> | null = null;

function loadCheckout(): Promise<Checkout | null> {
  if (window.Razorpay !== undefined) return Promise.resolve(window.Razorpay);
  loading ??= new Promise<Checkout | null>((resolve) => {
    let settled = false;
    const done = (value: Checkout | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      done(null);
    }, SCRIPT_TIMEOUT_MS);
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.addEventListener('load', () => {
      done(window.Razorpay ?? null);
    });
    script.addEventListener('error', () => {
      done(null);
    });
    document.head.appendChild(script);
  }).then((checkout) => {
    if (checkout === null) loading = null;
    return checkout;
  });
  return loading;
}

/**
 * Checkout's script, fetched ahead of the tap while घर.4 is open and buying is possible. Safe to
 * call as often as the screen likes — one load is ever in flight, a loaded script is kept — and
 * nothing at all with the radio off.
 */
export function preloadCheckout(): void {
  if (offline()) return;
  void loadCheckout();
}

/**
 * Wakes the `order` function while the traveller is still choosing, so the tap does not also pay
 * for a cold start and a fresh connection. A CORS preflight-style OPTIONS, which the function
 * answers with its headers and nothing else: it cannot create, price or read an order.
 */
export function warmOrder(): void {
  if (offline()) return;
  try {
    void fetch(ORDER, { method: 'OPTIONS' }).catch(() => undefined);
  } catch {
    /* a warm-up that cannot go is no loss */
  }
}

/**
 * Checkout, opened on the order with no method restriction, so every method the account
 * accepts is offered: the UPI apps on this phone, a UPI ID or Checkout's own QR for somebody
 * else to pay from theirs, cards and netbanking (decision 019, 30 September addendum). Wallets
 * are not enabled on the account, so nothing on a screen offers them.
 *
 * The name and the line under it come from the caller, because they are on a screen a traveller
 * reads and every string in this app comes out of the catalogue.
 */
export async function openCheckout(
  order: OpenOrder,
  name: string,
  description: string,
  script: Promise<Checkout | null> = loadCheckout(),
): Promise<'submitted' | 'closed' | 'unavailable'> {
  const Razorpay = await script;
  if (Razorpay === null) return 'unavailable';
  return new Promise<'submitted' | 'closed' | 'unavailable'>((resolve) => {
    let answered = false;
    const settle = (outcome: 'submitted' | 'closed' | 'unavailable') => {
      if (answered) return;
      answered = true;
      resolve(outcome);
    };
    try {
      new Razorpay({
        key: order.keyId,
        order_id: order.aggregatorOrderId,
        amount: order.amountInr * 100,
        currency: 'INR',
        name,
        description,
        prefill: {},
        theme: { color: THEME },
        handler: () => {
          settle('submitted');
        },
        modal: {
          ondismiss: () => {
            settle('closed');
          },
        },
      }).open();
    } catch {
      settle('unavailable');
    }
  });
}

/** Slot 1 onto this phone, slots 2–4 kept for the QRs — exactly what a redeemed code does. */
async function install(passes: readonly SignedPass[], slots: number): Promise<boolean> {
  const own = passes[0];
  // A pass that does not verify is not a pass, however confidently the server called it one.
  if (own === undefined || !(await installPass(own))) return false;
  keepFamilyPasses(slots, passes.slice(1));
  return true;
}

/** What one reading of the order means for the traveller, and what it installs. */
async function settleFrom(order: OpenOrder, state: OrderState): Promise<PurchaseOutcome | null> {
  if (state.status === 'paid') {
    if (!(await install(state.passes ?? [], order.slots))) return { kind: 'failed' };
    forgetOrder();
    // The code, if there was one, is spent: the server burned it when the order was settled.
    forgetCoupon();
    return { kind: 'paid', slots: order.slots };
  }
  if (state.status === 'failed' || state.status === 'expired' || state.status === 'unknown') {
    forgetOrder();
    return { kind: 'failed' };
  }
  return null;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

async function poll(order: OpenOrder, delays: readonly number[]): Promise<PurchaseOutcome> {
  for (const delay of delays) {
    await wait(delay);
    const settled = await settleFrom(order, await orderStatus(order.orderId));
    if (settled !== null) return settled;
  }
  // Still open. The order stays remembered, and the next open of the app asks again.
  return { kind: 'pending' };
}

/**
 * The whole purchase, from the tap to the pass. Every ending is a sentence घर.4 can say.
 */
export async function buyPass(options: {
  readonly slots: number;
  readonly code?: string | undefined;
  readonly name: string;
  readonly description: string;
}): Promise<PurchaseOutcome> {
  // The script and the order are started together, so a cold tap waits for the slower of the
  // two rather than for both in a row. Nothing is skipped: the order is still made on the
  // server, and the pass still comes only from the webhook.
  const script = offline() ? null : loadCheckout();
  const created = await createOrder(options.slots, options.code);
  if (created.kind !== 'order') return created;
  const order = created.order;
  // Remembered before Checkout opens: a traveller who pays and then loses the tab has paid.
  rememberOrder(order);

  const opened = await openCheckout(
    order,
    options.name,
    options.description,
    script ?? loadCheckout(),
  );
  if (opened === 'unavailable') return { kind: 'unreachable' };

  // Closed without paying is the common case, and it does not deserve a minute of spinner —
  // but it is checked, because a traveller may have paid in their UPI app and closed this.
  const settled = await poll(
    order,
    opened === 'closed' ? POLL_DELAYS_MS.slice(0, GLANCE) : POLL_DELAYS_MS,
  );
  return settled.kind === 'pending' && opened === 'closed' ? { kind: 'closed' } : settled;
}

/**
 * One reading of a remembered order. This is what reaches a traveller whose payment went
 * through after they closed the app: the pass is waiting on the server, and the next open
 * asks for it.
 */
export async function resumeOrder(): Promise<PurchaseOutcome | null> {
  const order = openOrder();
  if (order === null) return null;
  if (entitlement().paid === true) {
    forgetOrder();
    return null;
  }
  return await settleFrom(order, await orderStatus(order.orderId));
}

/** On boot and whenever the phone says it is back online. No timer: each open is an attempt. */
export function startOrderResume(): () => void {
  const attempt = () => {
    if (openOrder() === null) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    void resumeOrder();
  };
  attempt();
  window.addEventListener('online', attempt);
  return () => {
    window.removeEventListener('online', attempt);
  };
}
