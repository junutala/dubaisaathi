import { useEffect, useState } from 'react';
import type { FieldReport } from '@saathi/shared';
import { collectorName } from './collector.js';
import { db } from './db.js';
import { advanceSerial, currentSerial } from './serial.js';
import { MENU, shrink } from './shrink.js';
import { useStrings } from './strings.js';
import { startSync, syncReports, type SyncOutcome } from './sync.js';

/**
 * The rider's screen (decision 029).
 *
 * A different person from the collector who fills the long form: a man on a motorcycle who
 * drops numbered paper at fifty counters in an afternoon and may read neither Hindi nor English
 * (the owner, 18 September). So this screen is built to be used without reading it.
 *
 * A number to copy and a tick. He types nothing at all: the number is chosen by the app and he
 * writes it into the box on the paper with the pen already in his hand. The coordinates are never
 * asked for either — the phone is watched from the moment the screen opens, and what is saved is
 * where he is standing when he presses the tick.
 *
 * **No photograph of the shop, ever** (the owner, 23 September): photographing shops in Dubai
 * draws the kind of attention nobody collecting menus should have to explain. **The menu's first
 * page is another matter** (the owner, 25 September, from three days of walking): when the
 * counter hands a menu over, one picture of its first page is taken here and travels with the
 * pin. When it is not — the menu was photographed on the phone's own camera, or downloaded from
 * the counter's QR — two ticks say which, so the desk knows where to look for it. None of the
 * three is required; the pin is.
 *
 * The number marries the pin to whatever else came back.
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

function toFix(position: GeolocationPosition): Fix {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracyM: position.coords.accuracy,
  };
}

/**
 * A reading taken at the moment of the tick, never one from the cache. The watch alone is not
 * enough: a phone that believes it has not moved does not report again, so on 23 September two
 * pairs of shops got one pin each — 0022 and 0023 from either side of a 100-foot road, 76 seconds
 * apart, to the seventh decimal. Null when the phone gives nothing in time, and the watched fix is
 * then what is saved, so the tick is never left dead.
 */
function freshFix(): Promise<Fix | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(toFix(position));
      },
      () => {
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 },
    );
  });
}

