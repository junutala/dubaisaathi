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
  const opened: { key: string; order_id: string; amount: number; method?: unknown }[] = [];
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
          method: this.options.method,
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

describe('the payment screen', () => {
  it('opens on the order with UPI preselected, and leaves it open for the QR button', async () => {
    const { buyPass } = await load();
    answer((_path, body) =>
      body.action === 'create'
        ? { json: { ...ORDER, amountInr: 299, slots: 2 } }
        : { json: { status: 'created' } },
    );
    const opened = checkout('closes');
    vi.useFakeTimers();

    const upi = buyPass({ slots: 2, method: 'upi', name: 'दुबई साथी', description: 'पास' });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await upi).toEqual({ kind: 'closed' });
    expect(opened[0]).toMatchObject({
      key: 'rzp_test_key',
      order_id: 'order_TESTAAAA',
      amount: 29_900,
      method: { upi: true },
    });

    const qr = buyPass({ slots: 2, method: 'any', name: 'दुबई साथी', description: 'पास' });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await qr).toEqual({ kind: 'closed' });
    expect(opened[1]?.method).toBeUndefined();
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

    expect(
      await buyPass({ slots: 1, method: 'upi', name: 'दुबई साथी', description: 'पास' }),
    ).toEqual({ kind: 'unreachable' });
    // The order was made and is still recoverable: the money was never asked for, but the
    // order is the phone's receipt for having asked.
    expect(openOrder()?.orderId).toBe(ORDER.orderId);
    appendChild.mockRestore();
  });

  it('is not an error when Checkout itself refuses to start', async () => {
    const { buyPass } = await load();
    answer(() => ({ json: { ...ORDER, amountInr: 199, slots: 1 } }));
    checkout('throws');
    expect(
      await buyPass({ slots: 1, method: 'upi', name: 'दुबई साथी', description: 'पास' }),
    ).toEqual({ kind: 'unreachable' });
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

    const buying = buyPass({ slots: 3, method: 'upi', name: 'दुबई साथी', description: 'पास' });
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

    const buying = buyPass({ slots: 1, method: 'upi', name: 'दुबई साथी', description: 'पास' });
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

    const buying = buyPass({ slots: 1, method: 'upi', name: 'दुबई साथी', description: 'पास' });
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
