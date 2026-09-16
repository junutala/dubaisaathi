import { useEffect } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import type { SavedHotel } from '../info/index.js';
import { distanceKm, distanceLabel } from '../../lib/distance.js';
import { useHere } from '../../lib/here.js';
import { localName, placeById } from '../transport/index.js';
import { attractionById } from './attractions.js';

/**
 * 3.2 — one place: what it is in a few lines, then the facts a traveller checks before going,
 * then the two things to do — ring, or go, which hands the place to जाना.
 */
export function PlaceScreen({
  placeId,
  hotel,
}: {
  readonly placeId: string;
  readonly hotel: SavedHotel | undefined;
}) {
  const { t, locale } = useSettings();
  const row = attractionById(placeId);
  const place = placeById(placeId);
  const here = useHere(hotel);

  useEffect(() => {
    if (!row || !place) navigate({ screen: 'know' });
  }, [row, place]);
  if (!row || !place) return null;

  const name = localName(place.name, locale);
  const km = here.at === undefined ? undefined : distanceKm(here.at, place.location);

  return (
    <>
      <ScreenHeader pillar="know" trail={name} />
      <div className="flow">
        <div className="photo-frame" style={{ height: 150 }}>
          <span className="photo-cap">{t(`know.chip.${row.category}` as StringKey)}</span>
        </div>
        <div className="stack-sm">
          <h1 className="outlet-title">{name}</h1>
          <p className="outlet-meta">
            <span>{locale === 'hi' ? place.name.en : place.name.hi}</span>
            {km !== undefined && (
              <span>
                {here.from === 'hotel'
                  ? t('know.fromHotel', { distance: distanceLabel(t, km) })
                  : distanceLabel(t, km)}
              </span>
            )}
          </p>
        </div>
        <p className="place-blurb">{row.blurb[locale]}</p>

        <div className="grid2">
          <span className="fact">
            <span className="fact-label">{t('know.hours')}</span>
            <span className="fact-value">{row.hoursText[locale]}</span>
          </span>
          <span className="fact">
            <span className="fact-label">{t('know.ticket')}</span>
            <span className="fact-value">
              {row.ticketAed === 0 ? t('know.free') : t('know.from', { aed: row.ticketAed })}
              {row.ticketNote !== undefined && (
                <span className="muted small"> · {row.ticketNote[locale]}</span>
              )}
            </span>
          </span>
          {row.phone !== undefined && (
            <span className="fact">
              <span className="fact-label">{t('know.phone')}</span>
              <span className="fact-value">{row.phone}</span>
            </span>
          )}
          {row.durationHours !== undefined && (
            <span className="fact">
              <span className="fact-label">{t('know.duration')}</span>
              <span className="fact-value">
                {t('know.hoursText', { hours: row.durationHours })}
              </span>
            </span>
          )}
        </div>

        <div className="grow" />
        <div className="grid2">
          {row.phone === undefined ? (
            <span className="btn btn-ghost" style={{ opacity: 0.45 }}>
              <Icon name="phone" size={20} strokeWidth={1.9} />
              {t('know.call')}
            </span>
          ) : (
            <a className="btn btn-ghost" href={`tel:${row.phone.replace(/\s+/g, '')}`}>
              <Icon name="phone" size={20} strokeWidth={1.9} />
              {t('know.call')}
            </a>
          )}
          <button
            type="button"
            className="btn btn-go"
            onClick={() => {
              navigate({ screen: 'options', placeId });
            }}
          >
            <Icon name="metro" size={20} strokeWidth={1.9} />
            {t('know.go')}
          </button>
        </div>
      </div>
    </>
  );
}
