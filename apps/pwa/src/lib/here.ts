import { useEffect, useState } from 'react';
import type { LatLng } from '@saathi/shared';
import type { SavedHotel } from '../features/info/index.js';
import { askForLocation, currentLocation, type Location } from './location.js';

/**
 * Where "from" is, for the three pillars that measure distance: the phone's fix when it gives
 * one, the hotel's pin when it does not, and nothing when neither exists. The screen says which
 * of the three it is, because "650 m" from a hotel and from the kerb are different facts.
 */
export interface Here {
  readonly at?: LatLng;
  readonly from: 'phone' | 'hotel' | 'none';
  /** The phone was asked and refused. Only ever set by an actual refusal (CLAUDE.md). */
  readonly denied: boolean;
  /** Whether the phone has answered at all yet. */
  readonly settled: boolean;
}

function resolve(location: Location, hotel: SavedHotel | undefined, settled: boolean): Here {
  if (location.kind === 'here') return { at: location.at, from: 'phone', denied: false, settled };
  const denied = location.kind === 'denied';
  if (hotel?.pin) return { at: hotel.pin, from: 'hotel', denied, settled };
  return { from: 'none', denied, settled };
}

export function useHere(hotel: SavedHotel | undefined): Here {
  const [location, setLocation] = useState<Location>(currentLocation);
  const [settled, setSettled] = useState(() => currentLocation().kind !== 'unknown');

  useEffect(() => {
    let live = true;
    void askForLocation().then((answer) => {
      if (!live) return;
      setLocation(answer);
      setSettled(true);
    });
    return () => {
      live = false;
    };
  }, []);

  return resolve(location, hotel, settled);
}
