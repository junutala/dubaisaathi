import { describe, expect, it } from 'vitest';
import type { FoodTag, IntentKind } from '@saathi/shared';
import { parseIntent } from './parseIntent.js';
import { intentCorpus } from './intentPacks.js';
import benchmark from '../../../../../data/intents/benchmark.v1.json';

/**
 * The intent benchmark (`docs/spikes/002-hindi-intent.md`).
 *
 * CLAUDE.md rule 5: the KPI is a correct `{intent, destination, mode, dietary}`, not a perfect
 * transcript. This is where that number lives. It runs in `npm run verify`, so a pack change
 * that lifts one sentence and drops three cannot land — and the floors below only ever move up.
 *
 * These floors measure the PARSER, on clean text. What speech recognition does to that text on
 * a real phone is the other half of the spike, and no test in a container can answer it.
 */

interface Case {
  readonly said: string;
  readonly kind: string;
  readonly origin?: string;
  readonly destination?: string;
  readonly mode?: string;
  readonly foodTags?: readonly string[];
  readonly phraseId?: string;
  readonly documentName?: string;
}

const CASES = (benchmark as { readonly cases: readonly Case[] }).cases;

/**
 * Every curated case must pass. A sentence the learning loop brings back that the parser gets
 * wrong is added here together with the pack change that fixes it — in the same commit, because
 * CLAUDE.md says fix causes, not instances. A failure we have decided not to fix yet belongs in
 * `docs/spikes/002-hindi-intent.md` as an open finding, not in here as slack.
 */
const INTENT_FLOOR = 1;
const SLOT_FLOOR = 1;

interface Score {
  readonly intentRight: number;
  readonly slotsRight: number;
  readonly slotsTotal: number;
  readonly wrong: readonly string[];
}

function run(): Score {
  let intentRight = 0;
  let slotsRight = 0;
  let slotsTotal = 0;
  const wrong: string[] = [];

  for (const expected of CASES) {
    const got = parseIntent(expected.said, intentCorpus);
    if (got.kind === (expected.kind as IntentKind)) intentRight++;
    else wrong.push(`intent: "${expected.said}" → ${got.kind}, wanted ${expected.kind}`);

    // Every slot is a plain id, so one comparison covers all of them.
    const slots: [string, string | undefined, string | undefined][] = [
      ['origin', expected.origin, got.origin?.placeId],
      ['destination', expected.destination, got.destination?.placeId],
      ['mode', expected.mode, got.mode],
      ['phraseId', expected.phraseId, got.phraseId],
      ['documentName', expected.documentName, got.documentName],
    ];
    for (const [name, want, have] of slots) {
      if (want === undefined) continue;
      slotsTotal++;
      if (want === have) slotsRight++;
      else wrong.push(`slot: "${expected.said}" → ${name} ${String(have)}, wanted ${want}`);
    }
    for (const tag of expected.foodTags ?? []) {
      slotsTotal++;
      if (got.foodTags?.includes(tag as FoodTag)) slotsRight++;
      else wrong.push(`slot: "${expected.said}" → missing tag ${tag}`);
    }
  }
  return { intentRight, slotsRight, slotsTotal, wrong };
}

describe('intent benchmark', () => {
  const score = run();

  it(`reads the intent of ${String(CASES.length)} sentences`, () => {
    // Asserting on the list, not the count, so a failure says which sentence broke and how.
    expect(score.wrong.filter((w) => w.startsWith('intent'))).toEqual([]);
    expect(score.intentRight / CASES.length).toBeGreaterThanOrEqual(INTENT_FLOOR);
  });

  it(`fills every slot those sentences carry`, () => {
    expect(score.wrong.filter((w) => !w.startsWith('intent'))).toEqual([]);
    expect(score.slotsRight / score.slotsTotal).toBeGreaterThanOrEqual(SLOT_FLOOR);
  });

  it('never sends an out-of-scope question to a screen', () => {
    // The expensive failure is not "unknown" — it is confidently opening the wrong screen. A
    // traveller who asks about the weather and lands on a route plan stops trusting the mic.
    const misrouted = CASES.filter((c) => c.kind === 'unknown').filter(
      (c) => parseIntent(c.said, intentCorpus).confidence > 0,
    );
    expect(misrouted.map((c) => c.said)).toEqual([]);
  });

  it('asks about a bare place name rather than picking a tile for them', () => {
    const guessed = CASES.filter((c) => c.kind === 'place').filter(
      (c) => parseIntent(c.said, intentCorpus).kind !== 'place',
    );
    expect(guessed.map((c) => c.said)).toEqual([]);
  });
});
