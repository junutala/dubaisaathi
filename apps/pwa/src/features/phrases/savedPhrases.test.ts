import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../db/schema.js';
import { forgetPhrase, savePhrase, savedArabicFor, savedPhrases } from './savedPhrases.js';

beforeEach(async () => {
  await db.savedPhrases.clear();
});

describe('a phrase kept is a phrase that works offline', () => {
  it('comes back by the words that were said', async () => {
    await savePhrase('mera AC kharab hai', 'المكيف لا يعمل', 'test');
    const found = await savedArabicFor('mera AC kharab hai');
    expect(found?.ar).toBe('المكيف لا يعمل');
  });

  it('is found however the traveller cased or spaced it', async () => {
    await savePhrase('Mera AC kharab hai', 'المكيف لا يعمل', 'test');
    expect((await savedArabicFor('  mera   ac KHARAB hai '))?.ar).toBe('المكيف لا يعمل');
  });

  it('keeps one row when the same sentence is saved twice', async () => {
    await savePhrase('paani chahiye', 'أريد ماء', 'test');
    await savePhrase('paani chahiye', 'أريد ماء', 'test');
    expect(await db.savedPhrases.count()).toBe(1);
  });

  it('refuses a sentence with no Arabic rather than keeping an empty row', async () => {
    expect(await savePhrase('kuch bhi', '', 'test')).toBeNull();
    expect(await savePhrase('', 'أريد ماء', 'test')).toBeNull();
    expect(await db.savedPhrases.count()).toBe(0);
  });
});

describe('the list', () => {
  it('reads newest first, because that is what is being looked for', async () => {
    await savePhrase('first', 'الأول', 'test');
    await new Promise((r) => setTimeout(r, 5));
    await savePhrase('second', 'الثاني', 'test');
    const rows = await savedPhrases();
    expect(rows[0]?.said).toBe('second');
  });

  it('forgets one when the traveller says so', async () => {
    const row = await savePhrase('bekaar', 'شيء', 'test');
    await forgetPhrase(row?.id ?? '');
    expect(await db.savedPhrases.count()).toBe(0);
  });
});

describe('what it records about provenance', () => {
  it('keeps which engine produced the Arabic, so a bad batch can be found', async () => {
    const row = await savePhrase('test', 'اختبار', 'google-cloud-v3');
    expect(row?.engine).toBe('google-cloud-v3');
  });
});
