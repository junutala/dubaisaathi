import { useEffect, useMemo, useState } from 'react';
import type { ParsedIntent } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import { HeardBanner } from '../voice/HeardBanner.js';
import { destinationPhrase, destinationPhraseId } from '../phrases/destinationPhrase.js';
import type { StringKey } from '../../i18n/index.js';
import { localName, placeById } from './destinations.js';
import { askForLocation, type Location } from './location.js';
import { planRoutes, type RouteBadge, type RouteOption } from './routePlanner.js';
import { useTransportNetwork } from './useNetwork.js';
import { fareText, legSummary, minutes, modeIcon, modeLabel, type Words } from './describeLeg.js';

/**
 * 1.3 — रास्ता › विकल्प
 *
 * The decision a traveller is actually making is time against cost against how much of it is on
 * foot, so every card carries all three and the badge says which one it wins. Everything on this
 * screen is computed on the phone from the pack, with the radio off (rule 1) — and because an
 * offline pack cannot know about a delayed bus, the last line says so rather than pretending.
 */

const BADGE_KEY = {
  easiest: 'options.easiest',
  fastest: 'options.fastest',
  cheapest: 'options.cheapest',
} as const satisfies Record<RouteBadge, StringKey>;

export function RouteOptionsScreen({
  placeId,
  onMic,
  heard,
}: {
  readonly placeId: string;
  readonly onMic: () => void;
  readonly heard?: ParsedIntent | undefined;
}) {
  const { t, locale } = useSettings();
  const network = useTransportNetwork();
  const [location, setLocation] = useState<Location>({ kind: 'asking' });
  const destination = placeById(placeId);

  useEffect(() => {
    let live = true;
    void askForLocation().then((answer) => {
      if (!live) return;
      // The phone refused. 1.1b is the screen that says what that costs; this one cannot.
      if (answer.kind === 'denied') navigate({ screen: 'nolocation' });
      else setLocation(answer);
    });
    return () => {
      live = false;
    };
  }, []);

  // A place id that is not in the pack can only have come from a hand-edited address bar. The
  // screen that knows what to do with an unknown place is 1.1, so go there rather than paint
  // a header for a journey to nowhere.
  useEffect(() => {
    if (!destination) navigate({ screen: 'transport' });
  }, [destination]);

  const options = useMemo(() => {
    if (!network || !destination || location.kind !== 'here') return null;
    return planRoutes(network, location.at, destination);
  }, [network, destination, location]);

  if (!destination) return null;
  const place = localName(destination.name, locale);
  const words: Words | null = network ? { t, locale, network, destination } : null;

  return (
    <>
      <ScreenHeader
        title={t('options.title', { place })}
        tile="transport"
        trail={t('options.trail')}
      />
      <div className="flow">
        {heard && <HeardBanner intent={heard} />}

        <div className="from-to">
          <span className="muted">{t('options.from')}</span>
          <Icon name="right" size={18} strokeWidth={1.9} color="var(--muted)" />
          <span className="from-to-place">{place}</span>
        </div>

        {options === null && <p className="muted center">{t('options.planning')}</p>}

        {options !== null && options.length === 0 && (
          // Never a dead end: we cannot work out the way from here, and we say so — but the
          // sentence that gets a driver to take them there needs no location at all, so it is
          // the way forward on this screen (decision 014).
          <div className="stack-sm">
            <p className="trouble">{t('options.noRoute')}</p>
            <p className="muted small">{t('options.noRouteWhy')}</p>
            {destinationPhrase(destination) !== null && (
              <button
                type="button"
                className="btn btn-primary"
                data-tap
                onClick={() => {
                  navigate({ screen: 'arabic', phraseId: destinationPhraseId(destination.id) });
                }}
              >
                <Icon name="talk" size={21} strokeWidth={1.8} />
                {t('options.showDriver')}
              </button>
            )}
          </div>
        )}

        {words !== null && options !== null && options.length > 0 && (
          <div className="rows">
            {options.map((option) => (
              <OptionCard key={option.id} option={option} words={words} placeId={placeId} />
            ))}
          </div>
        )}

        <p className="muted small">{t('options.estimate')}</p>
        <div className="grow" />
      </div>
      <QuickBar current="transport" onMic={onMic} />
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
  return (
    <button
      type="button"
      className="opt"
      data-tap
      onClick={() => {
        navigate({ screen: 'steps', placeId, optionId: option.id });
      }}
    >
      <span className="opt-top">
        <span className="opt-icon">
          <Icon name={modeIcon(option.mode)} size={22} strokeWidth={1.8} color="var(--indigo)" />
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
          <span className="muted small">{fareText(words, option)}</span>
        </span>
        <span className="opt-time">{minutes(words, option.route.totalDurationSeconds)}</span>
      </span>
      <span className="opt-legs">
        {option.route.legs.map((leg, index) => (
          <span key={`${leg.mode}-${leg.fromNodeId}-${leg.toNodeId}`} className="opt-leg">
            {index > 0 && <span className="opt-sep">›</span>}
            <Icon name={modeIcon(leg.mode)} size={17} strokeWidth={1.9} color="var(--muted)" />
            {legSummary(words, leg)}
          </span>
        ))}
      </span>
    </button>
  );
}
