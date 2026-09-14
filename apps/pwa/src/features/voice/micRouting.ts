import type { ParsedIntent } from '@saathi/shared';
import { href, type Route } from '../../app/routes.js';
import { isConfident } from './parseIntent.js';

/**
 * Where a understood sentence lands. This is the whole promise of the mic (CLAUDE.md: "the mic
 * is the AI agent"): speech in, and the right screen with the answer already on it.
 *
 * It is a pure function so the mapping can be tested without a microphone, a browser or a tap.
 */
/**
 * 1.1, with the destination filled in when there is one.
 *
 * Wherever a traveller has said where they want to go but not which of the two things they want
 * done about it, this is where they land. "Discovery Gardens jaana hai" is *show me the
 * transport* in a hotel room and *tell the driver* at a taxi door; the difference is where they
 * are standing, it is not in the words, and no parser recovers it — so the app never guesses,
 * it opens the screen that offers both (decision 014).
 */
export function transportLanding(placeId: string | undefined): Route {
  return placeId === undefined ? { screen: 'transport' } : { screen: 'transport', placeId };
}

export function landingFor(intent: ParsedIntent): Route | 'ask' {
  if (!isConfident(intent)) return 'ask';
  switch (intent.kind) {
    case 'route':
      // 1.1, not the options: the destination is only half of what the traveller wants, and the
      // other half is a tap rather than a guess. The place goes with them, so the box is filled.
      return transportLanding(intent.destination?.placeId);
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
