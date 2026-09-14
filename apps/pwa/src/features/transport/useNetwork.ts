import { useEffect, useState } from 'react';
import { transportNetwork } from '../../db/content.js';
import { parseTransportPack, type TransportNetwork } from './network.js';
import shipped from '../../../../../data/transport/network.v1.json';

/**
 * The graph, once per session.
 *
 * It is read from IndexedDB, where the pack is loaded on boot, so a content update replaces the
 * stations without a new build. The copy that ships in the bundle is the fallback for the one
 * moment IndexedDB cannot answer — the first launch, before the pack has finished loading, and
 * a browser that refuses a database. It is the same file, so the two cannot disagree; what it
 * buys is that a traveller who opens रास्ता in the first second gets a route rather than a
 * spinner, which is the whole promise of rule 1.
 */
let pending: Promise<TransportNetwork> | null = null;

export function loadNetwork(): Promise<TransportNetwork> {
  pending ??= transportNetwork()
    .then((stored) => stored ?? parseTransportPack(shipped))
    .catch(() => parseTransportPack(shipped));
  return pending;
}

export function useTransportNetwork(): TransportNetwork | null {
  const [network, setNetwork] = useState<TransportNetwork | null>(null);
  useEffect(() => {
    let live = true;
    void loadNetwork().then((loaded) => {
      if (live) setNetwork(loaded);
    });
    return () => {
      live = false;
    };
  }, []);
  return network;
}
