/**
 * बोलना — the traveller speaks, the screen reads back English, and the next screen carries the
 * Arabic and says it aloud (decision 020). The microphone lives here and nowhere else in the
 * product; everything outside this folder comes through this barrel.
 */
export { BolnaScreen } from './BolnaScreen.js';
export { ArabicScreen } from './ArabicScreen.js';
export { listen, type Heard } from './listen.js';
export { toArabic, type Translated } from './arabic.js';
export { speakArabic, type Spoken } from './speak.js';
export {
  audioFormData,
  extFor,
  micReason,
  pickMimeType,
  startRecording,
  MicError,
  type Recorder,
  type Recording,
} from './recordAudio.js';
