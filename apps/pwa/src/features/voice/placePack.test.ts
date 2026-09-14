import { describe, expect, it } from 'vitest';
import { intentCorpus } from './intentPacks.js';
import { parseIntent } from './parseIntent.js';
import {
  typedDestinationPhrase,
  typedDestinationPhraseId,
  typedTextInPhrase,
} from '../phrases/destinationPhrase.js';

/**
 * The defect this guards against, reported from a phone on 14 September:
 *
 * > "I typed Burjuman Mall ko jaana hai and pressed Show to driver. The next screen showed
 * > Dubai Mall ko Jaana Hai."
 *
 * `dubai-mall` carried the bare alias `mall`, so **every mall we did not know became Dubai
 * Mall at full confidence** — BurJuman, Ibn Battuta, Wafi — with the real name silently
 * discarded. The traveller is then shown Arabic they cannot read, naming a mall 8 km from the
 * one they asked for, and hands the phone to a driver.
 *
 * It is the failure mode CLAUDE.md singles out as the worst this product has: confidently
 * wrong beats asking again, every time. So the rule is structural rather than a patch for one
 * word — a category noun is not a name, and none may stand alone as an alias.
 */

/** Words that describe a kind of place rather than naming one. */
const CATEGORY_WORDS = [
  'mall',
  'मॉल',
  'burj',
  'बुर्ज',
  'bur',
  'souk',
  'सूक',
  'tower',
  'towers',
  'टावर',
  'hotel',
  'होटल',
  'station',
  'स्टेशन',
  'city',
  'सिटी',
  'centre',
  'center',
  'सेंटर',
  'beach',
  'बीच',
  'park',
  'पार्क',
  'village',
  'विलेज',
  'garden',
  'gardens',
];

describe('the place pack', () => {
  it('never lets a category noun stand alone as an alias', () => {
    const offenders: string[] = [];
    for (const place of intentCorpus.places.values()) {
      for (const alias of place.name.aliases) {
        if (CATEGORY_WORDS.includes(alias.trim().toLowerCase())) {
          offenders.push(`${place.id} → "${alias}"`);
        }
      }
    }
    expect(offenders, 'a category noun matches every place of that kind').toEqual([]);
  });
});

describe('a mall we do not know is never answered with one we do', () => {
  /** The exact sentence from the report, and two more of the same shape. */
  it.each([
    ['Burjuman Mall ko jaana hai', 'burjuman'],
    ['Ibn Battuta Mall ko jaana hai', 'ibn-battuta-mall'],
    ['Deira City Centre jaana hai', 'deira-city-centre'],
  ])('%s resolves to itself, not to Dubai Mall', (typed, expected) => {
    const intent = parseIntent(typed, intentCorpus);
    expect(intent.destination?.placeId).toBe(expected);
  });

  /**
   * The one that matters most: a mall that is genuinely not in the pack must come back with
   * nothing. Silence is a screen that says "we do not know this place"; a wrong answer is a
   * traveller in the wrong emirate corner with a driver already moving.
   */
  it.each(['Wafi Mall ko jaana hai', 'Nakheel Mall ko jaana hai'])(
    '%s resolves to no place at all rather than the wrong one',
    (typed) => {
      const intent = parseIntent(typed, intentCorpus);
      expect(intent.destination?.placeId).toBeUndefined();
    },
  );

  /** And the neighbouring landmark that the bare `burj` alias would have swallowed. */
  it('keeps Burj Al Arab apart from Burj Khalifa', () => {
    expect(parseIntent('Burj Al Arab jaana hai', intentCorpus).destination?.placeId).toBe(
      'burj-al-arab',
    );
    expect(parseIntent('Burj Khalifa jaana hai', intentCorpus).destination?.placeId).toBe(
      'burj-khalifa',
    );
  });

  /** The neighbourhoods a budget traveller actually stays in, missing until now. */
  it.each([
    ['Discovery Gardens jaana hai', 'discovery-gardens'],
    ['International City jaana hai', 'international-city'],
    ['satwa jaana hai', 'satwa'],
  ])('%s now reaches a place', (typed, expected) => {
    expect(parseIntent(typed, intentCorpus).destination?.placeId).toBe(expected);
  });
});

describe('a place we will never have still gets the traveller there', () => {
  /**
   * The owner's objection, and it is the right one:
   *
   * > "You mean the tourists are allowed to go only to the places that we decide for them. So
   * > if they want to go to a friend's place in Satwa, we will not help him and instead drive
   * > him to Dubai Mall."
   *
   * A curated pack can hold the twenty destinations every tourist shares. It can never hold the
   * one address that is the reason they came. Showing a driver never needed the pack — he knows
   * the city — so the words go in front of him untouched.
   */
  it('puts unresolved words in front of the driver, verbatim', () => {
    const phrase = typedDestinationPhrase('Al Hudaiba Building, Satwa');
    expect(phrase?.ar).toBe('خذني إلى Al Hudaiba Building, Satwa');
    expect(phrase?.hinglish).toBe('Al Hudaiba Building, Satwa le chalo');
  });

  it('round-trips words with spaces and commas through a hash route', () => {
    const id = typedDestinationPhraseId('Flat 302, Al Hudaiba / Satwa');
    expect(id).not.toContain('/');
    expect(typedTextInPhrase(id)).toBe('Flat 302, Al Hudaiba / Satwa');
  });

  it('changes nothing about what they wrote', () => {
    // Not transliterated, not corrected, not resolved — every one of those is a chance to alter
    // where someone is asking to be taken.
    const words = 'burjuman ke paas wala gali';
    expect(typedDestinationPhrase(words)?.ar).toContain(words);
  });

  it('has nothing to say about an empty box', () => {
    expect(typedDestinationPhrase('   ')).toBeNull();
  });
});
