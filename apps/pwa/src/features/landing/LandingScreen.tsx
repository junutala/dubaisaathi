import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { Logo } from '../../app/shell/Logo.js';
import { LOCALES, LOCALE_LABEL } from '../../i18n/index.js';

/**
 * L · लैंडिंग — the first open, and the only place the offline pack is waited for.
 *
 * The pack is the app itself: the service worker precaches every screen, the fonts and the
 * content packs on install, and that install is what शुरू करें waits for. A phone with no
 * connection on first open must not be bricked by our own gate, so after a few seconds without
 * an answer the button opens the app anyway — everything the traveller can see is in the bundle.
 */
type Phase = 'preparing' | 'ready';

const GIVE_UP_MS = 6000;

export function LandingScreen({ onReady }: { readonly onReady: () => void }) {
  const { t, locale, setLocale } = useSettings();
  const [phase, setPhase] = useState<Phase>('preparing');

  useEffect(() => {
    let live = true;
    const done = () => {
      if (live) setPhase('ready');
    };
    const timer = window.setTimeout(done, GIVE_UP_MS);
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready.then(done, done);
    } else {
      done();
    }
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="landing">
      <div className="landing-brand">
        <Logo size={96} />
        <h1 className="landing-name">{t('app.name')}</h1>
        <p className="landing-usp">{t('landing.usp')}</p>
        <div className="landing-langs">
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              className={option === locale ? 'landing-lang landing-lang-on' : 'landing-lang'}
              onClick={() => {
                setLocale(option);
              }}
            >
              {LOCALE_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="landing-pack">
        <span className="landing-pack-head">
          <span>{phase === 'ready' ? t('landing.ready') : t('landing.preparing')}</span>
        </span>
        <span className="landing-track">
          <span style={{ width: phase === 'ready' ? '100%' : '35%' }} />
        </span>
        <span className="muted small">{t('landing.packWhat')}</span>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={phase !== 'ready'}
        onClick={onReady}
      >
        {t('landing.start')}
      </button>
      <p className="muted center small" style={{ marginBottom: 0 }}>
        {t('landing.noLogin')}
      </p>
    </div>
  );
}
