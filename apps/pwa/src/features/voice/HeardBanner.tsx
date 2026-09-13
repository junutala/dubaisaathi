import type { ParsedIntent } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';

/**
 * "आपने कहा: …" at the top of whichever screen the mic opened (design rule 10). One component
 * in one place, because the traveller's question is always the same: is this screen answering
 * what I actually asked? If it is not, the back arrow is one tap away.
 */
export function HeardBanner({ intent }: { readonly intent: ParsedIntent }) {
  const { t } = useSettings();
  return (
    <div className="heard">
      <span className="heard-label">{t('listen.heard')}</span>
      <span className="heard-text">“{intent.transcript}”</span>
    </div>
  );
}
