import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { href, parseRoute } from '../../app/routes.js';
import { answer, online, trustedSigner } from './signing.fixture.js';

/**
 * The family QR is a link (`#/pass/<token>`), so the other phone's own camera opens it and the
 * app installs the pass from the hash with no connection at all (decision 005). What must hold:
 * a real pass installs offline, an edited one does not, and the slot is reported when there
 * happens to be signal.
 */

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('saathi.deviceId', '11111111-2222-4333-8444-555555555555');
  online(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('#/pass/<token>', () => {
  it('is a route that carries the token both ways', () => {
    expect(parseRoute('#/pass/abc')).toEqual({ screen: 'pass', token: 'abc' });
    expect(parseRoute('#/pass')).toEqual({ screen: 'pass' });
    expect(href({ screen: 'pass', token: 'abc' })).toBe('#/pass/abc');
  });

  it('installs a real pass with the radio off', async () => {
    const { family, signedPass } = await trustedSigner();
    const { installFromToken } = await import('./scan.js');
    const { entitlement } = await import('./entitlement.js');
    const { passLink } = await import('./qr.js');
    const [, second] = await family(2, '2026-10-01T06:00:00.000Z');
    const link = passLink(second!);
    expect(link.startsWith('https://dubai.saafarsaathi.in/#/pass/')).toBe(true);
    const token = link.split('#/pass/')[1]!;
    expect(signedPass.decodePass(token)).toEqual(second);

    expect(await installFromToken(token)).toBe('installed');
    const state = entitlement();
    expect(state.paid).toBe(true);
    expect(state.slot).toBe(2);
    expect(state.groupEndsAt).toBe('2026-10-01T06:00:00.000Z');
    // The scanning phone holds its own slot and nobody else's QR.
    expect(state.familyPasses).toBeUndefined();
  });

  it('refuses a token whose claims were edited, and one that is not a pass at all', async () => {
    const { family, signedPass } = await trustedSigner();
    const { installFromToken } = await import('./scan.js');
    const { entitlement } = await import('./entitlement.js');
    const [pass] = await family(1);
    const stretched = { ...pass!, claims: { ...pass!.claims, hours: 9999 } };
    expect(await installFromToken(signedPass.encodePass(stretched))).toBe('invalid');
    expect(await installFromToken('a shop receipt')).toBe('invalid');
    expect(entitlement().paid).toBeUndefined();
  });

  it('reports the slot right away when there is signal', async () => {
    const { family, signedPass } = await trustedSigner();
    const { installFromToken } = await import('./scan.js');
    const { entitlement } = await import('./entitlement.js');
    online(true);
    const calls = answer(() => ({ json: { bound: true } }));
    const [pass] = await family(1);
    expect(await installFromToken(signedPass.encodePass(pass!))).toBe('installed');
    await vi.waitFor(() => {
      expect(entitlement().bindCheckedAt).toBeDefined();
    });
    expect(calls[0]!.path).toBe('bind');
  });
});
