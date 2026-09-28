import { describe, expect, it } from 'vitest';
import { dishesFromReading } from './readings.ts';
import { readDishes } from './toRestaurant.ts';

/** Sita Ram's card, 23 September — as review read it. */
const reading = {
  form: '0013',
  dishes: [
    { name: 'Chole Bhature', priceAed: 16, veg: true },
    { name: '  Pav   Bhaji ', priceAed: 15, veg: true },
    { name: 'pav bhaji', priceAed: 15, veg: true },
    { name: 'Water', priceAed: null, veg: true },
    { name: 'Chicken Samosa', priceAed: 2, veg: false },
    { name: '', priceAed: 3, veg: true },
    { name: 'Sabudana Khichdi', priceAed: 12, veg: true, vrat: true },
    { name: 'Aloo Jeera', priceAed: 10, veg: true },
    { name: 'Palak Kichadi', priceAed: 14, veg: true },
    { name: 'Sabudhana Vada (2pcs)', priceAed: 12, veg: true },
  ],
};

describe('a menu reading becomes the dishes a report carries', () => {
  const dishes = dishesFromReading(reading);

  it('keeps each dish once, tidied, and drops a nameless line', () => {
    expect(dishes.map((d) => d.name.en)).toEqual([
      'Chole Bhature',
      'Pav Bhaji',
      'Water',
      'Chicken Samosa',
      'Sabudana Khichdi',
      'Aloo Jeera',
      'Palak Kichadi',
      'Sabudhana Vada (2pcs)',
    ]);
  });

  it('tags vrat where the card marks it, and any khichdi or sabudana in any spelling', () => {
    expect(dishes[4]?.tags).toEqual(['vegetarian', 'vrat']);
    expect(dishes[5]?.tags).toEqual(['vegetarian']);
    expect(dishes[6]?.tags).toEqual(['vegetarian', 'vrat']);
    expect(dishes[7]?.tags).toEqual(['vegetarian', 'vrat']);
  });

  it('carries a price only where one was read, and a veg tag only where the menu marks it', () => {
    expect(dishes[0]).toEqual({
      name: { en: 'Chole Bhature' },
      tags: ['vegetarian'],
      priceAed: 16,
    });
    expect(dishes[2]).toEqual({ name: { en: 'Water' }, tags: ['vegetarian'] });
    expect(dishes[3]?.tags).toEqual([]);
  });

  it('is exactly what the report mapping reads', () => {
    const read = readDishes(dishes);
    expect(read?.map((d) => [d.name.en, d.priceAed])).toEqual([
      ['Chole Bhature', 16],
      ['Pav Bhaji', 15],
      ['Water', undefined],
      ['Chicken Samosa', 2],
      ['Sabudana Khichdi', 12],
      ['Aloo Jeera', 10],
      ['Palak Kichadi', 14],
      ['Sabudhana Vada (2pcs)', 12],
    ]);
  });
});
