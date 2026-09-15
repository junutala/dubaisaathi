import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { Logo } from '../../app/shell/Logo.js';
import { downloadVoskModel, voskModelState } from '../voice/voskStt.js';

/**
 * Screen 1 · लैंडिंग — the first open, and the only place the offline pack is fetched.
 *
 * The voice model used to be an offer on the microphone screen, downloaded by whoever happened
 * to tap it. That is the wrong moment: a traveller taps the mic in a Dubai taxi queue and is
 * told to wait for 42 megabytes on roaming. The owner's instruction is that it comes down with
 * everything else, the first time the app is opened, whether or not they ever intend to speak —
 * because the one time it must not be downloading is the time it is needed.
 *
 * So this screen is the wait, taken once, on whatever wifi they opened the app on.
 *
 * The gate is honest in both directions. शुरू करें waits for the download, because the ledger's
 * line for it is "live only when the app can keep its promise". But a phone with no connection
 * on first open must not be bricked by our own gate: after a failure the button opens the app
 * anyway, because everything except speech already works offline, and typing is the front door
 * (decision 014). A way out is not a way through, and neither is a locked door.
 */

type Phase =
  | { readonly at: 'checking' }
  | { readonly at: 'downloading'; readonly fraction: number }
  | { readonly at: 'ready' }
  /** The download could not happen. The app still opens; only the voice is missing. */
  | { readonly at: 'failed' };

/** Roughly how long 42 MB takes, so the wait is a time rather than a percentage of nothing. */
function minutesLeft(fraction: number, startedAt: number): number | null {
  const elapsed = Date.now() - startedAt;
  if (fraction <= 0.02 || elapsed < 2000) return null;
  const total = elapsed / fraction;
  return Math.max(1, Math.ceil((total - elapsed) / 60_000));
}

export function LandingScreen({ onReady }: { readonly onReady: () => void }) {
  const { t, online } = useSettings();
  const [phase, setPhase] = useState<Phase>({ at: 'checking' });
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let live = true;
    void voskModelState(online).then((state) => {
      if (!live) return;
      if (state === 'cached') {
        setPhase({ at: 'ready' });
        return;
      }
      if (state === 'unavailable') {
        setPhase({ at: 'failed' });
        return;
      }
      startedAt.current = Date.now();
      setPhase({ at: 'downloading', fraction: 0 });
      void downloadVoskModel((fraction) => {
        if (live) setPhase({ at: 'downloading', fraction });
      }).then((done) => {
        if (live) setPhase({ at: done ? 'ready' : 'failed' });
      });
    });
    return () => {
      live = false;
    };
  }, [online]);

  const fraction = phase.at === 'downloading' ? phase.fraction : phase.at === 'ready' ? 1 : 0;
  const minutes =
    phase.at === 'downloading' ? minutesLeft(phase.fraction, startedAt.current) : null;
  const canStart = phase.at === 'ready' || phase.at === 'failed';

  return (
    <div className="flow landing">
      <div className="landing-brand">
        {/* The mark, not a generic speech bubble. This is the one screen a traveller meets
            before they trust us with a 42 MB download, and it was introducing the product with
            an icon that belongs to tile 3. */}
        <Logo size={56} />
        <h1 className="landing-name">{t('app.name')}</h1>
        <p className="landing-usp">{t('landing.usp')}</p>
      </div>

      <ul className="landing-jobs">
        <li>{t('landing.job1')}</li>
        <li>{t('landing.job2')}</li>
        <li>{t('landing.job3')}</li>
      </ul>

      <div className="grow" />

      <div className="stack-sm">
        <p className="lbl">
          {phase.at === 'failed'
            ? t('landing.failed')
            : phase.at === 'ready'
              ? t('landing.ready')
              : minutes === null
                ? t('landing.preparing')
                : t('landing.preparingMinutes', { minutes: String(minutes) })}
        </p>
        <span className="landing-track">
          <span style={{ width: `${String(Math.round(fraction * 100))}%` }} />
        </span>
        <p className="muted small">
          {phase.at === 'failed' ? t('landing.failedWhy') : t('landing.gateWhy')}
        </p>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        data-tap
        disabled={!canStart}
        onClick={onReady}
      >
        {t('landing.start')}
      </button>
      <p className="muted center small">{t('landing.noLogin')}</p>
    </div>
  );
}
