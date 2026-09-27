import { describe, expect, it } from 'vitest';
import { offlineAskDue } from './offlineAsk.js';

describe('घर asks why there was no signal, once a Dubai day (decision 043)', () => {
  it('asks in a session that went without a signal', () => {
    expect(offlineAskDue('s1', 's1', null, '2026-09-27')).toBe(true);
  });

  it('does not ask a session that never lost the signal', () => {
    expect(offlineAskDue(null, 's1', null, '2026-09-27')).toBe(false);
    expect(offlineAskDue('s0', 's1', null, '2026-09-27')).toBe(false);
  });

  it('does not ask twice in a day, answered or dismissed', () => {
    expect(offlineAskDue('s1', 's1', '2026-09-27', '2026-09-27')).toBe(false);
    expect(offlineAskDue('s1', 's1', '2026-09-26', '2026-09-27')).toBe(true);
  });
});
