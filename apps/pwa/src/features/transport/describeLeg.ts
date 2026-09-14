import type { DubaiPlace } from '@saathi/shared';
import type { IconName } from '../../app/shell/icons.js';
import type { Locale, StringKey } from '../../i18n/index.js';
import { localName } from './destinations.js';
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
}

const MODE_KEY = {
  metro: 'mode.metro',
  bus: 'mode.bus',
  tram: 'mode.tram',
  taxi: 'mode.taxi',
  walk: 'mode.walk',
} as const satisfies Record<PlannedLeg['mode'], StringKey>;

const MODE_ICON = {
  metro: 'metro',
  bus: 'bus',
  tram: 'metro',
  taxi: 'taxi',
  walk: 'walk',
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

export function fareText(words: Words, option: RouteOption): string {
  if (option.fareAedMax === 0) return words.t('unit.noFare');
  if (option.fareAedMin === option.fareAedMax) {
    return words.t('unit.fare', { amount: option.fareAedMin });
  }
  return words.t('unit.fareRange', { min: option.fareAedMin, max: option.fareAedMax });
}

/** Where a leg starts or ends: the traveller, the place they named, or a station in between. */
export function nodeLabel(words: Words, nodeId: string): string {
  if (nodeId === ORIGIN_NODE_ID) return words.t('steps.here');
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
  return words.t(leg.mode === 'metro' ? 'unit.stations' : 'unit.stops', { count: leg.stops });
}

/** One line summarising a leg, for the strip along the bottom of an option card on 1.3. */
export function legSummary(words: Words, leg: PlannedLeg): string {
  if (leg.mode === 'walk') return minutes(words, leg.durationSeconds);
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
  if (leg.mode === 'taxi') {
    return {
      icon: 'taxi',
      title: words.t('steps.taxiRide'),
      detail: words.t('unit.direct', { km: (leg.distanceM / 1000).toFixed(1) }),
      time,
    };
  }
  return {
    icon: modeIcon(leg.mode),
    title: words.t('steps.ride', { line: lineLabel(words, leg) }),
    detail: words.t('steps.between', {
      from: nodeLabel(words, leg.fromNodeId),
      to: nodeLabel(words, leg.toNodeId),
      count: stopsLabel(words, leg),
    }),
    time,
  };
}
