import { describe, expect, it } from 'vitest';
import { readDietary, readDishes, readHours, tagsFor, toRestaurant } from './toRestaurant.ts';
import type { ReportRow } from './toRestaurant.ts';

/** The owner's own first capture, as Postgres actually returned it on 15 September. */
const karama: ReportRow = {
  id: '50c0546c-8142-414d-8c3b-4ccee9491a20',
  name: 'Karama cafe',
  name_hi: null,
  kind: 'restaurant',
  lat: 13.0562279,
  lng: 80.242942,
  kitchen: 'pure-veg',
  dietary: {
    jain: 'on-request',
    vrat: 'on-request',
    eggless: true,
    sattvik: 'on-request',
    noOnionGarlic: true,
  },
  confirmed_dishes: [
    { name: { en: 'Sabudana khichadi', hi: 'Sabudana khichadi', aliases: [] }, tags: [] },
  ],
  hours: { everyDay: { opens: '06:00', closes: '02:00' }, openLate: true },
  hours_confirmed_at: '2026-09-15T02:22:07.080Z',
  delivers: 'yes',
  delivery_phone: '6304363258',
  price_for_one_aed: null,
  spoke_to: null,
  status: 'approved',
};

describe('a real capture survives the trip to a card', () => {
  it('carries every answered field through', () => {
    const out = toRestaurant(karama);
    expect(out).not.toBeNull();
    expect(out?.name.en).toBe('Karama cafe');
    expect(out?.kitchen).toBe('pure-veg');
    expect(out?.delivers).toBe('yes');
    expect(out?.phone).toBe('6304363258');
    expect(out?.hours?.everyDay).toEqual({ opens: '06:00', closes: '02:00' });
    expect(out?.hours?.openLate).toBe(true);
    expect(out?.confirmedDishes?.[0]?.name.en).toBe('Sabudana khichadi');
  });

  it('leaves a skipped field absent rather than inventing one', () => {
    const out = toRestaurant(karama);
    // The collector skipped both. Absent is the honest answer; 0 AED is not.
    expect(out?.approxCostAed).toBeUndefined();
    expect(out?.spokeTo).toBeUndefined();
  });

  it('does not transliterate a name nobody wrote in Hindi', () => {
    // "Burjuman Mall" resolved to "Dubai Mall" on a driver's screen once. Never again by guessing.
    expect(toRestaurant(karama)?.name.hi).toBe('Karama cafe');
  });
});

describe('dietary answers', () => {
  it('keeps "nobody asked" different from "they said no"', () => {
    const answers = readDietary({ jain: true, vrat: false });
    expect(answers?.jain).toBe('yes');
    expect(answers?.vrat).toBe('no');
    // Never asked, so it must not appear at all — खाना shows a missing key as पूछिए.
    expect(answers?.sattvik).toBeUndefined();
  });

  it('reads the middle answer the phone sends as a string', () => {
    expect(readDietary({ jain: 'on-request' })?.jain).toBe('on-request');
  });

  it('is undefined when nothing was asked, not an empty object', () => {
    expect(readDietary(null)).toBeUndefined();
    expect(readDietary({})).toBeUndefined();
  });
});

describe('the tags a traveller filters on', () => {
  it('only a hard yes becomes a filterable tag', () => {
    // Everything on the owner's capture was on-request except eggless and no-onion-garlic.
    expect([...tagsFor(karama)].sort()).toEqual(['eggless', 'no-garlic', 'no-onion', 'vegetarian']);
  });

  it('never filters someone into a kitchen that only said maybe', () => {
    // jain was 'on-request'. A traveller asking for जैन must not be handed this as a match.
    expect(tagsFor(karama)).not.toContain('jain');
  });

  it('one shopkeeper question becomes the two tags a Jain traveller needs', () => {
    const tags = tagsFor({ ...karama, dietary: { noOnionGarlic: true } });
    expect(tags).toContain('no-onion');
    expect(tags).toContain('no-garlic');
  });

  it('a pure-veg kitchen is vegetarian without being asked', () => {
    expect(tagsFor({ ...karama, dietary: null })).toEqual(['vegetarian']);
  });

  it('a mixed kitchen is not vegetarian on its own', () => {
    expect(tagsFor({ ...karama, kitchen: 'mixed', dietary: null })).toEqual([]);
  });
});

describe('what cannot honestly become a card', () => {
  it('drops a report with no kitchen kind rather than guessing one', () => {
    expect(toRestaurant({ ...karama, kitchen: null })).toBeNull();
  });

  it('drops a nameless report', () => {
    expect(toRestaurant({ ...karama, name: '   ' })).toBeNull();
  });
});

describe('hours, which the owner insisted on keeping', () => {
  it('keeps a past-midnight close as given', () => {
    // 06:00 to 02:00 is the late place nobody else lists. It must not be "corrected".
    expect(readHours(karama.hours)?.everyDay?.closes).toBe('02:00');
  });

  it('reads open-all-day without needing times', () => {
    expect(readHours({ open24: true })?.open24).toBe(true);
  });

  it('is undefined when the collector skipped it', () => {
    expect(readHours(null)).toBeUndefined();
    expect(readHours({ openLate: true })).toBeUndefined();
  });
});

describe('dishes', () => {
  it('drops an empty row a collector left behind', () => {
    expect(readDishes([{ name: { en: '  ' } }, { name: { en: 'Jain sambar' } }])).toHaveLength(1);
  });

  it('falls back to the one name when no Hindi was written', () => {
    expect(readDishes([{ name: { en: 'Jain sambar' } }])?.[0]?.name.hi).toBe('Jain sambar');
  });
});
