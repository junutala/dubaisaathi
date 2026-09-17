import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { answer, online, trustedSigner } from './signing.fixture.js';

/**
 * The coupon, tested as the ways it fails a traveller: a code from an advertisement that never
 * reaches the field, a free pass that needs a second tap nobody knows about, a code typed with
 * no signal and lost, and a `single` code that makes them find the rule out by themselves.
 */

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('saathi.deviceId', '11111111-2222-4333-8444-555555555555');
  online(true);
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function load() {
  const signer = await trustedSigner();
  const coupon = await import('./coupon.js');
  const entitlement = await import('./entitlement.js');
  return { ...signer, ...coupon, ...entitlement };
}

describe('a code on the URL', () => {
  it('is read from the query string, remembered, and taken off the URL', async () => {
    const { takeCodeFromUrl, pendingCoupon } = await load();
    window.history.replaceState(null, '', '/?code=ss7k3m2x&utm=ad#/');
    expect(takeCodeFromUrl()).toBe('SS-7K3M2X');
    expect(pendingCoupon()).toEqual({ code: 'SS-7K3M2X', slots: 1 });
    expect(window.location.search).toBe('?utm=ad');
    expect(takeCodeFromUrl()).toBeNull();
  });

  it('is read from after the hash, the way a shared link carries it', async () => {
    const { takeCodeFromUrl } = await load();
    window.history.replaceState(null, '', '/#/pass?code=OP-4HXR9B');
    expect(takeCodeFromUrl()).toBe('OP-4HXR9B');
    expect(window.location.hash).toBe('#/pass');
  });

  it('ignores something that is not a code', async () => {
    const { takeCodeFromUrl, pendingCoupon } = await load();
    window.history.replaceState(null, '', '/?code=hello');
    expect(takeCodeFromUrl()).toBeNull();
    expect(pendingCoupon()).toBeNull();
  });
});

