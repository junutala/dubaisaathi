import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { answer, online, trustedSigner } from './signing.fixture.js';

/**
 * Buying a pass, tested as the ways it fails a traveller (decision 019): an order priced from
 * the wrong rule, a free code charged for, a payment screen that never loads on a hotel wifi,
 * a pass that arrives after the traveller closed the app, and a "pass" nobody of ours signed.
 *
 * The edge functions themselves run on Deno and are not executed here; what is mirrored is the
 * conversation with them — the body the app sends and what it does with each answer.
 */

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('saathi.deviceId', '11111111-2222-4333-8444-555555555555');
  online(true);
  window.history.replaceState(null, '', '/');
  Reflect.deleteProperty(window, 'Razorpay');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  Reflect.deleteProperty(window, 'Razorpay');
  document.head.querySelectorAll('script').forEach((script) => {
    script.remove();
  });
});

async function load() {
  const signer = await trustedSigner();
  const purchase = await import('./purchase.js');
  const entitlement = await import('./entitlement.js');
  const coupon = await import('./coupon.js');
  return { ...signer, ...purchase, ...entitlement, ...coupon };
}

/** A Checkout that answers the way the traveller is said to have answered it. */
function checkout(how: 'pays' | 'closes' | 'throws') {
  const opened: { key: string; order_id: string; amount: number; restricted: boolean }[] = [];
  Object.defineProperty(window, 'Razorpay', {
    configurable: true,
    value: class {
      private readonly options: {
        key: string;
        order_id: string;
        amount: number;
        method?: unknown;
        handler: () => void;
        modal: { ondismiss: () => void };
      };

      constructor(options: {
        key: string;
        order_id: string;
        amount: number;
        method?: unknown;
        handler: () => void;
        modal: { ondismiss: () => void };
      }) {
        if (how === 'throws') throw new Error('checkout refused to start');
        this.options = options;
      }

      open() {
        opened.push({
          key: this.options.key,
          order_id: this.options.order_id,
          amount: this.options.amount,
          restricted: 'method' in this.options,
        });
        if (how === 'pays') this.options.handler();
        else this.options.modal.ondismiss();
      }
    },
  });
  return opened;
}

const ORDER = {
  orderId: '99999999-9999-4999-8999-999999999999',
  aggregatorOrderId: 'order_TESTAAAA',
  keyId: 'rzp_test_key',
};

describe('creating an order', () => {
  it('sends the phones and the device, and takes the list price back', async () => {
    const { createOrder } = await load();
    const calls = answer((_path, body) => ({
      json: { ...ORDER, amountInr: 399, slots: body.slots },
    }));

    const created = await createOrder(3);
    expect(created).toEqual({ kind: 'order', order: { ...ORDER, amountInr: 399, slots: 3 } });
    expect(calls[0]!.path).toBe('order');
    expect(calls[0]!.body).toMatchObject({
      action: 'create',
      deviceId: '11111111-2222-4333-8444-555555555555',
      slots: 3,
    });
    expect(calls[0]!.body.code).toBeUndefined();
  });

  it('carries the code, and takes the discounted price back', async () => {
    const { createOrder } = await load();
    const calls = answer(() => ({
      json: { ...ORDER, amountInr: 149, slots: 2, code: 'SS7K3M2X' },
    }));

    const created = await createOrder(2, 'SS7K3M2X');
    expect(created).toMatchObject({ kind: 'order', order: { amountInr: 149, code: 'SS7K3M2X' } });
    expect(calls[0]!.body).toMatchObject({ slots: 2, code: 'SS7K3M2X' });
  });

  it('refuses a code that makes the pass free — that one goes through redeem', async () => {
    const { createOrder } = await load();
    answer(() => ({ status: 409, json: { reason: 'free' } }));
    expect(await createOrder(1, 'SSFREEEE')).toEqual({ kind: 'refused', reason: 'free' });
  });

  it('says so and asks for nothing with the radio off', async () => {
    const { createOrder } = await load();
    online(false);
    const calls = answer(() => ({ json: ORDER }));
    expect(await createOrder(1)).toEqual({ kind: 'offline' });
    expect(calls).toHaveLength(0);
  });
});

