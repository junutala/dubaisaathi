import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { localName } from './destinations.js';
import type { RouteOptionId } from './routePlanner.js';
import { useTransportNetwork } from './useNetwork.js';
import {
  alertFor,
  onFix,
  onTick,
  rideOf,
  startRide,
  stopsLeft,
  tapStop,
  type RideAlert,
  type RideProgress,
} from './rideProgress.js';

/**
 * 2.7 — जाना › सवारी. "I'm on this bus": the stops left to the one the traveller gets off at,
 * counted along the line's own stops, with a buzz when the next stop is theirs and again when
 * they are there (Sprint 2, the owner's; decision 051).
 *
 * The ride arrives whole in the address — line, direction, boarding and alighting stop — and is
 * never planned again here: the planner starts from where the phone is, and on a moving bus that
 * changes every few seconds.
 *
 * Everything the phone is asked to do it is asked, and what it said goes on the screen (CLAUDE.md:
 * never tell a traveller their phone cannot do something until it has refused): the location
 * watch, keeping the screen on, the vibration. None of it is needed for the count to go on — the
 * timetable carries it, and a tap on a stop corrects it.
 */

const TICK_MS = 5_000;

type Asked =
  | { readonly kind: 'asking' }
  | { readonly kind: 'yes' }
  | { readonly kind: 'no'; readonly why: string };

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message || error.name : String(error);
}

/** A short beep, made on the phone with no file and no network. */
function beep(times: number): void {
  try {
    const scope = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Context = scope.AudioContext ?? scope.webkitAudioContext;
    if (Context === undefined) return;
    const audio = new Context();
    void audio.resume();
    for (let i = 0; i < times; i++) {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.frequency.value = 880;
      gain.gain.value = 0.25;
      tone.connect(gain).connect(audio.destination);
      const start = audio.currentTime + i * 0.45;
      tone.start(start);
      tone.stop(start + 0.25);
    }
  } catch {
    /* no sound either; the screen still says it in words */
  }
}