describe('applying a code', () => {
  it('quotes a free code, then issues it on the button and installs slot 1', async () => {
    const { applyCoupon, entitlement, pendingCoupon, family } = await load();
    const passes = await family(3, '2026-10-01T06:00:00.000Z');
    const calls = answer((_path, body) => ({
      json:
        body.quoteOnly === true
          ? {
              code: body.code,
              kind: 'family',
              payable: 0,
              listPrice: 399,
              issued: false,
              discount: { discountPercent: 100 },
            }
          : {
              code: body.code,
              kind: 'family',
              payable: 0,
              issued: true,
              passes: [...passes].reverse(),
            },
    }));

    const quoted = await applyCoupon('ss-7k3m2x', 3, 'quote');
    expect(quoted).toMatchObject({ kind: 'quoted', quote: { payable: 0, kind: 'family' } });
    expect(pendingCoupon()).toMatchObject({ code: 'SS-7K3M2X', slots: 3, quote: { payable: 0 } });
    expect(entitlement().paid).toBeUndefined();

    const issued = await applyCoupon('SS-7K3M2X', 3, 'issue');
    expect(issued).toEqual({ kind: 'issued', slots: 3 });
    const state = entitlement();
    expect(state.paid).toBe(true);
    expect(state.slot).toBe(1);
    expect(state.passId).toBe(passes[0]!.claims.passId);
    expect(state.groupEndsAt).toBe('2026-10-01T06:00:00.000Z');
    expect(state.slots).toBe(3);
    expect(state.familyPasses?.map((pass) => pass.claims.slot)).toEqual([2, 3]);
    expect(pendingCoupon()).toBeNull();
    expect(calls.map((call) => call.path)).toEqual(['redeem', 'redeem']);
    expect(calls[0]!.body).toMatchObject({
      deviceId: '11111111-2222-4333-8444-555555555555',
      slots: 3,
    });
  });

  it('refuses a pass signed by somebody else even when the server says issued', async () => {
    const { applyCoupon, entitlement, sign } = await load();
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
    answer(() => ({ json: { payable: 0, issued: true, passes: [forged] } }));
    expect(await applyCoupon('SS-7K3M2X', 1, 'issue')).toEqual({ kind: 'failed' });
    expect(entitlement().paid).toBeUndefined();
  });

  it('remembers a partial code with its quote and issues nothing', async () => {
    const { applyCoupon, pendingCoupon, entitlement } = await load();
    answer(() => ({
      json: {
        code: 'SS-7K3M2X',
        kind: 'family',
        payable: 149,
        listPrice: 299,
        issued: false,
        discount: { discountPercent: 50 },
      },
    }));
    const outcome = await applyCoupon('SS-7K3M2X', 2, 'quote');
    expect(outcome).toMatchObject({ kind: 'quoted', quote: { payable: 149, listPrice: 299 } });
    expect(pendingCoupon()?.quote?.discount).toEqual({ discountPercent: 50 });
    expect(entitlement().paid).toBeUndefined();
  });

  it('locks a single code to one phone and asks again by itself', async () => {
    const { applyCoupon, pendingCoupon } = await load();
    const calls = answer((_path, body) =>
      body.slots === 1
        ? {
            json: {
              code: 'OP-4HXR9B',
              kind: 'single',
              payable: 99,
              listPrice: 199,
              issued: false,
              discount: { discountPercent: 0, priceOverrideInr: 99 },
            },
          }
        : { status: 400, json: { reason: 'single' } },
    );
    const outcome = await applyCoupon('OP-4HXR9B', 3, 'quote');
    expect(outcome).toMatchObject({ kind: 'quoted', quote: { payable: 99, kind: 'single' } });
    expect(calls.map((call) => call.body.slots)).toEqual([3, 1]);
    expect(pendingCoupon()).toMatchObject({ code: 'OP-4HXR9B', slots: 1, kind: 'single' });
    // Once known, the phone count is never sent above one for this code again.
    await applyCoupon('OP-4HXR9B', 4, 'quote');
    expect(calls[2]!.body.slots).toBe(1);
  });

  it.each([
    ['unknown', 404],
    ['not-yet', 400],
    ['ended', 410],
    ['exhausted', 409],
    ['already-redeemed', 409],
  ])('forgets a code the server calls %s', async (reason, status) => {
    const { applyCoupon, pendingCoupon } = await load();
    answer(() => ({ status, json: { reason } }));
    expect(await applyCoupon('SS-7K3M2X', 1, 'quote')).toEqual({ kind: 'refused', reason });
    expect(pendingCoupon()).toBeNull();
  });

  it('says so and keeps the code when the server cannot be reached', async () => {
    const { applyCoupon, pendingCoupon } = await load();
    vi.stubGlobal('fetch', () => Promise.reject(new Error('no route to host')));
    expect(await applyCoupon('SS-7K3M2X', 2, 'quote')).toEqual({ kind: 'failed' });
    expect(pendingCoupon()).toEqual({ code: 'SS-7K3M2X', slots: 2 });
  });

  it('remembers a code applied offline and applies it when the phone comes back', async () => {
    const { applyCoupon, pendingCoupon, startCouponRetry } = await load();
    online(false);
    const calls = answer(() => ({
      json: {
        code: 'SS-7K3M2X',
        kind: 'family',
        payable: 0,
        listPrice: 299,
        issued: false,
        discount: { discountPercent: 100 },
      },
    }));
    expect(await applyCoupon('SS-7K3M2X', 2, 'quote')).toEqual({ kind: 'offline' });
    expect(pendingCoupon()).toEqual({ code: 'SS-7K3M2X', slots: 2 });
    expect(calls).toHaveLength(0);

    const stop = startCouponRetry();
    expect(calls).toHaveLength(0);
    online(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => {
      expect(pendingCoupon()?.quote?.payable).toBe(0);
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body).toMatchObject({ code: 'SS-7K3M2X', slots: 2, quoteOnly: true });
    // A quoted code is not asked about again.
    window.dispatchEvent(new Event('online'));
    await Promise.resolve();
    expect(calls).toHaveLength(1);
    stop();
  });
});
