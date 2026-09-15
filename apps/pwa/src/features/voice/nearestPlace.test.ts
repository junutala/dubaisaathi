import { describe, expect, it } from 'vitest';
import { allowedEdits, editsBetween, nearestPlace, NEAREST_MIN } from './nearestPlace.js';
import { intentCorpus } from './intentPacks.js';
import { fold } from './normalise.js';
import { parseIntent } from './parseIntent.js';

const nearest = (said: string) => nearestPlace(fold(said), intentCorpus.placeByAlias);

/**
 * The bet this makes, and why it is a better bet than a bigger model.
 *
 * Nothing transcribes Dubai place names reliably. They are English and Arabic proper nouns said
 * in an Indian accent inside a Hindi sentence, and on one afternoon on one phone: Vosk returned
 * "माला एमरेट्स", whisper-base ran three words into one, and Google's cloud recogniser — with a
 * data centre behind it — gave "माल का एमिरेट्स". Three engines, three sizes, same failure.
 *
 * But the answer is never open. A traveller is naming one of about twenty places we ship, so
 * this stops being transcription and becomes nearest-match over a closed, small list. Rule 5
 * said it first: intent accuracy is the KPI, not a clean transcript.
 */
describe('the nearest place to what was actually heard', () => {
  it.each([
    ['बरजमान', 'burjuman', 'whisper-base, offline, on the owner’s phone'],
    ['माल का एमिरेट्स', 'mall-of-emirates', 'Google’s cloud recogniser, same afternoon'],
  ])('finds %s → %s (%s)', (said, placeId) => {
    expect(nearest(said)).toBe(placeId);
  });

  /**
   * The collision that sets the threshold, and it is not hypothetical: this fired, and answered
   * "Karama: रास्ता or खाना?" to somebody who wanted their phone charged.
   */
  it('never reads the commonest verb in Hindi as a neighbourhood', () => {
    expect(editsBetween(fold('करना'), fold('करामा'), 3)).toBe(1);
    expect(nearest('करना')).toBeUndefined();
    expect(parseIntent('मेरा फ़ोन चार्ज करना है', intentCorpus).destination).toBeUndefined();
  });

  it('leaves short words alone entirely, whatever they are near', () => {
    expect(fold('करना').length).toBeLessThan(NEAREST_MIN);
    expect(nearest('बस')).toBeUndefined();
    expect(nearest('खाना')).toBeUndefined();
  });

  /** Two places equally close is two answers. Picking one would be inventing an intention. */
  it('answers with nothing rather than tossing a coin', () => {
    const tied = new Map([
      ['aaaaaaaa', 'first-place'],
      ['aaaaaaab', 'second-place'],
    ]);
    expect(nearestPlace('aaaaaaac', tied)).toBeUndefined();
  });

  it('still prefers the closer of two when there is one', () => {
    const list = new Map([
      ['burajuman', 'burjuman'],
      ['dubai mol', 'dubai-mall'],
    ]);
    expect(nearestPlace('barajaman', list)).toBe('burjuman');
  });

  /** A near match asks rather than acts: the wrong end of Dubai costs an hour, a tap costs one. */
  it('is offered as a question, not as a decision', () => {
    const intent = parseIntent('मुझे बरजमान तक जाना है', intentCorpus);
    expect(intent.destination?.placeId).toBe('burjuman');
    expect(intent.destination?.confidence).toBeLessThan(1);
  });
});

describe('the distance itself', () => {
  it('counts the edits between two spellings', () => {
    expect(editsBetween('karama', 'karama', 3)).toBe(0);
    expect(editsBetween('karama', 'karana', 3)).toBe(1);
    expect(editsBetween('burajuman', 'barajaman', 3)).toBe(2);
  });

  /** Bounded on purpose: this runs over every alias, for every window, while somebody waits. */
  it('gives up as soon as it cannot come in under the limit', () => {
    expect(editsBetween('karama', 'completely different', 2)).toBeGreaterThan(2);
    expect(editsBetween('a', 'aaaaaaaaaa', 2)).toBeGreaterThan(2);
  });

  it('allows more room in a longer word, and never more than three', () => {
    expect(allowedEdits(8)).toBe(2);
    expect(allowedEdits(14)).toBe(3);
    expect(allowedEdits(100)).toBe(3);
  });
});
