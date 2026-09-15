import { useEffect, useRef, useState } from 'react';
import type { ConfirmedDish, FieldReport, KitchenKind } from '@saathi/shared';
import { db, keepOurData } from './db.js';
import { collectorName, setCollectorName } from './collector.js';
import { Logo } from './Logo.js';
import { startSync, syncReports, type SyncOutcome } from './sync.js';

/**
 * One screen, because a collector standing in a shop should never be navigating.
 *
 * Four things are required and everything else is optional: where it is, the name on the board,
 * a photograph of the front, and what kind of kitchen it is. A partial report on a real outlet
 * is worth far more than a skipped one, and a long mandatory form is how you get six visits a
 * day instead of eighteen.
 *
 * Nothing is typed that can be captured. The location comes from the phone, the menu comes from
 * the camera, and the address is never asked for at all.
 */

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
  const [at, setAt] = useState<{ lat: number; lng: number } | null>(null);
  const [pinning, setPinning] = useState(false);
  const [pinTrouble, setPinTrouble] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [kitchen, setKitchen] = useState<KitchenKind | null>(null);
  const [front, setFront] = useState<File | null>(null);
  const [menu, setMenu] = useState<File[]>([]);

  const [diet, setDiet] = useState<Record<string, Answer>>({});
  const [dishes, setDishes] = useState<ConfirmedDish[]>([]);
  const [dishName, setDishName] = useState('');

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
   * The phone is asked; it is never interrogated first. A browser that reports no geolocation
   * still gets the call, because only the device gets to say no and it says it after being
   * asked — the rule this project paid a day for.
   */
  const pin = () => {
    setPinning(true);
    setPinTrouble(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAt({ lat: position.coords.latitude, lng: position.coords.longitude });
        setPinning(false);
      },
      (error) => {
        setPinTrouble(error.message || 'the phone did not give a location');
        setPinning(false);
      },
      { enableHighAccuracy: true, timeout: 20_000 },
    );
  };

  const ready = at !== null && name.trim() !== '' && kitchen !== null && front !== null;

  const submit = async () => {
    if (!ready || who === null) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const report: FieldReport = {
      id,
      kind: 'restaurant',
      collectorId: who,
      capturedAt: now,
      location: at,
      name: name.trim(),
      ...(nameHi.trim() === '' ? {} : { nameHi: nameHi.trim() }),
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
      ...(phone.trim() === '' ? {} : { deliveryPhone: phone.trim() }),
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

  const clear = () => {
    setAt(null);
    setName('');
    setNameHi('');
    setKitchen(null);
    setFront(null);
    setMenu([]);
    setDiet({});
    setDishes([]);
    setDishName('');
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
        <button type="button" className="btn primary" onClick={pin} disabled={pinning}>
          {pinning ? 'Asking the phone…' : at === null ? 'Pin me here' : 'Pinned — pin again'}
        </button>
        {at !== null && (
          <p className="hint">
            {at.lat.toFixed(5)}, {at.lng.toFixed(5)}
          </p>
        )}
        {pinTrouble !== null && <p className="trouble">{pinTrouble}</p>}
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

      <Section title="Photo of the front" required>
        <FilePick
          label={front === null ? 'Take the photo' : 'Retake'}
          onPick={(f) => {
            setFront(f[0] ?? null);
          }}
        />
        {front !== null && <p className="hint">Got it.</p>}
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
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (dishName.trim() === '') return;
              setDishes([
                ...dishes,
                { name: { en: dishName.trim(), hi: dishName.trim(), aliases: [] }, tags: [] },
              ]);
              setDishName('');
            }}
          >
            Add
          </button>
        </div>
        {dishes.length > 0 && <p className="hint">{dishes.map((d) => d.name.en).join(' · ')}</p>}
        <p className="hint">A dish they will actually make is worth more than a tick box.</p>
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

      <Section title="Delivery">
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
        {delivers === 'yes' && (
          <input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
            }}
            placeholder="Phone to call"
            inputMode="tel"
          />
        )}
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
        <FilePick
          label="Menu photos"
          multiple
          onPick={(f) => {
            setMenu([...menu, ...f]);
          }}
        />
        {menu.length > 0 && <p className="hint">{menu.length} menu photo(s).</p>}
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
        {ready ? 'Save this outlet' : 'Pin, name, photo and kitchen first'}
      </button>
      <p className="hint center">It saves on the phone first. Uploading can wait for signal.</p>
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
