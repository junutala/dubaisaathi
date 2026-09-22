import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { packDigestInput } from '@saathi/shared';
import { PACK_FILES, checkPack, versionField, type PackId } from './packCheck.ts';

/**
 * The digest contract (decision 030), which very nearly shipped broken: the publisher hashed the
 * file as it sits on disk and the phone hashed the body it had parsed and re-serialised. Two
 * correct digests of the same content that can never match — and the phone would have refused
 * every pack as damaged while the server insisted it had published one.
 *
 * What the test pins is the agreement, not the algorithm: a file written by a person, with
 * whatever indentation their editor uses, must produce the digest the phone computes.
 */
describe('a pack is hashed the same on both sides', () => {
  const pack = { contentVersion: 3, attractions: [{ placeId: 'burj-khalifa' }] };

  function publisherDigest(fileText: string): string {
    const body: unknown = JSON.parse(fileText);
    return createHash('sha256').update(packDigestInput(body)).digest('hex');
  }

  async function phoneDigest(body: unknown): Promise<string> {
    const bytes = new TextEncoder().encode(packDigestInput(body));
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  it('agrees whatever the file looked like', async () => {
    const pretty = JSON.stringify(pack, null, 2) + '\n';
    const flat = JSON.stringify(pack);
    expect(publisherDigest(pretty)).toBe(publisherDigest(flat));
    expect(publisherDigest(pretty)).toBe(await phoneDigest(pack));
  });

  it('still notices content that actually changed', async () => {
    const changed = { ...pack, attractions: [{ placeId: 'dubai-mall' }] };
    expect(publisherDigest(JSON.stringify(pack))).not.toBe(await phoneDigest(changed));
  });
});

/**
 * The check that guards what reaches a phone, run over the files that would actually be sent.
 *
 * It was not run by anything until today, and it silently rotted: the fare pack moved from
 * distance bands to zones and the check went on looking for `transitBandsAed`, so
 * `publish:packs` refused the one pack it existed to wave through. A gate that nothing runs is
 * not a gate, and this is the test that runs it.
 */
describe('every pack in data/ is publishable', () => {
  const PUBLISHABLE: readonly PackId[] = ['attractions', 'transport', 'fares'];

  it.each(PUBLISHABLE)('%s passes the publisher’s own check', async (id) => {
    const body: unknown = JSON.parse(await readFile(PACK_FILES[id], 'utf8'));
    expect(() => {
      checkPack(id, body);
    }).not.toThrow();
    const version = (body as Record<string, unknown>)[versionField(id)];
    expect(typeof version, `${id} needs a ${versionField(id)}`).toBe('number');
    expect(version).toBeGreaterThan(0);
  });

  /**
   * restaurants.v1.json holds nothing until the first collection day, and publishing emptiness
   * over a phone's outlets is decision 025 broken from our side. The check must keep refusing it.
   */
  it('still refuses an empty restaurants pack', () => {
    expect(() => {
      checkPack('restaurants', { restaurants: [] });
    }).toThrow(/empty/);
  });

  /**
   * The rows live under the pack's own name in every file. This said `items` for two of them,
   * so the publisher could never have sent an outlet or an attraction — it would have failed on
   * the first collection day, which is the day decision 030 exists for.
   */
  it('looks for each pack’s rows where that pack actually keeps them', () => {
    expect(() => {
      checkPack('attractions', { items: [{ placeId: 'burj-khalifa' }] });
    }).toThrow(/no "attractions" array/);
    expect(() => {
      checkPack('attractions', { attractions: [{ placeId: 'burj-khalifa' }] });
    }).not.toThrow();
  });

  it('refuses a fare pack with no tariff in it', () => {
    expect(() => {
      checkPack('fares', { fareVersion: 9, taxi: { minimumAed: 12 } });
    }).toThrow(/Nol zone tariff/);
  });
});
