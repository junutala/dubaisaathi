import { useEffect, useState } from 'react';
import type { ParsedIntent } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import { HeardBanner } from '../voice/HeardBanner.js';
import { CONSULATE } from './consulate.js';
import { formatDay, useBlobUrl } from './photos.js';
import { listDocuments, readHotel } from './storage.js';
import type { SavedHotel, TravellerDocument } from './records.js';

/**
 * 4.1 — the calm shelf. Not an emergency screen: a tourist in distress reaches for the dialler
 * and the reception desk, not a seven-day app (decision 002). This is what they look at before
 * anything goes wrong — the hotel, the documents, the consulate, and one line of numbers
 * because an Indian otherwise dials 100.
 *
 * Every one of those is on the phone, which is what makes rule 6 true: this screen paints with
 * the radio off, on the day the trial ends, and a fortnight after the pass expired. It reads
 * nothing about entitlement and nothing off the network.
 */
export function InfoHomeScreen({
  onMic,
  heard,
}: {
  readonly onMic: () => void;
  /** Set when the mic sent them here — "beema dikhao" lands on the document list. */
  readonly heard?: ParsedIntent | undefined;
}) {
  const { t, locale } = useSettings();
  const [hotel, setHotel] = useState<SavedHotel>();
  const [documents, setDocuments] = useState<readonly TravellerDocument[]>([]);
  /** Kept apart from `hotel` so an empty shelf is never shown before the phone has been read. */
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.all([readHotel(), listDocuments()]).then(([saved, docs]) => {
      if (!live) return;
      setHotel(saved);
      setDocuments(docs);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <ScreenHeader title={t('info.title')} tile="info" />
      <div className="flow">
        {heard && <HeardBanner intent={heard} />}

        <div className="card info-hotel">
          <HotelIdentity hotel={hotel} loaded={loaded} />
          {hotel && (
            <div className="info-hotel-actions">
              {/* Getting back is रास्ता's job, so it hands over to that tile rather than
                  growing a second route screen inside this one — carrying the hotel's area as
                  the destination, so the traveller does not retype where they live. */}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  navigate(
                    hotel.area?.placeId === undefined
                      ? { screen: 'transport' }
                      : { screen: 'transport', placeId: hotel.area.placeId },
                  );
                }}
              >
                <Icon name="route" size={20} strokeWidth={1.8} />
                {t('info.hotel.back')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  navigate({ screen: 'driver', phraseId: HOTEL_PHRASE_ID });
                }}
              >
                {t('info.hotel.show')}
              </button>
            </div>
          )}
        </div>

        <div className="rows">
          <p className="lbl">{t('info.docs')}</p>
          {loaded && documents.length === 0 && <p className="muted small">{t('info.docs.none')}</p>}
          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className="doc-row"
              onClick={() => {
                navigate({ screen: 'docView', docId: doc.id });
              }}
            >
              <span className="doc-row-icon">
                <Icon name="doc" size={21} strokeWidth={1.8} color="var(--indigo)" />
              </span>
              <span className="doc-row-text">
                <span className="doc-row-name">{doc.name}</span>
                <span className="muted small">
                  {t('info.docs.added', { date: formatDay(locale, doc.addedAt) })}
                </span>
              </span>
              <Icon name="right" size={20} strokeWidth={1.8} color="var(--chev)" />
            </button>
          ))}
          <button
            type="button"
            className="add-row"
            onClick={() => {
              navigate({ screen: 'docAdd' });
            }}
          >
            <Icon name="plus" size={20} strokeWidth={2} color="var(--marigoldText)" />
            {t('info.docs.add')}
          </button>
        </div>

        {/* The dialler is the better tool, so the row hands the number to it (decision 002). */}
        <a
          className="card info-row"
          href={`tel:${CONSULATE.phone ?? ''}`}
          aria-label={t('info.consulate.call')}
        >
          <span className="info-row-text">
            <span className="muted small">{CONSULATE.name[locale]}</span>
            <span className="info-row-detail">{CONSULATE.where[locale]}</span>
          </span>
          <Icon name="phone" size={22} strokeWidth={1.8} color="var(--marigoldText)" />
        </a>

        {/* Knowledge, not a button: an Indian otherwise dials 100, and these three are what
            Dubai answers on. Nothing here is tappable, because nothing here should be tapped
            by accident. */}
        <span className="muted center small info-numbers">{t('info.numbers')}</span>
      </div>
      <QuickBar current="info" onMic={onMic} />
    </>
  );
}

/**
 * The sentence a driver is shown when the traveller wants to go back to the hotel. It is a
 * phrase from the pack, so it is Arabic on a screen built to be read at arm's length (3.3).
 */
const HOTEL_PHRASE_ID = 'taxi-hotel';

/**
 * मेरा होटल, in both of its states, and it is one control in both: a hotel that is not there
 * yet invites the traveller to capture it, and one that is there opens 4.2 again so a pin can
 * gain a card photo later. Without that, a traveller who pinned in the lobby could never add
 * the photograph the driver actually needs.
 */
function HotelIdentity({
  hotel,
  loaded,
}: {
  readonly hotel: SavedHotel | undefined;
  readonly loaded: boolean;
}) {
  const { t, locale } = useSettings();
  const photo = useBlobUrl(hotel?.cardPhoto ?? hotel?.gatePhoto);

  const captured = hotel
    ? [
        hotel.cardPhoto && t('info.hotel.card'),
        hotel.gatePhoto && t('info.hotel.gate'),
        hotel.pin && t('info.hotel.pinned'),
      ]
        .filter((part): part is string => typeof part === 'string')
        .join(' · ')
    : t('info.hotel.add');

  return (
    <button
      type="button"
      className="info-hotel-id"
      onClick={() => {
        navigate({ screen: 'hotelAdd' });
      }}
    >
      <span className="info-hotel-thumb">
        {photo ? (
          <img src={photo} alt={t('info.hotel')} />
        ) : (
          <Icon name="camera" size={26} strokeWidth={1.6} color="var(--muted)" />
        )}
      </span>
      <span className="info-hotel-text">
        <span className="muted small">{t('info.hotel')}</span>
        {hotel?.area && <span className="info-hotel-name">{hotel.area[locale]}</span>}
        <span className="muted small">{loaded ? captured : ''}</span>
      </span>
    </button>
  );
}
