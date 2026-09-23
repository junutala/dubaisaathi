import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { PhotoInput } from './PhotoInput.js';
import { useBlobUrl } from './photos.js';
import { areaFor } from './nearestArea.js';
import { pinHere } from './pin.js';
import { insideDubai } from '../../lib/dubai.js';
import type { SavedHotel } from './records.js';
import { cardFields, type CardFields } from './cardFields.js';
import { readCard } from './readCard.js';
import { deleteHotel, saveHotelCapture, type HotelCapture } from './storage.js';

/**
 * घर.1 — मेरा होटल, in two steps (decision 032, the owner, 23 September).
 *
 * **The card.** Both sides of the reception's card, the pin, and Submit — all on the first
 * screen, because a pin placed below the fold is a pin nobody presses.
 *
 * **What the card said.** Submit reads the card on the phone and fills in the name, the desk's
 * number and the address; the traveller corrects anything wrong and types the room, which is
 * never on a card. Everything fits on one screen, and everything saves as it is typed.
 *
 * On the phone and nowhere else (decision 003): the card is read here, not sent to be read.
 */
export function HotelScreen({ hotel }: { readonly hotel: SavedHotel | undefined }) {
  /** What the last reading came to, said once on the second step. */
  const [outcome, setOutcome] = useState<ReadOutcome>();
  const [reading, setReading] = useState(false);

  /**
   * Reads whichever sides are given and fills only what is still empty — a value the traveller
   * typed is theirs, and a second reading never writes over it.
   */
  const read = async (photos: readonly Blob[], current: SavedHotel | undefined) => {
    setReading(true);
    const result = await readCard(photos);
    const found = cardFields(result.lines);
    const capture: { -readonly [K in keyof CardFields]: CardFields[K] } = {};
    for (const field of FILLED) {
      const value = found[field];
      if (value !== undefined && (current?.[field] ?? '').trim() === '') capture[field] = value;
    }
    const saved = await saveHotelCapture({ ...capture, submittedAt: new Date().toISOString() });
    setReading(false);
    setOutcome(
      result.failed
        ? navigator.onLine
          ? 'failed'
          : 'offline'
        : Object.keys(found).length > 0
          ? 'read'
          : photos.length > 0
            ? 'nothing'
            : undefined,
    );
    return saved;
  };

  /*
   * A card that could not be read for want of a signal is read the moment the signal returns
   * — its own listener, because nothing else on this screen would notice (CLAUDE.md: a moment
   * the app waits for must be a moment the app can notice).
   */
  const latest = useRef(hotel);
  latest.current = hotel;
  useEffect(() => {
    if (outcome !== 'offline') return;
    const again = () => {
      const now = latest.current;
      void read(cardsOf(now), now);
    };
    window.addEventListener('online', again, { once: true });
    return () => {
      window.removeEventListener('online', again);
    };
  }, [outcome]);

  const submitted = hotel !== undefined && (hotel.submittedAt !== undefined || hasWords(hotel));
  return submitted ? (
    <HotelDetails
      hotel={hotel}
      outcome={reading ? 'reading' : outcome}
      onRetake={(capture) => {
        void saveHotelCapture(capture).then((saved) => read(cardsOf(saved), saved));
      }}
    />
  ) : (
    <HotelCard
      hotel={hotel}
      reading={reading}
      onSubmit={() => {
        void read(cardsOf(hotel), hotel);
      }}
    />
  );
}

/** The three fields a card can fill. The room is never on one. */
const FILLED = ['name', 'phone', 'address'] as const;

type ReadOutcome = 'reading' | 'read' | 'nothing' | 'failed' | 'offline';

const OUTCOME_LINE: Record<ReadOutcome, StringKey> = {
  reading: 'hotel.reading',
  read: 'hotel.readDone',
  nothing: 'hotel.readNothing',
  failed: 'hotel.readFailed',
  offline: 'hotel.readOffline',
};

function cardsOf(hotel: SavedHotel | undefined): Blob[] {
  return [hotel?.cardPhoto, hotel?.cardBack].filter((blob): blob is Blob => blob !== undefined);
}

