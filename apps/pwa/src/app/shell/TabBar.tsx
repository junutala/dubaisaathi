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
  {
    pillar: 'reach',
    key: 'nav.reach',
    icon: 'speech',
    route: { screen: 'reach' },
    // Ink, not a hue: every colour in the bar belongs to a pillar, and बात is not one. Teal
    // would have lit it in जाना's own colour.
    lit: 'var(--ink)',
  },
];

/**
 * The bar, on every screen: the three pillars, the documents, and बात. The pass is not here — it
 * lives on the strip's dot and on घर's tile, and a पास लें button duplicated both and read as one
 * more tab (decision 018, 17 September).
 *
 * बात is the fifth and last (decision 026). It is in the bar rather than on घर because घर is
 * full — four blocks and one tile — and because it has to be reachable from the screen a
 * traveller is on when they have something to say, which is never घर.
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
