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
import { shrink, FRONT, MENU } from './shrink.js';
import { BUILD } from './version.js';
import { readMenu } from './readMenu.js';
import type { Candidate } from './dishCandidates.js';
import { startSync, syncReports, type SyncOutcome } from './sync.js';
import { setLang, useStrings, type Key } from './strings.js';

/**
 * One screen, because a collector standing in a shop should never be navigating.
 *
 * Four things are required and everything else is optional: where it is, the name on the board,
 * a photograph of the front, and what kind of kitchen it is. A partial report on a real outlet
 * is worth far more than a skipped one, and a long mandatory form is how you get six visits a
 * day instead of eighteen.
 *
 * Nothing is typed that can be captured. The location comes from the phone on its own — the
 * form watches the GPS from the moment it opens and saves the fix the collector is standing on
 * when they press save, so there is no button to forget — the menu comes from the camera, and
 * the address is never asked for at all.
 */

/** A GPS reading, with how good it was and when, so the screen can say so. */
interface Fix {
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM: number;
  readonly at: number;
}

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

export function CaptureScreen() {
  const { lang, t } = useStrings();
  const [who, setWho] = useState<string | null>(() => collectorName());
  const [fix, setFix] = useState<Fix | null>(null);
  const [fixTrouble, setFixTrouble] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [area, setArea] = useState<AreaId | null>(null);
  const [areaOther, setAreaOther] = useState('');
  const [kitchen, setKitchen] = useState<KitchenKind | null>(null);
  // Blob rather than File: a photograph is shrunk the moment it is taken, so what sits in the
  // queue is what will be sent. A day's work then costs the phone's storage once, not twice.
  const [front, setFront] = useState<Blob | null>(null);
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
  const top = useRef<HTMLDivElement>(null);

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
   * The phone is asked the moment there is a collector, and kept asked: a watch rather than one
   * reading, so the fix saved is where they are standing when they press save, not where they
   * were when they opened the form outside the previous shop. A browser that reports no
   * geolocation still gets the call, because only the device gets to say no and it says it
   * after being asked — the rule this project paid a day for.
   */
  useEffect(() => {
    if (who === null) return;
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        setFix({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
          at: Date.now(),
        });
        setFixTrouble(null);
      },
      (error) => {
        setFixTrouble(error.message || t('noLocation'));
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watch);
    };
    // The language is read once here, on error; the watch does not restart for a word.
  }, [who, t]);

  /**
   * A pin already carries the place and the frontage, so completing one needs neither the phone's
   * fix nor a photograph — only what was written on the paper. A capture on the spot needs both.
   */
  const ready =
    name.trim() !== '' && kitchen !== null && (pin !== null || (fix !== null && front !== null));

  const submit = async () => {
    if (!ready || who === null) return;
    /**
     * Completing a pin writes back to the pin's own row — same id, so the server updates rather
     * than inserts, and the coordinates the rider took at the door are never re-sent or
     * re-derived. They were banked the moment he pressed the tick.
     */
    const id = pin?.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const where = pin ?? fix;
    if (where === null) return;

    const report: FieldReport = {
      id,
      kind: 'restaurant',
      collectorId: who,
      capturedAt: pin?.capturedAt ?? now,
      location: { lat: where.lat, lng: where.lng },
      ...(pin === null ? {} : { formSerial: pin.formSerial }),
      name: name.trim(),
      ...(nameHi.trim() === '' ? {} : { nameHi: nameHi.trim() }),
      ...(area === null ? {} : { areaId: area }),
      ...(area !== null || areaOther.trim() === '' ? {} : { areaName: areaOther.trim() }),
      ...(phone.trim() === '' ? {} : { phone: phone.trim() }),
      kitchen,
      dietary: {
        jain: answerFor(diet.jain),
        vrat: answerFor(diet.vrat),
        sattvik: answerFor(diet.sattvik),
        noOnionGarlic: answerFor(diet.noOnionGarlic),
        eggless: answerFor(diet.eggless),
      },
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
      frontPhotoIds: front === null ? [] : [`${id}-front`],
      menuPhotoIds: menu.map((_, i) => `${id}-menu-${String(i)}`),
      status: 'queued',
    };

    await db.transaction('rw', db.reports, db.photos, async () => {
      await db.reports.put({ ...report, uploaded: false });
      if (front !== null) {
        await db.photos.add({ id: `${id}-front`, reportId: id, kind: 'front', bytes: front });
      }
      for (const [i, file] of menu.entries()) {
        await db.photos.add({
          id: `${id}-menu-${String(i)}`,
          reportId: id,
          kind: 'menu',
          bytes: file,
        });
      }
    });

    setSaved(report.name);
    clear();
    top.current?.scrollIntoView({ behavior: 'smooth' });
    setQueue(await syncReports());
  };

  // The fix is not cleared: the phone keeps watching, and the next shop gets its own.
  const clear = () => {
    setPin(null);
    setName('');
    setNameHi('');
    setArea(null);
    setAreaOther('');
    setKitchen(null);
    setFront(null);
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

      {saved !== null && <p className="saved">{t('savedNext', { name: saved })}</p>}

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
          <p className="hint">
            <strong>{t('hereAndNow')}</strong> — {t('hereAndNowHint')}
          </p>
          {fix === null ? (
            <p className="hint">{t('askingPhone')}</p>
          ) : (
            <p className="hint">
              {t('located', {
                m: Math.round(fix.accuracyM),
                lat: fix.lat.toFixed(5),
                lng: fix.lng.toFixed(5),
              })}
            </p>
          )}
          {fixTrouble !== null && <p className="trouble">{fixTrouble}</p>}
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

      <Section title={t('nameOnBoard')} required>
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

      {pin === null && (
        <Section title={t('frontPhoto')} required>
          <FilePick
            label={front === null ? t('takePhoto') : t('retake')}
            onPick={(f) => {
              const picked = f[0];
              if (picked === undefined) return;
              void shrink(picked, FRONT).then(setFront);
            }}
          />
          {/* The size is shown because it is the collector's own data being spent, and because a
            number here is the only way anyone can tell the shrinking actually happened. */}
          {front !== null && <p className="hint">{t('gotIt', { size: kb(front) })}</p>}
        </Section>
      )}

      <Section title={t('kitchenKind')} required>
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
        {/* Straight-on and filling the frame is worth more to the reader than any setting: a menu
            shot at an angle loses whole lines. Said where the photo is taken, not in a manual. */}
        <p className="hint">{t('menuHint')}</p>
        <FilePick
          label={t('menuPhotos')}
          multiple
          onPick={(f) => {
            void Promise.all(f.map((file) => shrink(file, MENU))).then((shrunk) => {
              setMenu((was) => [...was, ...shrunk]);
            });
          }}
        />
        {menu.length > 0 && (
          <p className="hint">
            {t('menuCount', { n: menu.length, size: kb(menu.reduce((sum, m) => sum + m.size, 0)) })}
          </p>
        )}

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

      <button
        type="button"
        className="btn primary big"
        disabled={!ready}
        onClick={() => {
          void submit();
        }}
      >
        {ready ? t('save') : t('saveFirst')}
      </button>
      <p className="hint center">{t('savesFirst')}</p>
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
        accept="image/*"
        capture="environment"
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