/** A hotel someone has already written into, from before the card screen existed. */
function hasWords(hotel: SavedHotel): boolean {
  return [hotel.name, hotel.room, hotel.phone, hotel.address, hotel.note].some(
    (value) => (value ?? '').trim() !== '',
  );
}

/** The first step: the card's two sides, the pin, and Submit. */
function HotelCard({
  hotel,
  reading,
  onSubmit,
}: {
  readonly hotel: SavedHotel | undefined;
  readonly reading: boolean;
  readonly onSubmit: () => void;
}) {
  const { t } = useSettings();
  return (
    <>
      <ScreenHeader pillar="home" icon="pin" title={t('hotel.title')} />
      <div className="flow hotel-flow">
        <p className="hotel-lead">{t('hotel.cardLead')}</p>
        <div className="hotel-cards">
          <CardSide
            blob={hotel?.cardPhoto}
            caption={t('hotel.cardFront')}
            onPhoto={(cardPhoto) => {
              void saveHotelCapture({ cardPhoto });
            }}
          />
          <CardSide
            blob={hotel?.cardBack}
            caption={t('hotel.cardBack')}
            onPhoto={(cardBack) => {
              void saveHotelCapture({ cardBack });
            }}
          />
        </div>
        <PinBox hotel={hotel} />
        <div className="grow" />
        <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={reading}>
          {reading ? t('hotel.reading') : t('hotel.submit')}
        </button>
        <p className="muted small center">{t('hotel.onlyHere')}</p>
      </div>
    </>
  );
}

/** The second step: what the card said, in boxes the traveller corrects, and the room to type. */
function HotelDetails({
  hotel,
  outcome,
  onRetake,
}: {
  readonly hotel: SavedHotel;
  readonly outcome: ReadOutcome | undefined;
  readonly onRetake: (capture: HotelCapture) => void;
}) {
  const { t } = useSettings();
  const [fields, setFields] = useState(() => textOf(hotel));
  const timer = useRef<number | undefined>(undefined);
  /** The boxes typed into since the last save — while any is waiting, a reading does not undo it. */
  const dirty = useRef(new Set<TextField>());

  useEffect(() => {
    if (dirty.current.size === 0) setFields(textOf(hotel));
  }, [hotel]);

  const typeInto = (field: TextField, value: string) => {
    const next = { ...fields, [field]: value };
    setFields(next);
    dirty.current.add(field);
    window.clearTimeout(timer.current);
    // Saved a moment after the last keystroke, not on every one: a phone should not write a row
    // per letter, and the traveller should not have to find a button. Only the boxes typed into
    // are written, so a card reading that lands meanwhile keeps what it found in the others.
    timer.current = window.setTimeout(() => {
      const change: Partial<Record<TextField, string | undefined>> = {};
      for (const typed of dirty.current) {
        const text = next[typed].trim();
        change[typed] = text === '' ? undefined : text;
      }
      dirty.current.clear();
      void saveHotelCapture(change);
    }, 400);
  };

  const older = [
    ...(hotel.gatePhoto ? [{ blob: hotel.gatePhoto, key: 'gate' as const, index: -1 }] : []),
    ...(hotel.photos ?? []).map((blob, index) => ({ blob, key: 'photos' as const, index })),
  ];

  return (
    <>
      <ScreenHeader
        pillar="home"
        icon="pin"
        title={t('hotel.title')}
        action={
          <button
            type="button"
            className="hdr-btn"
            aria-label={t('hotel.delete')}
            title={t('hotel.delete')}
            onClick={() => {
              void deleteHotel().then(() => {
                navigate({ screen: 'home' });
              });
            }}
          >
            <Icon name="trash" size={21} strokeWidth={1.9} />
          </button>
        }
      />
      <div className="flow hotel-flow">
        <div className="hotel-top">
          <div className="hotel-thumbs">
            <CardSide
              small
              blob={hotel.cardPhoto}
              caption={t('hotel.cardFront')}
              onPhoto={(cardPhoto) => {
                onRetake({ cardPhoto });
              }}
            />
            <CardSide
              small
              blob={hotel.cardBack}
              caption={t('hotel.cardBack')}
              onPhoto={(cardBack) => {
                onRetake({ cardBack });
              }}
            />
            {older.map((photo) => (
              <OlderPhoto
                key={`${photo.key}-${String(photo.index)}`}
                blob={photo.blob}
                onRemove={() => {
                  void saveHotelCapture(
                    photo.key === 'gate'
                      ? { gatePhoto: undefined }
                      : { photos: (hotel.photos ?? []).filter((_, i) => i !== photo.index) },
                  );
                }}
              />
            ))}
          </div>
          {outcome !== undefined && (
            <p className={`hotel-outcome${outcome === 'read' ? ' hotel-outcome-read' : ''}`}>
              {t(OUTCOME_LINE[outcome])}
            </p>
          )}
        </div>

        <div className="hotel-fields">
          <TextBox field="name" value={fields.name} onType={typeInto} />
          <div className="hotel-pair">
            <TextBox field="room" value={fields.room} onType={typeInto} stacked />
            <TextBox field="phone" value={fields.phone} onType={typeInto} stacked />
          </div>
          <TextBox field="address" value={fields.address} onType={typeInto} />
          <TextBox field="note" value={fields.note} onType={typeInto} />
        </div>

        <PinBox hotel={hotel} compact />
        <p className="muted small center">{t('hotel.onlyHereShort')}</p>
      </div>
    </>
  );
}

