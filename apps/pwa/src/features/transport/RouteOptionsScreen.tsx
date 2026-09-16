import { useEffect, useMemo } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import type { SavedHotel } from '../info/index.js';
import { distanceKm, distanceLabel } from '../../lib/distance.js';
import { localName, placeById } from './destinations.js';
import { VIRTUAL_HERE_NAME } from '../../lib/dubai.js';
import { useOrigin } from './origin.js';
import { planRoutes, type RouteBadge, type RouteOption } from './routePlanner.js';
import { useTransportNetwork } from './useNetwork.js';
import { fareText, legSummary, minutes, modeIcon, modeLabel, type Words } from './describeLeg.js';

/**
 * 2.2 — जाना › विकल्प. From where the traveller is (or their hotel) to the place they named:
 * every way there, with the time and the fare on each, and the badge that says why it is on the
 * list. Computed on the phone from the pack with the radio off (rule 1), so the last line says
 * the numbers are estimates rather than pretending to a timetable it cannot have.
 */

const BADGE_KEY = {
  easiest: 'options.easiest',
  fastest: 'options.fastest',
  cheapest: 'options.cheapest',
} as const satisfies Record<RouteBadge, StringKey>;

export function RouteOptionsScreen({
  placeId,
  hotel,
}: {
  readonly placeId: string;
  readonly hotel: SavedHotel | undefined;
}) {
  const { t, locale } = useSettings();
  const network = useTransportNetwork();
  const origin = useOrigin(hotel);
  const destination = placeById(placeId);

  useEffect(() => {
    if (origin.kind === 'none' && origin.denied) navigate({ screen: 'nolocation' });
  }, [origin]);

  // A place id that is not in the pack can only have come from a hand-edited address bar. The
  // screen that knows what to do with an unknown place is 2.1.
  useEffect(() => {
    if (!destination) navigate({ screen: 'go' });
  }, [destination]);

  const options = useMemo(() => {
    if (!network || !destination || origin.kind === 'asking' || origin.kind === 'none') return null;
    return planRoutes(network, origin.at, destination);
  }, [network, destination, origin]);

  if (!destination) return null;
  const place = localName(destination.name, locale);
  const words: Words | null = network ? { t, locale, network, destination } : null;
  const km =
    origin.kind === 'phone' || origin.kind === 'hotel' || origin.kind === 'virtual'
      ? distanceKm(origin.at, destination.location)
      : undefined;

  return (
    <>
      <ScreenHeader pillar="go" trail={place} />
      <div className="flow">
        <div className="from-to">
          <span className="from-to-row">
            <span className="from-to-dot" style={{ background: 'var(--marigold)' }} />
            <span>
              {origin.kind === 'hotel'
                ? `${hotel?.name ?? t('options.from')} · ${t('options.from')}`
                : origin.kind === 'virtual'
                  ? t('options.fromVirtual', { place: VIRTUAL_HERE_NAME[locale] })
                  : t('options.fromHere')}
            </span>
          </span>
          <span className="from-to-row">
            <span className="from-to-dot" style={{ background: 'var(--go)' }} />
            <span className="from-to-place">{place}</span>
            {km !== undefined && <span className="muted small">· {distanceLabel(t, km)}</span>}
          </span>
        </div>

        <p className="lbl">{t('options.how')}</p>

        {options === null && origin.kind !== 'none' && (
          <p className="muted center">{t('options.planning')}</p>
        )}

        {(origin.kind === 'none' || (options !== null && options.length === 0)) && (
          <div className="stack-sm">
            <p className="trouble">{t('options.noRoute')}</p>
            <p className="muted small">{t('options.noRouteWhy')}</p>
          </div>
        )}

        {words !== null && options !== null && options.length > 0 && (
          <div className="rows">
            {options.map((option) => (
              <OptionCard key={option.id} option={option} words={words} placeId={placeId} />
            ))}
          </div>
        )}

        {/* The taxi is always there, even when nothing can be planned: it needs no location. */}
        {(origin.kind === 'none' || (options !== null && options.length === 0)) && (
          <button
            type="button"
            className="btn btn-go"
            onClick={() => {
              navigate({ screen: 'taxi', placeId });
            }}
          >
            <Icon name="taxi" size={20} strokeWidth={1.9} />
            {t('mode.taxi')}
          </button>
        )}

        <p className="muted small center">{t('options.estimate')}</p>
      </div>
    </>
  );
}

function OptionCard({
  option,
  words,
  placeId,
}: {
  readonly option: RouteOption;
  readonly words: Words;
  readonly placeId: string;
}) {
  const { t } = useSettings();
  const detail =
    option.mode === 'taxi'
      ? t('options.taxiDetail')
      : option.mode === 'walk'
        ? t('options.walkDetail')
        : option.route.legs.map((leg) => legSummary(words, leg)).join(' · ');
  return (
    <button
      type="button"
      className="opt"
      data-tap
      onClick={() => {
        if (option.mode === 'taxi') navigate({ screen: 'taxi', placeId });
        else navigate({ screen: 'steps', placeId, optionId: option.id });
      }}
    >
      <span className="opt-top">
        <span className="opt-icon">
          <Icon name={modeIcon(option.mode)} size={24} strokeWidth={1.9} color="var(--goText)" />
        </span>
        <span className="opt-what">
          <span className="opt-head">
            <span className="opt-name">{modeLabel(words, option.mode)}</span>
            {option.badges.map((badge) => (
              <span key={badge} className="opt-badge">
                {words.t(BADGE_KEY[badge])}
              </span>
            ))}
          </span>
          <span className="muted small">{detail}</span>
        </span>
        <span className="opt-right">
          <span className="opt-time">{minutes(words, option.route.totalDurationSeconds)}</span>
          <span className="opt-fare">{fareText(words, option)}</span>
        </span>
      </span>
    </button>
  );
}
