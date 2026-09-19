import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { packDigestInput } from '@saathi/shared';

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
