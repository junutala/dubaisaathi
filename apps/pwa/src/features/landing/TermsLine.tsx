import { useSettings } from '../../app/settings.js';
import { href } from '../../app/routes.js';

/**
 * "जारी रखकर आप नियम और शर्तें मानते हैं" and the way to read them (decision 048), above the one
 * button on the landing page and on the one-time notice. The link opens घर.10, bundled, so the
 * terms read with the radio off; its back returns here.
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
