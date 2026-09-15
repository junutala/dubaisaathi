import { useSettings } from '../../app/settings.js';
import { navigate, type Route } from '../../app/routes.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { BUILD } from '../../app/version.js';

interface TileDef {
  readonly key: StringKey;
  readonly blurb: StringKey;
  readonly icon: IconName;
  readonly route: Route;
}

/**
 * Three tiles, not four. बोलना came off: it is not a place a traveller goes, it is something
 * they do about a place they are already going to, and now रास्ता carries both readings of a
 * destination. A tile that has to be explained has not earned its place.
 */
const TILES: readonly TileDef[] = [
  {
    key: 'tile.transport',
    blurb: 'tile.transport.blurb',
    icon: 'routeTile',
    route: { screen: 'transport' },
  },
  { key: 'tile.food', blurb: 'tile.food.blurb', icon: 'foodTile', route: { screen: 'food' } },
  { key: 'tile.info', blurb: 'tile.info.blurb', icon: 'infoTile', route: { screen: 'info' } },
];

/**
 * घर — the tiles, and nothing else.
 *
 * There is no box here, and that is the decision rather than an omission. A sentence needs a
 * screen to give it meaning: "Discovery Gardens jaana hai" is *show me the transport* in a hotel
 * room and *tell the driver* at a taxi door, and the difference is where the traveller is
 * standing, not anything in the words (decision 014). रास्ता can serve both readings because it
 * asks — कैसे जाएँ or ड्राइवर को दिखाएँ — and खाना can, because a sentence typed there is about
 * food. Home can do neither: it would have to guess, and guessing was never settled because it
 * cannot be.
 *
 * So the tiles are the front door, each one opening a screen whose box already knows what the
 * words are for.
 */
export function HomeScreen() {
  const { t } = useSettings();
  return (
    <div className="flow">
      <div className="tiles">
        {TILES.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className="tile"
            data-tap
            onClick={() => {
              navigate(tile.route);
            }}
          >
            {/* Size and stroke come from the stylesheet: the icon is a share of the tile, not
                a fixed number of pixels. */}
            <span className="tile-icon">
              <Icon name={tile.icon} color="var(--marigold)" />
            </span>
            <span className="tile-text">
              <span className="tile-name">{t(tile.key)}</span>
              <span className="tile-blurb">{t(tile.blurb)}</span>
            </span>
          </button>
        ))}
      </div>
      {/* Which build this is. Deliberately the quietest thing on the screen — a traveller has no
          use for it, and the two people who need to know a fix actually shipped should not have
          to read a server log to find out. */}
      <p className="build">{BUILD}</p>
    </div>
  );
}
