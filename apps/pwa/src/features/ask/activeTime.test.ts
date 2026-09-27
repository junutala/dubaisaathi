import { describe, expect, it } from 'vitest';
import { createActiveClock, IDLE_MS } from './activeTime.js';

describe('active time counts use, not an open app', () => {
  it('counts visible seconds while the traveller keeps touching the screen', () => {
    const clock = createActiveClock(0);
    for (let t = 5000; t <= 30_000; t += 5000) {
      clock.interact(t - 100);
      clock.tick(t, true, 'food', 'offline');
    }
    expect(clock.flush()).toEqual([{ pillar: 'food', net: 'offline', seconds: 30 }]);
  });

  it('stops counting a minute after the last touch — a phone in a pocket is not a traveller', () => {
    const clock = createActiveClock(0);
    for (let t = 5000; t <= 5 * 60_000; t += 5000) clock.tick(t, true, 'go', 'online');
    const [row] = clock.flush();
    expect(row?.seconds).toBe(IDLE_MS / 1000);
  });

  it('counts nothing while the app is hidden', () => {
    const clock = createActiveClock(0);
    clock.interact(0);
    clock.tick(5000, false, 'know', 'online');
    expect(clock.flush()).toEqual([]);
  });

  it('files time under the pillar and network state of the moment', () => {
    const clock = createActiveClock(0);
    clock.interact(0);
    clock.tick(5000, true, 'food', 'online');
    clock.interact(5000);
    clock.tick(10_000, true, 'go', 'offline');
    expect(clock.flush()).toEqual([
      { pillar: 'food', net: 'online', seconds: 5 },
      { pillar: 'go', net: 'offline', seconds: 5 },
    ]);
  });

  it('does not count a phone that slept between ticks as an hour of use', () => {
    const clock = createActiveClock(0);
    clock.interact(0);
    clock.tick(3_600_000, true, 'food', 'offline');
    expect(clock.flush()).toEqual([]);
  });
});