describe('the handover to Razorpay', () => {
  const scripts = () =>
    document.head.querySelectorAll('script[src="https://checkout.razorpay.com/v1/checkout.js"]');

  it('starts the script and the order together, so a cold tap waits for one, not both', async () => {
    const { buyPass } = await load();
    let reply: (response: Response) => void = () => undefined;
    const calls: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      calls.push(url);
      return new Promise<Response>((resolve) => {
        reply = resolve;
      });
    });

    const buying = buyPass({ slots: 1, name: 'दुबई साथी', description: 'पास' });
    // The order is out and has not answered, and the script is already on its way.
    expect(calls).toHaveLength(1);
    expect(scripts()).toHaveLength(1);

    reply(new Response(JSON.stringify({}), { status: 500 }));
    expect(await buying).toEqual({ kind: 'failed' });
  });

  it('preloads the script once however often घर.4 asks, and not at all offline', async () => {
    const { preloadCheckout } = await load();
    online(false);
    preloadCheckout();
    expect(scripts()).toHaveLength(0);
    online(true);
    preloadCheckout();
    preloadCheckout();
    preloadCheckout();
    expect(scripts()).toHaveLength(1);
  });

  it('warms the order function with a request that cannot create anything', async () => {
    const { warmOrder } = await load();
    const calls: { url: string; method: string | undefined; body: unknown }[] = [];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body });
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    warmOrder();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toMatch(/\/functions\/v1\/order$/);
    expect(calls[0]?.method).toBe('OPTIONS');
    expect(calls[0]?.body).toBeUndefined();
    online(false);
    warmOrder();
    expect(calls).toHaveLength(1);
  });
});

describe('the payment screen', () => {
  it('opens on the order with no method restriction, so every method the account takes shows', async () => {
    const { buyPass } = await load();
    answer((_path, body) =>
      body.action === 'create'
        ? { json: { ...ORDER, amountInr: 299, slots: 2 } }
        : { json: { status: 'created' } },
    );
    const opened = checkout('closes');
    vi.useFakeTimers();

    const buying = buyPass({ slots: 2, name: 'दुबई साथी', description: 'पास' });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await buying).toEqual({ kind: 'closed' });
    expect(opened[0]).toMatchObject({
      key: 'rzp_test_key',
      order_id: 'order_TESTAAAA',
      amount: 29_900,
      restricted: false,
    });
  });

  it('gives an honest outcome when the script will not load, rather than throwing', async () => {
    const { buyPass, openOrder } = await load();
    answer(() => ({ json: { ...ORDER, amountInr: 199, slots: 1 } }));
    // The phone is online enough to reach our function and not enough to reach Razorpay's CDN —
    // a hotel wifi, exactly. The script element answers with an error, as the browser would.
    const appendChild = vi.spyOn(document.head, 'appendChild');
    appendChild.mockImplementation((node) => {
      queueMicrotask(() => {
        node.dispatchEvent(new Event('error'));
      });
      return node;
    });

    expect(await buyPass({ slots: 1, name: 'दुबई साथी', description: 'पास' })).toEqual({
      kind: 'unreachable',
    });
    // The order was made and is still recoverable: the money was never asked for, but the
    // order is the phone's receipt for having asked.
    expect(openOrder()?.orderId).toBe(ORDER.orderId);
    appendChild.mockRestore();
  });

  it('is not an error when Checkout itself refuses to start', async () => {
    const { buyPass } = await load();
    answer(() => ({ json: { ...ORDER, amountInr: 199, slots: 1 } }));
    checkout('throws');
    expect(await buyPass({ slots: 1, name: 'दुबई साथी', description: 'पास' })).toEqual({
      kind: 'unreachable',
    });
  });
});

