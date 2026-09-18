import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema.js';
import { nationalNumber, pendingMessages, waitingCount, writeMessage } from './outbox.js';
import { sendOutbox } from './send.js';

/**
 * The outbox, tested as the bad day rather than the good one.
 *
 * The failure that matters is the same one the question log has: a phone that marks a message
 * sent when the server never took it. That message is gone — the traveller was told we have it,
 * and nobody can produce it again. So what is checked here is what survives no signal, a 500
 * and a rejection.
 */

const wrote = {
  name: 'अरुण',
  country: 'IN' as const,
  phone: '9876543210',
  message: 'करामा में साबूदाना खिचड़ी कहाँ मिलेगी?',
  locale: 'hi' as const,
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the number, out of whatever was typed', () => {
  it('takes the dialling code off, however it was written', () => {
    expect(nationalNumber('+91 98765 43210', 'IN')).toBe('9876543210');
    expect(nationalNumber('0091-9876543210', 'IN')).toBe('9876543210');
    expect(nationalNumber('919876543210', 'IN')).toBe('9876543210');
    expect(nationalNumber('+971 50 123 4567', 'AE')).toBe('501234567');
    expect(nationalNumber('00971501234567', 'AE')).toBe('501234567');
  });

  it('drops a trunk zero, which is how a number is written on a hotel card', () => {
    expect(nationalNumber('098765 43210', 'IN')).toBe('9876543210');
    expect(nationalNumber('050 123 4567', 'AE')).toBe('501234567');
  });

  it('leaves a plain national number alone', () => {
    expect(nationalNumber('9876543210', 'IN')).toBe('9876543210');
    expect(nationalNumber('501234567', 'AE')).toBe('501234567');
  });
});

describe('writing with no signal', () => {
  it('keeps the message and reports it waiting', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    await writeMessage(wrote);
    expect(await waitingCount()).toBe(1);

    // The send is attempted and gets nowhere, which costs the message nothing.
    expect(await sendOutbox()).toBe(0);
    expect(await waitingCount()).toBe(1);
    expect((await pendingMessages())[0]?.message).toBe(wrote.message);
  });

  it('sends what was waiting once there is a signal, and only then marks it', async () => {
    const posted: string[] = [];
    const fetched = vi.fn((_url: string, init?: RequestInit) => {
      posted.push(typeof init?.body === 'string' ? init.body : '');
      return Promise.resolve(new Response('{"saved":true}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetched);

    await writeMessage(wrote);
    expect(await sendOutbox()).toBe(1);
    expect(await waitingCount()).toBe(0);

    const body = JSON.parse(posted[0] ?? '{}') as Record<string, unknown>;
    // Everyone writing from inside the app is a traveller; the website's form asks.
    expect(body.who).toBe('traveller');
    expect(body.phone).toBe('9876543210');
    expect(body.locale).toBe('hi');

    // Nothing is sent twice.
    expect(await sendOutbox()).toBe(0);
    expect(fetched).toHaveBeenCalledTimes(1);
  });

  it('leaves the queue alone when the server breaks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 503 }))),
    );

    await writeMessage(wrote);
    expect(await sendOutbox()).toBe(0);
    expect(await waitingCount()).toBe(1);
  });

  it('stops at the first message that cannot go, so they arrive in the order they were written', async () => {
    const fetched = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    vi.stubGlobal('fetch', fetched);

    await writeMessage(wrote);
    await writeMessage({ ...wrote, message: 'दूसरी बात' });
    await sendOutbox();

    expect(fetched).toHaveBeenCalledTimes(1);
    expect(await waitingCount()).toBe(2);
  });

  it('does not keep a message the server will never accept', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{"error":"too many"}', { status: 429 }))),
    );

    await writeMessage(wrote);
    expect(await sendOutbox()).toBe(1);
    expect(await waitingCount()).toBe(0);
  });
});
