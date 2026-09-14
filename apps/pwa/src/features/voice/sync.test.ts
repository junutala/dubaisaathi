import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/schema.js';
import { recordVoiceEvent, pendingVoiceEvents } from './voiceEvent.js';
import { syncVoiceEvents } from './sync.js';

/**
 * The queue leaving the phone, tested as the things that would actually go wrong.
 *
 * The worst of them is silent: a phone that marks rows synced when the server never took them.
 * Those rows are gone — the learning loop is the only record of what a traveller asked for and
 * did not get, and nobody can produce them again. So every test here is about what survives a
 * bad day rather than about the happy path.
 */

const online = (yes: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value: yes, configurable: true });
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
  localStorage.setItem('saathi.deviceId', '11111111-2222-4333-8444-555555555555');
  online(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function queueOne(transcript = 'करामा जाना है') {
  return recordVoiceEvent({
    transcript,
    intent: 'route',
    confidence: 0.8,
    landedOn: 'transport',
    failure: null,
    sttEngine: 'typed',
  });
}

describe('sending the queue', () => {
  it('sends what is queued and marks only what the server accepted', async () => {
    const kept = await queueOne('करामा जाना है');
    const lost = await queueOne('jain sambar kahan milega');
    // The server took one row and said nothing about the other.
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response(JSON.stringify({ accepted: [kept.id] }), { status: 200 })),
    );

    const outcome = await syncVoiceEvents();

    expect(outcome).toEqual({ sent: 2, accepted: 1 });
    const stillQueued = (await pendingVoiceEvents()).map((event) => event.id);
    expect(stillQueued).toEqual([lost.id]);
  });

  /** The failure that loses data for ever, so it is the one asserted hardest. */
  it('marks nothing when the server errors', async () => {
    await queueOne();
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('no', { status: 500 })));

    expect(await syncVoiceEvents()).toEqual({ sent: 1, accepted: 0, skipped: 'failed' });
    expect(await pendingVoiceEvents()).toHaveLength(1);
  });

  it('marks nothing when the radio dies mid-flight', async () => {
    await queueOne();
    vi.stubGlobal('fetch', () => Promise.reject(new Error('network')));

    expect(await syncVoiceEvents()).toEqual({ sent: 1, accepted: 0, skipped: 'failed' });
    expect(await pendingVoiceEvents()).toHaveLength(1);
  });

  /** Rule 1: offline is the normal case, not the error case. */
  it('does not reach for the network at all when the phone is offline', async () => {
    await queueOne();
    const fetched = vi.fn();
    vi.stubGlobal('fetch', fetched);
    online(false);

    expect(await syncVoiceEvents()).toEqual({ sent: 0, accepted: 0, skipped: 'offline' });
    expect(fetched).not.toHaveBeenCalled();
    expect(await pendingVoiceEvents()).toHaveLength(1);
  });

  it('never sends a row twice', async () => {
    const one = await queueOne();
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response(JSON.stringify({ accepted: [one.id] }), { status: 200 })),
    );
    await syncVoiceEvents();

    const bodies: string[] = [];
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      bodies.push(init.body as string);
      return Promise.resolve(new Response(JSON.stringify({ accepted: [] }), { status: 200 }));
    });
    await syncVoiceEvents();

    expect(bodies[0]).not.toContain(one.id);
  });

  /** The device id belongs on the envelope; repeating it on every row says nothing extra. */
  it('sends the device id once and never inside a row', async () => {
    await queueOne();
    let sent = '';
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      sent = init.body as string;
      return Promise.resolve(new Response(JSON.stringify({ accepted: [] }), { status: 200 }));
    });
    await syncVoiceEvents();

    const body = JSON.parse(sent) as { deviceId: string; events: Record<string, unknown>[] };
    expect(body.deviceId).toBe('11111111-2222-4333-8444-555555555555');
    expect(body.events[0]).not.toHaveProperty('deviceId');
    expect(body.events[0]).not.toHaveProperty('synced');
  });
});
