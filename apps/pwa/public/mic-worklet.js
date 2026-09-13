/**
 * Microphone frames, off the main thread.
 *
 * The obvious way to feed a recogniser is a ScriptProcessorNode, which is deprecated and runs on
 * the main thread — so every React render competes with the audio and the recording glitches. An
 * AudioWorklet runs on the audio thread instead, which on a cheap phone is the difference between
 * a clean transcript and a chopped one.
 *
 * Plain JavaScript in `public/` on purpose: a worklet is fetched as its own module by URL, and
 * serving it from our own origin keeps the page's CSP at 'self' with no blob exception.
 */
class SaathiMicProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    // The runtime reuses this buffer between calls, so it has to be copied before it is sent.
    if (channel && channel.length > 0) this.port.postMessage(channel.slice(0));
    // Keep the node alive; it produces no output of its own.
    return true;
  }
}

registerProcessor('saathi-mic', SaathiMicProcessor);
