import type { DubaiPlace } from '@saathi/shared';
import type { IconName } from '../../app/shell/icons.js';
import type { Locale, StringKey } from '../../i18n/index.js';
import { localName } from './destinations.js';
import { rupees } from './fares.js';
import type { TransportNetwork } from './network.js';
import {
  DESTINATION_NODE_ID,
  ORIGIN_NODE_ID,
  type PlannedLeg,
  type RouteOption,
} from './routePlanner.js';

/**
 * The words a leg is written in, in one place, because 1.3 and 1.4 must not disagree about the
 * same journey: the card that says "रेड लाइन · 4 स्टेशन" and the step that says it are the
 * same sentence, and a traveller comparing the two is checking exactly that.
 */

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export interface Words {
  readonly t: Translate;
  readonly locale: Locale;
  readonly network: TransportNetwork;
  readonly destination: DubaiPlace;
  /** What to call the start when it is not the traveller's own spot: the hotel, or BurJuman. */
  readonly origin?: string;
}

const MODE_KEY = {
  metro: 'mode.metro',
  bus: 'mode.bus',
  tram: 'mode.tram',
  taxi: 'mode.taxi',
  walk: 'mode.walk',
  abra: 'mode.abra',
} as const satisfies Record<PlannedLeg['mode'], StringKey>;

const MODE_ICON = {
  metro: 'metro',
  bus: 'bus',
  tram: 'metro',
  taxi: 'taxi',
  walk: 'walk',
  abra: 'boat',
} as const satisfies Record<PlannedLeg['mode'], IconName>;

export function modeLabel(words: Words, mode: PlannedLeg['mode']): string {
  return words.t(MODE_KEY[mode]);
}

export function modeIcon(mode: PlannedLeg['mode']): IconName {
  return MODE_ICON[mode];
}

export function minutes(words: Words, seconds: number): string {
  return words.t('unit.minutes', { count: Math.max(1, Math.round(seconds / 60)) });
}

/**
 * The fare in dirhams and, beside it, in rupees (the owner, 25 September): the traveller this is
 * for counts in rupees, and metro ≈ ₹130 next to taxi ≈ ₹1,000 is the saving said without a word.
 */
export function fareText(words: Words, option: RouteOption): string {
  if (option.fareAedMax === 0) return words.t('unit.noFare');
  if (option.fareAedMin === option.fareAedMax) {
    const inr = rupees(option.fareAedMin);
    const aed = words.t('unit.fare', { amount: option.fareAedMin });
    return inr === undefined ? aed : `${aed} · ${words.t('unit.inr', { inr })}`;
  }
  return fareRangeText(words.t, option.fareAedMin, option.fareAedMax);
}

/** A range in dirhams, then the same range in rupees when the pack carries a rate. */
export function fareRangeText(t: Translate, min: number, max: number): string {
  const aed = t('unit.fareRange', { min, max });
  const low = rupees(min);
  const high = rupees(max);
  return low === undefined || high === undefined
    ? aed
    : `${aed} · ${t('unit.inrRange', { min: low, max: high })}`;
}

/** Where a leg starts or ends: the traveller, the place they named, or a station in between. */
export function nodeLabel(words: Words, nodeId: string): string {
  if (nodeId === ORIGIN_NODE_ID) return words.origin ?? words.t('steps.here');
  if (nodeId === DESTINATION_NODE_ID) return localName(words.destination.name, words.locale);
  const node = words.network.nodes.find((candidate) => candidate.id === nodeId);
  return node ? localName(node.name, words.locale) : nodeId;
}

export function lineLabel(words: Words, leg: PlannedLeg): string {
  const line = words.network.lines.find((candidate) => candidate.id === leg.line);
  return line ? localName(line.name, words.locale) : modeLabel(words, leg.mode);
}

