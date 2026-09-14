import type { ReactNode } from 'react';
import type { ParsedIntent } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';

/**
 * The two-button question (design rule 11). A bare place name could be a route or a restaurant;
 * a sentence that parsed to nothing gets the same treatment. Either way the traveller taps once
 * and moves on — ambiguity never becomes a dead end.
 *
 * `actions` is what to offer when nothing was understood at all, because that differs by where
 * the sentence came from: the mic screen offers another attempt at speaking, the ask bar offers
 * the box back. The question itself is the same everywhere, so it lives here once.
 */
export function Clarifier({
  intent,
  onPick,
  actions,
}: {
  readonly intent: ParsedIntent;
  readonly onPick: (choice: 'route' | 'food') => void;
  readonly actions: ReactNode;
}) {
  const { t } = useSettings();
  const known = intent.kind === 'place';

  return (
    <div className="listen">
      <p className="listen-state">
        {known
          ? t('listen.whichOne', { text: intent.destination?.spoken ?? intent.transcript })
          : t('listen.notUnderstood')}
      </p>
      {known ? (
        <>
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
        </>
      ) : (
        <>
          <p className="muted center">{t('listen.notUnderstoodWhy')}</p>
          {actions}
        </>
      )}
    </div>
  );
}
