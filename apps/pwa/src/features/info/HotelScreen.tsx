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
import { deleteHotel, saveHotelCapture } from './storage.js';

/**
 * घर.1 — मेरा होटल. Whatever the traveller wants to keep about where they are staying, on the
 * phone and nowhere else (owner, 16 September): photographs, the room, the desk's number, a
 * note, and a pin taken where they stand. Nothing is required and nothing is limited.
 *
 * Every change saves as it is made. There is no "keep" button to forget: the strip showing the
 * hotel is the confirmation.
 */
export function HotelScreen({ hotel }: { readonly hotel: SavedHotel | undefined }) {
  const { t, locale } = useSettings();
  const [fields, setFields] = useState({
    name: hotel?.name ?? '',
    room: hotel?.room ?? '',
    phone: hotel?.phone ?? '',
    note: hotel?.note ?? '',
  });
  const [pinning, setPinning] = useState(false);
  /** What the phone said when it would not give a fix. Only ever set by an actual refusal. */
  const [refused, setRefused] = useState<StringKey>();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setFields({
      name: hotel?.name ?? '',
      room: hotel?.room ?? '',
      phone: hotel?.phone ?? '',
      note: hotel?.note ?? '',
    });
  }, [hotel]);

  const typeInto = (field: keyof typeof fields, value: string) => {
    const next = { ...fields, [field]: value };
    setFields(next);
    window.clearTimeout(timer.current);
    // Saved a moment after the last keystroke, not on every one: a phone should not write a row
    // per letter, and the traveller should not have to find a button.
    timer.current = window.setTimeout(() => {
      void saveHotelCapture({
        name: next.name.trim(),
        room: next.room.trim(),
        phone: next.phone.trim(),
        note: next.note.trim(),
      });
    }, 400);
  };

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

  const extras = hotel?.photos ?? [];

  return (
    <>
      <ScreenHeader pillar="home" icon="pin" title={t('hotel.title')} />
      <div className="flow">
        <div className="hotel-photos">
          <HotelPhoto
            blob={hotel?.cardPhoto}
            caption={t('hotel.photoCard')}
            onPhoto={(cardPhoto) => {
              void saveHotelCapture({ cardPhoto });
            }}
          />
          <HotelPhoto
            blob={hotel?.gatePhoto}
            caption={t('hotel.photoGate')}
            onPhoto={(gatePhoto) => {
              void saveHotelCapture({ gatePhoto });
            }}
          />
          {extras.map((blob, index) => (
            <HotelPhoto
              key={`${String(index)}-${String(blob.size)}`}
              blob={blob}
              caption={`${t('hotel.photoAlt')} ${String(index + 1)}`}
              onPhoto={(replaced) => {
                void saveHotelCapture({
                  photos: extras.map((p, i) => (i === index ? replaced : p)),
                });
              }}
              onRemove={() => {
                void saveHotelCapture({ photos: extras.filter((_, i) => i !== index) });
              }}
            />
          ))}
        </div>
        <PhotoInput
          className="add-row"
          onPhoto={(photo) => {
            void saveHotelCapture({ photos: [...extras, photo] });
          }}
        >
          <Icon name="camera" size={20} strokeWidth={1.9} />
          {t('hotel.photoMore')}
        </PhotoInput>

        <div className="rows">
          {(['name', 'room', 'phone', 'note'] as const).map((field) => (
            <label key={field} className="field">
              <span className="field-label">{t(`hotel.${field}` as StringKey)}</span>
              <input
                className="field-input"
                type={field === 'phone' ? 'tel' : 'text'}
                inputMode={field === 'room' ? 'numeric' : undefined}
                value={fields[field]}
                placeholder={t(`hotel.${field}Placeholder` as StringKey)}
                onChange={(event) => {
                  typeInto(field, event.target.value);
                }}
              />
              {field === 'phone' && fields.phone.trim() !== '' && (
                <a href={`tel:${fields.phone.trim()}`} aria-label={t('hotel.phone')}>
                  <Icon name="phone" size={20} strokeWidth={1.9} color="var(--teal)" />
                </a>
              )}
            </label>
          ))}
        </div>

        {/* Live from the moment the screen paints, and the phone is asked only when pressed. No
            permission query stands between the traveller and the attempt (CLAUDE.md). */}
        <button type="button" className="pinbox" onClick={pin} disabled={pinning}>
          <Icon name="pin" size={22} strokeWidth={1.9} color="var(--teal)" />
          <span className="pinbox-text">
            <span className="pinbox-head">
              {pinning ? t('hotel.pinning') : hotel?.pin ? t('hotel.pinned') : t('hotel.pinNow')}
            </span>
            <span className="pinbox-sub">
              {hotel?.pin
                ? hotel.area
                  ? t('hotel.pinnedWhere', { area: hotel.area[locale] })
                  : t('hotel.pinnedNoArea')
                : t('hotel.pinWhy')}
            </span>
          </span>
          {hotel?.pin && <span className="pinbox-action">{t('hotel.pinAgain')}</span>}
        </button>
        {refused !== undefined && <p className="muted small">{t(refused)}</p>}

        <p className="muted small center">{t('hotel.onlyHere')}</p>
        {hotel && (
          <button
            type="button"
            className="linkish center"
            onClick={() => {
              void deleteHotel().then(() => {
                navigate({ screen: 'home' });
              });
            }}
          >
            {t('hotel.delete')}
          </button>
        )}
      </div>
    </>
  );
}

/** What each refusal is called, so the traveller reads what the phone said and what to do next. */
const PIN_REFUSAL: Record<'denied' | 'unavailable' | 'timeout', StringKey> = {
  denied: 'hotel.pinDenied',
  unavailable: 'hotel.pinUnavailable',
  timeout: 'hotel.pinTimeout',
};

function HotelPhoto({
  blob,
  caption,
  onPhoto,
  onRemove,
}: {
  readonly blob: Blob | undefined;
  readonly caption: string;
  readonly onPhoto: (photo: Blob) => void;
  readonly onRemove?: () => void;
}) {
  const { t } = useSettings();
  const url = useBlobUrl(blob);
  return (
    <span style={{ position: 'relative' }}>
      <PhotoInput className="photo-frame hotel-photo" onPhoto={onPhoto}>
        {url && <img src={url} alt={caption} />}
        <span className="photo-cap">{caption}</span>
      </PhotoInput>
      {onRemove && (
        <button
          type="button"
          className="hotel-photo-x"
          onClick={onRemove}
          aria-label={t('docView.delete')}
        >
          <Icon name="trash" size={16} strokeWidth={2} />
        </button>
      )}
    </span>
  );
}
