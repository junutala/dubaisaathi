import { useSettings } from '../settings.js';
import { LOCALES, LOCALE_LABEL } from '../../i18n/index.js';
import { navigate } from '../routes.js';
import { Icon } from './icons.js';
import { Logo } from './Logo.js';
import { NUDGE_FROM_HOURS_LEFT, type Validity } from '../../features/pass/index.js';
import type { SavedHotel } from '../../features/info/index.js';

/**
 * The top strip, on every screen after the landing page, same place, same shape (16 September).
 *
 * Row one is the app: the mark and the name (a tap goes home), whether there is a network, the
 * pass as one small dot, the language and the theme. Row two is the traveller's own hotel — the
 * thing they reach for first on any bad evening — and it stays there until they change it.
 *
 * The dot is green while the counter runs and marigold when the Dubai day is about to end or has
 * ended. It is never red: decision 002 reserves red for nothing, on the owner's instruction, and
 * an expired trial is a conversion moment rather than an alarm.
 */
export function TopStrip({
  validity,
  hotel,
}: {
  readonly validity: Validity;
  readonly hotel: SavedHotel | undefined;
}) {
  const { t, locale, setLocale, theme, toggleTheme, online } = useSettings();
  const other = LOCALES.find((l) => l !== locale) ?? 'en';
  const ending =
    validity.state === 'expired' ||
    (validity.state === 'trial' && (validity.hours ?? 0) <= NUDGE_FROM_HOURS_LEFT);

  return (
    <div className="strip">
      <div className="strip-row">
        <button
          type="button"
          className="strip-brand"
          onClick={() => {
            navigate({ screen: 'home' });
          }}
          aria-label={t('strip.home')}
        >
          <Logo size={28} />
          <span className="strip-name">{t('app.name')}</span>
        </button>
        {/* Teal when offline, not red: working without a network is what this app is for, so
            it is a statement of fact and never a warning. */}
        <span className="strip-net" style={{ color: online ? 'var(--muted)' : 'var(--tealText)' }}>
          <Icon name={online ? 'wifi' : 'wifioff'} size={15} strokeWidth={2.1} />
          {t(online ? 'strip.online' : 'strip.offline')}
        </span>
        <button
          type="button"
          className="strip-pass"
          onClick={() => {
            navigate({ screen: 'pass' });
          }}
          aria-label={t('strip.pass')}
        >
          <span
            className="strip-dot"
            style={{ background: ending ? 'var(--marigold)' : 'var(--running)' }}
          />
          {t('strip.pass')}
        </button>
        <button
          type="button"
          className="strip-btn"
          onClick={() => {
            setLocale(other);
          }}
          aria-label={t('strip.language')}
          title={LOCALE_LABEL[other]}
        >
          <Icon name="language" size={19} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          className="strip-btn"
          onClick={toggleTheme}
          aria-label={t('strip.theme')}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} strokeWidth={1.9} />
        </button>
      </div>

      <button
        type="button"
        className={hotel ? 'strip-hotel' : 'strip-hotel strip-hotel-empty'}
        onClick={() => {
          navigate({ screen: 'hotel' });
        }}
      >
        <Icon name={hotel ? 'pin' : 'plus'} size={20} strokeWidth={1.9} color="var(--marigold)" />
        {hotel ? (
          <>
            <span className="strip-hotel-name">
              {[
                hotel.name,
                hotel.room === undefined ? undefined : t('strip.room', { room: hotel.room }),
              ]
                .filter((part): part is string => typeof part === 'string' && part !== '')
                .join(' · ') || t('strip.hotel')}
            </span>
            <span className="strip-hotel-change">{t('strip.hotelChange')}</span>
          </>
        ) : (
          <span className="strip-hotel-text">
            <span className="strip-hotel-name">{t('strip.hotelAdd')}</span>
            <span className="strip-hotel-why">{t('strip.hotelAddWhy')}</span>
          </span>
        )}
      </button>
    </div>
  );
}
