import { describe, expect, it } from 'vitest';
import { cardFields } from './cardFields.js';
import { cardQrOf, choosePin, contactLines, pinFromCard, pinFromStanding } from './cardQr.js';
import type { SavedHotel } from './records.js';

/**
 * What the QR code on a hotel's card is worth (decision 032, addendum), on the shapes real cards
 * carry: a long Google Maps link, a short one, the WhatsApp link most Dubai cards print, a
 * website, a contact card, and codes that decode to nothing useful.
 */

const CITYMAX =
  'https://www.google.com/maps/place/Citymax+Hotel+Bur+Dubai/@25.2521937,55.2986377,17z/data=!3m1!4b1!4m9!3m8!8m2!3d25.2521889!4d55.3012126';
const CITYMAX_AT = { lat: 25.2521889, lng: 55.3012126 };
const RIGGA = { lat: 25.2637, lng: 55.3197 };

function hotel(fields: Omit<SavedHotel, 'id' | 'savedAt'>): SavedHotel {
  return { id: 'hotel', savedAt: '2026-09-23T09:00:00.000Z', ...fields };
}

describe('the codes on a card', () => {
  it('takes the place off a long maps link, whatever else the card carries', () => {
    const qr = cardQrOf(['https://wa.me/971501234567', CITYMAX]);
    expect(qr.place).toEqual({ at: CITYMAX_AT, name: 'Citymax Hotel Bur Dubai' });
    expect(qr.shortLink).toBeUndefined();
    expect(qr.lines).toEqual([]);
  });

  it('keeps a short link to follow, only when no long one said it already', () => {
    expect(cardQrOf(['https://maps.app.goo.gl/Xy12AbCd']).shortLink).toBe(
      'https://maps.app.goo.gl/Xy12AbCd',
    );
    expect(cardQrOf(['https://maps.app.goo.gl/Xy12AbCd', CITYMAX]).shortLink).toBeUndefined();
  });

  it('ignores WhatsApp, a website, a menu and garbage entirely', () => {
    for (const text of [
      'https://wa.me/971501234567',
      'https://api.whatsapp.com/send?phone=971501234567&text=Hi',
      'https://www.riggapalminn.com',
      'https://menu.example.ae/rigga-palm',
      'WIFI:T:WPA;S:RiggaPalmGuest;P:welcome123;;',
      '¿¿¿',
    ]) {
      expect(cardQrOf([text])).toEqual({ lines: [] });
    }
  });

  it('reads a vCard into lines the card rules decide on: the desk, not the mobile', () => {
    const lines = contactLines(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Khan;Imran',
        'FN:Imran Khan',
        'ORG:Rigga Palm Inn;Front Office',
        'TITLE:Front Office Manager',
        'TEL;TYPE=CELL:+971 50 123 4567',
        'TEL;TYPE=WORK:+971 4 268 0455',
        'ADR;TYPE=WORK:;;23D Street\\, Al Rigga;Dubai;;;UAE',
        'URL:https://www.riggapalminn.com',
        'END:VCARD',
      ].join('\r\n'),
    );
    expect(lines.map((line) => line.text)).toEqual([
      'Rigga Palm Inn',
      'Tel: +971 50 123 4567',
      'Tel: +971 4 268 0455',
      '23D Street, Al Rigga, Dubai, UAE',
      'https://www.riggapalminn.com',
    ]);
    expect(cardFields(lines).phone).toBe('+971 4 268 0455');
  });

  it('reads a MECARD, and a mobile alone fills no desk', () => {
    const lines = contactLines(
      'MECARD:N:Rigga Palm Inn;TEL:+971501234567;EMAIL:desk@riggapalminn.com;;',
    );
    expect(lines.map((line) => line.text)).toEqual(['Tel: +971501234567', 'desk@riggapalminn.com']);
    expect(cardFields(lines).phone).toBeUndefined();
  });
});

describe('the pin, and the card’s say in it', () => {
  it('pins the card’s place, with its area, when there is no pin yet', () => {
    const capture = pinFromCard(undefined, CITYMAX_AT);
    expect(capture.pin).toEqual(CITYMAX_AT);
    expect(capture.pinFrom).toBe('card');
    expect(capture.area).toBeDefined();
  });

  it('never pins a place outside Dubai', () => {
    expect(pinFromCard(undefined, { lat: 19.1036, lng: 72.8266 })).toEqual({});
    expect(pinFromCard(hotel({ pin: RIGGA }), { lat: 19.1036, lng: 72.8266 })).toEqual({});
  });

  it('leaves the traveller’s pin alone within 200 m, and asks beyond it', () => {
    expect(pinFromCard(hotel({ pin: RIGGA }), { lat: 25.264, lng: 55.3199 })).toEqual({
      cardPin: undefined,
    });
    const far = pinFromCard(hotel({ pin: RIGGA }), CITYMAX_AT);
    expect(far.pin).toBeUndefined();
    expect(far.cardPin?.at).toEqual(CITYMAX_AT);
  });

  it('replaces a pin that came from the card with the card’s new place', () => {
    const capture = pinFromCard(hotel({ pin: RIGGA, pinFrom: 'card' }), CITYMAX_AT);
    expect(capture.pin).toEqual(CITYMAX_AT);
  });

  it('makes the traveller’s own pin the pin, and keeps a card that disagrees to ask about', () => {
    const fromCard = hotel({ pin: CITYMAX_AT, pinFrom: 'card' });
    const capture = pinFromStanding(fromCard, RIGGA);
    expect(capture.pin).toEqual(RIGGA);
    expect(capture.pinFrom).toBeUndefined();
    expect('pinFrom' in capture).toBe(true);
    expect(capture.cardPin?.at).toEqual(CITYMAX_AT);
    // Standing where the card says: nothing to ask.
    expect(pinFromStanding(fromCard, { lat: 25.2523, lng: 55.3013 }).cardPin).toBeUndefined();
  });

  it('settles the question either way', () => {
    const asked = hotel({ pin: RIGGA, cardPin: { at: CITYMAX_AT } });
    expect(choosePin(asked, 'stood')).toEqual({ cardPin: undefined });
    expect(choosePin(asked, 'card')).toEqual({
      pin: CITYMAX_AT,
      area: undefined,
      pinFrom: 'card',
      cardPin: undefined,
    });
  });
});
