import { describe, expect, it } from 'vitest';
import { landingFor } from './micRouting.js';
import { parseIntent } from './parseIntent.js';
import { intentCorpus } from './intentPacks.js';
import { composedTextInPhrase } from '../phrases/composeArabic.js';

const landing = (said: string) => landingFor(parseIntent(said, intentCorpus));

/**
 * The mic's whole promise, tested without a microphone: a sentence in, and the screen that
 * already has the answer on it (CLAUDE.md, "the mic is the AI agent").
 */
describe('where the mic lands', () => {
  it.each([
    // रास्ता, with the destination already in the box — not the options. "Karama jaana hai" is
    // *show me the transport* in a hotel room and *tell the driver* at a taxi door, and the
    // difference is where the traveller is standing rather than anything in the words. The app
    // never guesses between the two; 1.1 offers both and one tap settles it (decision 014).
    ['Bhai mujhe Karama jaana hai, metro se kaise jaaun?', '#/transport/karama'],
    ['मुझे मरीना मॉल जाना है', '#/transport/marina-mall'],
    ['Jain khana kahaan milega', '#/food'],
    ['ड्राइवर को बोलो होटल ले चलो', '#/arabic/taxi-hotel'],
    ['driver ko bolo meter chalu karo', '#/arabic/taxi-meter'],
    ['beema dikhao', '#/info'],
  ])('sends "%s" to %s', (said, hash) => {
    const route = landing(said);
    expect(route).not.toBe('ask');
    if (route === 'ask') return;
    expect(hashOf(route)).toBe(hash);
  });

  it('asks when one word could mean two things', () => {
    expect(landing('करामा')).toBe('ask');
  });

  /**
   * The floor, and the reason this app exists.
   *
   * A sentence our parser cannot read is still a sentence somebody in Dubai can. Until now it
   * landed on "That did not come through" with two buttons that both threw the words away — and
   * one of them offered to take it typed, to a traveller who had just typed it. Whatever we
   * cannot act on, we translate.
   */
  it.each([
    'aaj mausam kaisa rahega',
    'AC kharab hai, theek kar do',
    'thoda dheere chaliye please',
    'मेरा फ़ोन चार्ज करना है',
  ])('translates "%s" rather than dead-ending on it', (said) => {
    // Nothing here matches a ready sentence — "ye kitne ka hai bhaiya" does, and lands on its
    // own curated Arabic instead. These are the ones with nowhere else to go.
    const route = landing(said);
    expect(route).not.toBe('ask');
    if (route === 'ask') return;
    expect(route.screen).toBe('arabic');
    if (route.screen !== 'arabic') return;
    // The traveller's own words travel inside the id, so the Arabic survives a reload.
    expect(composedTextInPhrase(route.phraseId)).toBe(said);
  });

  /** A journey with nowhere named still opens रास्ता, with an empty box rather than a shrug. */
  it('opens रास्ता with an empty box when it heard a journey but no place', () => {
    const route = landing('metro se kaise jaaun');
    expect(route).not.toBe('ask');
    if (route === 'ask') return;
    expect(hashOf(route)).toBe('#/transport');
  });

  it('falls back to the sentence list when it heard "बोलो" but not what', () => {
    const route = landing('arabi mein bolo');
    expect(route).not.toBe('ask');
    if (route === 'ask') return;
    expect(hashOf(route)).toBe('#/say');
  });
});

function hashOf(route: Exclude<ReturnType<typeof landingFor>, 'ask'>): string {
  switch (route.screen) {
    case 'info':
      return '#/info';
    case 'transport':
      return route.placeId === undefined ? '#/transport' : `#/transport/${route.placeId}`;
    case 'food':
      return '#/food';
    case 'arabic':
      return `#/arabic/${route.phraseId}`;
    case 'say':
      return '#/say';
    default:
      return `#/${route.screen}`;
  }
}
