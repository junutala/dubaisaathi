import { describe, expect, it } from 'vitest';
import { searchOutlets } from './search.js';
import { outlets } from './outlets.js';

/**
 * The trap this file exists for.
 *
 * A sentence with nothing food-like in it filters nothing, so the search hands back *every*
 * outlet we have. खाना read that as an answer and showed the whole list under "mera phone charge
 * karna hai" — a wrong answer delivered confidently, which is worse than an empty one. The
 * screen's "we could not read that" line was gated on `hits.length === 0` and therefore never
 * appeared for exactly the sentences it was written for.
 *
 * So: `unmatchedWords` is the signal, `hits` is not, and this says so out loud.
 */
describe('a sentence that is not about food', () => {
  it('is reported as unread even though every outlet comes back', () => {
    const found = searchOutlets('mera phone charge karna hai', [], undefined);
    expect(found.unmatchedWords).toBe(true);
    // The trap: a screen gating on this would show nothing, and did.
    expect(found.hits.length).toBe(outlets.length);
  });

  it('is not raised for a sentence that did read as food', () => {
    const found = searchOutlets('jain khana', ['jain'], undefined);
    expect(found.unmatchedWords).toBe(false);
  });
});
