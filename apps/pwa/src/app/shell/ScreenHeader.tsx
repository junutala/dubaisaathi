import { useSettings } from '../settings.js';
import { navigate } from '../routes.js';
import { Icon, type IconName } from './icons.js';
import type { StringKey } from '../../i18n/index.js';

export type Tile = 'transport' | 'food' | 'talk' | 'info' | 'home';

const TILE_KEY: Record<Tile, StringKey> = {
  transport: 'tile.transport',
  food: 'tile.food',
  talk: 'tile.talk',
  info: 'tile.info',
  home: 'nav.home',
};

const TILE_ICON: Record<Tile, IconName> = {
  transport: 'route',
  food: 'food',
  talk: 'talk',
  info: 'info',
  home: 'home',
};

/**
 * One header for every screen that is not home. It answers the three questions a traveller
 * has on arriving anywhere: which tile am I in, what is this screen, and how do I get out.
 */
export function ScreenHeader({
  title,
  tile,
  trail,
  onBack,
}: {
  readonly title: string;
  readonly tile: Tile;
  readonly trail?: string;
  readonly onBack?: () => void;
}) {
  const { t } = useSettings();
  const accent = tile === 'home' ? 'var(--indigo)' : 'var(--marigoldText)';

  return (
    <div className="hdr">
      <button
        type="button"
        className="hdr-btn"
        onClick={() => {
          if (onBack) onBack();
          else window.history.back();
        }}
        aria-label={t('nav.back')}
      >
        <Icon name="left" size={24} />
      </button>

      <div className="hdr-titles">
        <span className="hdr-crumb" style={{ color: accent }}>
          <Icon name={TILE_ICON[tile]} size={15} strokeWidth={2} color={accent} />
          {t(TILE_KEY[tile])}
          {trail !== undefined && (
            <>
              <span className="hdr-sep">›</span>
              <span className="hdr-trail">{trail}</span>
            </>
          )}
        </span>
        <span className="hdr-title">{title}</span>
      </div>

      <button
        type="button"
        className="hdr-btn"
        onClick={() => {
          navigate({ screen: 'home' });
        }}
        aria-label={t('nav.home')}
      >
        <Icon name="home" size={23} strokeWidth={1.8} color="var(--indigo)" />
      </button>
    </div>
  );
}