describe('after Checkout closes', () => {
  it('polls until the webhook has settled, then installs slot 1 and keeps the rest', async () => {
    const { buyPass, entitlement, family, forgetOrder, openOrder } = await load();
    const passes = await family(3, '2026-10-01T06:00:00.000Z');
    let asked = 0;
    answer((_path, body) => {
      if (body.action === 'create') return { json: { ...ORDER, amountInr: 399, slots: 3 } };
      asked += 1;
      return asked < 3
        ? { json: { status: 'created' } }
        : { json: { status: 'paid', passes: [...passes].reverse() } };
    });
    checkout('pays');
    vi.useFakeTimers();

    const buying = buyPass({ slots: 3, name: 'दुबई साथी', description: 'पास' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await buying).toEqual({ kind: 'paid', slots: 3 });

    const state = entitlement();
    expect(state.paid).toBe(true);
    expect(state.slot).toBe(1);
    expect(state.passId).toBe(passes[0]!.claims.passId);
    expect(state.groupEndsAt).toBe('2026-10-01T06:00:00.000Z');
    expect(state.slots).toBe(3);
    expect(state.familyPasses?.map((pass) => pass.claims.slot)).toEqual([2, 3]);
    // Installed, so nothing is left to poll for.
    expect(openOrder()).toBeNull();
    forgetOrder();
  });

  it('refuses a pass signed by somebody else even when the server says paid', async () => {
    const { buyPass, entitlement, sign } = await load();
    const theirs = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ]);
    const forged = await sign(
      {
        passId: crypto.randomUUID(),
        familyId: crypto.randomUUID(),
        slot: 1,
        kind: 'paid',
        hours: 336,
      },
      theirs.privateKey,
    );
    answer((_path, body) =>
      body.action === 'create'
        ? { json: { ...ORDER, amountInr: 199, slots: 1 } }
        : { json: { status: 'paid', passes: [forged] } },
    );
    checkout('pays');
    vi.useFakeTimers();

    const buying = buyPass({ slots: 1, name: 'दुबई साथी', description: 'पास' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await buying).toEqual({ kind: 'failed' });
    expect(entitlement().paid).toBeUndefined();
  });

  it('says the payment is still being confirmed rather than claiming either way', async () => {
    const { buyPass, openOrder, forgetOrder } = await load();
    answer((_path, body) =>
      body.action === 'create'
        ? { json: { ...ORDER, amountInr: 199, slots: 1 } }
        : { json: { status: 'created' } },
    );
    checkout('pays');
    vi.useFakeTimers();

    const buying = buyPass({ slots: 1, name: 'दुबई साथी', description: 'पास' });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await buying).toEqual({ kind: 'pending' });
    // Still remembered: the pass is late, not lost.
    expect(openOrder()?.orderId).toBe(ORDER.orderId);
    forgetOrder();
  });
});

describe('an order left open', () => {
  it('is polled on the next open and installs the pass that was waiting', async () => {
    const { entitlement, family, openOrder, startOrderResume } = await load();
    const passes = await family(1);
    localStorage.setItem(
      'saathi.order',
      JSON.stringify({ ...ORDER, amountInr: 199, slots: 1, code: 'SS7K3M2X' }),
    );
    localStorage.setItem('saathi.coupon', JSON.stringify({ code: 'SS7K3M2X', slots: 1 }));
    const calls = answer(() => ({ json: { status: 'paid', passes } }));

    const stop = startOrderResume();
    await vi.waitFor(() => {
      expect(entitlement().paid).toBe(true);
    });
    expect(calls[0]!.body).toMatchObject({ action: 'status', orderId: ORDER.orderId });
    // Cleared once installed, and the code with it: the server burned it when it settled.
    expect(openOrder()).toBeNull();
    expect(localStorage.getItem('saathi.coupon')).toBeNull();
    stop();
  });

  it('is forgotten once the server calls it failed, and asks nothing with the radio off', async () => {
    const { openOrder, resumeOrder } = await load();
    localStorage.setItem('saathi.order', JSON.stringify({ ...ORDER, amountInr: 199, slots: 1 }));

    online(false);
    const calls = answer(() => ({ json: { status: 'failed' } }));
    expect(await resumeOrder()).toBeNull();
    expect(calls).toHaveLength(0);
    expect(openOrder()?.orderId).toBe(ORDER.orderId);

    online(true);
    expect(await resumeOrder()).toEqual({ kind: 'failed' });
    expect(openOrder()).toBeNull();
  });
});

