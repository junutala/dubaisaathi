import { useEffect, useState } from 'react';
import { db } from './db.js';
import {
  fetchList,
  firstPage,
  keptList,
  metresBetween,
  nearestFirst,
  sendPages,
  type WantedForm,
} from './menusWanted.js';
import { isPdf, pdfPages } from './pdfPages.js';
import { MENU, shrink } from './shrink.js';
import { useStrings } from './strings.js';

/**
 * Menus wanted (the owner, 27 September): "I only need those outlets that have NO MENU in our
 * app". Every pinned form without one, nearest first; tap one, photograph its pages or add the PDF
 * the counter's QR gave, and they land on that form. Nothing to name, no second pin.
 *
 * Most of these forms have no picture of their own — that is why they are here — so a form is told
 * apart by its number, the note he wrote, when it was pinned, the shops pinned just before and
 * after it that do have a first page, and the pin itself in a map.
 */

interface Here {
  readonly lat: number;
  readonly lng: number;
}

const WHEN = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Dubai',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function MenusWanted() {
  const { t } = useStrings();
  const [forms, setForms] = useState<readonly WantedForm[]>(keptList);
  const [stale, setStale] = useState(false);
  const [here, setHere] = useState<Here | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const refresh = () => {
    fetchList().then(
      (list) => {
        setForms(list);
        setStale(false);
      },
      () => {
        setStale(true);
      },
    );
  };

  useEffect(() => {
    refresh();
    window.addEventListener('online', refresh);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lib.dom overstates support
    const watch = navigator.geolocation?.watchPosition(
      (position) => {
        setHere({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => {
      window.removeEventListener('online', refresh);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- as above
      if (watch !== undefined) navigator.geolocation?.clearWatch(watch);
    };
  }, []);

  const chosen = forms.find((form) => form.formSerial === open);
  if (chosen !== undefined) {
    return (
      <WantedFormScreen
        form={chosen}
        here={here}
        onBack={() => {
          setOpen(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="wanted">
      <h1 className="wanted-title">
        {t('wantedTitle')} · {forms.length}
      </h1>
      {stale && <p className="wanted-stale">{t('wantedStale')}</p>}
      {forms.length === 0 && !stale && <p className="wanted-stale">{t('wantedNone')}</p>}
      <ul className="wanted-list">
        {nearestFirst(forms, here).map((form) => (
          <li key={form.formSerial}>
            <button
              type="button"
              className="wanted-row"
              onClick={() => {
                setOpen(form.formSerial);
              }}
            >
              <b className="wanted-serial">{form.formSerial}</b>
              <span className="wanted-row-text">
                {form.wanted ??
                  form.notes ??
                  t('wantedPinned', { when: WHEN.format(new Date(form.capturedAt)) })}
              </span>
              {here !== null && <span className="wanted-away">{metresBetween(here, form)} m</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Neighbour({ serial, label }: { readonly serial: string; readonly label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    void firstPage(serial).then((got) => {
      url = got;
      setSrc(got);
    });
    return () => {
      if (url !== null) URL.revokeObjectURL(url);
    };
  }, [serial]);
  return (
    <figure className="wanted-shop">
      {src === null ? <div className="wanted-shop-blank" /> : <img src={src} alt={label} />}
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function WantedFormScreen({
  form,
  here,
  onBack,
}: {
  readonly form: WantedForm;
  readonly here: Here | null;
  readonly onBack: () => void;
}) {
  const { t } = useStrings();
  const [ready, setReady] = useState(0);
  const [sending, setSending] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  const count = async () => {
    setReady(await db.wantedPages.where('formSerial').equals(form.formSerial).count());
  };
  useEffect(() => {
    void count();
  });

  const keep = async (pages: readonly Blob[]) => {
    const base = Date.now();
    await db.wantedPages.bulkAdd(
      pages.map((bytes, i) => ({
        id: crypto.randomUUID(),
        formSerial: form.formSerial,
        bytes,
        takenAt: new Date(base + i).toISOString(),
      })),
    );
    setSaid(null);
    await count();
  };

  const removeLast = async () => {
    const pages = await db.wantedPages
      .where('formSerial')
      .equals(form.formSerial)
      .sortBy('takenAt');
    const last = pages.at(-1);
    if (last !== undefined) await db.wantedPages.delete(last.id);
    await count();
  };

  const send = async () => {
    setSending(true);
    const outcome = await sendPages(form.formSerial);
    setSending(false);
    setSaid(
      outcome.ok
        ? t('wantedSent', { serial: form.formSerial, n: outcome.pages })
        : t('wantedNotSent', { why: outcome.why }),
    );
    await count();
  };

  return (
    <div className="wanted">
      <button type="button" className="wanted-back" onClick={onBack}>
        ‹ {t('wantedBack')}
      </button>
      <div className="pin-serial">
        <span className="pin-label">फ़ॉर्म नं. · FORM NO.</span>
        <output className="pin-number">{form.formSerial}</output>
      </div>
      <p className="wanted-facts">
        {t('wantedPinned', { when: WHEN.format(new Date(form.capturedAt)) })}
        {here !== null && ` · ${String(metresBetween(here, form))} m`}
        {form.notes !== null && form.notes !== '' && (
          <>
            <br />“{form.notes}”
          </>
        )}
        {form.wanted !== null && (
          <>
            <br />
            {t('wantedStill', { what: form.wanted })}
          </>
        )}
      </p>
      {(form.before !== null || form.after !== null) && (
        <div className="wanted-shops">
          {form.before !== null && (
            <Neighbour serial={form.before} label={t('wantedBefore', { serial: form.before })} />
          )}
          {form.after !== null && (
            <Neighbour serial={form.after} label={t('wantedAfter', { serial: form.after })} />
          )}
        </div>
      )}
      <a
        className="wanted-maps"
        href={`https://www.google.com/maps/search/?api=1&query=${String(form.lat)},${String(form.lng)}`}
        target="_blank"
        rel="noreferrer"
      >
        {t('wantedMaps')}
      </a>

      <div className="pin-menu">
        <label className={ready > 0 ? 'pin-menu-opt pin-menu-on' : 'pin-menu-opt'}>
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
          <span>{t('wantedTake')}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Cleared so the camera opens again at once for the next page.
              e.target.value = '';
              if (file === undefined) return;
              void shrink(file, MENU).then((page) => keep([page]));
            }}
          />
        </label>
        <label className="pin-menu-opt">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 3.5h7.5L18.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z" />
            <path d="M13.5 3.5v5h5" />
          </svg>
          <span>{t('wantedFile')}</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = '';
              void (async () => {
                for (const file of files) {
                  await keep(isPdf(file) ? await pdfPages(file, MENU) : [await shrink(file, MENU)]);
                }
              })();
            }}
          />
        </label>
      </div>

      {ready > 0 && (
        <>
          <p className="wanted-facts">{t('wantedReady', { n: ready })}</p>
          <button type="button" className="pin-menu-undo" onClick={() => void removeLast()}>
            {t('pinMenuUndo')}
          </button>
          <button
            type="button"
            className="wanted-send"
            disabled={sending}
            onClick={() => void send()}
          >
            {t('wantedSend')}
          </button>
        </>
      )}
      {said !== null && <p className="wanted-said">{said}</p>}
    </div>
  );
}
