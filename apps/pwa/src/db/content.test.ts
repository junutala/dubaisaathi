import { beforeEach, describe, expect, it } from 'vitest';
import { loadTransportPack, transportNetwork } from './content.js';
import { db } from './schema.js';
import { parseTransportPack } from '../features/transport/index.js';
import transportRaw from '../../../../data/transport/network.v1.json';

describe('the transport pack, offline', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('loads into the device and reads the whole graph back with no network', async () => {
    const pack = parseTransportPack(transportRaw);
    expect(await loadTransportPack(pack)).toBe('loaded');
    const network = await transportNetwork();
    expect(network?.nodes.length).toBe(pack.nodes.length);
    expect(network?.edges.length).toBe(pack.edges.length);
    // The fares and the walking speed come back with the stations they were priced for — a
    // journey planned from the device must not be priced from the bundle.
    expect(network?.fares.taxi.perKmAed).toBe(pack.fares.taxi.perKmAed);
    expect(network?.walkingMetresPerMinute).toBe(pack.walkingMetresPerMinute);
  });

  it('is idempotent, so booting twice does not duplicate the network', async () => {
    const pack = parseTransportPack(transportRaw);
    await loadTransportPack(pack);
    expect(await loadTransportPack(pack)).toBe('already-current');
    expect(await db.transportNodes.count()).toBe(pack.nodes.length);
  });

  it('has nothing to give before the pack is loaded, and says so rather than half a graph', async () => {
    expect(await transportNetwork()).toBeNull();
  });
});
