import { useEffect, useState } from 'react';
import type { LatLng } from '@saathi/shared';
import type { SavedHotel } from '../features/info/index.js';
import { clockSaysDubai, insideDubai, VIRTUAL_HERE } from './dubai.js';
import { askForLocation, currentLocation, watchLocation, type Location } from './location.js';

/**
 * Where "from" is, for the three pillars that measure distance: the phone's fix when it gives
 * one inside Dubai, the hotel's pin when it does not, BurJuman when there is no hotel either
 * and the phone is somewhere else in the world, and nothing only when location is refused and
 * no hotel is saved. The screen says which it is, because "650 m" from a hotel, from the kerb
 * and from a stand-in are different facts. The stand-in is what lets a traveller in Pune try
 * every screen before the flight (CLAUDE.md: the product is fully usable in India).
 */
export type HereFrom = 'phone' | 'hotel' | 'virtual' | 'none';

export interface Here {
  readonly at?: LatLng;
  readonly from: HereFrom;
  /** The phone was asked and refused. Only ever set by an actual refusal (CLAUDE.md). */
  readonly denied: boolean;
  /** Whether the phone has answered at all yet. */
  readonly settled: boolean;
}

function resolve(location: Location, hotel: SavedHotel | undefined, settled: boolean): Here {
  if (location.kind === 'here' && insideDubai(location.at)) {
    return { at: location.at, from: 'phone', denied: false, settled };
  }
  const denied = location.kind === 'denied';
  if (hotel?.pin) return { at: hotel.pin, from: 'hotel', denied, settled };
  // A fix that is not in Dubai is a traveller at home: show them Dubai from BurJuman.
  if (location.kind === 'here')
    return { at: VIRTUAL_HERE, from: 'virtual', denied: false, settled };
  /**
   * No fix yet, or none coming, and the phone's own clock is not Dubai's: the same stand-in,
   * decided without asking anyone anything. This is what stops the strip changing its mind —
   * it used to say "add your hotel" until a pillar happened to obtain a fix, then switch to
   * BurJuman, then forget again at the next launch.
   */
  if (!clockSaysDubai()) return { at: VIRTUAL_HERE, from: 'virtual', denied, settled };
  return { from: 'none', denied, settled };
}

/**
 * The same answer as `useHere`, for a screen that must never be the one that asks.
 *
 * The top strip is on every screen, including the first one a traveller ever opens. If it asked
 * for location, the phone's own prompt would arrive before any reason for it had been shown —
 * which is the one thing design rules 10 and 18 forbid. So it watches: it reports whatever answer
 * a pillar has already obtained, and reports nothing until one has.
 */
export function useKnownHere(hotel: SavedHotel | undefined): Here {
  const [location, setLocation] = useState<Location>(currentLocation);
  useEffect(() => watchLocation(setLocation), []);
  return resolve(location, hotel, location.kind !== 'unknown' && location.kind !== 'asking');
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
