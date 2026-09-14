import { describe, expect, it } from 'vitest';
import { landingFor } from './micRouting.js';
import { parseIntent } from './parseIntent.js';
import { intentCorpus } from './intentPacks.js';

const landing = (said: string) => landingFor(parseIntent(said, intentCorpus));

/**
 * The mic's whole promise, tested without a microphone: a sentence in, and the screen that
 * already has the answer on it (CLAUDE.md, "the mic is the AI agent").
 */
describe('where the mic lands', () => {
  it.each([
    ['Bhai mujhe Karama jaana hai, metro se kaise jaaun?', '#/soon/transport'],
    ['मुझे मरीना मॉल जाना है', '#/soon/transport'],
    ['Jain khana kahaan milega', '#/soon/food'],
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

  it('asks rather than dead-ends on a sentence it cannot read', () => {
    expect(landing('aaj mausam kaisa rahega')).toBe('ask');
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
    case 'soon':
      return `#/soon/${route.tile}`;
    case 'arabic':
      return `#/arabic/${route.phraseId}`;
    case 'say':
      return '#/say';
    default:
      return `#/${route.screen}`;
  }
}
