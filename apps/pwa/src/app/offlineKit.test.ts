import { describe, expect, it } from 'vitest';
import { countThisOpen, offlineKitDue } from './offlineKit.js';

/** A storage that keeps what it is given, as a browser's would for one phone. */
function store(): Pick<Storage, 'getItem' | 'setItem'> {
  const kept = new Map<string, string>();
  return {
    getItem: (key) => kept.get(key) ?? null,
    setItem: (key, value) => {
      kept.set(key, value);
    },
  };
}

describe('the offline kit waits for the second open (decision 052)', () => {
  it('counts the first open as one and leaves the kit for later', () => {
    const opens = countThisOpen(store(), store());
    expect(opens).toBe(1);
    expect(offlineKitDue(opens, false, false)).toBe(false);
  });

  it('does not count a reload in the same tab as a return', () => {
    const local = store();
    const session = store();
    countThisOpen(local, session);
    expect(countThisOpen(local, session)).toBe(1);
  });

  it('fetches the kit when the phone comes back in a new session', () => {
    const local = store();
    countThisOpen(local, store());
    const opens = countThisOpen(local, store());
    expect(opens).toBe(2);
    expect(offlineKitDue(opens, false, false)).toBe(true);
  });

  it('keeps a phone that already has the kit, and an installed app, on it', () => {
    expect(offlineKitDue(1, true, false)).toBe(true);
    expect(offlineKitDue(1, false, true)).toBe(true);
  });

  it('treats a browser that remembers nothing as a return, so the kit still comes', () => {
    const refusing: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(offlineKitDue(countThisOpen(refusing, refusing), false, false)).toBe(true);
  });
});
