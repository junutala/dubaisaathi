import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { answer, online, trustedSigner } from './signing.fixture.js';

/**
 * Decision 005's reconciliation from the phone's side. What matters: a slot another phone
 * reported first is cleared here, with the reason kept for घर.4; and nothing — not a dead
 * server, not an answer we do not understand, not a phone with no signal — takes a pass away
 * for any other reason.
 */

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('saathi.deviceId', '11111111-2222-4333-8444-555555555555');
  online(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function installed() {
  const signer = await trustedSigner();
  const { installPass, entitlement } = await import('./entitlement.js');
  const bind = await import('./bind.js');
  const [pass] = await signer.family(1, '2026-10-01T06:00:00.000Z');
  expect(await installPass(pass!)).toBe(true);
  return { ...signer, ...bind, entitlement, pass: pass! };
}

describe('reporting the slot', () => {
  it('sends exactly the signed claims and remembers a good answer for a day', async () => {
    const { reconcilePass, entitlement, pass } = await installed();
    const calls = answer(() => ({ json: { bound: true } }));
    expect(await reconcilePass()).toBe('bound');
    expect(calls[0]!.path).toBe('bind');
    expect(calls[0]!.body).toEqual({
      deviceId: '11111111-2222-4333-8444-555555555555',
      ...pass.claims,
      signature: pass.signature,
    });
    expect(entitlement().bindCheckedAt).toBeDefined();
    expect(await reconcilePass()).toBe('checked-recently');
    expect(await reconcilePass({ force: true })).toBe('bound');
    expect(calls).toHaveLength(2);
  });

  it.each(['taken', 'revoked'] as const)(
    'clears the pass when the server says %s',
    async (reason) => {
      const { reconcilePass, entitlement } = await installed();
      answer(() => ({ json: { bound: false, reason } }));
      expect(await reconcilePass()).toBe(reason);
      const state = entitlement();
      expect(state.paid).toBe(false);
      expect(state.passId).toBeUndefined();
      expect(state.pass).toBeUndefined();
      expect(state.groupEndsAt).toBeUndefined();
      expect(state.passLost).toBe(reason);
      expect(await reconcilePass()).toBe('nothing-to-bind');
    },
  );

  it('takes nothing away on an answer it does not understand, or no answer', async () => {
    const { reconcilePass, entitlement } = await installed();
    answer(() => ({ json: { bound: false, reason: 'unknown' } }));
    expect(await reconcilePass()).toBe('unknown');
    expect(entitlement().paid).toBe(true);
    answer(() => ({ status: 500, json: { error: 'down' } }));
    expect(await reconcilePass()).toBe('failed');
    vi.stubGlobal('fetch', () => Promise.reject(new Error('no route')));
    expect(await reconcilePass()).toBe('failed');
    expect(entitlement().paid).toBe(true);
  });

  it('never runs without a connection, and runs when one arrives', async () => {
    const { reconcilePass, startPassReconcile, entitlement } = await installed();
    online(false);
    const calls = answer(() => ({ json: { bound: true } }));
    expect(await reconcilePass()).toBe('offline');
    const stop = startPassReconcile();
    expect(calls).toHaveLength(0);
    online(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => {
      expect(entitlement().bindCheckedAt).toBeDefined();
    });
    expect(calls).toHaveLength(1);
    stop();
  });
});
