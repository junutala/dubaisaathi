import { useEffect, useState } from 'react';
import { db } from './db.js';
import { MenuCamera } from './MenuCamera.js';
import {
  fetchList,
  findForm,
  firstPage,
  keptList,
  metresBetween,
  PAGE_SENT,
  sendPages,
  serverPages,
  type WantedForm,
} from './menusWanted.js';
import { isPdf, pdfPages } from './pdfPages.js';
import { MENU, shrink } from './shrink.js';
import { useStrings } from './strings.js';

/**
 * Menus wanted (the owner, 27 September): "I only need those outlets that have NO MENU in our
 * app". Every pinned form without one, in number order; tap one, photograph its pages or add the
 * PDF the counter's QR gave, and they land on that form. Nothing to name, no second pin.
 *
 * The list is for matching a paper menu in the hand to its form — "which shop is 30 and not 29 or
 * 31" — so each form carries its own name and its own first picture, the cover he took at the
 * counter. A form with neither has its note, when it was pinned and the pin in a map.
 */

interface Here {
  readonly lat: number;
  readonly lng: number;
}

/** The same ceiling as a pin's own pages: a camera left firing cannot fill the phone's queue. */
const MENU_PAGES = 40;

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
  /** A form opened by its number rather than from the list (the owner, 30 September). */
  const [byNumber, setByNumber] = useState<WantedForm | null>(null);
  const [typed, setTyped] = useState('');
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);

  const openByNumber = async () => {
    if (typed.trim() === '' || looking) return;
    setLooking(true);
    setNotFound(null);
    try {
      const form = await findForm(typed);
      if (form === null) setNotFound(t('wantedNoSuch', { serial: typed.trim() }));
      else setByNumber(form);
    } catch {
      setNotFound(t('wantedStale'));
    }
    setLooking(false);
  };

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

  const chosen = byNumber ?? forms.find((form) => form.formSerial === open);
  if (chosen !== undefined) {
    return (
      <WantedFormScreen
        form={chosen}
        here={here}
        onBack={() => {
          setOpen(null);
          setByNumber(null);
          setTyped('');
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
      {/* Any form by the number on its paper, whether the list carries it or not: a form whose
          only picture was its cover had dropped off the list with no way back to it. */}
      <form
        className="wanted-find"
        onSubmit={(e) => {
          e.preventDefault();
          void openByNumber();
        }}
      >
        <input
          inputMode="numeric"
          value={typed}
          placeholder={t('wantedFindHint')}
          aria-label={t('wantedFindHint')}
          onChange={(e) => {
            setTyped(e.target.value);
            setNotFound(null);
          }}
        />
        <button type="submit" disabled={typed.trim() === '' || looking}>
          {t('wantedFind')}
        </button>
      </form>
      {notFound !== null && <p className="wanted-stale">{notFound}</p>}
      {stale && <p className="wanted-stale">{t('wantedStale')}</p>}
      {forms.length === 0 && !stale && <p className="wanted-stale">{t('wantedNone')}</p>}
      <ul className="wanted-list">
        {forms.map((form) => (
          <li key={form.formSerial}>
            <button
              type="button"
              className="wanted-row"
              onClick={() => {
                setOpen(form.formSerial);
              }}
            >
              <b className="wanted-serial">{form.formSerial}</b>
              {(form.picture || (form.cover ?? null) !== null) && (
                <Cover serial={form.formSerial} src={form.cover} className="wanted-thumb" />
              )}
              <span className="wanted-row-text">
                <b>{form.name ?? '—'}</b>
                {form.notes !== null && form.notes.trim() !== '' && (
                  <span className="wanted-note">“{form.notes}”</span>
                )}
                <small>{t('wantedPinned', { when: WHEN.format(new Date(form.capturedAt)) })}</small>
              </span>
              {here !== null && <span className="wanted-away">{metresBetween(here, form)} m</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The form's own first picture: the cover taken at the counter — in its own slot since 30
 * September, and the menu's first page before that.
 */
function Cover({
  serial,
  src: given,
  className,
}: {
  readonly serial: string;
  readonly src?: string | null | undefined;
  readonly className: string;
}) {
  const [src, setSrc] = useState<string | null>(given ?? null);
  useEffect(() => {
    if ((given ?? null) !== null) return;
    let url: string | null = null;
    void firstPage(serial).then((got) => {
      url = got;
      setSrc(got);
    });
    return () => {
      if (url !== null) URL.revokeObjectURL(url);
    };
  }, [serial, given]);
  return src === null ? (
    <span className={`${className} wanted-blank`} />
  ) : (
    <img className={className} src={src} alt="" />
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
  /** What the server itself says it holds for this form: the only number called "on the server". */
  const [onServer, setOnServer] = useState<number | null | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);

  const count = async () => {
    setReady(await db.wantedPages.where('formSerial').equals(form.formSerial).count());
  };
  const recount = async () => {
    await count();
    setOnServer(await serverPages(form.formSerial));
  };
  useEffect(() => {
    void recount();
    // A page sent from anywhere — this button, or the queue going out when the signal returns —
    // changes both numbers, so both are asked again.
    const sent = (event: Event) => {
      if ((event as CustomEvent<string>).detail === form.formSerial) void recount();
    };
    const back = () => {
      void recount();
    };
    window.addEventListener(PAGE_SENT, sent);
    window.addEventListener('online', back);
    return () => {
      window.removeEventListener(PAGE_SENT, sent);
      window.removeEventListener('online', back);
    };
  }, [form.formSerial]);

  const send = async () => {
    setSending(true);
    const outcome = await sendPages(form.formSerial);
    setSending(false);
    setSaid(outcome.ok ? null : t('wantedNotSent', { why: outcome.why }));
    await recount();
  };

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
    // Straight to the server (the owner, 27 September): no Send step between one page and the next.
    await send();
  };

  if (camera) {
    return (
      <MenuCamera
        taken={(onServer ?? 0) + ready}
        max={MENU_PAGES}
        onShot={(page) => {
          // Each page goes to the server as it is taken, as the Camera button's always did.
          void Promise.resolve(page).then((ready) => keep([ready]));
        }}
        onClose={() => {
          setCamera(false);
        }}
      />
    );
  }

  return (
    <div className="wanted">
      <button type="button" className="wanted-back" onClick={onBack}>
        ‹ {t('wantedBack')}
      </button>
      <div className="pin-serial">
        <span className="pin-label">फ़ॉर्म नं. · FORM NO.</span>
        <output className="pin-number">{form.formSerial}</output>
      </div>
      {form.name !== null && <h2 className="wanted-name">{form.name}</h2>}
      <div className="wanted-add">
        <button
          type="button"
          className={ready > 0 ? 'pin-menu-opt pin-menu-on' : 'pin-menu-opt'}
          onClick={() => {
            setCamera(true);
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
            <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
            <circle cx="12" cy="13" r="3.4" />
          </svg>
          <span>{t('wantedTake')}</span>
        </button>
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

      {said !== null && <p className="wanted-stale">{said}</p>}
      <p className="wanted-said">
        {onServer === undefined
          ? t('wantedAsking')
          : onServer === null
            ? t('wantedNoCount')
            : t('wantedOnServer', { serial: form.formSerial, n: onServer })}
      </p>
      {sending && <p className="wanted-facts">{t('wantedSending')}</p>}
      {ready > 0 && !sending && (
        <>
          <p className="wanted-facts">{t('wantedReady', { n: ready })}</p>
          <button type="button" className="wanted-send" onClick={() => void send()}>
            {t('wantedSend')}
          </button>
        </>
      )}

      {(form.picture || (form.cover ?? null) !== null) && (
        <Cover serial={form.formSerial} src={form.cover} className="wanted-cover" />
      )}
      <p className="wanted-facts">
        {t('wantedPinned', { when: WHEN.format(new Date(form.capturedAt)) })}
        {here !== null && ` · ${String(metresBetween(here, form))} m`}
        {form.notes !== null && form.notes.trim() !== '' && (
          <span className="wanted-note">“{form.notes}”</span>
        )}
        {form.wanted !== null && (
          <>
            <br />
            {t('wantedStill', { what: form.wanted })}
          </>
        )}
      </p>
      <a
        className="wanted-maps"
        href={`https://www.google.com/maps/search/?api=1&query=${String(form.lat)},${String(form.lng)}`}
        target="_blank"
        rel="noreferrer"
      >
        {t('wantedMaps')}
      </a>
    </div>
  );
}
