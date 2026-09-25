import { describe, expect, it } from 'vitest';
import type { LatLng } from '@saathi/shared';
import { routeShape } from './routeShape.js';

const HOTEL: LatLng = { lat: 25.2637, lng: 55.3197 };
const KITCHEN: LatLng = { lat: 25.2605, lng: 55.2976 };
const STOPS: Readonly<Record<string, LatLng>> = {
  origin: HOTEL,
  destination: KITCHEN,
  'al-rigga': { lat: 25.2638, lng: 55.3238 },
  union: { lat: 25.2663, lng: 55.3142 },
  burjuman: { lat: 25.2549, lng: 55.3043 },
};

describe('routeShape', () => {
  it('draws a metro journey through every stop it passes, the walks dashed', () => {
    const shape = routeShape(
      [
        { mode: 'walk', path: ['origin', 'al-rigga'] },
        { mode: 'metro', line: 'red', path: ['al-rigga', 'union', 'burjuman'] },
        { mode: 'walk', path: ['burjuman', 'destination'] },
      ],
      HOTEL,
      KITCHEN,
      (id) => STOPS[id],
    );
    expect(shape.legs.features).toHaveLength(3);
    const ride = shape.legs.features[1];
    expect(ride?.geometry.coordinates).toEqual([
      [55.3238, 25.2638],
      [55.3142, 25.2663],
      [55.3043, 25.2549],
    ]);
    expect(ride?.properties).toEqual({ colour: '#D7263D', dashed: false });
    expect(shape.legs.features[0]?.properties.dashed).toBe(true);
    // Two changes (onto the train, off it), plus the two ends.
    expect(shape.points.features.map((f) => f.properties.role)).toEqual([
      'change',
      'change',
      'start',
      'end',
    ]);
  });

  it('fits the map to the whole journey, not just its ends', () => {
    const shape = routeShape(
      [{ mode: 'metro', line: 'red', path: ['origin', 'union', 'burjuman', 'destination'] }],
      HOTEL,
      KITCHEN,
      (id) => STOPS[id],
    );
    expect(shape.bounds).toEqual([55.2976, 25.2549, 55.3197, 25.2663]);
  });

  it('leaves out a stop it cannot place rather than drawing it at 0,0', () => {
    const shape = routeShape(
      [{ mode: 'bus', line: '8', path: ['origin', 'nowhere', 'destination'] }],
      HOTEL,
      KITCHEN,
      (id) => STOPS[id],
    );
    expect(shape.legs.features[0]?.geometry.coordinates).toHaveLength(2);
    expect(shape.legs.features[0]?.properties.colour).toBe('#2563EB');
  });
});
