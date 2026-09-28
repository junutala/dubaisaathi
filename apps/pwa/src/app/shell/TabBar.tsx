import { useSettings } from '../settings.js';
import { navigate, type BarItem, type Route } from '../routes.js';
import { Icon, type IconName } from './icons.js';
import type { StringKey } from '../../i18n/index.js';

interface Slot {
  readonly item: BarItem;
  readonly key: StringKey;
  readonly icon: IconName;
  readonly route: Route;
}

const SLOTS: readonly Slot[] = [
  { item: 'home', key: 'bar.home', icon: 'home', route: { screen: 'home' } },
  { item: 'docs', key: 'bar.docs', icon: 'docs', route: { screen: 'docs' } },
  { item: 'contribute', key: 'bar.contribute', icon: 'bulb', route: { screen: 'contribute' } },
  { item: 'share', key: 'bar.share', icon: 'qr', route: { screen: 'share' } },
];

/**
 * The bar, on every screen: four places, each an icon with its word under it (decision 046).
 *
 * घर and ऐप शेयर are the bookends, each on its own colour: the way back is the traveller's, and
 * the app passed on is ours — the moment a stranger sees the board reader and asks what it is,
 * the QR is one tap away. दस्तावेज़ and सुझाव sit plain between them. The words came back because
 * none of the four is a pillar name: every one translates, so the reason they went (decision 027)
 * is gone, and an icon alone is understood by fewer people than a word is.
 *
 * The pillars are not here: घर's four blocks are the way into them.
 */
export function TabBar({ current }: { readonly current: BarItem | undefined }) {
  const { t } = useSettings();
  return (
    <nav className="bar">
      {SLOTS.map((slot) => {
        const on = slot.item === current;
        const classes = ['bar-tab', `bar-tab-${slot.item}`];
        if (on) classes.push('bar-tab-on');
        return (
          <button
            key={slot.item}
            type="button"
            className={classes.join(' ')}
            aria-current={on ? 'page' : undefined}
            onClick={() => {
              navigate(slot.route);
            }}
          >
            <Icon name={slot.icon} size={24} strokeWidth={on ? 2 : 1.8} />
            <span className="bar-word">{t(slot.key)}</span>
          </button>
        );
      })}
    </nav>
  );
}
