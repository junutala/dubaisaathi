import { useSettings } from '../../app/settings.js';
import { href } from '../../app/routes.js';

/**
 * "भुगतान करके आप नियम और शर्तें मानते हैं" and the way to read them (decision 048), under घर.4's pay
 * button — the one moment a traveller agrees to something (decision 057: nothing is accepted to
 * open the app). The link opens घर.10, bundled, so the terms read with the radio off.
 */
export function TermsLine() {
  const { t } = useSettings();
  return (
    <p className="small terms-line">
      <span>{t('terms.acceptLine')}</span>{' '}
      <a className="terms-line-link" href={href({ screen: 'terms' })}>
        {t('terms.read')}
      </a>
    </p>
  );
}
