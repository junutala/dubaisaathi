import { useSettings } from '../../app/settings.js';
import { navigate, type Route } from '../../app/routes.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import type { Validity } from '../pass/entitlement.js';

interface PillarDef {
  readonly key: StringKey;
  readonly roman: StringKey;
  readonly blurb: StringKey;
  readonly icon: IconName;
  readonly route: Route;
  readonly bg: string;
  readonly fg: string;
}

/**
 * The three pillars, in the order the owner named them: खाना, जाना, जानना. Each is a deep block
 * of its own hue with cream type on it — the bold-type direction chosen on 16 September — and its
 * icon as a watermark, because on a tile the name is the thing to read and the drawing is the
 * thing to recognise.
 */
const PILLARS: readonly PillarDef[] = [
  {
    key: 'pillar.food',
    roman: 'pillar.food.roman',
    blurb: 'pillar.food.blurb',
    icon: 'thali',
    route: { screen: 'food' },
    bg: 'var(--food)',
    fg: 'var(--onFood)',
  },
  {
    key: 'pillar.go',
    roman: 'pillar.go.roman',
    blurb: 'pillar.go.blurb',
    icon: 'metro',
    route: { screen: 'go' },
    bg: 'var(--go)',
    fg: 'var(--onGo)',
  },
  {
    key: 'pillar.know',
    roman: 'pillar.know.roman',
    blurb: 'pillar.know.blurb',
    icon: 'lantern',
    route: { screen: 'know' },
    bg: 'var(--know)',
    fg: 'var(--onKnow)',
  },
];

/**
 * घर — the three pillars, and from the twentieth hour of the Dubai day, the nudge.
 *
 * There is no box here and no microphone. A sentence needs a screen to give it meaning, and each
 * pillar's own box already knows what the words typed into it are for.
 */
export function HomeScreen({
  validity,
  nudge,
}: {
  readonly validity: Validity;
  readonly nudge: boolean;
}) {
  const { t } = useSettings();
  return (
    <div className="home">
      {nudge && (
        <div className="nudge">
          <span className="nudge-text">
            <span className="nudge-head">
              {validity.state === 'expired'
                ? t('home.nudgeOver')
                : t('home.nudge', { hours: validity.hours ?? 0 })}
            </span>
            <span className="nudge-why">{t('home.nudgeWhy')}</span>
          </span>
          <button
            type="button"
            className="nudge-cta"
            onClick={() => {
              navigate({ screen: 'pass' });
            }}
          >
            {t('home.nudgeCta')}
          </button>
        </div>
      )}
      <div className="pillars">
        {PILLARS.map((pillar) => (
          <button
            key={pillar.key}
            type="button"
            className="pillar"
            style={{ background: pillar.bg, color: pillar.fg }}
            data-tap
            onClick={() => {
              navigate(pillar.route);
            }}
          >
            <span className="pillar-mark">
              <Icon name={pillar.icon} size={170} strokeWidth={1.1} />
            </span>
            <span className="pillar-roman">{t(pillar.roman)}</span>
            <span className="pillar-text">
              <span className="pillar-name">{t(pillar.key)}</span>
              <span className="pillar-blurb">{t(pillar.blurb)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
