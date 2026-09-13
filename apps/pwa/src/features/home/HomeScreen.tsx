import { useSettings } from '../../app/settings.js';
import { navigate, type Route } from '../../app/routes.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';

interface TileDef {
  readonly key: StringKey;
  readonly blurb: StringKey;
  readonly icon: IconName;
  readonly route: Route;
}

const TILES: readonly TileDef[] = [
  {
    key: 'tile.transport',
    blurb: 'tile.transport.blurb',
    icon: 'route',
    route: { screen: 'soon', tile: 'transport' },
  },
  {
    key: 'tile.food',
    blurb: 'tile.food.blurb',
    icon: 'food',
    route: { screen: 'soon', tile: 'food' },
  },
  { key: 'tile.talk', blurb: 'tile.talk.blurb', icon: 'talk', route: { screen: 'say' } },
  {
    key: 'tile.info',
    blurb: 'tile.info.blurb',
    icon: 'info',
    route: { screen: 'soon', tile: 'info' },
  },
];

/** Four tiles and the mic. Nothing else (rule 1). */
export function HomeScreen({ onMic }: { readonly onMic: () => void }) {
  const { t } = useSettings();
  return (
    <div className="flow home">
      <div className="tiles">
        {TILES.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className="tile"
            onClick={() => {
              navigate(tile.route);
            }}
          >
            <span className="tile-icon">
              <Icon name={tile.icon} size={24} strokeWidth={1.8} color="var(--marigoldText)" />
            </span>
            <span className="tile-text">
              <span className="tile-name">{t(tile.key)}</span>
              <span className="tile-blurb">{t(tile.blurb)}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="home-mic">
        <button type="button" className="mic-lg" onClick={onMic} aria-label={t('nav.mic')}>
          <Icon name="mic" size={31} strokeWidth={1.6} color="var(--onMarigold)" />
        </button>
        <span className="muted center">{t('home.micHint')}</span>
      </div>
    </div>
  );
}
