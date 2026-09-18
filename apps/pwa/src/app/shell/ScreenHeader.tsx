import { useSettings } from '../settings.js';
import type { Pillar } from '../routes.js';
import { Icon, type IconName } from './icons.js';
import type { StringKey } from '../../i18n/index.js';

const PILLAR_KEY: Record<Pillar, StringKey> = {
  food: 'pillar.food',
  go: 'pillar.go',
  know: 'pillar.know',
  docs: 'nav.docs',
  reach: 'nav.reach',
  home: 'strip.home',
};

const PILLAR_ICON: Record<Pillar, IconName> = {
  food: 'thali',
  go: 'metro',
  know: 'lantern',
  docs: 'docs',
  reach: 'speech',
  home: 'home',
};

const PILLAR_COLOUR: Record<Pillar, string> = {
  food: 'var(--foodText)',
  go: 'var(--goText)',
  know: 'var(--knowText)',
  docs: 'var(--marigoldText)',
  reach: 'var(--ink)',
  home: 'var(--marigold)',
};

/**
 * One header for every screen that is not home: back, the pillar's icon in its own hue, the
 * pillar's name, and the trail to this screen. It answers the three questions a traveller has
 * on arriving anywhere — which pillar am I in, what is this screen, how do I get out — and the
 * brand on the strip above is the way home.
 */
export function ScreenHeader({
  pillar,
  title,
  trail,
  icon,
  onBack,
}: {
  readonly pillar: Pillar;
  /** Shown instead of the pillar's name, for घर.n screens that are not a pillar. */
  readonly title?: string;
  readonly trail?: string;
  readonly icon?: IconName;
  readonly onBack?: () => void;
}) {
  const { t } = useSettings();
  const colour = PILLAR_COLOUR[pillar];
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
        <Icon name="left" size={22} strokeWidth={2} />
      </button>
      <span className="hdr-what">
        <Icon name={icon ?? PILLAR_ICON[pillar]} size={22} strokeWidth={1.9} color={colour} />
        <span className="hdr-title">{title ?? t(PILLAR_KEY[pillar])}</span>
        {trail !== undefined && <span className="hdr-trail">› {trail}</span>}
      </span>
    </div>
  );
}