type TextField = 'name' | 'room' | 'phone' | 'address' | 'note';

function textOf(hotel: SavedHotel): Record<TextField, string> {
  return {
    name: hotel.name ?? '',
    room: hotel.room ?? '',
    phone: hotel.phone ?? '',
    address: hotel.address ?? '',
    note: hotel.note ?? '',
  };
}

const LABEL: Record<TextField, StringKey> = {
  name: 'hotel.name',
  room: 'hotel.room',
  phone: 'hotel.phone',
  address: 'hotel.address',
  note: 'hotel.note',
};

const PLACEHOLDER: Record<TextField, StringKey> = {
  name: 'hotel.namePlaceholder',
  room: 'hotel.roomPlaceholder',
  phone: 'hotel.phonePlaceholder',
  address: 'hotel.addressPlaceholder',
  note: 'hotel.notePlaceholder',
};

function TextBox({
  field,
  value,
  onType,
  stacked = false,
}: {
  readonly field: TextField;
  readonly value: string;
  readonly onType: (field: TextField, value: string) => void;
  readonly stacked?: boolean;
}) {
  const { t } = useSettings();
  const number = value.trim();
  return (
    <label className={stacked ? 'field field-stack' : 'field'}>
      <span className="field-label">{t(LABEL[field])}</span>
      <span className="field-line">
        <input
          className="field-input"
          type={field === 'phone' ? 'tel' : 'text'}
          inputMode={field === 'room' ? 'numeric' : undefined}
          value={value}
          placeholder={t(PLACEHOLDER[field])}
          onChange={(event) => {
            onType(field, event.target.value);
          }}
        />
        {field === 'phone' && number !== '' && (
          <a
            className="field-dial"
            href={`tel:${number.replace(/[^\d+]/g, '')}`}
            aria-label={t('hotel.phone')}
          >
            <Icon name="phone" size={20} strokeWidth={1.9} color="var(--teal)" />
          </a>
        )}
      </span>
    </label>
  );
}

/**
 * यहीं पिन लगाएँ. Live from the moment the screen paints, and the phone is asked only when
 * pressed: no permission query stands between the traveller and the attempt (CLAUDE.md).
 */
