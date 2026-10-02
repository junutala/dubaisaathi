import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { Icon } from '../../app/shell/icons.js';
import { Logo, Wordmark } from '../../app/shell/Logo.js';
import { TermsLine } from './TermsLine.js';
import { LOCALES, LOCALE_LABEL } from '../../i18n/index.js';
import { precacheCached, precacheTotal } from './precache.js';
import { offlineKitIsDue } from '../../app/offlineKit.js';

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
 *
 * On a phone's first open the kit is not fetched at all (decision 052): the button is live at
 * once, and the box says the pack comes down the next time Saathi is opened — before the trip.
 */
type Phase = 'preparing' | 'ready';

const GIVE_UP_MS = 20_000;
const POLL_MS = 400;

export function LandingScreen({ onReady }: { readonly onReady: () => void }) {
  const { t, locale, setLocale } = useSettings();
  const [later] = useState(() => !offlineKitIsDue());
  const [phase, setPhase] = useState<Phase>(later ? 'ready' : 'preparing');
  const [fraction, setFraction] = useState(0);

  useEffect(() => {
    if (later) return;
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
  }, [later]);

  return (
    <div className="landing">
      <div className="landing-brand">
        <Logo size={80} />
        <h1 className="landing-name">
          <Wordmark name={t('app.name')} trail />
        </h1>
        <p className="landing-offline">{t('landing.offline')}</p>
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

      {later ? (
        <div className="landing-pack">
          <span className="landing-pack-head">
            <span>{t('landing.later')}</span>
          </span>
          <span className="muted small">{t('landing.laterWhen')}</span>
        </div>
      ) : (
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
      )}

      {/* What we keep, and the terms, said once above the one button that starts the app — which
          is also the traveller accepting both (decisions 045 and 048). No decline, never again
          for the same terms. */}
      <p className="small consent-line">{t('consent.line')}</p>
      <TermsLine />
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
