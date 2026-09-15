import type { ParsedIntent } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';

/**
 * The two-button question (design rule 11), and the only place in the app where a sentence stops
 * to ask something.
 *
 * It asks about exactly one thing: a bare place name. "Karama" is रास्ता in a hotel room and खाना
 * at lunchtime, the difference is not in the word, and no parser recovers it — so the traveller
 * taps once (decision 014).
 *
 * It used to have a second face, for a sentence that parsed to nothing: "That did not come
 * through", with buttons offering to hear it again or take it typed. Both of those threw the
 * sentence away, and the second was shown to someone who *had* just typed it. A sentence we
 * cannot parse is not a sentence we cannot use — it now goes to 3.2 and comes out in Arabic
 * (`micRouting.sayItInArabic`), which is the product's actual promise. Nothing reaches this
 * component without a place in it any more, so there is nothing here for it.
 */
export function Clarifier({
  intent,
  onPick,
}: {
  readonly intent: ParsedIntent;
  readonly onPick: (choice: 'route' | 'food') => void;
}) {
  const { t } = useSettings();
  return (
    <div className="listen">
      <p className="listen-state">
        {t('listen.whichOne', { text: intent.destination?.spoken ?? intent.transcript })}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          onPick('route');
        }}
      >
        {t('listen.askRoute')}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          onPick('food');
        }}
      >
        {t('listen.askFood')}
      </button>
    </div>
  );
}
