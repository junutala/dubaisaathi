import type { ParsedIntent, VoiceFailure } from '@saathi/shared';
import type { Route } from '../../app/routes.js';
import { intentCorpus } from '../voice/intentPacks.js';
import { isConfident, parseIntent } from '../voice/parseIntent.js';
import { landingFor } from '../voice/micRouting.js';
import { recordVoiceEvent } from '../voice/voiceEvent.js';

/**
 * One path for every sentence, however it was entered (decision 014).
 *
 * Typing is the front door and speaking fills the same box, so there is one place that turns a
 * sentence into a screen — not one for the keyboard and one for the mic. When the parser learns
 * something, or the learning loop starts recording a new field, it happens here once.
 */

export interface Submission {
  /** What the traveller is sending — typed, or spoken and then agreed to. */
  readonly text: string;
  /** What the engine produced, when the traveller changed it before sending. */
  readonly heard?: string | undefined;
  /** The unbiased decoder's reading, kept for the learning loop (decision 013). */
  readonly unconstrained?: string | undefined;
}

/** `null` when there was nothing to send: an empty box is not a failure worth recording. */
export type AskOutcome =
  | { readonly at: 'go'; readonly intent: ParsedIntent; readonly route: Route }
  | { readonly at: 'ask'; readonly intent: ParsedIntent }
  | null;

/**
 * Why a sentence did not reach a screen. `clarifier-shown` is not a failure of the traveller's:
 * a bare place name is genuinely two questions, and recording it is the only thing that can
 * teach the packs otherwise.
 */
export function parseFailure(intent: ParsedIntent): VoiceFailure | null {
  if (intent.kind === 'unknown') return 'unknown-intent';
  if (intent.kind === 'place') return 'clarifier-shown';
  return isConfident(intent) ? null : 'low-confidence';
}

/**
 * Parse, record, and say where it goes. Pure of navigation on purpose: the caller decides what
 * to do with the answer, so this can be tested without a browser, a screen or a tap.
 *
 * `heard` is recorded only when the traveller changed what the engine produced. That pair —
 * what was heard, and what it should have been, from the one person who knows — is the
 * strongest thing the learning loop will ever get, and it costs nothing to collect.
 */
export function submitSentence(submitted: Submission, engineId: string): AskOutcome {
  const transcript = submitted.text.trim();
  if (transcript === '') return null;

  const intent = parseIntent(transcript, intentCorpus);
  const route = landingFor(intent);
  const corrected = submitted.heard !== undefined && submitted.heard !== transcript;

  void recordVoiceEvent({
    transcript,
    ...(corrected ? { correctedFrom: submitted.heard } : {}),
    ...(submitted.unconstrained === undefined
      ? {}
      : { unconstrainedTranscript: submitted.unconstrained }),
    intent: intent.kind,
    confidence: intent.confidence,
    landedOn: route === 'ask' ? 'listen' : route.screen,
    failure: parseFailure(intent),
    sttEngine: engineId,
  });

  return route === 'ask' ? { at: 'ask', intent } : { at: 'go', intent, route };
}

/**
 * The traveller answered the two-button question. Recorded because a clarifier that keeps being
 * shown for the same words is the packs asking to be taught, and the answer is the label.
 */
export function recordClarifierChoice(
  intent: ParsedIntent,
  choice: 'route' | 'food',
  engineId: string,
): void {
  void recordVoiceEvent({
    transcript: intent.transcript,
    intent: choice,
    confidence: intent.confidence,
    landedOn: choice === 'route' ? 'transport' : 'food',
    failure: null,
    clarifierChoice: choice,
    sttEngine: engineId,
  });
}
