import { useEffect, useRef, useState } from 'react';
import type { FieldReport } from '@saathi/shared';
import { collectorName } from './collector.js';
import { db } from './db.js';
import { FRONT, shrink } from './shrink.js';
import { advanceSerial, currentSerial } from './serial.js';
import { useStrings } from './strings.js';
import { startSync, syncReports, type SyncOutcome } from './sync.js';

/**
 * The rider's screen (decision 029).
 *
 * A different person from the collector who fills the long form: a man on a motorcycle who
 * drops numbered paper at fifty counters in an afternoon and may read neither Hindi nor English
 * (the owner, 18 September). So this screen is built to be used without reading it.
 *
 * A number to copy, a camera and a tick. He types nothing at all: the number is chosen by the
 * app and he writes it into the box on the paper with the pen already in his hand. The
 * coordinates are never asked for either — the phone is watched from the moment the screen
 * opens, and what is saved is where he is standing when he presses the tick.
 *
 * **The photograph is optional** (the owner, 18 September): a policeman on the pavement or women
 * standing in the shopfront, and a man who would rather not raise his camera is a man stuck at a
 * screen that will not let him finish. It earns its place when it is there — it is what makes
 * the desk's picker a list of shopfronts rather than of bare numbers — but the pin is the thing
 * that matters, and the pin is the fix.
 *
 * The paper carries the five answers and a stapled takeaway menu. This carries the pin. The
 * number marries them at the desk.
 *
 * **Every capture starts here**, including the owner's own (18 September): he carries blank forms
 * and fills one the moment he sees an Indian kitchen, and he is standing at the door when he does
 * it — so the door is where the coordinates are taken, and the tick offers to carry straight on
 * into the long form with this pin already chosen. One flow, whether the rest is filled in on the
 * pavement or at a desk that night.
 */

interface Fix {
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM: number;
}

export function PinScreen({ onFillIn }: { readonly onFillIn?: (pinId: string) => void }) {
  const { t } = useStrings();
  const [serial, setSerial] = useState(currentSerial);
  const [front, setFront] = useState<Blob | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [queue, setQueue] = useState<SyncOutcome>({ pending: 0, sent: 0 });
  const [saved, setSaved] = useState<{ serial: string; id: string } | null>(null);
  const camera = useRef<HTMLInputElement>(null);

  useEffect(() => startSync(setQueue), []);

  /**
   * Watched, not asked once: the fix that is saved must be the doorway he is standing in, not
   * the last shop's. A browser that claims no geolocation still gets the call — only the device
   * says no, and it says it after being asked.
   */
  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        setFix({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        });
      },
      () => {
        setFix(null);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watch);
    };
  }, []);

  // The fix alone. A photograph is welcome and never required — see the note above.
  const ready = fix !== null;

  async function save() {
    const who = collectorName();
    if (!ready || who === null) return;
    const id = crypto.randomUUID();

    /**
     * A thin report: a serial, a pin and a frontage. No name, because the rider types nothing
     * but digits — the board is in the photograph and review reads it there. Nothing is invented
     * to fill a field: an empty name is honest about what was captured.
     */
    const report: FieldReport = {
      id,
      kind: 'restaurant',
      collectorId: who,
      capturedAt: new Date().toISOString(),
      location: { lat: fix.lat, lng: fix.lng },
      name: '',
      formSerial: serial,
      frontPhotoIds: front === null ? [] : [`${id}-front`],
      menuPhotoIds: [],
      status: 'queued',
    };

    await db.transaction('rw', db.reports, db.photos, async () => {
      await db.reports.add({ ...report, uploaded: false });
      if (front !== null) {
        await db.photos.add({ id: `${id}-front`, reportId: id, kind: 'front', bytes: front });
      }
    });

    setSaved({ serial, id });
    setSerial(advanceSerial());
    setFront(null);
    setQueue(await syncReports());
  }

  // The confirmation is the number in numerals and a tick, and it clears itself: at the fiftieth
  // shop nobody should have to dismiss anything. Four seconds rather than the old two and a half,
  // because it now carries a way on into the long form and a button nobody can reach in time is
  // not a way on at all.
  useEffect(() => {
    if (saved === null) return;
    const timer = window.setTimeout(() => {
      setSaved(null);
    }, 4000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [saved]);

  if (saved !== null) {
    const pinId = saved.id;
    return (
      <div className="pin-done">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        <p className="pin-done-serial">{saved.serial}</p>
        {/* For whoever has the paper in his hand as well as the phone — the owner, usually,
            standing at the door he has just pinned. It opens the long form on this pin, so the
            fix and the number are already joined and nothing is asked twice. A rider who only
            drops paper ignores it and the screen clears itself. */}
        {onFillIn !== undefined && (
          <button
            type="button"
            className="pin-fill"
            onClick={() => {
              onFillIn(pinId);
            }}
          >
            {t('fillItNow')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pin">
      <div className="pin-head">
        <span className={fix === null ? 'pin-gps pin-gps-off' : 'pin-gps'}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 21.5s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
            <circle cx="12" cy="10.5" r="2.4" />
          </svg>
          <b>{fix === null ? '…' : `${String(Math.round(fix.accuracyM))} m`}</b>
        </span>
        <span className={queue.pending > 0 ? 'pin-queue pin-queue-waiting' : 'pin-queue'}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V5" />
            <path d="M6 11l6-6 6 6" />
          </svg>
          <b>{queue.pending}</b>
        </span>
      </div>

      {/* The number to write on the form, and the only reason to look at this screen before
          the camera. Nothing to type: he copies it into the printed box. */}
      <div className="pin-serial">
        <span className="pin-label">फ़ॉर्म नं. · FORM NO.</span>
        <output className="pin-number">{serial}</output>
      </div>

      <button
        type="button"
        className={front === null ? 'pin-camera' : 'pin-camera pin-camera-got'}
        onClick={() => camera.current?.click()}
        aria-label={t('frontPhoto')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4z" />
          <circle cx="12" cy="13.5" r="3.2" />
        </svg>
        {front !== null && (
          <span className="pin-tick">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        )}
      </button>
      {/* The camera is opened by the button above; the input itself is never seen. `capture`
          asks Android for the camera rather than the gallery, and a phone that ignores it falls
          back to the picker, which still works. */}
      <input
        ref={camera}
        className="pin-file"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void shrink(file, FRONT).then(setFront);
          event.target.value = '';
        }}
      />

      <button type="button" className="pin-done-btn" disabled={!ready} onClick={() => void save()}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </button>
    </div>
  );
}
