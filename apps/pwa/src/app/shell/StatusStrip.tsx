import { useSettings } from '../settings.js';
import { LOCALES, LOCALE_LABEL } from '../../i18n/index.js';
import { Icon } from './icons.js';
import { navigate } from '../routes.js';

/**
 * The status strip: on every screen after the landing page, always in the same place.
 * How long the offline functions last — the money, so it is never hidden — and the two switches
 * for how the app presents itself.
 *
 * Online/offline used to sit on the left of this bar and now lives on the brand bar above it,
 * beside the name: both of those describe the app itself, while everything left here describes
 * the traveller's plan. One thing per bar reads faster than four things in a row.
 */
export interface Validity {
  readonly state: 'before' | 'trial' | 'pass' | 'expired';
  /** 0–100; how much of the counter is left. */
  readonly percent: number;
  readonly hours?: number;
  readonly days?: number;
}

const RECHARGE_STATES = new Set<Validity['state']>(['trial', 'expired']);

export function StatusStrip({ validity }: { validity: Validity }) {
  const { t, locale, setLocale, toggleTheme } = useSettings();

  const label =
    validity.state === 'trial'
      ? t('strip.trial', { hours: validity.hours ?? 0 })
      : validity.state === 'pass'
        ? t('strip.pass', { days: validity.days ?? 0 })
        : t(validity.state === 'before' ? 'strip.before' : 'strip.expired');

  const fill = validity.state === 'pass' ? 'var(--teal)' : 'var(--marigold)';
  const other = LOCALES.find((l) => l !== locale) ?? 'en';

  return (
    <div className="strip">
      <button
        type="button"
        className="strip-validity"
        aria-label={label}
        onClick={() => {
          navigate({ screen: 'pass' });
        }}
      >
        <span className="strip-validity-label">{label}</span>
        <span className="strip-track">
          <span style={{ width: `${String(validity.percent)}%`, background: fill }} />
        </span>
      </button>

      {RECHARGE_STATES.has(validity.state) && (
        <button
          type="button"
          className="strip-recharge"
          onClick={() => {
            navigate({ screen: 'pass' });
          }}
        >
          {t('strip.recharge')}
        </button>
      )}

      <button
        type="button"
        className="strip-btn"
        onClick={() => {
          setLocale(other);
        }}
        aria-label={t('strip.language')}
        title={LOCALE_LABEL[other]}
      >
        <Icon name="language" size={21} strokeWidth={1.8} />
      </button>

      <button
        type="button"
        className="strip-btn"
        onClick={toggleTheme}
        aria-label={t('strip.theme')}
      >
        <Icon name="moon" size={21} strokeWidth={1.8} />
      </button>
    </div>
  );
}
