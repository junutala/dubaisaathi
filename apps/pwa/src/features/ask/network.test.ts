import { describe, expect, it } from 'vitest';
import {
  currentNetwork,
  networkState,
  ONLINE_FOR_MS,
  reportReach,
  resetNetworkForTests,
} from './network.js';

describe('the network state is evidence, not the browser’s guess', () => {
  const now = 1_000_000_000;

  it('is unknown before our server has been asked anything', () => {
    expect(networkState({ okAt: null, failedAt: null }, true, now)).toBe('unknown');
  });

  it('is online only while our server’s last answer is fresh', () => {
    expect(networkState({ okAt: now - 1000, failedAt: null }, true, now)).toBe('online');
    expect(networkState({ okAt: now - ONLINE_FOR_MS - 1, failedAt: null }, true, now)).toBe(
      'unknown',
    );
  });

  it('is offline when the last attempt got no answer, whatever the browser says', () => {
    expect(networkState({ okAt: now - 5000, failedAt: now - 1000 }, true, now)).toBe('offline');
  });

  it('is offline when the phone itself says it has no network', () => {
    expect(networkState({ okAt: now - 1000, failedAt: null }, false, now)).toBe('offline');
  });

  it('comes back online as soon as our server answers again', () => {
    expect(networkState({ okAt: now - 100, failedAt: now - 1000 }, true, now)).toBe('online');
  });
});

describe('two reports in the same millisecond', () => {
  it('lets the newer one decide, whichever it is', () => {
    const now = 1_000_000;
    resetNetworkForTests();
    reportReach(true, now);
    reportReach(false, now);
    expect(currentNetwork(now + 1)).toBe('offline');
    reportReach(true, now);
    expect(currentNetwork(now + 2)).toBe('online');
  });
});
