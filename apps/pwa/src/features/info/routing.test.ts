import { describe, expect, it } from 'vitest';
import { href, parseRoute } from '../../app/routes.js';
import { landingHref } from '../voice/micRouting.js';

/**
 * The symptom this guards against is the one a traveller would report in four words: "I tapped
 * ज़रूरी जानकारी and it said it was being built." The tile is reached from three places that
 * were written before it existed — the home tile, the bottom bar, and the mic landing a
 * "beema dikhao" — and each of them addresses it by the old name.
 */
describe('every way into ज़रूरी जानकारी', () => {
  it('opens the built screen, not the one that says it is being built', () => {
    expect(parseRoute('#/info')).toEqual({ screen: 'info' });
    // What home and the old mic landing both ask for.
    expect(parseRoute('#/soon/info')).toEqual({ screen: 'info' });
    expect(href({ screen: 'soon', tile: 'info' })).toBe('#/info');
  });

  it('leaves the two tiles that really are being built alone', () => {
    expect(parseRoute('#/soon/transport')).toEqual({ screen: 'soon', tile: 'transport' });
    expect(parseRoute('#/soon/food')).toEqual({ screen: 'soon', tile: 'food' });
  });

  it('lands "beema dikhao" on the document list', () => {
    // The mic's answer for a document intent, followed all the way to a screen. If the two
    // ends of this stop agreeing, the banner on 4.1 goes quiet and nobody notices.
    const landing = landingHref({
      kind: 'document',
      transcript: 'बीमा दिखाओ',
      confidence: 0.9,
      documentName: 'बीमा',
    });
    expect(landing).toBe('#/info');
    expect(parseRoute(landing ?? '')).toEqual({ screen: 'info' });
  });

  it('round-trips the three child screens, so a refresh at a desk lands where it was', () => {
    for (const route of [
      { screen: 'hotelAdd' },
      { screen: 'docAdd' },
      { screen: 'docView', docId: 'a-document-id' },
    ] as const) {
      expect(parseRoute(href(route))).toEqual(route);
    }
  });

  it('sends a document link with no id back to the shelf rather than nowhere', () => {
    expect(parseRoute('#/doc')).toEqual({ screen: 'info' });
  });
});
