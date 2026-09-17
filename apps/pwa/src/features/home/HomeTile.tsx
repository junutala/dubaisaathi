import { useSettings } from '../../app/settings.js';
import { navigate, type Route } from '../../app/routes.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import type { Validity } from '../pass/index.js';

type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

/**
 * What a tile needs to know to say its one line. Assembled by the app from the entitlement
 * and the pending code, so घर itself reads nothing from storage.
 */
export interface HomeTileState {
  readonly validity: Validity;
  /** From the twentieth hour of the Dubai day: the tile's tone warms (16 September). */
  readonly nudge: boolean;
  readonly paid: boolean;
  readonly slots: number;
  /**
   * Whether the phone has a connection right now. A block whose screen cannot work without one
   * is not shown without one: बोलना needs the network to hear anything at all, and offering it
   * with the radio off would be offering a traveller something that is going to fail. Read by
   * `HomeScreen` for बोलना's block, which is why it lives on the state घर is handed.
   */
  readonly online: boolean;
  /** A coupon code the traveller holds and has not redeemed; `free` once the server said ₹0. */
  readonly pendingCode?: { readonly code: string; readonly free: boolean };
}

/** The two lines of a tile: the state, and why it is worth a tap. */
export interface TileText {
  readonly name: string;
  readonly why: string;
}

export interface HomeTileDef {
  readonly id: string;
  readonly icon: IconName;
  readonly route: Route;
  readonly visible: (state: HomeTileState) => boolean;
  readonly warm: (state: HomeTileState) => boolean;
  readonly text: (state: HomeTileState, t: Translate) => TileText;
}

/**
 * The tiles at the foot of घर, below the blocks and above the bar (decision 018): the revenue
 * action, in the shape of the strip's hotel row, in marigold and never red. बोलना was a tile
 * here until 17 September and is now घर's fourth block instead, at the owner's instruction.
 */
export const HOME_TILES: readonly HomeTileDef[] = [
  {
    id: 'pass',
    icon: 'ticket',
    route: { screen: 'pass' },
    visible: () => true,
    warm: (state) => state.nudge,
    text: (state, t) => {
      const { validity, paid, slots, pendingCode } = state;
      if (paid) {
        const why = t('home.tile.paidWhy');
        if (validity.state === 'expired') return { name: t('home.tile.paidOver'), why };
        const days = validity.days ?? 0;
        return {
          name: slots > 1 ? t('home.tile.paidFamily', { days }) : t('home.tile.paid', { days }),
          why,
        };
      }
      const why = t('home.tile.why');
      if (pendingCode !== undefined) {
        const { code } = pendingCode;
        return {
          name: pendingCode.free
            ? t('home.tile.code', { code })
            : t('home.tile.codePartial', { code }),
          why,
        };
      }
      if (validity.state === 'before') return { name: t('home.tile.before'), why };
      if (validity.state === 'expired') return { name: t('home.tile.expired'), why };
      return { name: t('home.tile.trial', { hours: validity.hours ?? 0 }), why };
    },
  },
];

export function HomeTile({
  tile,
  state,
}: {
  readonly tile: HomeTileDef;
  readonly state: HomeTileState;
}) {
  const { t } = useSettings();
  const { name, why } = tile.text(state, t);
  return (
    <button
      type="button"
      className={tile.warm(state) ? 'home-tile home-tile-warm' : 'home-tile'}
      onClick={() => {
        navigate(tile.route);
      }}
    >
      <Icon name={tile.icon} size={22} strokeWidth={1.9} />
      <span className="home-tile-text">
        <span className="home-tile-name">{name}</span>
        <span className="home-tile-why">{why}</span>
      </span>
      <Icon name="right" size={18} strokeWidth={2} />
    </button>
  );
}
