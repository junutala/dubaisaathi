import { useSettings } from '../settings.js';
import { navigate, type Pillar, type Route } from '../routes.js';
import { Icon, type IconName } from './icons.js';
import type { StringKey } from '../../i18n/index.js';

interface Slot {
  readonly pillar: Pillar;
  readonly key: StringKey;
  readonly icon: IconName;
  readonly route: Route;
  readonly lit: string;
}

const SLOTS: readonly Slot[] = [
  {
    pillar: 'food',
    key: 'pillar.food',
    icon: 'thali',
    route: { screen: 'food' },
    lit: 'var(--foodText)',
  },
  { pillar: 'go', key: 'pillar.go', icon: 'metro', route: { screen: 'go' }, lit: 'var(--goText)' },
  {
    pillar: 'know',
    key: 'pillar.know',
    icon: 'lantern',
    route: { screen: 'know' },
    lit: 'var(--knowText)',
  },
  {
    pillar: 'docs',
    key: 'nav.docs',
    icon: 'docs',
    route: { screen: 'docs' },
    lit: 'var(--marigoldText)',
  },
];

/**
 * The bar, on every screen: the three pillars and the documents, and nothing else. The pass lives
 * on the strip's dot and on घर's tile; a पास लें button here duplicated both and read as one more
 * tab (decision 018, 17 September). A fifth item was tried and taken out the same day — the bar
 * is four (decision 026, reversed).
 */
export function TabBar({ current }: { readonly current: Pillar }) {
  const { t } = useSettings();
  return (
    <nav className="bar">
      {SLOTS.map((slot) => {
        const on = slot.pillar === current;
        return (
          <button
            key={slot.pillar}
            type="button"
            className={on ? 'bar-tab bar-tab-on' : 'bar-tab'}
            style={on ? { color: slot.lit } : undefined}
            onClick={() => {
              navigate(slot.route);
            }}
          >
            <Icon name={slot.icon} size={24} strokeWidth={on ? 2 : 1.8} />
            <span>{t(slot.key)}</span>
          </button>
        );
      })}
    </nav>
  );
}
