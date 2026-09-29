import { describe, expect, it } from 'vitest';
import { parseOutletPack } from './outlets.js';

const row = {
  id: 'r1',
  name: { en: 'Woodlands Restaurant', hi: 'Woodlands Restaurant' },
  location: { lat: 25.26, lng: 55.29 },
  kitchen: 'pure-veg',
  tags: [],
  phone: '04 355 2855',
};

describe('parseOutletPack', () => {
  it("keeps the card's delivery number apart from the board's (decision 047)", () => {
    const [outlet] = parseOutletPack({
      restaurants: [{ ...row, delivers: 'yes', deliveryPhone: '055 123 4567' }],
    });
    expect(outlet?.phone).toBe('04 355 2855');
    expect(outlet?.deliveryPhone).toBe('055 123 4567');
  });

  it('has no delivery number when the card printed none', () => {
    const [outlet] = parseOutletPack({ restaurants: [row] });
    expect(outlet?.deliveryPhone).toBeUndefined();
  });
});
