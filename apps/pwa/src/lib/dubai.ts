import type { LatLng } from '@saathi/shared';

/**
 * Where Dubai is, for the one question three pillars and the pass all ask: is this reading in
 * it? A traveller trying the app in Pune is not in it, and the honest answer there is not a
 * 1,900 km taxi fare but a stand-in: the hotel they have saved, or failing that BurJuman, the
 * interchange in the middle of the districts our travellers stay in. The screen says which.
 */

/** Dubai emirate, generously. Being generous here costs nothing; being tight strands arrivals. */
export const DUBAI = { lat: 25.2, lng: 55.27 } as const;
const RADIUS_KM = 80;

/** Where "here" is when the phone is outside Dubai and no hotel is saved: BurJuman. */
export const VIRTUAL_HERE: LatLng = { lat: 25.2551, lng: 55.3041 };
export const VIRTUAL_HERE_NAME = { hi: 'बुरजुमान', en: 'BurJuman' } as const;

export function distanceKm(a: LatLng, b: LatLng): number {
  const radians = Math.PI / 180;
  const earthKm = 6371;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function insideDubai(at: LatLng): boolean {
  return distanceKm(at, DUBAI) <= RADIUS_KM;
}

/** Dubai's own zone. A phone anywhere in the UAE reports this one. */
const DUBAI_ZONE = 'Asia/Dubai';

/**
 * Whether the phone's own clock puts it in Dubai — asked because the alternative was worse.
 *
 * The strip must never ask for location (design rules 10 and 18: the reason comes before the
 * prompt, and the strip is on the first screen a traveller ever sees). So until some pillar had
 * asked, the strip knew nothing and offered to save a hotel; the moment खाना or जाना got a fix
 * from India it became the BurJuman stand-in, and at the next cold launch it was back to asking
 * for a hotel. The owner called it erratic, and it was: the row's identity depended on invisible
 * history rather than on anything he had done.
 *
 * A time zone is free, offline, needs no permission and is right almost always — a phone in
 * Kochi says Asia/Kolkata, a phone in Deira says Asia/Dubai. It decides only what the screen
 * *says* while nothing better is known; a real fix always overrules it, and the trial clock
 * never reads it (that still takes repeated readings inside Dubai, decision 006).
 */
export function clockSaysDubai(): boolean {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === DUBAI_ZONE;
  } catch {
    // An engine that cannot say is not an engine that says no: assume nothing, ask nothing.
    return true;
  }
}
