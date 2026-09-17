import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listen } from './listen.js';
import { toArabic } from './arabic.js';
import type { Recording } from './recordAudio.js';

/**
 * Every answer the server can give, and what the traveller is told about it.
 *
 * This is the whole point of the outcome unions: there is no bench page and no console for
 * anyone to read, so each of these has to arrive at the screen as one honest line. A case
 * missing here is a case that reaches a traveller as a blank screen.
 */

const RECORDING: Recording = { blob: new Blob(['sound'], { type: 'audio/webm' }), ext: 'webm' };

const online = (yes: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value: yes, configurable: true });
};

/** `fetch` answering with one status and body, and keeping what it was sent. */
function answers(status: number, json: unknown) {
  const calls: { url: string; body: unknown }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body });
    return Promise.resolve(new Response(JSON.stringify(json), { status }));
  });
  return calls;
}

beforeEach(() => {
  online(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sending a recording to listen', () => {
  it('hands back what was heard, as multipart with no JSON content type on it', async () => {
    const calls = answers(200, { transcript: '  I need a room with hot water  ' });
    const heard = await listen(RECORDING, 7, 'hi');
    expect(heard).toEqual({ kind: 'heard', text: 'I need a room with hot water' });

    const sent = calls[0]?.body;
    expect(sent).toBeInstanceOf(FormData);
    const form = sent as FormData;
    expect(form.get('audio')).toBeInstanceOf(Blob);
    expect(form.get('language')).toBe('hi');
    // The seconds travel so the function can refuse a long recording before it is billed.
    expect(form.get('seconds')).toBe('7');
  });

  it('says nothing was heard rather than treating silence as an error', async () => {
    answers(200, { transcript: '   ' });
    expect(await listen(RECORDING, 3)).toEqual({ kind: 'nothing' });
  });

  it('says so when the key is not set on the function', async () => {
    answers(503, { error: 'listening is not configured' });
    expect(await listen(RECORDING, 3)).toEqual({ kind: 'refused', reason: 'not-configured' });
  });

  it('says so when the recording was turned away as too long', async () => {
    answers(413, { error: 'too long' });
    expect(await listen(RECORDING, 45)).toEqual({ kind: 'refused', reason: 'too-long' });
  });

  it('fails honestly when the connection dies mid-upload', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('network')));
    expect(await listen(RECORDING, 3)).toEqual({ kind: 'failed' });
  });

  it('fails honestly on a server error', async () => {
    answers(500, { error: 'boom' });
    expect(await listen(RECORDING, 3)).toEqual({ kind: 'failed' });
  });

  it('does not call at all with the radio off', async () => {
    online(false);
    const calls = answers(200, { transcript: 'never asked' });
    expect(await listen(RECORDING, 3)).toEqual({ kind: 'offline' });
    expect(calls).toHaveLength(0);
  });
});

describe('asking translate for the Arabic', () => {
  it('sends the English text and hands back the Arabic', async () => {
    const calls = answers(200, { ar: 'أحتاج غرفة بها ماء ساخن', from: 'en' });
    expect(await toArabic('I need a room with hot water')).toEqual({
      kind: 'arabic',
      ar: 'أحتاج غرفة بها ماء ساخن',
    });
    expect(calls[0]?.url).toContain('/functions/v1/translate');
    expect(JSON.parse(String(calls[0]?.body))).toEqual({ text: 'I need a room with hot water' });
  });

  it('says so with the radio off, without asking', async () => {
    online(false);
    const calls = answers(200, { ar: 'never asked' });
    expect(await toArabic('hello')).toEqual({ kind: 'offline' });
    expect(calls).toHaveLength(0);
  });

  it('asks for nothing when there is nothing to ask about', async () => {
    const calls = answers(200, { ar: 'never asked' });
    expect(await toArabic('   ')).toEqual({ kind: 'refused', reason: 'nothing' });
    expect(calls).toHaveLength(0);
  });

  it('says so when the key is not set on the function', async () => {
    answers(503, { error: 'translation is not configured' });
    expect(await toArabic('hello')).toEqual({ kind: 'refused', reason: 'not-configured' });
  });

  it('fails honestly when the provider is down', async () => {
    answers(502, { error: 'translation failed' });
    expect(await toArabic('hello')).toEqual({ kind: 'failed' });
  });
});
