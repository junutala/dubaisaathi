import { describe, expect, it } from 'vitest';
import { ROUTING_CONFIDENCE } from '@saathi/shared';
import { isConfident, parseIntent } from './parseIntent.js';
import { intentCorpus } from './intentPacks.js';
import { skeleton, SKELETON_MIN } from './normalise.js';

const parse = (text: string) => parseIntent(text, intentCorpus);

describe('the packs', () => {
  it('builds without a malformed entry', () => {
    expect(intentCorpus.places.size).toBeGreaterThan(10);
    expect(intentCorpus.intents.length).toBeGreaterThan(40);
  });

  it('has no two places sharing a usable skeleton', () => {
    // A shared skeleton would make one place silently answer for another. Adding a place that
    // collides should fail here, so the alias is fixed deliberately rather than discovered by
    // a traveller in a taxi.
    const owners = new Map<string, Set<string>>();
    for (const place of intentCorpus.places.values()) {
      for (const alias of [place.name.en, place.name.hi, ...place.name.aliases]) {
        const bones = skeleton(alias);
        if (bones.length < SKELETON_MIN) continue;
        owners.set(bones, (owners.get(bones) ?? new Set()).add(place.id));
      }
    }
    const clashes = [...owners].filter(([, ids]) => ids.size > 1);
    expect(clashes.map(([bones, ids]) => `${bones}: ${[...ids].join(' + ')}`)).toEqual([]);
  });
});

describe('route', () => {
  // CLAUDE.md rule 4: a test fed only pure Devanagari does not reflect a real user.
  it.each([
    'मुझे करामा जाना है',
    'mujhe Karama jaana hai',
    'Bhai mujhe Karama jaana hai, metro se kaise jaaun?',
    'मुझे Karama जाना है',
    'karama kaise pahunchu',
  ])('reads "%s" as a route to Karama', (said) => {
    const intent = parse(said);
    expect(intent.kind).toBe('route');
    expect(intent.destination?.placeId).toBe('karama');
    expect(isConfident(intent)).toBe(true);
  });

  it('picks up the mode when the sentence names one', () => {
    expect(parse('Bhai mujhe Karama jaana hai, metro se kaise jaaun?').mode).toBe('metro');
    expect(parse('टैक्सी से दुबई मॉल जाना है').mode).toBe('taxi');
  });

  it('reads "से" as where they are, not where they are going', () => {
    const intent = parse('करामा से बुर दुबई जाना है');
    expect(intent.origin?.placeId).toBe('karama');
    expect(intent.destination?.placeId).toBe('bur-dubai');
  });

  it('opens the tile on the verb alone, with nothing filled in', () => {
    const intent = parse('rasta batao');
    expect(intent.kind).toBe('route');
    expect(intent.destination).toBeUndefined();
    expect(isConfident(intent)).toBe(true);
  });

  it('finds a place nobody curated, and says it is not certain', () => {
    // "Kraama" is in no alias list. Its consonants are Karama's, so the skeleton match offers
    // it — at 0.75, not 1, because a wrong destination is worse than a question.
    const intent = parse('Kraama jaana hai');
    expect(intent.destination?.placeId).toBe('karama');
    expect(intent.destination?.confidence).toBeLessThan(1);
    expect(isConfident(intent)).toBe(true);
  });
});

describe('food', () => {
  it.each([
    ['Jain khana kahaan milega', 'jain'],
    ['जैन खाना कहाँ मिलेगा', 'jain'],
    ['bina pyaz khana', 'no-onion'],
    ['व्रत का खाना', 'vrat'],
  ])('reads "%s" as food tagged %s', (said, tag) => {
    const intent = parse(said);
    expect(intent.kind).toBe('food');
    expect(intent.foodTags).toContain(tag);
    expect(isConfident(intent)).toBe(true);
  });

  it('is food even with no tag, because the tile can ask', () => {
    const intent = parse('bhookh lagi hai');
    expect(intent.kind).toBe('food');
    expect(isConfident(intent)).toBe(true);
  });

  it('keeps the place when they name one', () => {
    expect(parse('Karama mein veg khana').destination?.placeId).toBe('karama');
  });
});

describe('phrase', () => {
  it.each([
    ['driver ko bolo hotel le chalo', 'taxi-hotel'],
    ['ड्राइवर को बोलो होटल ले चलो', 'taxi-hotel'],
    ['meter chalu karne ko bolo', 'taxi-meter'],
    ['अरबी में बोलो — दाम क्या है', 'shop-price'],
  ])('reads "%s" as the sentence %s', (said, phraseId) => {
    const intent = parse(said);
    expect(intent.kind).toBe('phrase');
    expect(intent.phraseId).toBe(phraseId);
    expect(isConfident(intent)).toBe(true);
  });

  it('takes a ready sentence as a phrase even with no verb', () => {
    expect(parse('wifi ka password').kind).toBe('phrase');
  });
});

describe('document', () => {
  it.each([
    ['beema dikhao', 'insurance'],
    ['बीमा दिखाओ', 'insurance'],
    ['passport nikalo', 'passport'],
    ['वापसी की फ़्लाइट दिखाओ', 'flight'],
  ])('reads "%s" as the %s document', (said, name) => {
    const intent = parse(said);
    expect(intent.kind).toBe('document');
    expect(intent.documentName).toBe(name);
    expect(isConfident(intent)).toBe(true);
  });
});

describe('when it is not sure', () => {
  it('shows the traveller their own words, not the folded form', () => {
    // The clarifier asks about "करामा", never about "karama" — that folded form is how the
    // parser thinks, and putting it on screen would make the app look broken.
    expect(parse('करामा').destination?.spoken).toBe('करामा');
    expect(parse('Bur Dubai').destination?.spoken).toBe('Bur Dubai');
    expect(parse('मुझे मरीना मॉल जाना है').destination?.spoken).toBe('मरीना मॉल');
  });

  it('asks rather than guesses for a bare place name', () => {
    const intent = parse('Karama');
    expect(intent.kind).toBe('place');
    expect(intent.destination?.placeId).toBe('karama');
    expect(intent.confidence).toBeLessThan(ROUTING_CONFIDENCE);
    expect(isConfident(intent)).toBe(false);
  });

  it('is unknown, never a dead end, for a sentence it cannot read', () => {
    const intent = parse('aaj mausam kaisa rahega');
    expect(intent.kind).toBe('unknown');
    expect(intent.confidence).toBe(0);
  });

  it('is unknown for silence', () => {
    expect(parse('').kind).toBe('unknown');
  });

  it('never claims certainty, because the speech that fed it was not certain', () => {
    const said = 'Bhai mujhe Karama jaana hai, metro se kaise jaaun?';
    expect(parse(said).confidence).toBeLessThanOrEqual(0.95);
  });

  it('keeps the transcript verbatim, for the learning loop', () => {
    expect(parse('कुछ भी').transcript).toBe('कुछ भी');
  });
});
