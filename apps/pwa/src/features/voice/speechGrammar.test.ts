import { describe, expect, it } from 'vitest';
import { parseIntent } from './parseIntent.js';
import { intentCorpus, speechGrammar } from './intentPacks.js';
import { buildSpeechGrammar, GRAMMAR_UNKNOWN, withoutUnknownWords } from './speechGrammar.js';
import benchmark from '../../../../../data/intents/benchmark.v1.json';

/**
 * A grammar-constrained recogniser can only ever say words that are in its grammar. So the cost
 * of constraining it is measurable here, without a phone and without a model: take each sentence
 * the benchmark says a traveller speaks, delete every word the grammar does not contain — which
 * is the most the recogniser could lose — and check the parser still reaches the same conclusion.
 *
 * This is the guard on the trade CLAUDE.md rule 5 makes. A smaller vocabulary is worth having
 * because it hears place names; it is only worth having if the sentences around those place names
 * still survive it.
 */

interface Case {
  readonly said: string;
  readonly kind: string;
  readonly destination?: string;
  readonly origin?: string;
  readonly mode?: string;
}

const cases = (benchmark as { cases: readonly Case[] }).cases;
const vocabulary = new Set(speechGrammar);

/** Devanagari, matching the builder's own test for a word the Hindi lexicon could hold. */
const DEVANAGARI = /[ऀ-ॿ]/u;

/**
 * What the recogniser could at worst return for this sentence: every in-grammar word kept, every
 * out-of-grammar word gone. A real recogniser would put `[unk]` where the word was; the parser
 * ignores unknown tokens either way, so deleting them models the same loss.
 */
function throughTheGrammar(said: string): string {
  const kept: string[] = [];
  for (const raw of said.normalize('NFC').split(/\s+/u)) {
    const word = raw.replace(/[।.,?!]/gu, '');
    if (!DEVANAGARI.test(word)) {
      kept.push(raw);
      continue;
    }
    if (vocabulary.has(word)) {
      kept.push(word);
      continue;
    }
    // A hyphenated spelling comes back as the separate words the grammar does hold, if it holds
    // them: "वाई-फ़ाई" is one written word and two spoken ones.
    const parts = word.split('-').filter((part) => vocabulary.has(part));
    if (parts.length > 0) kept.push(...parts);
  }
  return kept.join(' ');
}

/** Only the Devanagari sentences: the grammar governs the offline model, which writes Devanagari. */
const devanagariCases = cases.filter((c) => DEVANAGARI.test(c.said));

describe('the grammar the offline recogniser decodes against', () => {
  it('covers every place name a traveller could ask for', () => {
    const missing: string[] = [];
    for (const place of intentCorpus.places.values()) {
      for (const word of place.name.hi.normalize('NFC').split(/\s+/u)) {
        if (DEVANAGARI.test(word) && !vocabulary.has(word)) missing.push(`${place.id}: ${word}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps the out-of-vocabulary token, so speech it does not cover is not forced onto a place', () => {
    // Without this a traveller asking something unrelated gets the nearest place name back with
    // full confidence, and is sent somewhere. Being asked is better than being misdirected.
    expect(speechGrammar).toContain(GRAMMAR_UNKNOWN);
  });

  it('holds words, not phrases, so word order is not fixed', () => {
    const phrases = speechGrammar.filter((w) => w !== GRAMMAR_UNKNOWN && w.includes(' '));
    expect(phrases).toEqual([]);
  });

  it('holds no Roman text, which a Hindi lexicon cannot produce', () => {
    const roman = speechGrammar.filter((w) => w !== GRAMMAR_UNKNOWN && /[A-Za-z]/u.test(w));
    expect(roman).toEqual([]);
  });

  it('is small enough to be worth constraining at all', () => {
    // The point is the size of the choice the decoder makes. A few hundred words is a different
    // problem from fifty thousand; a few thousand would not be.
    expect(speechGrammar.length).toBeLessThan(1000);
    expect(speechGrammar.length).toBeGreaterThan(150);
  });

  it('grows with the packs rather than being maintained by hand', () => {
    const withNewPlace = buildSpeechGrammar(
      {
        contentVersion: 1,
        publishedAt: '',
        places: [
          {
            id: 'x',
            name: { en: 'X', hi: 'ऐसीजगह', ar: '', aliases: [] },
            kind: 'neighbourhood',
            location: { lat: 0, lng: 0 },
          },
        ],
      },
      {
        contentVersion: 1,
        publishedAt: '',
        intents: {},
        modes: {},
        foodTags: {},
        documents: {},
        phrases: {},
        hotel: [],
      },
    );
    expect(withNewPlace).toContain('ऐसीजगह');
  });
});

describe('what the grammar costs, measured against the benchmark', () => {
  it('has sentences to measure', () => {
    expect(devanagariCases.length).toBeGreaterThan(20);
  });

  it('changes no conclusion the parser reaches', () => {
    const lost: string[] = [];
    for (const item of devanagariCases) {
      const before = parseIntent(item.said, intentCorpus);
      const after = parseIntent(throughTheGrammar(item.said), intentCorpus);
      const same =
        before.kind === after.kind &&
        before.destination?.placeId === after.destination?.placeId &&
        before.origin?.placeId === after.origin?.placeId &&
        before.mode === after.mode;
      if (!same) {
        lost.push(
          `"${item.said}" → through the grammar: "${throughTheGrammar(item.said)}" ` +
            `(${before.kind}/${before.destination?.placeId ?? '-'} became ` +
            `${after.kind}/${after.destination?.placeId ?? '-'})`,
        );
      }
    }
    expect(lost).toEqual([]);
  });

  it('does not push a sentence over the routing threshold that was below it', () => {
    // Over-eagerness is the risk of biasing: a word forced onto a place name routes someone
    // somewhere on the strength of a sentence that should have been a question.
    const overreached: string[] = [];
    for (const item of devanagariCases) {
      const before = parseIntent(item.said, intentCorpus);
      const after = parseIntent(throughTheGrammar(item.said), intentCorpus);
      if (after.confidence > before.confidence) {
        overreached.push(
          `"${item.said}": ${String(before.confidence)} → ${String(after.confidence)}`,
        );
      }
    }
    expect(overreached).toEqual([]);
  });
});

describe('the out-of-vocabulary marker', () => {
  it('does not reach the traveller or the parser', () => {
    expect(withoutUnknownWords('मुझे [unk] करामा जाना है')).toBe('मुझे करामा जाना है');
  });

  it('leaves a sentence that was entirely out of vocabulary empty, not full of markers', () => {
    // Which is what makes the screen ask: nothing was heard that this app knows a word for.
    expect(withoutUnknownWords('[unk] [unk] [unk]')).toBe('');
  });

  it('does not touch a real word', () => {
    expect(withoutUnknownWords('थाली कहाँ मिलेगी')).toBe('थाली कहाँ मिलेगी');
  });
});
