import { beforeEach, describe, expect, it } from 'vitest';
import { PHRASE_SITUATIONS } from '@saathi/shared';
import { loadPhrasePack, parsePhrasePack, phraseById, phrasesFor } from './content.js';
import { db } from './schema.js';
import raw from '../../../../data/phrases/phrases.v1.json';

describe('the phrase pack, offline', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('loads into the device and reads back with no network', async () => {
    expect(await loadPhrasePack(parsePhrasePack(raw))).toBe('loaded');
    const taxi = await phrasesFor('taxi');
    expect(taxi.length).toBeGreaterThan(0);
    expect(taxi.every((p) => p.ar.trim() !== '')).toBe(true);
  });

  it('is idempotent, so booting twice does not duplicate the pack', async () => {
    await loadPhrasePack(parsePhrasePack(raw));
    expect(await loadPhrasePack(parsePhrasePack(raw))).toBe('already-current');
    expect(await db.phrases.count()).toBe(parsePhrasePack(raw).phrases.length);
  });

  it('gives every phrase Hindi, Hinglish and Arabic — Hinglish is first-class (rule 4)', async () => {
    await loadPhrasePack(parsePhrasePack(raw));
    for (const phrase of await db.phrases.toArray()) {
      expect(phrase.hi.trim(), phrase.id).not.toBe('');
      expect(phrase.hinglish.trim(), phrase.id).not.toBe('');
      expect(phrase.ar.trim(), phrase.id).not.toBe('');
      expect(PHRASE_SITUATIONS).toContain(phrase.situation);
    }
  });

  it('finds one phrase by id, which is how 3.2 and 3.3 load', async () => {
    await loadPhrasePack(parsePhrasePack(raw));
    const phrase = await phraseById('taxi-hotel');
    expect(phrase?.ar).toContain('الفندق');
  });

  it('rejects a pack with an unknown situation instead of showing a blank list', () => {
    expect(() =>
      parsePhrasePack({
        contentVersion: 9,
        publishedAt: '2026-01-01T00:00:00Z',
        phrases: [{ id: 'x', situation: 'nightclub', hi: 'a', hinglish: 'a', en: 'a', ar: 'a' }],
      }),
    ).toThrow(/nightclub/);
  });
});