function PinBox({
  hotel,
  compact = false,
}: {
  readonly hotel: SavedHotel | undefined;
  /** One line, for the second step, where the traveller already read why on the first. */
  readonly compact?: boolean;
}) {
  const { t, locale } = useSettings();
  const [pinning, setPinning] = useState(false);
  /** What the phone said when it would not give a fix. Only ever set by an actual refusal. */
  const [refused, setRefused] = useState<StringKey>();

  const pin = () => {
    setPinning(true);
    setRefused(undefined);
    void pinHere().then((result) => {
      setPinning(false);
      if (result.kind === 'refused') {
        setRefused(PIN_REFUSAL[result.why]);
        return;
      }
      /*
       * The phone answered, and it answered from somewhere that is not Dubai (decision 024).
       * That is the owner's own case: he booked Rolla Residence meaning Rolla Residence Hotel
       * Apartments, across the same street. A traveller at home knows the booking's name and
       * not its building, and a pin taken in Kochi — or on the wrong side of Rolla Street — is
       * worse than no pin at all, because BurJuman is labelled a stand-in on every row it
       * touches while a wrong hotel is labelled "your hotel" and is quietly wrong in all three
       * pillars. So it is not saved, and the screen says why and when to come back.
       */
      if (!insideDubai(result.at)) {
        setRefused('hotel.pinOutsideDubai');
        return;
      }
      const area = areaFor(result.at);
      void saveHotelCapture(area ? { pin: result.at, area } : { pin: result.at });
    });
  };

  return (
    <>
      <button
        type="button"
        className={compact ? 'pinbox pinbox-compact' : 'pinbox'}
        onClick={pin}
        disabled={pinning}
      >
        <Icon name="pin" size={22} strokeWidth={1.9} color="var(--teal)" />
        <span className="pinbox-text">
          <span className="pinbox-head">
            {pinning
              ? t('hotel.pinning')
              : !hotel?.pin
                ? t('hotel.pinNow')
                : compact && hotel.area
                  ? t('hotel.pinnedShort', { area: hotel.area[locale] })
                  : t('hotel.pinned')}
          </span>
          {!compact && (
            <span className="pinbox-sub">
              {hotel?.pin
                ? hotel.area
                  ? t('hotel.pinnedWhere', { area: hotel.area[locale] })
                  : t('hotel.pinnedNoArea')
                : t('hotel.pinWhy')}
            </span>
          )}
        </span>
        {hotel?.pin && <span className="pinbox-action">{t('hotel.pinAgain')}</span>}
      </button>
      {refused !== undefined && <p className="muted small">{t(refused)}</p>}
    </>
  );
}

/** What each refusal is called, so the traveller reads what the phone said and what to do next. */
const PIN_REFUSAL: Record<'denied' | 'unavailable' | 'timeout', StringKey> = {
  denied: 'hotel.pinDenied',
  unavailable: 'hotel.pinUnavailable',
  timeout: 'hotel.pinTimeout',
};

/** One side of the card: the place a photograph goes, and the photograph once it is there. */
function CardSide({
  blob,
  caption,
  onPhoto,
  small = false,
}: {
  readonly blob: Blob | undefined;
  readonly caption: string;
  readonly onPhoto: (photo: Blob) => void;
  readonly small?: boolean;
}) {
  const url = useBlobUrl(blob);
  return (
    <PhotoInput
      className={`photo-frame hotel-card${small ? ' hotel-card-small' : ''}`}
      onPhoto={onPhoto}
    >
      {url ? (
        <img src={url} alt={caption} />
      ) : (
        <span className="hotel-card-empty">
          <Icon name="camera" size={small ? 18 : 26} strokeWidth={1.8} />
        </span>
      )}
      <span className="photo-cap">{caption}</span>
    </PhotoInput>
  );
}

/**
 * A photograph taken before the card screen existed — the front of the building, the lift.
 * Nothing asks for these now, and they stay until the traveller removes them.
 */
function OlderPhoto({ blob, onRemove }: { readonly blob: Blob; readonly onRemove: () => void }) {
  const { t } = useSettings();
  const url = useBlobUrl(blob);
  return (
    <button
      type="button"
      className="hotel-older"
      onClick={onRemove}
      aria-label={`${t('docView.delete')} · ${t('hotel.photoOlder')}`}
    >
      {url && <img src={url} alt={t('hotel.photoOlder')} />}
      <span className="hotel-older-dot">
        <Icon name="trash" size={14} strokeWidth={2} />
      </span>
    </button>
  );
}
