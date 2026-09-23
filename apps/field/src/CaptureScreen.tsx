import { useEffect, useRef, useState } from 'react';
import {
  AREAS,
  type AreaId,
  type ConfirmedDish,
  type FieldReport,
  type KitchenKind,
} from '@saathi/shared';
import { db, keepOurData } from './db.js';
import { collectorName, setCollectorName } from './collector.js';
import { waitingPins, type WaitingPin } from './pins.js';
import { Logo, Wordmark } from './Logo.js';
import { shrink, MENU } from './shrink.js';
import { isPdf, pdfPages } from './pdfPages.js';
import { BUILD } from './version.js';
import { readMenu } from './readMenu.js';
import type { Candidate } from './dishCandidates.js';
import { sendReport, startSync, syncReports, type SyncOutcome } from './sync.js';
import { setLang, useStrings, type Key } from './strings.js';

/**
 * One screen — the desk, where the paper the rider brought back is keyed in (decision 029).
 *
 * It is never filled in at the shop any more. The rider's own screen banked the fix and the
 * number at the door; this form starts by picking that number off the list, and the coordinates
 * ride along with it. So there is no GPS watch here and no frontage photograph: whoever is
 * sitting at the desk has a stapled form and a menu card in front of them, and the phone in
 * their hand may be a thousand miles from the kitchen.
 *
 * Three things are required and everything else is optional: the pin, the name on the board,
 * and what kind of kitchen it is. A partial report on a real outlet is worth far more than a
 * skipped one, and a long mandatory form is how you get six of them keyed in instead of
 * eighteen. The dishes and their prices still come from the camera rather than the keyboard.
 */

type Answer = 'yes' | 'on-request' | 'no' | null;

type DietKey = keyof NonNullable<FieldReport['dietary']>;

const DIET: readonly { key: DietKey; label: Key }[] = [
  { key: 'jain', label: 'jain' },
  { key: 'vrat', label: 'vrat' },
  { key: 'sattvik', label: 'sattvik' },
  { key: 'noOnionGarlic', label: 'noOnionGarlic' },
  { key: 'eggless', label: 'eggless' },
];

/** "18 Sep 14:20" — enough to tell one afternoon's forms from another's, in either language. */
function whenShort(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime())
    ? iso
    : at.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
}

const KITCHENS: readonly { value: KitchenKind; label: Key }[] = [
  { value: 'pure-veg', label: 'pureVeg' },
  { value: 'mixed', label: 'mixed' },
  { value: 'non-veg', label: 'nonVeg' },
];

const ANSWERS: readonly { value: 'yes' | 'on-request' | 'no'; label: Key }[] = [
  { value: 'yes', label: 'yes' },
  { value: 'on-request', label: 'onRequest' },
  { value: 'no', label: 'no' },
];