export function RideScreen({
  placeId,
  optionId,
  line,
  direction,
  from,
  to,
}: {
  readonly placeId: string;
  readonly optionId: RouteOptionId;
  readonly line: string;
  readonly direction: 0 | 1 | undefined;
  readonly from: string;
  readonly to: string;
}) {
  const { t, locale } = useSettings();
  const network = useTransportNetwork();
  const ride = useMemo(
    () => (network ? rideOf(network, line, direction, from, to) : null),
    [network, line, direction, from, to],
  );
  const [progress, setProgress] = useState<RideProgress>(() => startRide(Date.now()));
  const [gps, setGps] = useState<Asked>({ kind: 'asking' });
  const [screen, setScreen] = useState<Asked>({ kind: 'asking' });
  const [buzz, setBuzz] = useState<Asked>({ kind: 'asking' });

  // Where the vehicle is: every fix the phone gives, for as long as the ride is on screen.
  useEffect(() => {
    if (!ride) return;
    if (!('geolocation' in navigator)) {
      setGps({ kind: 'no', why: 'geolocation' });
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setGps({ kind: 'yes' });
        setProgress((current) =>
          onFix(
            current,
            ride,
            {
              at: { lat: position.coords.latitude, lng: position.coords.longitude },
              accuracyM: position.coords.accuracy,
            },
            Date.now(),
          ),
        );
      },
      (error) => {
        setGps({ kind: 'no', why: error.message || String(error.code) });
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
    };
  }, [ride]);

  // The timetable, for the tunnels and for any minute the GPS goes quiet.
  useEffect(() => {
    if (!ride) return;
    const timer = window.setInterval(() => {
      setProgress((current) => onTick(current, ride, Date.now()));
    }, TICK_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [ride]);

  // The screen kept on, asked again whenever the page comes back into view, as the API needs.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const ask = async () => {
      if (!('wakeLock' in navigator)) {
        setScreen({ kind: 'no', why: 'wakeLock' });
        return;
      }
      try {
        const held = await navigator.wakeLock.request('screen');
        if (gone) {
          void held.release();
          return;
        }
        lock = held;
        setScreen({ kind: 'yes' });
      } catch (error) {
        setScreen({ kind: 'no', why: reasonOf(error) });
      }
    };
    const again = () => {
      if (document.visibilityState === 'visible') void ask();
    };
    void ask();
    document.addEventListener('visibilitychange', again);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', again);
      void lock?.release().catch(() => undefined);
    };
  }, []);

  const left = ride ? stopsLeft(progress, ride) : null;
  const before = useRef<number | null>(null);
  useEffect(() => {
    if (left === null) return;
    const previous = before.current;
    before.current = left;
    if (previous === null) return;
    const alert: RideAlert | null = alertFor(previous, left);
    if (alert === null) return;
    const pattern = alert === 'you-are-here' ? [600, 200, 600, 200, 600] : [400, 200, 400];
    let vibrated = false;
    try {
      vibrated = typeof navigator.vibrate === 'function' && navigator.vibrate(pattern);
    } catch {
      vibrated = false;
    }
    setBuzz(vibrated ? { kind: 'yes' } : { kind: 'no', why: 'vibrate' });
    // The beep goes with the buzz either way: a phone in a pocket on a loud bus needs both.
    beep(alert === 'you-are-here' ? 3 : 2);
  }, [left]);

  const back = () => {
    navigate({ screen: 'steps', placeId, optionId });
  };

  const lineName = (() => {
    const known = network?.lines.find((candidate) => candidate.id === line);
    return known ? localName(known.name, locale) : line;
  })();

  if (!network) {
    return (
      <>
        <ScreenHeader pillar="go" trail={t('ride.trail')} onBack={back} />
        <div className="flow">
          <p className="muted center">{t('options.planning')}</p>
        </div>
      </>
    );
  }

  if (!ride || left === null) {
    return (
      <>
        <ScreenHeader pillar="go" trail={t('ride.trail')} onBack={back} />
        <div className="flow">
          <p className="trouble">{t('ride.notFound')}</p>
          <button type="button" className="btn btn-ghost" onClick={back}>
            {t('ride.end')}
          </button>
        </div>
      </>
    );
  }

  const last = ride.stops[ride.stops.length - 1];
  const stopName = last ? localName(last.name, locale) : '';

  return (
    <>
      <ScreenHeader pillar="go" trail={`${lineName} › ${t('ride.trail')}`} onBack={back} />
      <div className="flow">
        <div className={left <= 1 ? 'ride-card ride-card-near' : 'ride-card'}>
          <span className="ride-off">{t('ride.getOff', { stop: stopName })}</span>
          <span className="ride-count">
            {left === 0
              ? t('ride.here')
              : left === 1
                ? t('ride.leftOne')
                : t('ride.left', { count: left })}
          </span>
          <span className="muted small">{t(`ride.how.${progress.how}`)}</span>
        </div>

        <ol className="ride-stops">
          {ride.stops.map((stop, index) => {
            const state =
              index < progress.at
                ? 'ride-stop ride-stop-passed'
                : index === progress.at
                  ? 'ride-stop ride-stop-now'
                  : index === ride.stops.length - 1
                    ? 'ride-stop ride-stop-off'
                    : 'ride-stop';
            return (
              <li key={stop.id}>
                <button
                  type="button"
                  className={state}
                  onClick={() => {
                    setProgress((current) => tapStop(current, index, Date.now()));
                  }}
                >
                  <span className="ride-stop-name">{localName(stop.name, locale)}</span>
                  {index === progress.at && (
                    <span className="ride-stop-tag">{t('ride.stopNow')}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <p className="muted small">{t('ride.every')}</p>
        {screen.kind === 'yes' && <p className="muted small">{t('ride.screenOn')}</p>}
        {screen.kind === 'no' && (
          <p className="muted small">{t('ride.screenOff', { why: screen.why })}</p>
        )}
        {gps.kind === 'no' && <p className="muted small">{t('ride.gpsOff', { why: gps.why })}</p>}
        {buzz.kind === 'no' && <p className="muted small">{t('ride.buzzOff')}</p>}

        <button type="button" className="btn btn-ghost" onClick={back}>
          {t('ride.end')}
        </button>
      </div>
    </>
  );
}
