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
  {
    pillar: 'go',
    key: 'pillar.go',
    icon: 'signpost',
    route: { screen: 'go' },
    lit: 'var(--goText)',
  },
  {
    pillar: 'know',
    key: 'pillar.know',
    icon: 'lantern',
    route: { screen: 'know' },
    lit: 'var(--knowText)',
  },
  {
    pillar: 'docs',
    key: 'nav.info',
    icon: 'info',
    route: { screen: 'docs' },
    lit: 'var(--marigoldText)',
  },
];

/**
 * The bar, on every screen: four icons and nothing else. The pass lives on the strip's dot and on
 * घर's tile; a पास लें button here duplicated both and read as one more tab (decision 018), and a
 * fifth item was tried and taken out on the 18th (decision 026, reversed).
 *
 * **No words under the icons** (owner, 18 September). Two of the four labels were English in the
 * English catalogue and Devanagari in neither — the three pillar names never translate, so the
 * bar read as three Hindi words and one English one. Icons alone carry the same meaning in both
 * catalogues and buy back the height. Each one keeps its word as the accessible name, which is
 * what a screen reader announces and what `aria-label` is for; a glyph with no name is a button
 * nobody blind can use (decision 027).
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
            aria-label={t(slot.key)}
            aria-current={on ? 'page' : undefined}
            onClick={() => {
              navigate(slot.route);
            }}
          >
            <Icon name={slot.icon} size={27} strokeWidth={on ? 2 : 1.8} />
          </button>
        );
      })}
    </nav>
  );
}
