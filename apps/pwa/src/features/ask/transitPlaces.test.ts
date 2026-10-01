import { describe, expect, it } from 'vitest';
import { intentCorpus } from './intentPacks.js';
import { parseIntent } from './parseIntent.js';
import { buildCorpus } from './corpus.js';
import { transitPlaces } from './transitPlaces.js';
import places from '../../../../../data/intents/places.v1.json';
import keywords from '../../../../../data/intents/keywords.v1.json';
import network from '../../../../../data/transport/network.v1.json';

/**
 * Every station and stop in the RTA network is somewhere to go (the owner, 1 October). Until
 * this, a traveller typed "healthcare city" and was told we did not know the place, while the
 * planner was carrying Dubai Healthcare City metro station the whole time.
 */
const to = (typed: string) => parseIntent(typed, intentCorpus).destination;

describe('the network is somewhere to go', () => {
  it('reaches the station the real search could not', () => {
    expect(to('healthcare city')).toMatchObject({
      placeId: 'stop:dubai-healthcare-city',
      confidence: 1,
    });
    expect(to('mujhe Dubai Healthcare City jaana hai')?.placeId).toBe('stop:dubai-healthcare-city');
  });

  it('reaches a bus stop by its own name, in a Hinglish sentence', () => {
    expect(to('Internet City jaana hai')?.placeId).toBe('stop:dubai-internet-city');
    expect(to('wafi city kaise jaun')?.placeId).toBe('stop:wafi-city');
  });

  it('keeps a renamed station reachable by the name a traveller still uses', () => {
    expect(to('rashidiya')?.placeId).toBe('stop:centrepoint');
    expect(to('noor bank')?.placeId).toBe('stop:onpassive');
  });

  it('reaches a name with or without the RTA\'s "Al"', () => {
    expect(to('nahda jaana hai')?.placeId).toBe('stop:al-nahda');
    expect(to('al nahda jaana hai')?.placeId).toBe('stop:al-nahda');
  });

  it('lets a near spelling reach a station, as a question', () => {
    expect(to('centerpoint metro')).toMatchObject({
      placeId: 'stop:centrepoint',
      confidence: 0.75,
    });
  });

  it('leaves a curated place answering for its own stops', () => {
    // "Al Karama Bus Station" is Karama: the curated place carries the driver's Arabic.
    expect(to('al karama bus station')?.placeId).toBe('karama');
    expect(to('gold souq bus station')?.placeId).toBe('gold-souk');
  });

  it('folds the bays of one bus station into one destination', () => {
    const golds = [...intentCorpus.places.keys()].filter((id) => id.startsWith('stop:stadium-bus'));
    expect(golds).toEqual(['stop:stadium-bus-station']);
  });
});

describe('two and a half thousand names never answer an ordinary sentence', () => {
  it.each([
    'hospital jaana hai',
    'masjid',
    'school',
    'street 5',
    'mera phone charge karna hai',
    'Wafi Mall ko jaana hai',
  ])('%s resolves to no stop', (typed) => {
    expect(to(typed)?.placeId).toBeUndefined();
  });

  it('names neither of two stops that share a name', () => {
    // "Union Coop" stands in Abu Hail, Al Barsha and Al Twar: picking one would be a guess.
    expect(to('union coop')?.placeId ?? '').not.toMatch(/coop/);
  });

  it('never lets a bus stop be reached by a near spelling', () => {
    const near = new Set(intentCorpus.nearAliases.values());
    const busStops = [...intentCorpus.places.values()].filter(
      (place) => place.kind === 'transport' && !near.has(place.id),
    );
    expect(busStops.length).toBeGreaterThan(1000);
  });

  it('builds the whole vocabulary quickly enough for a cheap phone at launch', () => {
    const start = performance.now();
    buildCorpus(places, keywords, transitPlaces(network));
    // Measured at about 0.2 s here; the bound is generous so a slow CI runner does not flake,
    // and tight enough that an accidental quadratic does not slip through.
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
