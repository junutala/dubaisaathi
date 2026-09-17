import { useSettings } from '../../app/settings.js';
import { navigate, type Route } from '../../app/routes.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { BUILD } from '../../app/version.js';
import { HOME_TILES, HomeTile, type HomeTileState } from './HomeTile.js';

interface PillarDef {
  readonly key: StringKey;
  readonly roman: StringKey;
  readonly blurb: StringKey;
  readonly icon: IconName;
  readonly route: Route;
  readonly bg: string;
  readonly fg: string;
  /**
   * A block whose screen cannot work without a connection is not on घर without one. Only बोलना
   * carries this: everything behind it — the recogniser and the Arabic — is online, and a block
   * that is there when it cannot work is a promise broken on the tap (decision 020).
   */
  readonly needsSignal?: boolean;
}

/**
 * The blocks on घर, in the order the owner named them: खाना, जाना, जानना, and बोलना after them
 * from 17 September. Each is a deep block of its own hue with cream type on it — the bold-type
 * direction chosen on 16 September — and its icon as a watermark, because on a block the name is
 * the thing to read and the drawing is the thing to recognise.
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
  {
    key: 'pillar.speak',
    roman: 'pillar.speak.roman',
    blurb: 'pillar.speak.blurb',
    icon: 'mic',
    route: { screen: 'bolna' },
    bg: 'var(--speak)',
    fg: 'var(--onSpeak)',
    needsSignal: true,
  },
];

/**
 * घर — the hotel above (on the strip), the blocks, and the pass tile below them (decision 018).
 * The product in the middle; what the traveller keeps and what they pay for at either edge. It
 * never scrolls: the blocks give up the tile's height.
 *
 * There is no box here. A sentence needs a screen to give it meaning, and each pillar's own box
 * already knows what the words typed into it are for. The one microphone is behind बोलना's
 * block, which is here only while the phone has a signal.
 */
export function HomeScreen({ tile }: { readonly tile: HomeTileState }) {
  const { t } = useSettings();
  const blocks = PILLARS.filter((pillar) => pillar.needsSignal !== true || tile.online);
  return (
    <div className="home">
      <div className="pillars">
        {blocks.map((pillar) => (
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
      {HOME_TILES.filter((def) => def.visible(tile)).map((def) => (
        <HomeTile key={def.id} tile={def} state={tile} />
      ))}
      {/* Which build this is, on घर only and in the smallest type on the screen. The owner and
          whoever fixed something need to know they are looking at the new one; nobody else
          reads it. It can be taken off once a deploy is trusted on sight. */}
      <span className="home-build">{t('home.build', { build: BUILD })}</span>
    </div>
  );
}
