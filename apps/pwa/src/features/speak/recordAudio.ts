/**
 * One microphone helper, for बोलना and for nothing else (decision 020).
 *
 * Ported from the owner's other product, where this same MediaRecorder dance has been running in
 * the field for months: probe the supported mime type, collect the chunks, and stop every track
 * afterwards so the browser drops its recording indicator. Nothing here is invented; what is
 * kept are its reasons, which are written next to the parts they explain.
 *
 * CLAUDE.md's rule about capability applies to every line below: nothing asks the browser
 * whether it could record and then gives up on the answer. The device is asked to record, and
 * whatever it refuses with is classified by `micReason` and said in one honest line.
 */

/**
 * Browsers disagree about what they will record. Safari and iOS refuse webm and give mp4;
 * Firefox prefers ogg. `''` means "the recorder's own default" and must stay last — it always
 * matches, so it is the answer when nothing else does rather than a reason to refuse.
 */
const CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
  '',
] as const;

export function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return CANDIDATES.find((type) => type === '' || MediaRecorder.isTypeSupported(type)) ?? '';
}

export function extFor(mimeType = ''): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}

/** Why the phone would not record, in the words the screen has a line for. */
export type MicReason = 'no-recorder' | 'denied' | 'no-mic' | 'in-use' | 'failed';

/**
 * What the device actually said, turned into one of the five things a traveller can act on.
 * The names come from the getUserMedia specification and are what real phones throw:
 * a refusal at the permission prompt, a phone with no microphone at all, and a microphone
 * another app is already holding are three different problems with three different answers.
 */
export function micReason(error: unknown): MicReason {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-mic';
  if (name === 'NotReadableError' || name === 'AbortError') return 'in-use';
  return 'failed';
}

/** A microphone error carrying the reason, so the screen never has to read a browser's prose. */
export class MicError extends Error {
  readonly reason: MicReason;
  constructor(reason: MicReason) {
    super(reason);
    this.name = 'MicError';
    this.reason = reason;
  }
}

export interface Recording {
  readonly blob: Blob;
  readonly ext: string;
}

export interface Recorder {
  /** Stops and resolves with what was recorded. The microphone is released either way. */
  readonly stop: () => Promise<Recording>;
  /** Throws the recording away and releases the microphone. */
  readonly cancel: () => void;
}

/**
 * Begin recording. Resolves once the microphone is actually live, so the screen shows
 * "listening" only when it is true.
 *
 * `maxMs` is a hard stop, so a recording the traveller forgot about cannot run until the tab is
 * closed; `onAutoStop` fires when that is what ended it rather than a tap, so the screen can say
 * so instead of leaving them wondering.
 */
export async function startRecording({
  maxMs = 30_000,
  onAutoStop,
}: { maxMs?: number; onAutoStop?: () => void } = {}): Promise<Recorder> {
  // `mediaDevices` is typed as always present and is not: on an insecure origin, and in an old
  // browser, there is simply no such object. Widened here, at the boundary, so the check is real.
  const media: MediaDevices | undefined =
    typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
  if (typeof MediaRecorder === 'undefined' || media === undefined)
    throw new MicError('no-recorder');

  let stream: MediaStream;
  try {
    stream = await media.getUserMedia({ audio: true });
  } catch (error) {
    throw new MicError(micReason(error));
  }

  const release = () => {
    for (const track of stream.getTracks()) track.stop();
  };

  let recorder: MediaRecorder;
  try {
    const mimeType = pickMimeType();
    recorder = new MediaRecorder(stream, mimeType === '' ? {} : { mimeType });
  } catch (error) {
    // The microphone is already open at this point; a recorder that will not start must not be
    // allowed to leave it that way, with the phone's recording indicator lit over nothing.
    release();
    throw new MicError(micReason(error));
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<Recording>((resolve) => {
    recorder.onstop = () => {
      release();
      const type = recorder.mimeType === '' ? 'audio/webm' : recorder.mimeType;
      resolve({ blob: new Blob(chunks, { type }), ext: extFor(type) });
    };
  });

  recorder.start();

  const timer = setTimeout(() => {
    if (recorder.state === 'recording') {
      recorder.stop();
      onAutoStop?.();
    }
  }, maxMs);

  return {
    stop() {
      clearTimeout(timer);
      if (recorder.state === 'recording') recorder.stop();
      // A recorder that had already stopped itself at `maxMs` has released the microphone in its
      // own `onstop`; `stopped` is already resolved and this simply hands back that recording.
      return stopped;
    },
    cancel() {
      clearTimeout(timer);
      if (recorder.state === 'recording') recorder.stop();
      release();
    },
  };
}

/**
 * Package a recording for `listen`, which expects the field name `audio`.
 *
 * `seconds` is what the phone counted while recording. `listen` refuses anything over half a
 * minute with it, which is how a long recording is turned away before it is billed rather than
 * after.
 */
export function audioFormData(
  blob: Blob,
  ext: string,
  language?: string,
  seconds?: number,
): FormData {
  const form = new FormData();
  form.append('audio', blob, `audio.${ext}`);
  if (language !== undefined) form.append('language', language);
  if (seconds !== undefined) form.append('seconds', String(Math.round(seconds)));
  return form;
}
