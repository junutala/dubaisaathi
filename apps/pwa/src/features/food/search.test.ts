import { describe, expect, it, vi } from 'vitest';
import { searchOutlets } from './search.js';
import { outlets } from './outlets.js';

/**
 * These are tests of how search behaves, so they run on the development fixture, whose kitchens
 * were written to exercise every rule — not on whatever the field collected this week, which
 * changes with every publish (the first real outlets landed on 24 September).
 */
vi.mock('../../../../../data/restaurants/restaurants.v1.json', () => ({
  default: { contentVersion: 1, status: 'collected', restaurants: [] },
}));

/** A hotel in Karama, so "nearest first" has something to measure from. */
const KARAMA = { lat: 25.245, lng: 55.305 };
/** A minute at which every fixture kitchen is open. */
const NOON = new Date(Date.UTC(2026, 8, 15, 8, 0));

describe('a dish, searched', () => {
  it('finds the kitchens a person confirmed it at, before the kitchens of its kind', () => {
    const found = searchOutlets('sabudana khichdi', [], KARAMA, NOON);
    expect(found.dish?.id).toBe('sabudana-khichdi');
    expect(found.hits.length).toBeGreaterThan(0);
    expect(found.hits[0]?.confirmed).toBe(true);
    const firstUnconfirmed = found.hits.findIndex((hit) => !hit.confirmed);
    const lastConfirmed = found.hits.map((hit) => hit.confirmed).lastIndexOf(true);
    if (firstUnconfirmed >= 0) expect(lastConfirmed).toBeLessThan(firstUnconfirmed);
  });

  it('reads the same dish in either script and inside a sentence', () => {
    expect(searchOutlets('साबूदाना खिचड़ी', [], undefined, NOON).dish?.id).toBe('sabudana-khichdi');
    expect(searchOutlets('jain thali chahiye', [], undefined, NOON).dish?.id).toBe('jain-thali');
  });

  it('never sends a vegetarian dish to a kitchen with no vegetarian food', () => {
    const found = searchOutlets('masala dosa', [], KARAMA, NOON);
    expect(found.hits.every((hit) => hit.outlet.kitchen !== 'non-veg')).toBe(true);
  });

  it('honours a stated constraint and never infers one', () => {
    const veg = searchOutlets('', ['veg'], KARAMA, NOON);
    expect(veg.hits.every((hit) => hit.outlet.kitchen === 'pure-veg')).toBe(true);
    const all = searchOutlets('', [], KARAMA, NOON);
    expect(all.hits.length).toBeGreaterThan(veg.hits.length);
  });

  it('orders by distance from where the traveller is', () => {
    const found = searchOutlets('', [], KARAMA, NOON);
    const kms = found.hits.map((hit) => hit.km ?? 0);
    expect([...kms].sort((a, b) => a - b)).toEqual(kms);
  });

  it('orders by name when there is nowhere to measure from, never by upload order', () => {
    const names = searchOutlets('', [], undefined, NOON).hits.map((hit) => hit.outlet.name.en);
    expect(names.length).toBeGreaterThan(1);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
  });
});

/**
 * The trap this block exists for: a sentence with nothing food-like in it filters nothing, so
 * the search hands back every outlet. `unmatchedWords` is the signal that says so, and the
 * screen says "could not read that" on it rather than showing the list as an answer.
 */
describe('a sentence that is not about food', () => {
  it('is reported as unread even though every outlet comes back', () => {
    const found = searchOutlets('mera phone charge karna hai', [], undefined, NOON);
    expect(found.unmatchedWords).toBe(true);
    expect(found.hits.length).toBe(outlets().length);
  });

  it('is not raised for a sentence that did read as food', () => {
    expect(searchOutlets('jain khana', [], undefined, NOON).unmatchedWords).toBe(false);
  });
});
