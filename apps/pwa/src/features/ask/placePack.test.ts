import { describe, expect, it } from 'vitest';
import { intentCorpus } from './intentPacks.js';
import { parseIntent } from './parseIntent.js';
import { carriesMoreThanThePlace, readPlace } from '../transport/destinations.js';

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

describe('a near spelling is offered as a question, never acted on', () => {
  /**
   * "Burjman" came off a real keyboard. The matcher reads it as BurJuman at less than full
   * confidence; 2.1 shows that as "क्या आपका मतलब बुरजुमान है?" with the place's own Devanagari
   * name — never a transliteration of the traveller's letters (owner, 16 September).
   */
  it('reads a mistyped place as itself, marked unsure', () => {
    const reading = readPlace('Burjman');
    expect(reading?.place.id).toBe('burjuman');
    expect(reading?.sure).toBe(false);
  });

  it('reads an exact place as sure, in either script', () => {
    expect(readPlace('karama')).toMatchObject({ sure: true });
    expect(readPlace('बुर्ज ख़लीफ़ा')?.place.id).toBe('burj-khalifa');
  });

  it('reads nothing into words that are not a place', () => {
    expect(readPlace('mera phone charge karna hai')).toBeNull();
  });
});

describe('an address inside a place we know keeps the part that says which door', () => {
  /**
   * The residual half of the owner's Satwa objection. Satwa is in the pack now, so
   * "Satwa, Al Hudaiba Building" resolves — and resolving it is exactly how the building gets
   * thrown away. A driver shown خذني إلى السطوة has been told the neighbourhood and nothing
   * about the door, which is the bare-"mall" defect one level down.
   */
  it('knows when the traveller wrote more than the place name', () => {
    expect(carriesMoreThanThePlace('Satwa Al Hudaiba Building', 'Satwa')).toBe(true);
    expect(carriesMoreThanThePlace('karama mein Zabeel House', 'Karama')).toBe(true);
  });

  it('knows when they wrote only the place, in either script', () => {
    expect(carriesMoreThanThePlace('करामा जाना है', 'करामा')).toBe(false);
    expect(carriesMoreThanThePlace('mujhe karama jaana hai', 'karama')).toBe(false);
    expect(carriesMoreThanThePlace('metro se dubai mall le chalo', 'dubai mall')).toBe(false);
  });
});
