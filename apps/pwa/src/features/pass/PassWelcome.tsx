import { useSettings } from '../../app/settings.js';
import { Icon } from '../../app/shell/icons.js';
import { Logo } from '../../app/shell/Logo.js';

/**
 * घर.4, the moment a pass lands on this phone (decision 022).
 *
 * A pass arriving is the best thing that happens in this product — somebody has just been
 * given fourteen days of it — and until 17 September it was announced in the same small grey
 * line as a failed coupon: _"पास लग गया"_, with an empty screen under it. The owner, reading it
 * on a family member's phone: _"we should brag about this. You hid such an important message as
 * a plain text."_
 *
 * So it is a screen of its own for one read: what they have, that it works with the radio off,
 * that the fourteen days wait for the plane (decision 006, and the question a suspicious person
 * asks next), and a good wish. One control, and it goes to घर — where the three pillars are.
 *
 * Everything here is drawn: the mark is inline SVG like every other icon, and nothing is
 * fetched. A second phone installs a scanned pass with no connection at all (decision 005), so
 * a welcome that needed the network would be a blank screen exactly when it matters.
 */
export function PassWelcome({ onDone }: { readonly onDone: () => void }) {
  const { t } = useSettings();
  return (
    <div className="flow welcome">
      <div className="welcome-card">
        <span className="welcome-mark">
          <Logo size={62} />
          <span className="welcome-ticket">
            <Icon name="ticket" size={22} strokeWidth={1.9} color="var(--onMarigold)" />
          </span>
        </span>
        <span className="welcome-eyebrow">{t('pass.welcome.eyebrow')}</span>
        <p className="welcome-title">{t('pass.welcome.title')}</p>
        <p className="welcome-line">{t('pass.welcome.offline')}</p>
        <p className="welcome-line">{t('pass.welcome.starts')}</p>
        <p className="welcome-bon">{t('pass.welcome.bon')}</p>
      </div>
      <div className="grow" />
      <button type="button" className="btn btn-primary welcome-go" onClick={onDone}>
        {t('pass.welcome.go')}
      </button>
    </div>
  );
}
