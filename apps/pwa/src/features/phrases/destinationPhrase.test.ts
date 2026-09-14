import { describe, expect, it } from 'vitest';
import { intentCorpus } from '../voice/intentPacks.js';
import { destinationPhrase, destinationPhraseId, placeIdInPhrase } from './destinationPhrase.js';
import { resolvePhrase } from './resolvePhrase.js';

/**
 * The symptom this guards against is a traveller at a taxi door being shown nothing, or being
 * shown Arabic that does not name where they are going. Both are silent failures on the screen
 * that matters most, so they are asserted against the real place pack rather than a fixture.
 */
describe('take me to X', () => {
  it('names the place in Arabic, in Arabic script', () => {
    const karama = intentCorpus.places.get('karama');
    expect(karama).toBeDefined();
    const phrase = destinationPhrase(karama!);
    expect(phrase?.ar).toBe('خذني إلى الكرامة');
    expect(phrase?.hi).toBe('करामा ले चलो');
  });

  it('composes a sentence for every place that ships', () => {
    for (const place of intentCorpus.places.values()) {
      const phrase = destinationPhrase(place);
      expect(phrase, `no sentence for ${place.id}`).not.toBeNull();
      expect(phrase!.ar).toContain(place.name.ar!);
    }
  });

  it('round-trips a place id through a phrase id', () => {
    expect(placeIdInPhrase(destinationPhraseId('dubai-mall'))).toBe('dubai-mall');
  });

  /** An ordinary pack phrase must not be mistaken for a composed one. */
  it('leaves pack phrase ids alone', () => {
    expect(placeIdInPhrase('taxi-meter')).toBeNull();
  });

  it('resolves a composed id without the phrase pack being loaded', async () => {
    const marina = intentCorpus.places.get('marina-mall');
    const phrase = await resolvePhrase(destinationPhraseId('marina-mall'));
    expect(phrase?.ar).toBe(`خذني إلى ${marina!.name.ar!}`);
  });

  /** A place we do not know must come back empty rather than as a sentence with a hole in it. */
  it('has nothing to say about a place it does not know', async () => {
    expect(await resolvePhrase(destinationPhraseId('atlantis'))).toBeUndefined();
  });
});
