import { describe, expect, it } from 'vitest';
import { insideDubai, VIRTUAL_HERE } from './dubai.js';

describe('deciding whether a reading is in Dubai', () => {
  it('counts a hotel in Karama and the airport as Dubai', () => {
    expect(insideDubai({ lat: 25.2456, lng: 55.3034 })).toBe(true);
    expect(insideDubai({ lat: 25.2528, lng: 55.3644 })).toBe(true);
  });

  it('does not count Pune, Mumbai or Delhi — the traveller trying the app before the flight', () => {
    expect(insideDubai({ lat: 18.5204, lng: 73.8567 })).toBe(false);
    expect(insideDubai({ lat: 19.076, lng: 72.8777 })).toBe(false);
    expect(insideDubai({ lat: 28.6139, lng: 77.209 })).toBe(false);
  });

  it('stands in at a place that is itself in Dubai', () => {
    expect(insideDubai(VIRTUAL_HERE)).toBe(true);
  });
});
