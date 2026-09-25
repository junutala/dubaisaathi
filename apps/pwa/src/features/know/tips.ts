import type { IconName } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';

/**
 * जानना is knowing, not only attractions (the owner, 25 September; decision 037). It opens on tabs:
 * जगहें, the attractions it always had, and one tab for each kind of thing a traveller should know
 * that is not a place — local travel first, with the Nol card, and shopping (where to buy dates,
 * oud) when its first topic is written. A tab with nothing in it is not shown: a tab that opens
 * on nothing is a promise broken on the tap.
 */
export const KNOW_TABS = ['places', 'travel', 'shopping'] as const;
export type KnowTab = (typeof KNOW_TABS)[number];

export interface Tip {
  readonly id: TipId;
  readonly tab: Exclude<KnowTab, 'places'>;
  readonly icon: IconName;
  readonly title: StringKey;
  readonly sub: StringKey;
}

export type TipId = 'nol';

export const TIPS: readonly Tip[] = [
  { id: 'nol', tab: 'travel', icon: 'metro', title: 'tips.nol.title', sub: 'tips.nol.sub' },
];

/** The tabs that have something behind them, in their fixed order. */
export function liveTabs(): readonly KnowTab[] {
  return KNOW_TABS.filter((tab) => tab === 'places' || TIPS.some((tip) => tip.tab === tab));
}

export function isKnowTab(value: string | undefined): value is KnowTab {
  return (KNOW_TABS as readonly (string | undefined)[]).includes(value);
}

export function isTipId(value: string | undefined): value is TipId {
  return TIPS.some((tip) => tip.id === value);
}
