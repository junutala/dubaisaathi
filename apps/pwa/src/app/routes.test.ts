import { describe, expect, it } from 'vitest';
import { barOf, campaignLanding, href, parseRoute, pillarOf } from './routes.js';

describe('घर.10 · नियम और शर्तें on the router (decision 048)', () => {
  it('reads #/terms and writes it back the same', () => {
    expect(parseRoute('#/terms')).toEqual({ screen: 'terms' });
    expect(href({ screen: 'terms' })).toBe('#/terms');
    expect(parseRoute(href({ screen: 'terms' }))).toEqual({ screen: 'terms' });
  });

  it('belongs to घर and lights none of the bar’s four places', () => {
    expect(pillarOf({ screen: 'terms' })).toBe('home');
    expect(barOf({ screen: 'terms' })).toBeUndefined();
  });
});

describe('2.7 · सवारी on the router (decision 051)', () => {
  const ride = {
    screen: 'ride',
    placeId: 'stop:dubai-healthcare-city',
    optionId: 'metro',
    line: 'red',
    direction: 0,
    from: 'burjuman',
    to: 'burj-khalifa-dubai-mall',
  } as const;

  it('carries the whole ride in the address and reads it back the same', () => {
    expect(parseRoute(href(ride))).toEqual(ride);
  });

  it('keeps a line with no direction, and a stop id with odd characters', () => {
    const noDirection = {
      screen: 'ride',
      placeId: ride.placeId,
      optionId: ride.optionId,
      line: 'X23',
      from: 's1:2',
      to: 'bus-gold-souq',
    } as const;
    expect(parseRoute(href(noDirection))).toEqual(noDirection);
  });

  it('falls back to जाना when the ride is not all there', () => {
    expect(parseRoute('#/ride/somewhere/metro~red')).toEqual({ screen: 'go' });
  });

  it('belongs to जाना', () => {
    expect(pillarOf(ride)).toBe('go');
  });
});

describe('an advertisement lands on its promise (decision 057)', () => {
  const app = 'https://dubai.saafarsaathi.in/';

  it('opens the vrat poster’s visitors on खाना with व्रत already on', () => {
    const url = new URL(`${app}?utm_source=meta&utm_campaign=khaana1&utm_content=gujarat`);
    expect(campaignLanding(url)).toEqual({ screen: 'food', diet: 'vrat' });
  });

  it('leaves everyone else, and any link that names a screen, where they were going', () => {
    expect(campaignLanding(new URL(`${app}?via=site`))).toBeNull();
    expect(campaignLanding(new URL(`${app}?utm_campaign=other`))).toBeNull();
    expect(campaignLanding(new URL(`${app}?utm_campaign=khaana1#/go`))).toBeNull();
    // Back on घर after landing, a reload stays on घर.
    expect(campaignLanding(new URL(`${app}?utm_campaign=khaana1#/`))).toBeNull();
  });

  it('reads and writes the khaana list with a chip on', () => {
    expect(href({ screen: 'food', diet: 'vrat' })).toBe('#/food-diet/vrat');
    expect(parseRoute('#/food-diet/vrat')).toEqual({ screen: 'food', diet: 'vrat' });
    expect(parseRoute('#/food-diet/pizza')).toEqual({ screen: 'food' });
    expect(pillarOf({ screen: 'food', diet: 'vrat' })).toBe('food');
  });
});
