import { asDataUrl } from './dataUrl.js';
import { db } from './db.js';
import { ENDPOINT, outletHeaders } from './sync.js';

/**
 * The pins waiting for their paper (decision 029).
 *
 * A pin is a form number, the fix taken at the door and usually a photograph of the shop front.
 * It is what the form is filled in against, whether that happens on the spot — the owner carries
 * blank forms and fills one the moment he sees an Indian kitchen — or at a desk that night with
 * a stack of paper the rider brought back.
 *
 * Two sources, on purpose. The server holds what every phone has sent, which is how paper
 * collected by somebody else can be keyed in here. The phone holds what it has taken itself,
 * which is how a pin dropped ninety seconds ago in a basement with no signal is still the one
 * being filled in. The phone's own copy wins where both have a pin: it is never staler, and it
 * is there when the radio is not.
 */
export interface WaitingPin {
  readonly id: string;
  readonly formSerial: string;
  readonly lat: number;
  readonly lng: number;
  readonly capturedAt: string;
  readonly collector: string;
  /** A data URL, or null where the camera could not be raised. */
  readonly front: string | null;
}

async function fromServer(): Promise<readonly WaitingPin[]> {
  try {
    const response = await fetch(ENDPOINT, { headers: outletHeaders() });
    if (!response.ok) return [];
    const body = (await response.json()) as { pins?: WaitingPin[] };
    return body.pins ?? [];
  } catch {
    // No signal at the desk is not an error worth a red screen: what this phone took is still
    // in the list, and that is the common case for the person who took it.
    return [];
  }
}

/**
 * A photograph is a convenience here, never the pin. One that will not read — an old WebView, a
 * blob the browser handed back in a shape it will not take again — costs the picture and must
 * never cost the row, because the row is the fix and the number.
 */
async function frontage(bytes: Blob): Promise<string | null> {
  try {
    return await asDataUrl(bytes);
  } catch {
    return null;
  }
}

/** This phone's own pins: a serial written, and no kitchen kind yet, which is what unfilled means. */
async function fromThisPhone(): Promise<readonly WaitingPin[]> {
  const rows = await db.reports
    .filter((report) => typeof report.formSerial === 'string' && report.kitchen === undefined)
    .toArray();
  return Promise.all(
    rows.map(async (row) => {
      const shot = await db.photos
        .where('reportId')
        .equals(row.id)
        .filter((photo) => photo.kind === 'front')
        .first();
      return {
        id: row.id,
        formSerial: row.formSerial ?? '',
        lat: row.location.lat,
        lng: row.location.lng,
        capturedAt: row.capturedAt,
        collector: row.collectorId,
        front: shot === undefined ? null : await frontage(shot.bytes),
      };
    }),
  );
}

export async function waitingPins(): Promise<readonly WaitingPin[]> {
  const [mine, theirs] = await Promise.all([fromThisPhone(), fromServer()]);
  const byId = new Map(theirs.map((pin) => [pin.id, pin]));
  for (const pin of mine) byId.set(pin.id, pin);
  return [...byId.values()].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}
