import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { answer, online, trustedSigner } from './signing.fixture.js';

/**
 * घर.4 the moment a pass lands (decision 022). Three ways a pass arrives — a family QR, a code
 * redeemed to zero, a purchase settling — and all three are the same moment for the traveller,
 * so all three are checked here. The rest is what keeps a moment a moment: once per pass, with
 * the pass still in hand afterwards, and every word present when the phone has asked for no
 * movement.
 */

const HEADLINE = '14 दिन का दुबई साथी — अब आपका।';
const GO = 'साथी खोलिए';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('saathi.deviceId', '11111111-2222-4333-8444-555555555555');
  localStorage.setItem('saathi.locale', 'hi');
  online(true);
  window.history.replaceState(null, '', '/#/pass');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function show(token?: string, signer?: Awaited<ReturnType<typeof trustedSigner>>) {
  signer ??= await trustedSigner();
  const { SettingsProvider } = await import('../../app/settings.js');
  const { PassScreen } = await import('./PassScreen.js');
  const entitlement = await import('./entitlement.js');
  const coupon = await import('./coupon.js');
  const purchase = await import('./purchase.js');
  const view = render(
    <SettingsProvider>
      <PassScreen token={token} />
    </SettingsProvider>,
  );
  return { ...signer, ...entitlement, ...coupon, ...purchase, view };
}

describe('the pass arrives', () => {
  it('welcomes a pass that a family QR brought, with no network at all', async () => {
    const signer = await trustedSigner();
    const [, second] = await signer.family(2, '2026-10-01T06:00:00.000Z');
    // The second phone installs a scanned pass offline by design (decision 005) — so does this.
    online(false);
    vi.stubGlobal('fetch', () => Promise.reject(new Error('there is no network here')));
    const { entitlement } = await show(signer.signedPass.encodePass(second!), signer);

    await screen.findByText(HEADLINE);
    expect(screen.getByText('पास आ गया')).toBeTruthy();
    expect(screen.getByText(/सिम नहीं, वाई-फ़ाई नहीं, रोमिंग नहीं/)).toBeTruthy();
    expect(screen.getByText(/गिनती दुबई पहुँचने पर शुरू होगी/)).toBeTruthy();
    expect(screen.getByText(/सफ़र अच्छा बीते/)).toBeTruthy();
    expect(screen.getByRole('button', { name: GO })).toBeTruthy();
    expect(entitlement().slot).toBe(2);
    // No image is fetched for it: everything on the card is drawn.
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });

  it('welcomes a pass a free code issued', async () => {
    const { family } = await show();
    const passes = await family(2, '2026-10-01T06:00:00.000Z');
    answer((path, body) => {
      if (path === 'bind') return { json: { bound: true } };
      return {
        json:
          body.quoteOnly === true
            ? {
                code: body.code,
                kind: 'family',
                payable: 0,
                listPrice: 299,
                issued: false,
                discount: { discountPercent: 100 },
              }
            : { code: body.code, kind: 'family', payable: 0, issued: true, passes },
      };
    });
    fireEvent.click(screen.getByRole('button', { name: /2 फ़ोन/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'कोड' }), {
      target: { value: 'SS7K3M2X' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'लगाएँ' }));
    fireEvent.click(await screen.findByRole('button', { name: 'पास लें — मुफ़्त' }));

    await screen.findByText(HEADLINE);
    expect(screen.queryByRole('button', { name: /2 फ़ोन/ })).toBeNull();
  });

  it('welcomes a pass a purchase settled, when the phone asks the order again', async () => {
    const { family, resumeOrder } = await show();
    const passes = await family(1, '2026-10-01T06:00:00.000Z');
    localStorage.setItem(
      'saathi.order',
      JSON.stringify({
        orderId: '99999999-9999-4999-8999-999999999999',
        aggregatorOrderId: 'order_TESTAAAA',
        keyId: 'rzp_test_key',
        amountInr: 199,
        slots: 1,
      }),
    );
    answer((path) =>
      path === 'bind' ? { json: { bound: true } } : { json: { status: 'paid', passes } },
    );
    expect((await resumeOrder())?.kind).toBe('paid');

    await screen.findByText(HEADLINE);
  });

  it('shows it once: the control lands on घर, the pass stays, and nothing replays it', async () => {
    const { family, installPass, entitlement, view } = await show();
    const [pass] = await family(1, '2026-10-01T06:00:00.000Z');
    answer(() => ({ json: { bound: true } }));
    expect(await installPass(pass!)).toBe(true);

    fireEvent.click(await screen.findByRole('button', { name: GO }));
    // घर, with the pass intact — the way out of a welcome is never the way out of a pass.
    expect(window.location.hash).toBe('#/');
    expect(entitlement().paid).toBe(true);
    expect(entitlement().passId).toBe(pass!.claims.passId);
    expect(entitlement().welcomedPassId).toBe(pass!.claims.passId);

    // The screen as it is met from now on: the pass, and what it gives, in place of the tiers.
    await waitFor(() => {
      expect(screen.queryByText(HEADLINE)).toBeNull();
    });
    expect(screen.getByText('इस पास में क्या-क्या')).toBeTruthy();
    expect(screen.getByText('खाने की जगहें, बिना नेटवर्क')).toBeTruthy();
    expect(screen.getByText('आपका होटल और दस्तावेज़, इसी फ़ोन में')).toBeTruthy();

    // And a fresh open of घर.4 — a reload, in the one way a test has of reloading — is quiet.
    view.unmount();
    const again = await show();
    expect(screen.queryByText(HEADLINE)).toBeNull();
    expect(again.entitlement().paid).toBe(true);
  });

  it('welcomes a second, different pass on its own', async () => {
    const signer = await trustedSigner();
    const [first] = await signer.family(1, '2026-10-01T06:00:00.000Z');
    answer(() => ({ json: { bound: true } }));
    const { installPass, markWelcomed, entitlement } = await show(undefined, signer);
    expect(await installPass(first!)).toBe(true);
    markWelcomed(first!.claims.passId);
    await waitFor(() => {
      expect(screen.queryByText(HEADLINE)).toBeNull();
    });

    // A new trip, a new pass: the id it carries is not the one that was welcomed.
    const [second] = await signer.family(1, '2026-11-01T06:00:00.000Z');
    expect(await installPass(second!)).toBe(true);
    await screen.findByText(HEADLINE);
    expect(entitlement().passId).toBe(second!.claims.passId);
  });

  it('says every word of it on a phone that has asked for no movement', async () => {
    // The animation is CSS and the words are not: a traveller who has turned motion off reads
    // exactly the same screen, in the same order, with the same way out.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));
    const signer = await trustedSigner();
    const [pass] = await signer.family(1, '2026-10-01T06:00:00.000Z');
    answer(() => ({ json: { bound: true } }));
    const { installPass } = await show(undefined, signer);
    expect(await installPass(pass!)).toBe(true);

    await screen.findByText(HEADLINE);
    for (const line of ['पास आ गया', /सिम नहीं, वाई-फ़ाई नहीं/, /सफ़र अच्छा बीते/, GO]) {
      expect(screen.getByText(line)).toBeTruthy();
    }
  });
});
