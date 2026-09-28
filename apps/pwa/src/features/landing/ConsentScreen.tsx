import { useSettings } from '../../app/settings.js';
import { Logo, Wordmark } from '../../app/shell/Logo.js';

/**
 * The data-use notice, once, for a phone that was already past the landing page when it arrived
 * (decision 045). A new phone reads the same line on the landing page, above शुरू करें, and
 * accepts it there; this screen exists only so that nobody who started earlier is left out. One
 * button, which is the acceptance; it never comes back.
 */
export function ConsentScreen({ onAccept }: { readonly onAccept: () => void }) {
  const { t } = useSettings();
  return (
    <div className="landing">
      <div className="landing-brand">
        <Logo size={64} />
        <h1 className="landing-name">
          <Wordmark name={t('app.name')} trail />
        </h1>
        <p className="landing-offline">{t('consent.title')}</p>
        <p className="consent-line">{t('consent.line')}</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={onAccept}>
        {t('consent.accept')}
      </button>
    </div>
  );
}
