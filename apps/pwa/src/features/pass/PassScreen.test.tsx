import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { stubCanvas } from './canvas.fixture.js';
import { answer, online, trustedSigner } from './signing.fixture.js';

/**
 * घर.4 as a traveller meets it (decision 018): the phones, a code, the total, and the one
 * button that fits the total — then the family's QRs. Tested against a mocked `redeem` and
 * `bind`, with passes signed by a key generated inside the test.
 */

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
  vi.restoreAllMocks();
});

/** The screen, from a module graph that trusts this test's key — or a signer made earlier. */
async function show(token?: string, signer?: Awaited<ReturnType<typeof trustedSigner>>) {
  signer ??= await trustedSigner();
  const { SettingsProvider } = await import('../../app/settings.js');
  const { PassScreen } = await import('./PassScreen.js');
  const entitlement = await import('./entitlement.js');
  const coupon = await import('./coupon.js');
  const bind = await import('./bind.js');
  render(
    <SettingsProvider>
      <PassScreen token={token} />
    </SettingsProvider>,
  );
  return { ...signer, ...entitlement, ...coupon, ...bind };
}

function typeCode(code: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'कोड' }), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'लगाएँ' }));
}

describe('घर.4', () => {
  it('shows the four phone counts at list price and a total of ₹199 before any code', async () => {
    await show();
    for (const [phones, price] of [
      [1, '₹199'],
      [2, '₹299'],
      [3, '₹399'],
      [4, '₹499'],
    ] as const) {
      expect(
        screen.getByRole('button', { name: new RegExp(`${String(phones)} फ़ोन`) }).textContent,
      ).toContain(price);
    }
    fireEvent.click(screen.getByRole('button', { name: /3 फ़ोन/ }));
    expect(screen.getByText('कुल').nextElementSibling?.textContent).toBe('₹399');
    // UPI is not open: the buttons say so and are not live.
    expect(screen.getByRole('button', { name: /UPI/ }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/ख़रीदना अभी चालू नहीं/)).toBeTruthy();
  });

  it('takes a free code: the total says मुफ़्त, the button issues, the family QRs follow', async () => {
    const { family, entitlement } = await show();
    const passes = await family(3, '2026-10-01T06:00:00.000Z');
    answer((path, body) => {
      if (path === 'bind') return { json: { bound: true } };
      return {
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
            : { code: body.code, kind: 'family', payable: 0, issued: true, passes },
      };
    });
    fireEvent.click(screen.getByRole('button', { name: /3 फ़ोन/ }));
    typeCode('ss7k3m2x');

    const free = await screen.findByRole('button', { name: 'पास लें — मुफ़्त' });
    expect(screen.getByText('कुल').nextElementSibling?.textContent).toBe('मुफ़्त');
    expect(screen.getByText('SS7K3M2X · 100% छूट')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /UPI/ })).toBeNull();

    fireEvent.click(free);
    await screen.findByText('पास लग गया — इस सफ़र में अब कुछ बंद नहीं होगा');
    expect(entitlement().paid).toBe(true);
    expect(entitlement().slot).toBe(1);
    // The buyer's phone shows slots 2 and 3 as QR codes, each with a way to send it on.
    expect(screen.getByText('परिवार')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'फ़ोन 2' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'फ़ोन 3' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'फ़ोन 1' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /भेजें/ })).toHaveLength(2);
    // Nothing to choose or type any more.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('sends a family QR as a picture and says what the phone did with it', async () => {
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
    typeCode('SS7K3M2X');
    fireEvent.click(await screen.findByRole('button', { name: 'पास लें — मुफ़्त' }));
    const send = await screen.findByRole('button', { name: /भेजें/ });

    // The canvas and the share sheet, as a phone that takes a file.
    stubCanvas(new Blob(['png'], { type: 'image/png' }));
    const shared: ShareData[] = [];
    vi.stubGlobal('navigator', {
      canShare: () => true,
      share: (data: ShareData) => {
        shared.push(data);
        return Promise.resolve();
      },
    });

    fireEvent.click(send);
    await screen.findByText('QR तस्वीर बनकर चली गई — उनके कैमरे से खुल जाएगी');
    expect(shared[0]?.files?.[0]?.name).toBe('dubaisaathi-pass-2.png');
  });

  it('shows the balance for a partial code and issues nothing', async () => {
    const { entitlement } = await show();
    answer(() => ({
      json: {
        code: 'SS7K3M2X',
        kind: 'family',
        payable: 149,
        listPrice: 299,
        issued: false,
        discount: { discountPercent: 50 },
      },
    }));
    fireEvent.click(screen.getByRole('button', { name: /2 फ़ोन/ }));
    typeCode('SS7K3M2X');
    await screen.findByText('SS7K3M2X · 50% छूट');
    expect(screen.getByText('कुल').nextElementSibling?.textContent).toBe('₹149');
    expect(screen.getByText(/बाक़ी ₹149 ख़रीद खुलने पर/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /UPI/ }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'पास लें — मुफ़्त' })).toBeNull();
    expect(entitlement().paid).toBeUndefined();
    // Choosing more phones re-prices from the same rule: ₹399 at 50% is ₹199.
    fireEvent.click(screen.getByRole('button', { name: /3 फ़ोन/ }));
    expect(screen.getByText('कुल').nextElementSibling?.textContent).toBe('₹199');
  });

  it('locks a single code to one phone and says so', async () => {
    await show();
    answer((_path, body) =>
      body.slots === 1
        ? {
            json: {
              code: 'OP4HXR9B',
              kind: 'single',
              payable: 99,
              listPrice: 199,
              issued: false,
              discount: { discountPercent: 0, priceOverrideInr: 99 },
            },
          }
        : { status: 400, json: { reason: 'single' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /4 फ़ोन/ }));
    typeCode('OP4HXR9B');
    await screen.findByText('इस कोड पर एक ही फ़ोन चलता है');
    expect(screen.getByText('OP4HXR9B · ₹99 में')).toBeTruthy();
    expect(screen.getByRole('button', { name: /4 फ़ोन/ }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /1 फ़ोन/ }).className).toBe('tier tier-on');
    expect(screen.getByText('कुल').nextElementSibling?.textContent).toBe('₹99');
  });

  it.each([
    ['unknown', 'यह कोड हमारे पास नहीं है — एक बार फिर देख लीजिए'],
    ['ended', 'इस कोड की तारीख़ निकल गई'],
    ['exhausted', 'यह कोड जितनी बार चलना था, चल चुका'],
    ['already-redeemed', 'यह कोड इस फ़ोन पर पहले ही लग चुका है'],
  ])('has one honest line for a code the server calls %s', async (reason, line) => {
    await show();
    answer(() => ({ status: 409, json: { reason } }));
    typeCode('SSZZZZZZ');
    await screen.findByText(line);
    expect(screen.getByText('कुल').nextElementSibling?.textContent).toBe('₹199');
  });

  it('remembers a code applied offline and applies it when the phone comes back', async () => {
    const { pendingCoupon } = await show();
    online(false);
    const calls = answer(() => ({
      json: {
        code: 'SS7K3M2X',
        kind: 'family',
        payable: 0,
        listPrice: 199,
        issued: false,
        discount: { discountPercent: 100 },
      },
    }));
    typeCode('SS7K3M2X');
    await screen.findByText(/कोड लगाने के लिए एक पल का नेटवर्क चाहिए/);
    expect(pendingCoupon()).toEqual({ code: 'SS7K3M2X', slots: 1 });
    expect(calls).toHaveLength(0);

    online(true);
    window.dispatchEvent(new Event('online'));
    await screen.findByRole('button', { name: 'पास लें — मुफ़्त' });
    expect(calls).toHaveLength(1);
  });

  it('pre-fills a code the URL brought, so the ad and the field meet', async () => {
    localStorage.setItem('saathi.coupon', JSON.stringify({ code: 'SS7K3M2X', slots: 1 }));
    await show();
    expect(screen.getByDisplayValue('SS7K3M2X')).toBeTruthy();
  });

  it('installs a scanned pass from the token route and says so', async () => {
    const signer = await trustedSigner();
    const [, second] = await signer.family(2, '2026-10-01T06:00:00.000Z');
    online(false);
    const { entitlement } = await show(signer.signedPass.encodePass(second!), signer);
    await screen.findByText('पास इस फ़ोन पर लग गया');
    expect(entitlement().slot).toBe(2);
    expect(window.location.hash).toBe('#/pass');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText('परिवार')).toBeNull();
  });

  it('says a tampered QR did not work, and keeps the trial', async () => {
    const signer = await trustedSigner();
    const [pass] = await signer.family(1);
    const forged = { ...pass!, claims: { ...pass!.claims, slot: 2 } };
    const { entitlement } = await show(signer.signedPass.encodePass(forged), signer);
    await screen.findByText(/यह QR किसी और का है/);
    expect(entitlement().paid).toBeUndefined();
    expect(screen.getByRole('textbox', { name: 'कोड' })).toBeTruthy();
  });

  it('clears the pass and says why when the server says the slot is taken', async () => {
    const { family, installPass, reconcilePass, entitlement } = await show();
    const [pass] = await family(1, '2026-10-01T06:00:00.000Z');
    expect(await installPass(pass!)).toBe(true);
    await waitFor(() => {
      expect(entitlement().paid).toBe(true);
    });
    expect(screen.queryByRole('textbox')).toBeNull();

    answer(() => ({ json: { bound: false, reason: 'taken' } }));
    expect(await reconcilePass()).toBe('taken');
    await screen.findByText('यह पास किसी और फ़ोन पर पहले लग चुका था, इसलिए यहाँ से हट गया');
    expect(entitlement().paid).toBe(false);
    // Back to the trial and the flow to buy: the phones and the code field are back.
    expect(screen.getByRole('textbox', { name: 'कोड' })).toBeTruthy();
  });

  it('tells a traveller who has paid but not landed that the pass is ready, not that the free day awaits', async () => {
    // The owner bought a pass in India on 17 September and the screen still offered him the
    // twenty-four free hours he had just paid to replace. The counter is right — a pass waits
    // for the plane (decision 006) — and only the words were wrong.
    localStorage.setItem('saathi.entitlement', JSON.stringify({ paid: true, slots: 1 }));
    localStorage.setItem('saathi.locale', 'en');
    await show();
    expect(screen.getByText(/Pass ready/)).toBeTruthy();
    expect(screen.queryByText(/24 hours free/)).toBeNull();
  });
});
