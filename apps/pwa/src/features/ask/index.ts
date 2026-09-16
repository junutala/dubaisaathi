/**
 * The box, and what turns its contents into something the app knows: the script-agnostic
 * matcher over the packs in `data/intents/`, and the question log that records what was asked
 * so the packs can be taught. Everything outside this folder comes through here.
 */
export { AskBar } from './AskBar.js';
export { intentCorpus } from './intentPacks.js';
export { parseIntent, isConfident } from './parseIntent.js';
export { fold } from './normalise.js';
export { GLUE, ROMAN_GLUE } from './glue.js';
export { recordVoiceEvent } from './voiceEvent.js';
export { startVoiceEventSync } from './sync.js';