/**
 * "QR कोड" — someone else pays (decision 049). The order is the same one the pay button uses,
 * the link is `order` `link`'s, and the pass comes the way every pass comes: the webhook signs
 * it, `status` hands it over, and it is verified here before it is installed.
 */
describe('QR कोड', () => {
  const LINK = { url: 'https://rzp.io/rzp/TESTQR01', expiresAt: '2099-01-01T00:00:00.000Z' };

  it('makes the order, asks for its link, and remembers both', async () => {
    const { paymentLink, openOrder, forgetOrder } = await load();
    const calls = answer((_path, body) =>
      body.action === 'create'
        ? { json: { ...ORDER, amountInr: 299, slots: 2 } }
        : {
            json: {
              orderId: ORDER.orderId,
              paymentLinkId: 'plink_TEST',
              shortUrl: LINK.url,
              expiresAt: LINK.expiresAt,
              amountInr: 299,
              slots: 2,
            },
          },
    );

    const made = await paymentLink(2);
    expect(made).toEqual({
      kind: 'link',
      order: { ...ORDER, amountInr: 299, slots: 2, link: LINK },
      link: LINK,
    });
    expect(calls.map((call) => call.body.action)).toEqual(['create', 'link']);
    // The phone sends which order, never an amount: the price is the server's.
    expect(calls[1]!.body).toEqual({
      action: 'link',
      deviceId: '11111111-2222-4333-8444-555555555555',
      orderId: ORDER.orderId,
    });
    expect(openOrder()?.link).toEqual(LINK);
    forgetOrder();
  });

  it('reuses the remembered order for the same purchase, and draws its QR with the radio off', async () => {
    const { paymentLink, forgetOrder } = await load();
    localStorage.setItem(
      'saathi.order',
      JSON.stringify({ ...ORDER, amountInr: 199, slots: 1, link: LINK }),
    );
    const calls = answer(() => ({
      json: { orderId: ORDER.orderId, shortUrl: LINK.url, expiresAt: LINK.expiresAt },
    }));
    expect(await paymentLink(1)).toMatchObject({ kind: 'link', link: LINK });
    expect(calls.map((call) => call.body.action)).toEqual(['link']);

    online(false);
    expect(await paymentLink(1)).toMatchObject({ kind: 'link', link: LINK });
    expect(calls).toHaveLength(1);
    // A different purchase has no QR yet, and nothing is asked for offline.
    expect(await paymentLink(2)).toEqual({ kind: 'offline' });
    forgetOrder();
  });

  it('replaces an order whose link has run out with a new one', async () => {
    const { paymentLink, openOrder, forgetOrder } = await load();
    localStorage.setItem('saathi.order', JSON.stringify({ ...ORDER, amountInr: 199, slots: 1 }));
    const fresh = '88888888-8888-4888-8888-888888888888';
    const calls = answer((_path, body) => {
      if (body.action === 'create') {
        return { json: { ...ORDER, orderId: fresh, amountInr: 199, slots: 1 } };
      }
      if (body.action === 'status') return { json: { status: 'created' } };
      return body.orderId === fresh
        ? { json: { orderId: fresh, shortUrl: LINK.url, expiresAt: LINK.expiresAt } }
        : { status: 410, json: { reason: 'link-expired' } };
    });
    expect(await paymentLink(1)).toMatchObject({ kind: 'link', order: { orderId: fresh } });
    expect(calls.map((call) => call.body.action)).toEqual(['link', 'status', 'create', 'link']);
    expect(openOrder()?.orderId).toBe(fresh);
    forgetOrder();
  });

  it('carries a code’s refusal back as the same line the pay button gets', async () => {
    const { paymentLink } = await load();
    answer(() => ({ status: 410, json: { reason: 'ended' } }));
    expect(await paymentLink(1, 'SS7K3M2X')).toEqual({ kind: 'refused', reason: 'ended' });
  });

  it('is polled while it is on screen, and installs the pass the webhook signed', async () => {
    const { watchOrder, entitlement, family, openOrder } = await load();
    const passes = await family(2, '2026-10-01T06:00:00.000Z');
    const order = { ...ORDER, amountInr: 299, slots: 2, link: LINK };
    localStorage.setItem('saathi.order', JSON.stringify(order));
    let asked = 0;
    const calls = answer(() => {
      asked += 1;
      // Ten minutes for the son in Pune to find his phone: still `created` for a long while.
      return asked < 60 ? { json: { status: 'created' } } : { json: { status: 'paid', passes } };
    });
    vi.useFakeTimers();

    const stop = new AbortController();
    const watching = watchOrder(order, stop.signal);
    await vi.advanceTimersByTimeAsync(11 * 60_000);
    expect(await watching).toEqual({ kind: 'paid', slots: 2 });
    expect(calls.every((call) => call.body.action === 'status')).toBe(true);
    expect(entitlement().paid).toBe(true);
    expect(entitlement().familyPasses?.map((pass) => pass.claims.slot)).toEqual([2]);
    expect(openOrder()).toBeNull();
  });

  it('stops asking when the QR is closed, and keeps the order for the next open', async () => {
    const { watchOrder, openOrder, forgetOrder } = await load();
    const order = { ...ORDER, amountInr: 199, slots: 1 };
    localStorage.setItem('saathi.order', JSON.stringify(order));
    const calls = answer(() => ({ json: { status: 'created' } }));
    vi.useFakeTimers();

    const stop = new AbortController();
    const watching = watchOrder(order, stop.signal);
    await vi.advanceTimersByTimeAsync(9000);
    stop.abort();
    expect(await watching).toBeNull();
    const seen = calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(seen);
    expect(openOrder()?.orderId).toBe(ORDER.orderId);
    forgetOrder();
  });

  it('lets the pay button collect on the same order the QR is out for', async () => {
    const { buyPass, forgetOrder } = await load();
    localStorage.setItem(
      'saathi.order',
      JSON.stringify({ ...ORDER, amountInr: 199, slots: 1, link: LINK }),
    );
    const calls = answer(() => ({ json: { status: 'created' } }));
    const opened = checkout('closes');
    vi.useFakeTimers();

    const buying = buyPass({ slots: 1, name: 'दुबई साथी', description: 'पास' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await buying).toEqual({ kind: 'closed' });
    expect(calls.some((call) => call.body.action === 'create')).toBe(false);
    expect(opened[0]!.order_id).toBe(ORDER.aggregatorOrderId);
    forgetOrder();
  });
});

describe('the gate', () => {
  it('stays open while VITE_GATE_LIVE is unset, even with buying live', async () => {
    vi.stubEnv('VITE_PURCHASE_LIVE', 'true');
    vi.resetModules();
    const { PURCHASE_IS_LIVE, isGated, updateEntitlement } = await import('./entitlement.js');
    expect(PURCHASE_IS_LIVE).toBe(true);
    // Landed two days ago on the free day: expired, and still never turned away.
    updateEntitlement({ landedAt: new Date(Date.now() - 48 * 3600_000).toISOString() });
    expect(isGated()).toBe(false);
  });

  it('closes on an expired trial only once VITE_GATE_LIVE says so', async () => {
    vi.stubEnv('VITE_PURCHASE_LIVE', 'true');
    vi.stubEnv('VITE_GATE_LIVE', 'true');
    vi.resetModules();
    const { isGated, updateEntitlement } = await import('./entitlement.js');
    updateEntitlement({ landedAt: new Date(Date.now() - 48 * 3600_000).toISOString() });
    expect(isGated()).toBe(true);
    // Nobody who has paid is ever gated, whatever the switch says.
    updateEntitlement({ paid: true });
    expect(isGated()).toBe(false);
  });
});
