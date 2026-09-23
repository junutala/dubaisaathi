import { describe, expect, it } from 'vitest';
import shipped from '../../../../../data/transport/network.v1.json';
import { parseTransportPack } from './network.js';
import { nearestStops } from './nearestStops.js';

/** Against the RTA network the phone actually carries, not a fixture. */
const network = parseTransportPack(shipped);

describe('the stops nearest the hotel', () => {
  it('finds the metro station and the bus stop nearest a pin in Al Rigga', () => {
    // The owner's hotel pin, 23 September.
    const near = nearestStops(network.nodes, { lat: 25.2637, lng: 55.3197 });
    expect(near.metro?.node.name.en).toBe('Al Rigga');
    expect(near.metro?.km).toBeLessThan(0.6);
    expect(near.bus?.node.name.en).toBe('Ghurair City 1');
    expect(near.bus?.km).toBeLessThan(0.3);
  });

  it('never offers a tram stop as the metro', () => {
    // Dubai Marina, where the tram runs beside the metro.
    const near = nearestStops(network.nodes, { lat: 25.0805, lng: 55.1403 });
    expect(near.metro?.node.modes).toContain('metro');
  });

  it('has nothing to say with no network', () => {
    expect(nearestStops([], { lat: 25.2637, lng: 55.3197 })).toEqual({});
  });
});
