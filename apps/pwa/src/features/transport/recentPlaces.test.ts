import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { forgetPlaces, popularPlaces, quickPicks, rememberPlace } from './recentPlaces.js';

/**
 * 1.1 opened as a box and two buttons over half a phone of nothing, which the owner read — before
 * a word of it — as an unfinished app. The shortcuts fill that space with somewhere to go.
 *
 * The rule they must never break: a shortcut **fills the box**, it does not act. Which of the two
 * buttons is right depends on whether the traveller is in a hotel room or at a taxi door, and
 * that was never ours to decide.
 */

beforeEach(forgetPlaces);
afterEach(forgetPlaces);

describe('somewhere to go, before the traveller has typed anything', () => {
  /** The first day, with no history at all, is the case that was broken. */
  it('is never empty on a phone that has never been used', () => {
    expect(quickPicks(undefined).length).toBeGreaterThan(0);
  });

  it('puts the most-asked places first, in the order the pack ranks them', () => {
    const ranked = popularPlaces();
    expect(ranked[0]?.id).toBe('dxb-airport');
    const ranks = ranked.map((place) => place.popularity ?? 0);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });

  it('leads with the hotel, because that is the destination a traveller repeats most', () => {
    expect(quickPicks('karama')[0]?.id).toBe('karama');
  });

  it('puts where this phone has been ahead of what is popular in general', () => {
    rememberPlace('gold-souk');
    rememberPlace('jumeirah');
    const ids = quickPicks(undefined).map((place) => place.id);
    // Newest first, and both ahead of the airport, which tops the popular list.
    expect(ids.indexOf('jumeirah')).toBeLessThan(ids.indexOf('gold-souk'));
    expect(ids.indexOf('gold-souk')).toBeLessThan(ids.indexOf('dxb-airport'));
  });

  it('never shows the same place twice, however it got there', () => {
    rememberPlace('dubai-mall');
    const ids = quickPicks('dubai-mall').map((place) => place.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stays a row of shortcuts rather than a list to read', () => {
    for (const id of ['karama', 'deira', 'jumeirah', 'gold-souk']) rememberPlace(id);
    expect(quickPicks('bur-dubai').length).toBeLessThanOrEqual(8);
  });

  /** A place dropped from the pack must vanish from the shortcuts, not crash them. */
  it('quietly drops a remembered place the pack no longer has', () => {
    rememberPlace('a-place-we-removed');
    expect(quickPicks(undefined).every((place) => place.id !== 'a-place-we-removed')).toBe(true);
  });
});
