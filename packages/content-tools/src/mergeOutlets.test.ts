import { describe, expect, it } from 'vitest';
import { mergeOutlets } from './mergeOutlets.ts';

/** A rows file is one desk's slice, never the whole pack (30 September). */
describe('publishing a rows file into the pack', () => {
  const published = [
    { id: 'a', name: 'Buhari' },
    { id: 'b', name: 'Woodlands' },
    { id: 'c', name: 'Swades' },
  ];

  it('keeps every outlet the file does not mention', () => {
    const merged = mergeOutlets(published, [{ id: 'd', name: 'Karandi' }]);
    expect(merged.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('replaces a corrected outlet where it stood, and adds new ones at the end', () => {
    const merged = mergeOutlets(published, [
      { id: 'e', name: 'Kozhikode' },
      { id: 'b', name: 'Woodlands (corrected)' },
    ]);
    expect(merged.map((o) => o.name)).toEqual([
      'Buhari',
      'Woodlands (corrected)',
      'Swades',
      'Kozhikode',
    ]);
  });
});
