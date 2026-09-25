import type { IconName } from '../../app/shell/icons.js';
import type { Locale, StringKey } from '../../i18n/index.js';
import bundled from '../../../../../data/know/tips.v1.json';

/**
 * जानना is knowing, not only attractions (the owner, 25 September; decision 037). It opens on tabs:
 * जगहें, the attractions it always had, and one tab for each kind of thing a traveller should know
 * that is not a place — सफ़र for getting around, and ख़रीदारी (dates, oud) when its first topic is
 * written. A tab with nothing in it is not shown: a tab that opens on nothing is a promise broken on
 * the tap.
 *
 * A topic is either built in — the Nol card, whose figures come from the fares pack — or written as
 * data in `data/know/tips.v1.json`: a title, a line, and items each with a level and a body, in
 * both languages, with the day it was checked. Content is data, not code, so the next topic is an
 * edit to that file.
 */
export const KNOW_TABS = ['places', 'travel', 'shopping'] as const;
export type KnowTab = (typeof KNOW_TABS)[number];
export type TopicTab = Exclude<KnowTab, 'places'>;

type Words = Readonly<Record<Locale, string>>;

export interface TextTopicItem {
  readonly title: Words;
  readonly level: Words;
  readonly body: Words;
}

export interface TextTopic {
  readonly id: string;
  readonly tab: TopicTab;
  readonly icon: IconName;
  readonly title: Words;
  readonly sub: Words;
  readonly checkedAt: string;
  readonly items: readonly TextTopicItem[];
  readonly footer: Words;
}

/** A built-in topic: its words are in the i18n catalogues, its figures in a pack. */
export interface BuiltInTip {
  readonly id: string;
  readonly tab: TopicTab;
  readonly icon: IconName;
  readonly titleKey: StringKey;
  readonly subKey: StringKey;
}

/** What a tab lists: a written topic, or a built-in one. */
export type Tip = TextTopic | BuiltInTip;

/** The Nol card is built in: every figure on it comes from the fares pack. */
const NOL: BuiltInTip = {
  id: 'nol',
  tab: 'travel',
  icon: 'metro',
  titleKey: 'tips.nol.title',
  subKey: 'tips.nol.sub',
};

function isWords(value: unknown): value is Words {
  if (typeof value !== 'object' || value === null) return false;
  const words = value as Record<string, unknown>;
  return typeof words.hi === 'string' && typeof words.en === 'string' && words.hi !== '';
}

/**
 * The topics file, narrowed once. A topic that is missing a language or an item is left out rather
 * than shown half-written; the rest of the file still shows.
 */
export function parseTopics(raw: unknown): readonly TextTopic[] {
  const topics = (raw as { topics?: unknown }).topics;
  if (!Array.isArray(topics)) return [];
  return topics.filter((topic): topic is TextTopic => {
    const t = topic as Record<string, unknown>;
    return (
      typeof t.id === 'string' &&
      /^[a-z-]+$/.test(t.id) &&
      t.id !== NOL.id &&
      (t.tab === 'travel' || t.tab === 'shopping') &&
      typeof t.icon === 'string' &&
      isWords(t.title) &&
      isWords(t.sub) &&
      isWords(t.footer) &&
      typeof t.checkedAt === 'string' &&
      Array.isArray(t.items) &&
      t.items.length > 0 &&
      t.items.every((item: unknown) => {
        const i = item as Record<string, unknown>;
        return isWords(i.title) && isWords(i.level) && isWords(i.body);
      })
    );
  });
}

export const TEXT_TOPICS: readonly TextTopic[] = parseTopics(bundled);

/** Every topic, in the order a tab lists them: the written ones first, then the Nol card. */
export const TIPS: readonly Tip[] = [...TEXT_TOPICS, NOL];

export function textTopic(id: string): TextTopic | undefined {
  return TEXT_TOPICS.find((topic) => topic.id === id);
}

/** The tabs that have something behind them, in their fixed order. */
export function liveTabs(): readonly KnowTab[] {
  return KNOW_TABS.filter((tab) => tab === 'places' || TIPS.some((tip) => tip.tab === tab));
}

export function isKnowTab(value: string | undefined): value is KnowTab {
  return (KNOW_TABS as readonly (string | undefined)[]).includes(value);
}