export function CaptureScreen({
  startWith = null,
  onStarted,
}: {
  /** A pin dropped moments ago on the other screen, to open on rather than make him find. */
  readonly startWith?: string | null;
  readonly onStarted?: () => void;
} = {}) {
  const { lang, t } = useStrings();
  const [who, setWho] = useState<string | null>(() => collectorName());

  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [area, setArea] = useState<AreaId | null>(null);
  const [areaOther, setAreaOther] = useState('');
  const [kitchen, setKitchen] = useState<KitchenKind | null>(null);
  // Blob rather than File: a photograph is shrunk the moment it is taken, so what sits in the
  // queue is what will be sent. A day's work then costs the phone's storage once, not twice.
  /**
   * The rider's pins waiting for their paper, and the one being completed (decision 029).
   *
   * The form has two sources of place now. A pin: the fix and the frontage were taken at the
   * door hours ago and this desk is filling in what was written on the form. Or the phone
   * itself, which is what a collector standing in the kitchen still uses.
   */
  const [pins, setPins] = useState<readonly WaitingPin[]>([]);
  const [pin, setPin] = useState<WaitingPin | null>(null);
  const [menu, setMenu] = useState<Blob[]>([]);
  /** A PDF being opened, or the reason one would not: a bare "would not open" cannot be fixed. */
  const [pdf, setPdf] = useState<{ readonly failed?: string } | null>(null);

  const [diet, setDiet] = useState<Record<string, Answer>>({});
  const [dishes, setDishes] = useState<ConfirmedDish[]>([]);
  // What the camera read off the menu, waiting for a person to say which of it is real.
  const [candidates, setCandidates] = useState<readonly Candidate[]>([]);
  const [reading, setReading] = useState<'no' | 'yes' | 'failed'>('no');
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('');

  const [opens, setOpens] = useState('');
  const [closes, setCloses] = useState('');
  const [open24, setOpen24] = useState(false);

  const [delivers, setDelivers] = useState<'yes' | 'no' | null>(null);
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState('');
  const [spokeTo, setSpokeTo] = useState('');
  const [notes, setNotes] = useState('');

  const [queue, setQueue] = useState<SyncOutcome>({ pending: 0, sent: 0 });
  const [saved, setSaved] = useState<string | null>(null);
  /** Save in flight, page by page; or why the server does not hold it yet. */
  const [sending, setSending] = useState<{ readonly done: number; readonly total: number } | null>(
    null,
  );
  const [notSent, setNotSent] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);
  /**
   * Menu files still being opened, and which form they were picked for. On 23 September a 24-page
   * PDF was still opening when 0002 was saved: 0002 went up with no pages, and the pages landed in
   * 0004 when they finished. Save waits for every file to open, and a file that finishes after its
   * form was saved is dropped — never added to the next one.
   */
  const [opening, setOpening] = useState(0);
  const formGen = useRef(0);

  useEffect(() => {
    void keepOurData();
    return startSync(setQueue);
  }, []);

  /** Asked once and again after every save, so a completed pin leaves the list. */
  useEffect(() => {
    if (who === null) return;
    void waitingPins().then(setPins);
  }, [who, saved]);

  /**
   * Walked in from the pin screen with a pin in hand: open on it. The list is this phone's own
   * pins as well as the server's, so the one he dropped ninety seconds ago is there whether or
   * not it has been uploaded yet — and if it somehow is not, he simply gets the picker.
   */
  useEffect(() => {
    if (startWith === null) return;
    const dropped = pins.find((one) => one.id === startWith);
    if (dropped === undefined) return;
    setPin(dropped);
    onStarted?.();
  }, [startWith, pins, onStarted]);

  /**
   * Every capture begins with a pin (the owner, 18 September): he carries blank forms wherever he
   * goes, so his own visits start at the door too, with a number and a fix taken standing there.
   * The place and the frontage came from whoever pinned it; what is left to fill is what the
   * paper says — whether that is done on the pavement a minute later or at a desk that night.
   */
  /**
   * The desk's whole job is the owner's sequence (23 September): pick the form number, the paper's
   * questions, the menu, submit. Only the number is required — the name, the kind of kitchen, the
   * dishes and the prices are read off the menu at review. An hour went on 0004 when the form asked
   * for those at the desk as well.
   */
  const ready = pin !== null && opening === 0 && sending === null;

  const submit = async () => {
    if (!ready || who === null) return;
    /**
     * Completing a pin writes back to the pin's own row — same id, so the server updates rather
     * than inserts, and the coordinates the rider took at the door are never re-sent or
     * re-derived. They were banked the moment he pressed the tick. `ready` already proves there
     * is a pin; TypeScript follows the alias, so there is no second check here.
     */
    const id = pin.id;
    const now = new Date().toISOString();

    const report: FieldReport = {
      id,
      kind: 'restaurant',
      collectorId: who,
      capturedAt: pin.capturedAt,
      location: { lat: pin.lat, lng: pin.lng },
      formSerial: pin.formSerial,
      name: name.trim(),
      keyedAt: now,
      ...(nameHi.trim() === '' ? {} : { nameHi: nameHi.trim() }),
      ...(area === null ? {} : { areaId: area }),
      ...(area !== null || areaOther.trim() === '' ? {} : { areaName: areaOther.trim() }),
      ...(phone.trim() === '' ? {} : { phone: phone.trim() }),
      ...(kitchen === null ? {} : { kitchen }),
      // Questions left blank are not answers: with none answered there is no dietary record at
      // all, rather than five "no"s nobody said.
      ...(Object.keys(diet).length === 0
        ? {}
        : {
            dietary: {
              jain: answerFor(diet.jain),
              vrat: answerFor(diet.vrat),
              sattvik: answerFor(diet.sattvik),
              noOnionGarlic: answerFor(diet.noOnionGarlic),
              eggless: answerFor(diet.eggless),
            },
          }),
      ...(dishes.length === 0 ? {} : { confirmedDishes: dishes }),
      ...(open24
        ? { hours: { open24: true }, hoursConfirmedAt: now }
        : opens !== '' && closes !== ''
          ? {
              hours: { everyDay: { opens, closes }, openLate: isLate(closes) },
              hoursConfirmedAt: now,
            }
          : {}),
      ...(delivers === null ? {} : { delivers }),
      ...(delivers === 'yes' && phone.trim() !== '' ? { deliveryPhone: phone.trim() } : {}),
      ...(price.trim() === '' ? {} : { priceForOneAed: Number(price) }),
      ...(spokeTo.trim() === '' ? {} : { spokeTo: spokeTo.trim() }),
      ...(notes.trim() === '' ? {} : { notes: notes.trim() }),
      // The pin's own frontage, where this phone is the one that took it: the photograph is
      // still in this queue, and a report that forgot its own pointer would leave it orphaned.
      frontPhotoIds: (await db.reports.get(id))?.frontPhotoIds ?? [],
      menuPhotoIds: menu.map((_, i) => `${id}-menu-${String(i)}`),
      status: 'queued',
    };

    await db.transaction('rw', db.reports, db.photos, async () => {
      await db.reports.put({ ...report, uploaded: false });
      // A form keyed again replaces its pages: the last attempt's are not this one's.
      await db.photos
        .where('reportId')
        .equals(id)
        .filter((photo) => photo.kind === 'menu')
        .delete();
      for (const [i, file] of menu.entries()) {
        // `put`: a form keyed a second time against the same number replaces its pages.
        await db.photos.put({
          id: `${id}-menu-${String(i)}`,
          reportId: id,
          kind: 'menu',
          bytes: file,
        });
      }
    });

    /**
     * The form stays on the screen until the server says it holds every page (the owner,
     * 23 September). Kept on the laptop either way, so a failure costs a press of Save, never
     * the keying.
     */
    setNotSent(null);
    setSending({ done: 0, total: menu.length });
    const sent = await sendReport({ ...report, uploaded: false }, (done, total) => {
      setSending({ done, total });
    });
    setSending(null);
    if (!sent.ok) {
      setNotSent(sent.why);
      return;
    }
    setSaved(t('savedOnServer', { serial: pin.formSerial, n: sent.pages }));
    clear();
    top.current?.scrollIntoView({ behavior: 'smooth' });
    void waitingPins().then(setPins);
    setQueue(await syncReports());
  };

  // The fix is not cleared: the phone keeps watching, and the next shop gets its own.
  const clear = () => {
    formGen.current += 1;
    setOpening(0);
    setPdf(null);
    setPin(null);
    setName('');
    setNameHi('');
    setArea(null);
    setAreaOther('');
    setKitchen(null);
    setMenu([]);
    setDiet({});
    setDishes([]);
    setCandidates([]);
    setReading('no');
    setDishName('');
    setDishPrice('');
    setOpens('');
    setCloses('');
    setOpen24(false);
    setDelivers(null);
    setPhone('');
    setPrice('');
    setSpokeTo('');
    setNotes('');
  };

  if (who === null) return <WhoAreYou onName={setWho} />;

  return (
    <div className="wrap" ref={top}>
      <header className="bar">
        {/* Which app this is, said plainly, with the mark. On 15 September outlet.saafarsaathi.in
            served the traveller's app because a repo-wide Railway config overrode the service's
            own Dockerfile, and nothing on the page said it was the wrong one. It is also the tool
            our own people hold in front of a shopkeeper while asking him questions, so it should
            look like it belongs to something. */}
        <span className="brand">
          <Logo size={26} />
          <span className="brand-text">
            <strong className="brand-name">
              <Wordmark name="Dubaisaathi" />
            </strong>
            <span className="brand-sub">
              {t('appSub')} · {who}
            </span>
          </span>
        </span>
        <span className="bar-right">
          <span className={queue.pending > 0 ? 'queue waiting' : 'queue'}>
            {queue.pending > 0 ? t('waiting', { n: queue.pending }) : t('allUploaded')}
          </span>
          <button
            type="button"
            className="lang"
            onClick={() => {
              setLang(lang === 'hi' ? 'en' : 'hi');
            }}
            aria-label={lang === 'hi' ? 'English' : 'हिंदी'}
          >
            {lang === 'hi' ? 'EN' : 'हिं'}
          </button>
        </span>
      </header>

      {saved !== null && <p className="saved">{saved}</p>}

      {/* Where this outlet is comes from one of two places (decision 029): a pin the rider
          dropped, or the phone under the collector's own feet. The picker is first because it
          decides what the rest of the form means. */}
      {pin === null ? (
        <Section title={t('pickPin')}>
          {pins.length === 0 ? (
            <p className="hint">{t('noPins')}</p>
          ) : (
            <>
              <p className="hint">{t('pinsWaiting', { n: pins.length })}</p>
              <div className="pin-list">
                {pins.map((one) => (
                  <button
                    key={one.id}
                    type="button"
                    className="pin-card"
                    onClick={() => {
                      setPin(one);
                    }}
                  >
                    {one.front === null ? (
                      <span className="pin-card-blank" aria-hidden="true" />
                    ) : (
                      <img className="pin-card-shot" src={one.front} alt="" />
                    )}
                    <span className="pin-card-serial">{one.formSerial}</span>
                    <span className="pin-card-when">{whenShort(one.capturedAt)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>
      ) : (
        <Section title={t('where')}>
          <div className="pin-chosen">
            {pin.front !== null && <img className="pin-card-shot" src={pin.front} alt="" />}
            <span className="pin-chosen-text">
              <strong>
                {t('fromPin', { serial: pin.formSerial, when: whenShort(pin.capturedAt) })}
              </strong>
              <span className="hint">{t('pinPlace', { when: whenShort(pin.capturedAt) })}</span>
            </span>
            <button
              type="button"
              className="lang"
              onClick={() => {
                setPin(null);
              }}
            >
              {t('changePin')}
            </button>
          </div>
        </Section>
      )}

      <Section title={t('askThem')}>
        {DIET.map((row) => (
          <div key={row.key} className="row">
            <span>{t(row.label)}</span>
            <div className="chips">
              {ANSWERS.map((answer) => (
                <button
                  key={answer.value}
                  type="button"
                  className={diet[row.key] === answer.value ? 'chip on' : 'chip'}
                  onClick={() => {
                    setDiet({ ...diet, [row.key]: answer.value });
                  }}
                >
                  {t(answer.label)}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="hint">{t('askPerson')}</p>
      </Section>

      <Section title={t('theMenu')}>
        {/* Straight-on and filling the frame is worth more to the reader than any setting: a menu
            shot at an angle loses whole lines. Said where the photo is taken, not in a manual. */}
        <p className="hint">{t('menuHint')}</p>
        <FilePick
          label={t('menuPhotos')}
          multiple
          onPick={(f) => {
            // Files in the order picked; a PDF becomes its pages, in its own order.
            const pdfs = f.filter(isPdf);
            const gen = formGen.current;
            const mine = () => gen === formGen.current;
            if (pdfs.length > 0) setPdf({});
            setOpening((n) => n + 1);
            void Promise.all(
              f.map((file) =>
                isPdf(file) ? pdfPages(file, MENU) : shrink(file, MENU).then((b) => [b]),
              ),
            ).then(
              (pages) => {
                if (!mine()) return;
                setMenu((was) => [...was, ...pages.flat()]);
                setPdf(null);
                setOpening((n) => n - 1);
              },
              (error: unknown) => {
                if (!mine()) return;
                const size = pdfs.map((file) => `${file.name}, ${kb(file.size)}`).join('; ');
                const why = error instanceof Error ? error.message : String(error);
                setPdf({ failed: `${size} — ${why}` });
                setOpening((n) => n - 1);
              },
            );
          }}
        />
        {pdf !== null && (
          <p className="hint">
            {pdf.failed === undefined
              ? t('menuPdfOpening')
              : t('menuPdfFailed', { why: pdf.failed })}
          </p>
        )}
        {menu.length > 0 && (
          <p className="hint">
            {t('menuCount', { n: menu.length, size: kb(menu.reduce((sum, m) => sum + m.size, 0)) })}
          </p>
        )}
      </Section>

      <button
        type="button"
        className="btn primary big"
        disabled={!ready}
        onClick={() => {
          void submit();
        }}
      >
        {sending !== null
          ? t('saveSending', { done: sending.done, total: sending.total })
          : ready
            ? t('save')
            : pin === null
              ? t('saveFirst')
              : t('saveOpening')}
      </button>
      {notSent !== null && <p className="hint warn">{t('saveNotSent', { why: notSent })}</p>}
      <p className="hint center">{t('savesFirst')}</p>

      {/* Everything review can read off the menu. Kept for a collector who knows it, never asked. */}
      <details className="more">
        <summary>{t('moreOptional')}</summary>
        <Section title={t('nameOnBoard')}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder={t('asWritten')}
          />
          <input
            value={nameHi}
            onChange={(e) => {
              setNameHi(e.target.value);
            }}
            placeholder={t('inHindi')}
            lang="hi"
          />
        </Section>

        <Section title={t('whichArea')}>
          <div className="chips">
            {AREAS.map((row) => (
              <button
                key={row.id}
                type="button"
                className={area === row.id ? 'chip on' : 'chip'}
                onClick={() => {
                  setArea(area === row.id ? null : row.id);
                  setAreaOther('');
                }}
              >
                {row.en}
              </button>
            ))}
          </div>
          {area === null && (
            <input
              value={areaOther}
              onChange={(e) => {
                setAreaOther(e.target.value);
              }}
              placeholder={t('somewhereElse')}
            />
          )}
          <p className="hint">{t('areaHint')}</p>
        </Section>

        <Section title={t('kitchenKind')}>
          <div className="chips">
            {KITCHENS.map((k) => (
              <button
                key={k.value}
                type="button"
                className={kitchen === k.value ? 'chip on' : 'chip'}
                onClick={() => {
                  setKitchen(k.value);
                }}
              >
                {t(k.label)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('dishesNamed')}>
          <div className="row">
            <input
              value={dishName}
              onChange={(e) => {
                setDishName(e.target.value);
              }}
              placeholder={t('dishExample')}
            />
            <input
              className="short"
              value={dishPrice}
              onChange={(e) => {
                setDishPrice(e.target.value);
              }}
              placeholder="AED"
              inputMode="decimal"
            />
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (dishName.trim() === '') return;
                const priceAed = Number(dishPrice);
                setDishes([
                  ...dishes,
                  {
                    name: { en: dishName.trim(), hi: dishName.trim(), aliases: [] },
                    tags: [],
                    ...(dishPrice.trim() !== '' && priceAed > 0 ? { priceAed } : {}),
                  },
                ]);
                setDishName('');
                setDishPrice('');
              }}
            >
              {t('add')}
            </button>
          </div>
          {dishes.length > 0 && (
            <div className="chips">
              {dishes.map((d) => (
                <button
                  key={d.name.en}
                  type="button"
                  className="chip on"
                  onClick={() => {
                    setDishes((was) => was.filter((x) => x.name.en !== d.name.en));
                  }}
                >
                  {d.name.en}
                  {d.priceAed === undefined ? '' : ` · ${String(d.priceAed)}`} ×
                </button>
              ))}
            </div>
          )}
          <p className="hint">{t('dishHint')}</p>
        </Section>

        <Section title={t('hours')}>
          <label className="check">
            <input
              type="checkbox"
              checked={open24}
              onChange={(e) => {
                setOpen24(e.target.checked);
              }}
            />
            {t('open24')}
          </label>
          {!open24 && (
            <div className="row">
              <input
                type="time"
                value={opens}
                onChange={(e) => {
                  setOpens(e.target.value);
                }}
              />
              <span>{t('to')}</span>
              <input
                type="time"
                value={closes}
                onChange={(e) => {
                  setCloses(e.target.value);
                }}
              />
            </div>
          )}
          <p className="hint">{t('hoursHint')}</p>
        </Section>

        <Section title={t('phoneDelivery')}>
          <input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
            }}
            placeholder={t('phoneOnBoard')}
            inputMode="tel"
          />
          <div className="chips">
            {(['yes', 'no'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={delivers === value ? 'chip on' : 'chip'}
                onClick={() => {
                  setDelivers(value);
                }}
              >
                {t(value)}
              </button>
            ))}
          </div>
          <p className="hint">{t('phoneHint')}</p>
        </Section>

        <Section title={t('theRest')}>
          <input
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
            }}
            placeholder={t('priceForOne')}
            inputMode="numeric"
          />
          <input
            value={spokeTo}
            onChange={(e) => {
              setSpokeTo(e.target.value);
            }}
            placeholder={t('spokeTo')}
          />
          {/*
          The camera does the typing; the collector does the knowing. Nothing here becomes a dish
          until it is tapped, because the person holding the phone is standing in front of the
          board and is the only one who can tell whether it says Sabudana or Sambudana. Read three
          days later, nobody can.
        */}
          {menu.length > 0 && (
            <button
              type="button"
              className="btn"
              disabled={reading === 'yes'}
              onClick={() => {
                setReading('yes');
                void readMenu(menu).then((found) => {
                  setCandidates(found.candidates);
                  setReading(found.failed ? 'failed' : 'no');
                });
              }}
            >
              {reading === 'yes' ? t('readingMenu') : t('readMenu')}
            </button>
          )}
          {reading === 'failed' && <p className="hint">{t('couldNotRead')}</p>}
          {candidates.length > 0 && (
            <>
              <p className="hint">{t('tapServed')}</p>
              <div className="chips">
                {candidates.map((candidate) => {
                  const on = dishes.some((d) => d.name.en === candidate.text);
                  return (
                    <button
                      key={candidate.text}
                      type="button"
                      className={on ? 'chip on' : 'chip'}
                      onClick={() => {
                        setDishes((was) =>
                          on
                            ? was.filter((d) => d.name.en !== candidate.text)
                            : [
                                ...was,
                                {
                                  name: { en: candidate.text, hi: candidate.text, aliases: [] },
                                  tags: [],
                                  // The price the camera read next to it, carried onto the grid.
                                  ...(candidate.priceAed === undefined
                                    ? {}
                                    : { priceAed: candidate.priceAed }),
                                },
                              ],
                        );
                      }}
                    >
                      {candidate.text}
                      {candidate.priceAed === undefined ? '' : ` · ${String(candidate.priceAed)}`}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
            placeholder={t('notes')}
            rows={3}
          />
        </Section>
      </details>
      {/* Which build this is, so "did my fix reach the phone?" is answerable by looking. */}
      <p className="build">{BUILD}</p>
    </div>
  );
}

function answerFor(value: Answer | undefined): boolean | 'on-request' {
  if (value === 'on-request') return 'on-request';
  return value === 'yes';
}

/** A kitchen that shuts at or after midnight, and before it reopens, is the 2am answer. */
function isLate(closes: string): boolean {
  const hour = Number(closes.slice(0, 2));
  return Number.isFinite(hour) && (hour < 6 || hour >= 23);
}

function Section({
  title,
  required,
  children,
}: {
  readonly title: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  const { t } = useStrings();
  return (
    <section className="sec">
      <h2>
        {title}
        {required === true && <span className="req">{t('needed')}</span>}
      </h2>
      {children}
    </section>
  );
}

/**
 * No `capture` attribute: on Android it opens the camera and hides the gallery, and the desk form
 * is filled after the walk from menu pages already photographed (the owner, 23 September).
 * Without it the phone offers both.
 */
function FilePick({
  label,
  multiple,
  onPick,
}: {
  readonly label: string;
  readonly multiple?: boolean;
  readonly onPick: (files: File[]) => void;
}) {
  return (
    <label className="btn file">
      {label}
      <input
        type="file"
        accept="image/*,application/pdf"
        multiple={multiple === true}
        onChange={(e) => {
          onPick([...(e.target.files ?? [])]);
        }}
      />
    </label>
  );
}

/** Asked once, on first open. Attribution, not a login. */
export function WhoAreYou({ onName }: { readonly onName: (name: string) => void }) {
  const { lang, t } = useStrings();
  const [value, setValue] = useState('');
  return (
    <div className="wrap">
      <h1 className="title">{t('whoTitle')}</h1>
      <p className="hint">{t('whoHint')}</p>
      <button
        type="button"
        className="lang"
        onClick={() => {
          setLang(lang === 'hi' ? 'en' : 'hi');
        }}
      >
        {lang === 'hi' ? 'English' : 'हिंदी में'}
      </button>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        placeholder={t('yourName')}
      />
      <button
        type="button"
        className="btn primary big"
        disabled={value.trim() === ''}
        onClick={() => {
          setCollectorName(value);
          onName(value.trim());
        }}
      >
        {t('start')}
      </button>
    </div>
  );
}

/** A size a person can read, so the saving is visible rather than claimed. */
function kb(value: Blob | number): string {
  const bytes = typeof value === 'number' ? value : value.size;
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${String(Math.round(bytes / 1024))} KB`;
}
