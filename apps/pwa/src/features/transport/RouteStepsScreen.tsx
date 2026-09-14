import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import { localName, placeById } from './destinations.js';
import { askForLocation, type Location } from './location.js';
import { planRoutes, type RouteOptionId } from './routePlanner.js';
import { useTransportNetwork } from './useNetwork.js';
import { fareText, legStep, minutes, modeLabel, type Words } from './describeLeg.js';

/**
 * 1.4 — रास्ता › क़दम दर क़दम
 *
 * What to expect before starting, then the legs in order with a time on each. The journey is
 * planned again from the same pack rather than carried here in the address bar, so refreshing
 * the page in a metro tunnel gives the same instructions instead of a blank screen.
 */
export function RouteStepsScreen({
  placeId,
  optionId,
  onMic,
}: {
  readonly placeId: string;
  readonly optionId: RouteOptionId;
  readonly onMic: () => void;
}) {
  const { t, locale } = useSettings();
  const network = useTransportNetwork();
  const [location, setLocation] = useState<Location>({ kind: 'asking' });
  const destination = placeById(placeId);

  useEffect(() => {
    let live = true;
    void askForLocation().then((answer) => {
      if (!live) return;
      if (answer.kind === 'denied') navigate({ screen: 'nolocation' });
      else setLocation(answer);
    });
    return () => {
      live = false;
    };
  }, []);

  const option = useMemo(() => {
    if (!network || !destination || location.kind !== 'here') return null;
    return planRoutes(network, location.at, destination).find((o) => o.id === optionId) ?? null;
  }, [network, destination, location, optionId]);

  // Either the place or the option is gone — a stale bookmark, or a pack update that dropped a
  // bus route. 1.3 can still answer "how do I get there", so that is where they go.
  useEffect(() => {
    if (!destination) navigate({ screen: 'transport' });
  }, [destination]);

  if (!destination) return null;
  const place = localName(destination.name, locale);
  const words: Words | null = network ? { t, locale, network, destination } : null;

  return (
    <>
      <ScreenHeader
        title={
          words && option ? t('steps.title', { mode: modeLabel(words, option.mode), place }) : place
        }
        tile="transport"
        trail={t('steps.trail')}
        onBack={() => {
          navigate({ screen: 'options', placeId });
        }}
      />
      <div className="flow">
        {(!words || !option) && <p className="muted center">{t('options.planning')}</p>}

        {words && option && (
          <>
            <div className="totals">
              <span className="total">
                <span className="total-value">
                  {minutes(words, option.route.totalDurationSeconds)}
                </span>
                <span className="total-label">{t('steps.totalTime')}</span>
              </span>
              <span className="total-rule" />
              <span className="total">
                <span className="total-value">{fareText(words, option)}</span>
                <span className="total-label">{t('steps.fare')}</span>
              </span>
              <span className="total-rule" />
              <span className="total">
                <span className="total-value">{minutes(words, option.route.walkingSeconds)}</span>
                <span className="total-label">{t('steps.walking')}</span>
              </span>
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
                      <Icon name={step.icon} size={21} strokeWidth={1.8} color="var(--indigo)" />
                    </span>
                    <span className="leg-body">
                      <span className="leg-head">
                        <span className="leg-title">{step.title}</span>
                        <span className="leg-time">{step.time}</span>
                      </span>
                      <span className="muted small">{step.detail}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="grow" />
      </div>
      <QuickBar current="transport" onMic={onMic} />
    </>
  );
}
