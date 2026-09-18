import { useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { SavedHotel } from '../info/index.js';
import { askForLocation, forgetLocation } from '../../lib/location.js';

/**
 * 2.5 — जाना › जगह की इजाज़त नहीं. The phone's permission is the phone's to give, and nothing
 * here overrides it. So this screen says plainly what stopped working, what still works, offers
 * the one thing that can fix it, and gets out of the way (design rule 18).
 */
export function LocationDeniedScreen({ hotel }: { readonly hotel: SavedHotel | undefined }) {
  const { t } = useSettings();
  /** Only after the phone has been asked again and said no again — never as a guess. */
  const [stillRefused, setStillRefused] = useState(false);

  return (
    <>
      <ScreenHeader
        pillar="go"
        onBack={() => {
          navigate({ screen: 'go' });
        }}
      />
      <div className="flow" style={{ paddingTop: 20 }}>
        <span className="lost-mark">
          <Icon name="pin" size={32} strokeWidth={1.7} color="var(--marigold)" />
        </span>
        <h1 className="lost-heading">{t('noLocation.title')}</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{t('noLocation.why')}</p>

        <div className="lost-still">
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t('noLocation.still')}</span>
          <span className="muted small">{t('noLocation.stillWhat')}</span>
        </div>

        {/* The web cannot open the phone's settings app. What it can do is ask again, which is
            what actually unblocks a traveller who has just turned the setting back on. If the
            phone refuses a second time, the screen says where the switch is — after the device
            has answered, never before it (CLAUDE.md). */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            forgetLocation();
            void askForLocation().then((answer) => {
              if (answer.kind === 'here') navigate({ screen: 'go' });
              else setStillRefused(true);
            });
          }}
        >
          {t('noLocation.settings')}
        </button>
        {stillRefused && <p className="muted small">{t('noLocation.stillRefused')}</p>}

        {hotel?.pin && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              navigate({ screen: 'go' });
            }}
          >
            {t('noLocation.fromHotel')}
          </button>
        )}
      </div>
    </>
  );
}