/** "4 स्टेशन" on a train, "11 स्टॉप" on a bus — a traveller counts them differently. */
function stopsLabel(words: Words, leg: PlannedLeg): string {
  const rail = leg.mode === 'metro' || leg.mode === 'tram';
  return words.t(rail ? 'unit.stations' : 'unit.stops', { count: leg.stops });
}

/** "Expo की ओर" — the headsign on the front of the train, which is what the platform sign says. */
export function towardsLabel(words: Words, leg: PlannedLeg): string | null {
  if (leg.direction === undefined) return null;
  const line = words.network.lines.find((candidate) => candidate.id === leg.line);
  const sign = line?.towards?.[leg.direction];
  if (!sign || sign.en === '') return null;
  return words.t('steps.towards', { place: words.locale === 'hi' ? sign.hi : sign.en });
}

/**
 * "पहली 05:07 · आख़िरी 23:16 · हर 4 मिनट में" for the stop the traveller boards at — the
 * "is it still running" answer, from the RTA feed, on the step where it is needed.
 */
export function serviceLine(words: Words, leg: PlannedLeg): string | null {
  if (leg.firstDeparture === undefined || leg.lastDeparture === undefined) return null;
  const line = words.network.lines.find((candidate) => candidate.id === leg.line);
  const times = words.t('steps.service', { first: leg.firstDeparture, last: leg.lastDeparture });
  if (line?.headwaySeconds === undefined) return times;
  return `${times} · ${words.t('steps.every', { count: Math.max(1, Math.round(line.headwaySeconds / 60)) })}`;
}

/** One line summarising a leg, for the strip along the bottom of an option card on 1.3. */
export function legSummary(words: Words, leg: PlannedLeg): string {
  if (leg.mode === 'walk') return minutes(words, leg.durationSeconds);
  if (leg.mode === 'abra')
    return `${modeLabel(words, leg.mode)} · ${minutes(words, leg.durationSeconds)}`;
  if (leg.mode === 'taxi') {
    return words.t('unit.direct', { km: (leg.distanceM / 1000).toFixed(1) });
  }
  return `${lineLabel(words, leg)} · ${stopsLabel(words, leg)}`;
}

export interface LegStep {
  readonly icon: IconName;
  readonly title: string;
  readonly detail: string;
  readonly time: string;
  /** First and last departure at the boarding stop, when the pack knows them. */
  readonly service?: string;
}

/** The same leg as an instruction, for the list on 1.4. */
export function legStep(words: Words, leg: PlannedLeg): LegStep {
  const time = minutes(words, leg.durationSeconds);
  if (leg.mode === 'walk') {
    return {
      icon: 'walk',
      title: words.t('steps.walk'),
      detail: words.t('steps.toPlace', { place: nodeLabel(words, leg.toNodeId) }),
      time,
    };
  }
  if (leg.mode === 'abra') {
    // Across, not along: a pier and the pier opposite, and the dirham in cash (decision 036).
    return {
      icon: 'boat',
      title: words.t('steps.abra', { place: nodeLabel(words, leg.toNodeId) }),
      detail: words.t('steps.abraDetail', { from: nodeLabel(words, leg.fromNodeId) }),
      time,
    };
  }
  if (leg.mode === 'taxi') {
    return {
      icon: 'taxi',
      title: words.t('steps.taxiRide'),
      detail: words.t('unit.direct', { km: (leg.distanceM / 1000).toFixed(1) }),
      time,
    };
  }
  const towards = towardsLabel(words, leg);
  const service = serviceLine(words, leg);
  return {
    icon: modeIcon(leg.mode),
    title: towards
      ? `${words.t('steps.ride', { line: lineLabel(words, leg) })}, ${towards}`
      : words.t('steps.ride', { line: lineLabel(words, leg) }),
    detail: words.t('steps.between', {
      from: nodeLabel(words, leg.fromNodeId),
      to: nodeLabel(words, leg.toNodeId),
      count: stopsLabel(words, leg),
    }),
    time,
    ...(service === null ? {} : { service }),
  };
}
