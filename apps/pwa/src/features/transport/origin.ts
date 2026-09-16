import { useEffect, useState } from 'react';
import type { LatLng } from '@saathi/shared';
import type { SavedHotel } from '../info/index.js';
import { insideDubai, VIRTUAL_HERE } from '../../lib/dubai.js';
import { askForLocation, type Location } from '../../lib/location.js';

/**
 * Where a journey starts: the phone's fix when it gives one inside Dubai, the hotel's pin when
 * it does not, and BurJuman when the phone is somewhere else in the world and no hotel is
 * saved — a traveller in Pune planning the trip gets real journeys, not "outside Dubai". A
 * traveller planning tomorrow from the hotel room is the common case, and a phone that has
 * refused location still has a hotel to plan from.
 */
export type Origin =
  | { readonly kind: 'asking' }
  | { readonly kind: 'phone'; readonly at: LatLng }
  | { readonly kind: 'hotel'; readonly at: LatLng }
  | { readonly kind: 'virtual'; readonly at: LatLng }
  | { readonly kind: 'none'; readonly denied: boolean };

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
  if (location.kind === 'here') return { kind: 'virtual', at: VIRTUAL_HERE };
  return { kind: 'none', denied: location.kind === 'denied' };
}
