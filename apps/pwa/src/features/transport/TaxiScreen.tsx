import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { SavedHotel } from '../info/index.js';
import { distanceKm } from '../../lib/distance.js';
import { useHere } from '../../lib/here.js';
import { localName, placeById } from './destinations.js';
import { currentFares } from './fares.js';
import { taxiFareBand } from './taxiFare.js';

/**
 * 2.4 — जाना › टैक्सी. The destination big, in Arabic as well when we have it, the fare the
 * meter is likely to show, one button that opens Careem, and the store for a phone without it.
 * A street taxi gets the same card: the driver reads the Arabic.
 *
 * The hand-off is a link and nothing more. Whether Careem accepts a prefilled drop-off through
 * its link is not something this container can verify, so the address is also one tap to copy.
 */

const CAREEM_APP = 'careem://';
const CAREEM_ANDROID = 'https://play.google.com/store/apps/details?id=com.careem.acma';
const CAREEM_IOS = 'https://apps.apple.com/app/id592978487';

export function TaxiScreen({
  placeId,
  hotel,
}: {
  readonly placeId: string;
  readonly hotel: SavedHotel | undefined;
}) {
  const { t, locale } = useSettings();
  const here = useHere(hotel);
  const [copied, setCopied] = useState(false);

  // Words the matcher did not know arrive as text: an address is still an address to a driver.
  const typed = placeId.startsWith('text:') ? decodeURIComponent(placeId.slice(5)) : undefined;
  const place = typed === undefined ? placeById(placeId) : undefined;

  useEffect(() => {
    if (typed === undefined && !place) navigate({ screen: 'go' });
  }, [typed, place]);
  if (typed === undefined && !place) return null;

  const name = place ? localName(place.name, locale) : (typed ?? '');
  const other = place ? (locale === 'hi' ? place.name.en : place.name.hi) : undefined;
  const arabic = place?.name.ar;
  const address = [name, other, arabic]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' · ');

  const fare = (() => {
    if (!place || here.at === undefined) return null;
    return taxiFareBand(currentFares().taxi, distanceKm(here.at, place.location) * 1000);
  })();

  const copy = () => {
    if (!('clipboard' in navigator)) return;
    void navigator.clipboard.writeText(address).then(
      () => {
        setCopied(true);
      },
      () => undefined,
    );
  };

  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <>
      <ScreenHeader pillar="go" icon="taxi" trail={`${name} › ${t('taxi.trail')}`} />
      <div className="flow">
        <div className="taxi-card">
          <span className="lbl" style={{ paddingTop: 0 }}>
            {t('taxi.going')}
          </span>
          <span className="taxi-name">{name}</span>
          {arabic !== undefined && <span className="taxi-ar">{arabic}</span>}
          {other !== undefined && <span className="muted small">{other}</span>}
          <button
            type="button"
            className="linkish"
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--goText)' }}
            onClick={copy}
          >
            <Icon name="copy" size={18} strokeWidth={2} />
            {copied ? t('taxi.copied') : t('taxi.copy')}
          </button>
        </div>

        {fare !== null && (
          <div className="taxi-fare">
            <span>{t('taxi.fare')}</span>
            <span className="taxi-fare-value">
              {t('unit.fareRange', { min: fare.min, max: fare.max })}
            </span>
          </div>
        )}

        <a className="btn btn-primary" href={CAREEM_APP}>
          <Icon name="external" size={20} strokeWidth={2} />
          {t('taxi.careem')}
        </a>
        <p className="muted small center">
          {t('taxi.noCareem')}{' '}
          <a
            href={ios ? CAREEM_IOS : CAREEM_ANDROID}
            style={{ color: 'var(--marigoldText)', fontWeight: 700 }}
          >
            {t('taxi.getCareem')}
          </a>
        </p>

        <div className="taxi-street">
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t('taxi.street')}</span>
          <span className="muted small">{t('taxi.streetWhy')}</span>
        </div>
      </div>
    </>
  );
}
