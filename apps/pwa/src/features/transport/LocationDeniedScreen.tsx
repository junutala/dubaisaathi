import { useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { askForLocation, forgetLocation } from '../../lib/location.js';

/**
 * 1.1b — रास्ता › जगह की इजाज़त नहीं
 *
 * The phone's permission is the phone's to give, and nothing here overrides it. So this screen
 * says plainly what stopped working, item by item, offers the one thing that can fix it, and
 * then gets out of the way: a traveller who says no once is not asked again on every screen
 * (design rule 30).
 *
 * "बाक़ी सब चलेगा" is the most important line on it. Without it a refused permission reads as a
 * broken app, and the traveller closes it instead of going on to बोलना and their documents.
 */

const LOST: readonly { readonly key: StringKey; readonly icon: IconName }[] = [
  { key: 'noLocation.route', icon: 'route' },
  { key: 'noLocation.food', icon: 'food' },
  { key: 'noLocation.hotel', icon: 'pin' },
];

export function LocationDeniedScreen({ onMic }: { readonly onMic: () => void }) {
  const { t } = useSettings();
  /** Only after the phone has been asked again and said no again — never as a guess. */
  const [stillRefused, setStillRefused] = useState(false);

  return (
    <>
      <ScreenHeader
        title={t('noLocation.title')}
        tile="transport"
        trail={t('transport.title')}
        onBack={() => {
          navigate({ screen: 'transport' });
        }}
      />
      <div className="flow">
        <div className="card pad stack-sm">
          <p className="lost-heading">{t('noLocation.heading')}</p>
          <div className="rows">
            {LOST.map((item) => (
              <span key={item.key} className="lost-row">
                <Icon name={item.icon} size={19} strokeWidth={1.8} color="var(--muted)" />
                {t(item.key)}
              </span>
            ))}
          </div>
        </div>

        {/* The web cannot open the phone's settings app — no browser exposes it. What it can do
            is ask again, which is what actually unblocks a traveller who has just turned the
            setting back on. If the phone refuses a second time, the screen then says where the
            switch is: after the device has answered, never before it (CLAUDE.md). */}
        <button
          type="button"
          className="btn btn-primary"
          data-tap
          onClick={() => {
            forgetLocation();
            void askForLocation().then((answer) => {
              if (answer.kind === 'here') navigate({ screen: 'transport' });
              else setStillRefused(true);
            });
          }}
        >
          <Icon name="pin" size={21} strokeWidth={1.8} />
          {t('noLocation.settings')}
        </button>
        {stillRefused && <p className="muted small">{t('noLocation.stillRefused')}</p>}

        <div className="note">
          <Icon name="check" size={19} strokeWidth={2.1} color="var(--teal)" />
          <span>{t('noLocation.rest')}</span>
        </div>

        <div className="grow" />
      </div>
      <QuickBar current="transport" onMic={onMic} />
    </>
  );
}
