import type { ParsedIntent } from '@saathi/shared';
import { href, type Route } from '../../app/routes.js';
import { composedPhraseId } from '../phrases/composeArabic.js';
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

/**
 * A sentence nothing could be done with, in Arabic.
 *
 * This is the floor of the whole app and there is nothing below it. A traveller standing in
 * front of a shopkeeper has said something in their own words; if our parser does not recognise
 * it, that is our gap, not theirs, and "that did not come through" leaves them holding a phone
 * that has just refused to help. The words are still a sentence somebody in Dubai can read, so
 * they go to 3.2 and come out in Arabic — composed on the device when the shape is one we know,
 * translated when the phone has signal, and honest about it when neither can.
 */
function sayItInArabic(intent: ParsedIntent): Route {
  return { screen: 'arabic', phraseId: composedPhraseId(intent.transcript) };
}

export function landingFor(intent: ParsedIntent): Route | 'ask' {
  // A bare place name is the one thing that still stops to ask. "Karama" is रास्ता or खाना and
  // the difference is not in the word, so it is a tap rather than a guess (decision 014). Every
  // other sentence goes somewhere.
  if (!isConfident(intent)) return intent.kind === 'place' ? 'ask' : sayItInArabic(intent);
  switch (intent.kind) {
    case 'route':
      // 1.1, not the options: the destination is only half of what the traveller wants, and the
      // other half is a tap rather than a guess. The place goes with them, so the box is filled.
      return transportLanding(intent.destination?.placeId);
    case 'food':
      return { screen: 'food' };
    case 'phrase':
      // A named sentence opens with its own Arabic. "अरबी में बोलो" names none — it is a request
      // for the screen, not a sentence to translate — so it opens 3.1 with an empty box.
      return intent.phraseId === undefined
        ? { screen: 'say' }
        : { screen: 'arabic', phraseId: intent.phraseId };
    case 'document':
      return { screen: 'info' };
    case 'place':
      return 'ask';
    case 'unknown':
      return sayItInArabic(intent);
  }
}

/** The route as a hash, so a screen can tell whether the mic is what brought the traveller. */
export function landingHref(intent: ParsedIntent): string | null {
  const route = landingFor(intent);
  return route === 'ask' ? null : href(route);
}
