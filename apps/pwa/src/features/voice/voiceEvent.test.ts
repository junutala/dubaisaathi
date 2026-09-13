import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema.js';
import { detectScript, pendingVoiceEvents, recordVoiceEvent } from './voiceEvent.js';

describe('the learning loop', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    localStorage.clear();
  });

  it('reads the script a traveller actually used', () => {
    expect(detectScript('मुझे करामा जाना है')).toBe('devanagari');
    expect(detectScript('mujhe Karama jaana hai')).toBe('roman');
    expect(detectScript('मुझे metro से जाना है')).toBe('mixed');
  });

  it('queues a failure on the device and leaves it unsynced', async () => {
    await recordVoiceEvent({
      transcript: 'kuch bhi',
      intent: 'unknown',
      confidence: 0,
      landedOn: 'home',
      failure: 'unknown-intent',
    });
    const pending = await pendingVoiceEvents();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.synced).toBe(false);
    expect(pending[0]?.failure).toBe('unknown-intent');
  });

  it('keys events to the device, never to a person — there is no account', async () => {
    await recordVoiceEvent({ transcript: 'a', intent: 'route', confidence: 0.9, landedOn: '1.3' });
    await recordVoiceEvent({ transcript: 'b', intent: 'food', confidence: 0.8, landedOn: '2.1' });
    const ids = new Set((await pendingVoiceEvents()).map((e) => e.deviceId));
    expect(ids.size).toBe(1);
  });
});
