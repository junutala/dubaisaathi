import { describe, expect, it } from 'vitest';
import { barOf, href, parseRoute, pillarOf } from './routes.js';

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
