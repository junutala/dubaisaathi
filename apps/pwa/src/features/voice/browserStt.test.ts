import { describe, expect, it } from 'vitest';
import source from './stt.ts?raw';

/**
 * "यह बुर दुबई से discovery gardens जाना है" came back from a phone as "यह बर दुबई से" — cut off
 * mid-sentence, in under a second. The cause was one word of configuration: the browser recogniser
 * was set to `continuous = false`, which ends it at the speaker's first pause. A traveller pauses
 * to think, and pauses again because the place has four words in it.
 *
 * It survived for weeks because a truncated sentence went straight to a screen, where nobody could
 * see what had been lost. It became obvious the same hour the words were first shown to the person
 * who had said them.
 *
 * The source is read as text because the alternative is standing up a fake `SpeechRecognition`
 * whose own behaviour would be this author's assumption about Chrome — which is the mistake, not
 * the test for it.
 */
describe('the browser recogniser', () => {
  it('keeps listening through a pause', () => {
    expect(source).toContain('recognition.continuous = true;');
    expect(source).not.toContain('recognition.continuous = false;');
  });

  it('ends on silence rather than being left open', () => {
    // Continuous means nothing stops it, so something has to. The same clock the offline engine
    // uses, so both engines judge the end of a sentence the same way.
    expect(source).toContain('startSpeechClock');
    expect(source).toContain('recognition.stop()');
  });

  it('collects the pieces of a sentence instead of keeping only the last', () => {
    // Continuous recognition reports a long sentence in several final results. Assigning rather
    // than collecting would throw away everything before the last fragment — the same truncation
    // by another route.
    expect(source).toContain('finals.push');
    expect(source).not.toMatch(/best = alternative\.transcript/u);
  });
});
