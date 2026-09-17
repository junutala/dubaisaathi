import { afterEach, describe, expect, it, vi } from 'vitest';
import { extFor, micReason, pickMimeType, startRecording, MicError } from './recordAudio.js';

/**
 * The microphone helper, tested the way it actually fails on a phone: a browser that will only
 * record one of the types we offer, a recording that is stopped, and one that is thrown away.
 *
 * The track release is the part worth holding to. A track left running keeps the phone's
 * recording indicator lit over a screen that has moved on, which is the single thing most likely
 * to make a traveller think the app is listening to them when it is not.
 */

interface FakeTrack {
  readonly stop: () => void;
}

/** Only what the helper touches. The real thing never enters a test, so nothing is cast to it. */
interface FakeStream {
  readonly getTracks: () => FakeTrack[];
}

const released: string[] = [];

function fakeStream(name: string): FakeStream {
  // A real track goes to `ended` on the first stop and ignores every later one, so this counts
  // a track as released once however many times it is asked — same as the browser.
  let ended = false;
  const tracks: FakeTrack[] = [
    {
      stop: () => {
        if (ended) return;
        ended = true;
        released.push(name);
      },
    },
  ];
  return { getTracks: () => tracks };
}

class FakeRecorder {
  static supported: string[] = ['audio/webm;codecs=opus', 'audio/webm'];
  static isTypeSupported(type: string): boolean {
    return FakeRecorder.supported.includes(type);
  }
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  readonly mimeType: string;
  constructor(_stream: FakeStream, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? '';
  }
  start(): void {
    this.state = 'recording';
  }
  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['sound'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

function withMicrophone(name = 'mic'): void {
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: () => Promise.resolve(fakeStream(name)) },
    configurable: true,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  released.length = 0;
  FakeRecorder.supported = ['audio/webm;codecs=opus', 'audio/webm'];
});

describe('picking a type the browser will record', () => {
  it('takes the first candidate the browser supports', () => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    expect(pickMimeType()).toBe('audio/webm;codecs=opus');
  });

  it('falls through webm to what an iPhone will actually give', () => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    FakeRecorder.supported = ['audio/mp4'];
    expect(pickMimeType()).toBe('audio/mp4');
    expect(extFor('audio/mp4')).toBe('mp4');
  });

  it("ends at the recorder's own default rather than refusing", () => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    FakeRecorder.supported = [];
    expect(pickMimeType()).toBe('');
    expect(extFor('')).toBe('webm');
  });

  it('has no opinion when there is no recorder at all', () => {
    expect(pickMimeType()).toBe('');
  });
});

describe('what the phone refused with', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'no-mic'],
    ['NotReadableError', 'in-use'],
    ['SomethingElse', 'failed'],
  ])('%s is %s', (name, reason) => {
    const error = new Error('refused');
    error.name = name;
    expect(micReason(error)).toBe(reason);
  });
});

describe('recording', () => {
  it('releases the microphone when the recording is stopped', async () => {
    withMicrophone();
    const recorder = await startRecording();
    const recording = await recorder.stop();
    expect(recording.ext).toBe('webm');
    expect(recording.blob.size).toBeGreaterThan(0);
    expect(released).toEqual(['mic']);
  });

  it('releases the microphone when the recording is thrown away', async () => {
    withMicrophone();
    const recorder = await startRecording();
    recorder.cancel();
    expect(released).toEqual(['mic']);
  });

  it('stops itself at the limit, tells the screen, and lets go of the microphone', async () => {
    vi.useFakeTimers();
    withMicrophone();
    const autoStopped = vi.fn();
    const recorder = await startRecording({ maxMs: 30_000, onAutoStop: autoStopped });
    vi.advanceTimersByTime(30_000);
    expect(autoStopped).toHaveBeenCalledOnce();
    expect(released).toEqual(['mic']);
    // The recording it made is still there to be sent: stopping early loses nothing.
    await expect(recorder.stop()).resolves.toMatchObject({ ext: 'webm' });
    vi.useRealTimers();
  });

  it('says the phone has no recorder rather than guessing why', async () => {
    await expect(startRecording()).rejects.toBeInstanceOf(MicError);
  });

  it("carries the phone's own refusal back as a reason", async () => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    const denied = new Error('denied');
    denied.name = 'NotAllowedError';
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(denied) },
      configurable: true,
    });
    await expect(startRecording()).rejects.toMatchObject({ reason: 'denied' });
  });
});
