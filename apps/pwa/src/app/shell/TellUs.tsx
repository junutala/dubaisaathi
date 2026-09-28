import { useSettings } from '../settings.js';
import { navigate } from '../routes.js';
import { Icon } from './icons.js';

/**
 * "यह नहीं मिला? बताइए — हम जोड़ेंगे" — the button every search that found nothing carries
 * (decision 046). It opens सुझाव with what the traveller typed already written in, so the gap
 * is reported where it was noticed and they never type it twice.
 */
export function TellUs({ about }: { readonly about?: string }) {
  const { t } = useSettings();
  const words = about?.trim() ?? '';
  return (
    <button
      type="button"
      className="btn btn-primary tell-us"
      onClick={() => {
        navigate(words === '' ? { screen: 'contribute' } : { screen: 'contribute', about: words });
      }}
    >
      <Icon name="bulb" size={20} strokeWidth={1.9} />
      {t('contribute.notFound')}
    </button>
  );
}
