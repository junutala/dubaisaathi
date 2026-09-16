import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { Icon } from '../../app/shell/icons.js';
import { Logo } from '../../app/shell/Logo.js';
import { LOCALES, LOCALE_LABEL } from '../../i18n/index.js';
import { precacheCached, precacheTotal } from './precache.js';

/**
 * L · लैंडिंग — the first open, and the only place the offline pack is waited for.
 *
 * The pack is the app itself: the service worker precaches every screen, the fonts and the
 * content packs on install, and शुरू करें waits for that to finish — measured, not drawn: the
 * bar is files landed over files in the worker's manifest. A phone with no connection on first
 * open must not be bricked by our own gate, so after a while without an answer the button opens
 * the app anyway; everything the traveller can see is in the bundle.
 *
 * And it says what offline means, in big words, because it is the one reason to install.
 */
type Phase = 'preparing' | 'ready';

const GIVE_UP_MS = 20_000;
const POLL_MS = 400;

export function LandingScreen({ onReady }: { readonly onReady: () => void }) {
  const { t, locale, setLocale } = useSettings();
  const [phase, setPhase] = useState<Phase>('preparing');
  const [fraction, setFraction] = useState(0);

  useEffect(() => {
    let live = true;
    let total: number | null = null;
    const done = () => {
      if (!live) return;
      setFraction(1);
      setPhase('ready');
    };
    const giveUp = window.setTimeout(done, GIVE_UP_MS);
    void precacheTotal().then((n) => {
      total = n;
    });
    const poll = window.setInterval(() => {
      void precacheCached().then((cached) => {
        if (!live) return;
        if (total !== null && total > 0) {
          setFraction(Math.min(1, cached / total));
          if (cached >= total) {
            window.clearInterval(poll);
            window.clearTimeout(giveUp);
            done();
          }
        }
      });
    }, POLL_MS);
    return () => {
      live = false;
      window.clearInterval(poll);
      window.clearTimeout(giveUp);
    };
  }, []);

  return (
    <div className="landing">
      <div className="landing-brand">
        <Logo size={80} />
        <h1 className="landing-name">{t('app.name')}</h1>
        <p className="landing-offline">{t('landing.offline')}</p>
        <p className="landing-usp">{t('landing.usp')}</p>
        <ul className="landing-jobs">
          {(['landing.job1', 'landing.job2', 'landing.job3', 'landing.job4'] as const).map(
            (key) => (
              <li key={key}>
                <Icon name="check" size={18} strokeWidth={2.4} color="var(--teal)" />
                {t(key)}
              </li>
            ),
          )}
        </ul>
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
          <span style={{ width: `${String(Math.round(fraction * 100))}%` }} />
        </span>
        <span className="muted small">
          {phase === 'ready' ? t('landing.tryIt') : t('landing.packWhat')}
        </span>
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
