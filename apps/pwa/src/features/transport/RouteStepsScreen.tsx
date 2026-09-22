import { useEffect, useMemo } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { SavedHotel } from '../info/index.js';
import { localName, placeById } from './destinations.js';
import { VIRTUAL_HERE_NAME } from '../../lib/dubai.js';
import { useOrigin } from './origin.js';
import { currentFares } from './fares.js';
import { planRoutes, type RouteOptionId } from './routePlanner.js';
import { useTransportNetwork } from './useNetwork.js';
import { fareText, legStep, minutes, modeLabel, type Words } from './describeLeg.js';

/**
 * 2.3 — जाना › क़दम दर क़दम. The time and the fare in one line, then the legs in order, each
 * with a time on it. The journey is planned again from the same pack rather than carried here
 * in the address bar, so refreshing the page in a metro tunnel gives the same instructions.
 *
 * A ride step also says which way the vehicle is headed and the first and last departure from
 * the stop it boards at, from the RTA feed: the "is it still running" answer, on the step where
 * it is asked. The RTA's attribution line closes the screen, as the licence asks.
 */
export function RouteStepsScreen({
  placeId,
  optionId,
  hotel,
}: {
  readonly placeId: string;
  readonly optionId: RouteOptionId;
  readonly hotel: SavedHotel | undefined;
}) {
  const { t, locale } = useSettings();
  const network = useTransportNetwork();
  const origin = useOrigin(hotel);
  const destination = placeById(placeId);

  useEffect(() => {
    if (origin.kind === 'none')
      navigate(origin.denied ? { screen: 'nolocation' } : { screen: 'options', placeId });
  }, [origin, placeId]);

  const option = useMemo(() => {
    if (!network || !destination || origin.kind === 'asking' || origin.kind === 'none') return null;
    return (
      planRoutes(network, origin.at, destination, currentFares()).find((o) => o.id === optionId) ??
      null
    );
  }, [network, destination, origin, optionId]);

  useEffect(() => {
    if (!destination) navigate({ screen: 'go' });
  }, [destination]);

  if (!destination) return null;
  const place = localName(destination.name, locale);
  const originName =
    origin.kind === 'hotel'
      ? (hotel?.name ?? t('options.from'))
      : origin.kind === 'virtual'
        ? VIRTUAL_HERE_NAME[locale]
        : undefined;
  const words: Words | null = network
    ? {
        t,
        locale,
        network,
        destination,
        ...(originName === undefined ? {} : { origin: originName }),
      }
    : null;
  const other: RouteOptionId = optionId === 'bus' ? 'metro' : 'bus';

  return (
    <>
      <ScreenHeader
        pillar="go"
        trail={words && option ? `${place} › ${modeLabel(words, option.mode)}` : place}
        onBack={() => {
          navigate({ screen: 'options', placeId });
        }}
      />
      <div className="flow">
        {(!words || !option) && <p className="muted center">{t('options.planning')}</p>}

        {words && option && (
          <>
            <div
              className="suggest"
              style={{ background: 'var(--goSoft)', color: 'var(--goText)' }}
            >
              <span className="suggest-text" style={{ fontWeight: 700 }}>
                {t('steps.summary', {
                  time: minutes(words, option.route.totalDurationSeconds),
                  fare: fareText(words, option),
                })}
                {option.mode === 'metro' || option.mode === 'bus' ? ` · ${t('steps.nol')}` : ''}
              </span>
              <Icon name="clock" size={18} strokeWidth={2} />
            </div>

            <div className="legs">
              {option.route.legs.map((leg, index) => {
                const step = legStep(words, leg);
                return (
                  <div
                    key={`${leg.mode}-${leg.fromNodeId}-${leg.toNodeId}`}
                    className={index === option.route.legs.length - 1 ? 'leg leg-last' : 'leg'}
                  >
                    <span className="leg-icon">
                      <Icon name={step.icon} size={20} strokeWidth={1.9} color="var(--goText)" />
                    </span>
                    <span className="leg-body">
                      <span className="leg-head">
                        <span className="leg-title">{step.title}</span>
                        <span className="leg-time">{step.time}</span>
                      </span>
                      <span className="muted small">{step.detail}</span>
                      {step.service !== undefined && (
                        <span className="leg-service">{step.service}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {option.route.legs.some((leg) => leg.firstDeparture !== undefined) && (
              <p className="muted small leg-note">{t('steps.serviceNote')}</p>
            )}
          </>
        )}

        <div className="grow" />
        <div className="grid2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              navigate({ screen: 'steps', placeId, optionId: other });
            }}
          >
            <Icon name={other === 'bus' ? 'bus' : 'metro'} size={20} strokeWidth={1.9} />
            {t(other === 'bus' ? 'steps.seeBus' : 'steps.seeMetro')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              navigate({ screen: 'taxi', placeId });
            }}
          >
            <Icon name="taxi" size={20} strokeWidth={1.9} />
            {t('steps.taxi')}
          </button>
        </div>
        {network && (
          <p className="muted tiny center attribution">
            {t('steps.source', { attribution: network.attribution })}
          </p>
        )}
      </div>
    </>
  );
}
