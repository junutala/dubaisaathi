import { useSettings } from '../settings.js';
import { navigate, type Route } from '../routes.js';
import { Icon, type IconName } from './icons.js';
import type { StringKey } from '../../i18n/index.js';
import type { Tile } from './ScreenHeader.js';

interface Slot {
  readonly tile: Tile;
  readonly key: StringKey;
  readonly icon: IconName;
  readonly route: Route;
}

const SLOTS: readonly Slot[] = [
  { tile: 'home', key: 'nav.home', icon: 'home', route: { screen: 'home' } },
  {
    tile: 'transport',
    key: 'tile.transport',
    icon: 'route',
    route: { screen: 'soon', tile: 'transport' },
  },
  { tile: 'food', key: 'tile.food', icon: 'food', route: { screen: 'soon', tile: 'food' } },
  { tile: 'info', key: 'tile.info', icon: 'info', route: { screen: 'soon', tile: 'info' } },
];

/**
 * Pick a tile and the others drop here, so switching is one tap. बोलना is not among them: it
 * stopped being a tile when रास्ता began carrying both readings of a destination, and the bar
 * lists tiles.
 */
export function QuickBar({
  current,
  onMic,
}: {
  readonly current: Tile;
  readonly onMic: () => void;
}) {
  const { t } = useSettings();
  const slots = SLOTS.filter((s) => s.tile !== current);
  const left = slots.slice(0, 2);
  const right = slots.slice(2);

  return (
    <nav className="bar">
      {left.map((slot) => (
        <BarTab key={slot.tile} slot={slot} label={t(slot.key)} />
      ))}
      <div className="bar-mic-slot">
        <button type="button" className="bar-mic" onClick={onMic} aria-label={t('nav.mic')}>
          <Icon name="mic" size={27} strokeWidth={1.6} color="var(--onMarigold)" />
        </button>
      </div>
      {right.map((slot) => (
        <BarTab key={slot.tile} slot={slot} label={t(slot.key)} />
      ))}
    </nav>
  );
}

function BarTab({ slot, label }: { readonly slot: Slot; readonly label: string }) {
  return (
    <button
      type="button"
      className="bar-tab"
      onClick={() => {
        navigate(slot.route);
      }}
    >
      <Icon name={slot.icon} size={23} strokeWidth={1.7} />
      <span>{label}</span>
    </button>
  );
}
