import { useEffect, useState } from 'react';
import type { LatLng } from '@saathi/shared';
import type { SavedHotel } from '../info/index.js';
import { insideDubai, VIRTUAL_HERE } from '../../lib/dubai.js';
import { askForLocation, type Location } from '../../lib/location.js';

/**
 * Where a journey starts: the phone's fix when it gives one inside Dubai, the hotel's pin when
 * it does not, and BurJuman otherwise — a traveller in Pune, a phone that said no, a laptop with
 * no GPS. जाना always plans a journey; it never stops to explain a permission (decision 058).
 * `abroad` is set only when the phone actually gave a fix somewhere else in the world.
 */
export type Origin =
  | { readonly kind: 'asking' }
  | { readonly kind: 'phone'; readonly at: LatLng }
  | { readonly kind: 'hotel'; readonly at: LatLng }
  | { readonly kind: 'virtual'; readonly at: LatLng; readonly abroad: boolean };

export function useOrigin(hotel: SavedHotel | undefined): Origin {
  const [location, setLocation] = useState<Location>({ kind: 'asking' });
  useEffect(() => {
    let live = true;
    void askForLocation().then((answer) => {
      if (live) setLocation(answer);
    });
    return () => {
      live = false;
    };
  }, []);

  if (location.kind === 'asking' || location.kind === 'unknown') return { kind: 'asking' };
  if (location.kind === 'here' && insideDubai(location.at))
    return { kind: 'phone', at: location.at };
  if (hotel?.pin) return { kind: 'hotel', at: hotel.pin };
  return { kind: 'virtual', at: VIRTUAL_HERE, abroad: location.kind === 'here' };
}
