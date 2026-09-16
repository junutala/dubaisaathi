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
import { Logo } from './Logo.js';
import { shrink, FRONT, MENU } from './shrink.js';
import { BUILD } from './version.js';
import { readMenu } from './readMenu.js';
import type { Candidate } from './dishCandidates.js';
import { startSync, syncReports, type SyncOutcome } from './sync.js';

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

const DIET: readonly { key: keyof FieldReport['dietary']; label: string }[] = [
  { key: 'jain', label: 'Jain' },
  { key: 'vrat', label: 'Vrat / fasting' },
  { key: 'sattvik', label: 'Sattvik' },
  { key: 'noOnionGarlic', label: 'No onion / garlic' },
  { key: 'eggless', label: 'Eggless' },
];

const KITCHENS: readonly { value: KitchenKind; label: string }[] = [
  { value: 'pure-veg', label: 'Pure veg' },
  { value: 'mixed', label: 'Veg + non-veg' },
  { value: 'non-veg', label: 'Non-veg' },
];

export function CaptureScreen() {
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
        setFixTrouble(error.message || 'the phone did not give a location');
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watch);
    };
  }, [who]);

  const ready = fix !== null && name.trim() !== '' && kitchen !== null && front !== null;

  const submit = async () => {
    // `ready` already proves there is a fix; TypeScript follows the alias, so no second check.
    if (!ready || who === null) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const report: FieldReport = {
      id,
      kind: 'restaurant',
      collectorId: who,
      capturedAt: now,
      location: { lat: fix.lat, lng: fix.lng },
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
      frontPhotoIds: [`${id}-front`],
      menuPhotoIds: menu.map((_, i) => `${id}-menu-${String(i)}`),
      status: 'queued',
    };

    await db.transaction('rw', db.reports, db.photos, async () => {
      await db.reports.add({ ...report, uploaded: false });
      await db.photos.add({ id: `${id}-front`, reportId: id, kind: 'front', bytes: front });
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
            <strong className="brand-name">Dubai Saathi</strong>
            <span className="brand-sub">Outlets · {who}</span>
          </span>
        </span>
        <span className={queue.pending > 0 ? 'queue waiting' : 'queue'}>
          {queue.pending > 0 ? `${String(queue.pending)} waiting to upload` : 'all uploaded'}
        </span>
      </header>

      {saved !== null && (
        <p className="saved">
          Saved <strong>{saved}</strong>. Next one.
        </p>
      )}

      <Section title="Where it is" required>
        {/* No button: the phone is watched from the moment the form opens, and the fix saved is
            the one under the collector's feet when they press save. */}
        {fix === null ? (
          <p className="hint">Asking the phone where you are…</p>
        ) : (
          <p className="hint">
            Located · within {String(Math.round(fix.accuracyM))} m · {fix.lat.toFixed(5)},{' '}
            {fix.lng.toFixed(5)}
          </p>
        )}
        {fixTrouble !== null && <p className="trouble">{fixTrouble}</p>}
      </Section>

      <Section title="Name on the board" required>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder="As written outside"
        />
        <input
          value={nameHi}
          onChange={(e) => {
            setNameHi(e.target.value);
          }}
          placeholder="In Hindi (optional)"
          lang="hi"
        />
      </Section>

      <Section title="Which area">
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
            placeholder="Somewhere else — write it"
          />
        )}
        <p className="hint">It is the word on the traveller's row: "करामा · 650 m".</p>
      </Section>

      <Section title="Photo of the front" required>
        <FilePick
          label={front === null ? 'Take the photo' : 'Retake'}
          onPick={(f) => {
            const picked = f[0];
            if (picked === undefined) return;
            void shrink(picked, FRONT).then(setFront);
          }}
        />
        {/* The size is shown because it is the collector's own data being spent, and because a
            number here is the only way anyone can tell the shrinking actually happened. */}
        {front !== null && <p className="hint">Got it · {kb(front)}</p>}
      </Section>

      <Section title="Kind of kitchen" required>
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
              {k.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Ask them — do they do these?">
        {DIET.map((row) => (
          <div key={row.key} className="row">
            <span>{row.label}</span>
            <div className="chips">
              {(['yes', 'on-request', 'no'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={diet[row.key] === value ? 'chip on' : 'chip'}
                  onClick={() => {
                    setDiet({ ...diet, [row.key]: value });
                  }}
                >
                  {value === 'on-request' ? 'on request' : value}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="hint">Ask a person. Do not read it off a sign.</p>
      </Section>

      <Section title="Dishes they named">
        <div className="row">
          <input
            value={dishName}
            onChange={(e) => {
              setDishName(e.target.value);
            }}
            placeholder="e.g. Jain sambar"
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
            Add
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
        <p className="hint">
          A dish they will actually make is worth more than a tick box. The price is what the
          traveller's menu shows next to it.
        </p>
      </Section>

      <Section title="Hours">
        <label className="check">
          <input
            type="checkbox"
            checked={open24}
            onChange={(e) => {
              setOpen24(e.target.checked);
            }}
          />
          Open 24 hours
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
            <span>to</span>
            <input
              type="time"
              value={closes}
              onChange={(e) => {
                setCloses(e.target.value);
              }}
            />
          </div>
        )}
        <p className="hint">
          A 3am close is fine — put 03:00. Late places are the ones nobody else has.
        </p>
      </Section>

      <Section title="Phone and delivery">
        <input
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
          }}
          placeholder="Phone on the board"
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
              {value}
            </button>
          ))}
        </div>
        <p className="hint">
          The traveller's card has a call button; this is the number behind it.
        </p>
      </Section>

      <Section title="The rest">
        <input
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
          }}
          placeholder="Price for one (AED)"
          inputMode="numeric"
        />
        <input
          value={spokeTo}
          onChange={(e) => {
            setSpokeTo(e.target.value);
          }}
          placeholder="Who you spoke to — Suresh, manager"
        />
        {/* Straight-on and filling the frame is worth more to the reader than any setting: a menu
            shot at an angle loses whole lines. Said where the photo is taken, not in a manual. */}
        <p className="hint">Hold the menu straight and fill the frame — it reads far better.</p>
        <FilePick
          label="Menu photos"
          multiple
          onPick={(f) => {
            void Promise.all(f.map((file) => shrink(file, MENU))).then((shrunk) => {
              setMenu((was) => [...was, ...shrunk]);
            });
          }}
        />
        {menu.length > 0 && (
          <p className="hint">
            {menu.length} menu photo(s) · {kb(menu.reduce((sum, m) => sum + m.size, 0))}
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
            {reading === 'yes' ? 'Reading the menu…' : 'Read the menu'}
          </button>
        )}
        {reading === 'failed' && (
          <p className="hint">Could not read it. Type the dishes above instead.</p>
        )}
        {candidates.length > 0 && (
          <>
            <p className="hint">
              Tap the ones they actually serve. Do it here, with the board in front of you — nobody
              can check this later.
            </p>
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
          placeholder="Anything a friend would mention"
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
        {ready ? 'Save this outlet' : 'Location, name, photo and kitchen first'}
      </button>
      <p className="hint center">It saves on the phone first. Uploading can wait for signal.</p>
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
  return (
    <section className="sec">
      <h2>
        {title}
        {required === true && <span className="req">needed</span>}
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
function WhoAreYou({ onName }: { readonly onName: (name: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="wrap">
      <h1 className="title">Saathi · Outlets</h1>
      <p className="hint">Every outlet you save is recorded against your name.</p>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        placeholder="Your name"
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
        Start
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