export function PinScreen({ onFillIn }: { readonly onFillIn?: (pinId: string) => void }) {
  const { t } = useStrings();
  const [serial, setSerial] = useState(currentSerial);
  const [fix, setFix] = useState<Fix | null>(null);
  const [queue, setQueue] = useState<SyncOutcome>({ pending: 0, sent: 0 });
  const [saved, setSaved] = useState<{ serial: string; id: string } | null>(null);
  const [taking, setTaking] = useState(false);
  /** The menu's first page, shrunk as it was picked. Optional: many counters do not hand one over. */
  const [firstPage, setFirstPage] = useState<Blob | null>(null);
  /**
   * A close picture of the WhatsApp number alone (the owner, Karama, 25 September): on a poor card
   * the number is unreadable in a picture of the whole page, and "WhatsApp us for the menu" is
   * what many counters say.
   */
  const [whatsapp, setWhatsapp] = useState<Blob | null>(null);
  const [photographed, setPhotographed] = useState(false);
  const [fromQr, setFromQr] = useState(false);
  /** Anything else the desk should know: "WhatsApp 050… for the menu" (the owner, 25 September). */
  const [note, setNote] = useState('');

  useEffect(() => startSync(setQueue), []);

  /**
   * Watched, not asked once: the fix that is saved must be the doorway he is standing in, not
   * the last shop's. A browser that claims no geolocation still gets the call — only the device
   * says no, and it says it after being asked.
   */
  useEffect(() => {
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        setFix(toFix(position));
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
    if (!ready || who === null || taking) return;
    setTaking(true);
    const fresh = await freshFix();
    setTaking(false);
    const at = fresh ?? fix;
    if (fresh !== null) setFix(fresh);
    const id = crypto.randomUUID();
    const pageId = `${id}-menu-0`;
    const whatsappId = `${id}-menu-whatsapp`;
    const pages = [
      ...(firstPage === null ? [] : [{ id: pageId, bytes: firstPage }]),
      ...(whatsapp === null ? [] : [{ id: whatsappId, bytes: whatsapp }]),
    ];
    // For review, not for the rider: where the menu is when it is not attached to this pin.
    const menuAt = [
      ...(photographed ? ['menu photographed on the collector’s phone'] : []),
      ...(fromQr ? ['menu downloaded from the counter’s QR'] : []),
      ...(whatsapp === null ? [] : ['WhatsApp number photographed (the last page on this pin)']),
      ...(note.trim() === '' ? [] : [note.trim()]),
    ].join('; ');

    /**
     * A thin report: a serial and a pin. No name, because the rider types nothing but digits —
     * the name is on the menu stapled to the paper, and review reads it there. Nothing is invented
     * to fill a field: an empty name is honest about what was captured.
     */
    const report: FieldReport = {
      id,
      kind: 'restaurant',
      collectorId: who,
      capturedAt: new Date().toISOString(),
      location: { lat: at.lat, lng: at.lng },
      name: '',
      formSerial: serial,
      frontPhotoIds: [],
      menuPhotoIds: pages.map((page) => page.id),
      ...(menuAt === '' ? {} : { notes: menuAt }),
      status: 'queued',
    };

    await db.transaction('rw', db.reports, db.photos, async () => {
      await db.reports.add({ ...report, uploaded: false });
      for (const page of pages) {
        await db.photos.add({ id: page.id, reportId: id, kind: 'menu', bytes: page.bytes });
      }
    });

    setFirstPage(null);
    setWhatsapp(null);
    setPhotographed(false);
    setFromQr(false);
    setNote('');

    setSaved({ serial, id });
    setSerial(advanceSerial());
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

      {/* The number to write on the form, and the only reason to look at this screen. Nothing to
          type: he copies it into the printed box. */}
      <div className="pin-serial">
        <span className="pin-label">फ़ॉर्म नं. · FORM NO.</span>
        <output className="pin-number">{serial}</output>
      </div>

      {/* How the menu came back, in glyphs: a camera for its first page, two ticks for a menu that
          is elsewhere, and a camera held close to the WhatsApp number. All optional — the tick
          below never waits on them. */}
      <div className="pin-menu">
        <label className={firstPage === null ? 'pin-menu-opt' : 'pin-menu-opt pin-menu-on'}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
            <circle cx="12" cy="13" r="3.4" />
          </svg>
          <span>{t('pinFirstPage')}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file === undefined) return;
              void shrink(file, MENU).then(setFirstPage);
            }}
          />
        </label>
        <button
          type="button"
          aria-pressed={photographed}
          className={photographed ? 'pin-menu-opt pin-menu-on' : 'pin-menu-opt'}
          onClick={() => {
            setPhotographed(!photographed);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="16" height="16" rx="2.5" />
            <path d="M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18" />
            <circle cx="15.5" cy="8.5" r="1.5" />
          </svg>
          <span>{t('pinPhotographed')}</span>
        </button>
        <button
          type="button"
          aria-pressed={fromQr}
          className={fromQr ? 'pin-menu-opt pin-menu-on' : 'pin-menu-opt'}
          onClick={() => {
            setFromQr(!fromQr);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <path d="M14 14h2v2h-2zM18 14h2M14 18v2h2M18 18h2v2" />
          </svg>
          <span>{t('pinFromQr')}</span>
        </button>
        <label className={whatsapp === null ? 'pin-menu-opt' : 'pin-menu-opt pin-menu-on'}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 19l1.2-3.6A7.5 7.5 0 1 1 9 18.3z" />
            <path d="M9.3 9.2c0 2.9 2.6 5.5 5.5 5.5l.9-1.4-1.8-.9-.8.8a4 4 0 0 1-2.3-2.3l.8-.8-.9-1.8z" />
          </svg>
          <span>{t('pinWhatsapp')}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file === undefined) return;
              void shrink(file, MENU).then(setWhatsapp);
            }}
          />
        </label>
      </div>
      {/* Optional, and the one place he types: what the counter said about the menu — "send a
          WhatsApp to 050… and we will send it". It reaches review with the pin. */}
      <textarea
        className="pin-note"
        rows={2}
        value={note}
        placeholder={t('pinNote')}
        aria-label={t('pinNote')}
        onChange={(e) => {
          setNote(e.target.value);
        }}
      />

      <button
        type="button"
        className="pin-done-btn"
        disabled={!ready || taking}
        onClick={() => void save()}
      >
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
