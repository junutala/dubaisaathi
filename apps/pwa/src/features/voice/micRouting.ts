import type { ParsedIntent } from '@saathi/shared';
import { href, type Route } from '../../app/routes.js';
import { isConfident } from './parseIntent.js';

/**
 * Where a understood sentence lands. This is the whole promise of the mic (CLAUDE.md: "the mic
 * is the AI agent"): speech in, and the right screen with the answer already on it.
 *
 * It is a pure function so the mapping can be tested without a microphone, a browser or a tap.
 */
export function landingFor(intent: ParsedIntent): Route | 'ask' {
  if (!isConfident(intent)) return 'ask';
  switch (intent.kind) {
    case 'route':
      return { screen: 'soon', tile: 'transport' };
    case 'food':
      return { screen: 'soon', tile: 'food' };
    case 'phrase':
      // The one path that is built end to end today: a named sentence opens with its Arabic on
      // screen, ready to be spoken or shown.
      return intent.phraseId === undefined
        ? { screen: 'say' }
        : { screen: 'arabic', phraseId: intent.phraseId };
    case 'document':
      return { screen: 'info' };
    case 'place':
    case 'unknown':
      return 'ask';
  }
}

/** The route as a hash, so a screen can tell whether the mic is what brought the traveller. */
export function landingHref(intent: ParsedIntent): string | null {
  const route = landingFor(intent);
  return route === 'ask' ? null : href(route);
}
