/**
 * A menu Claude read at review (decision 033), turned into the dishes a report carries.
 *
 * The desk keys a form in four steps and sends its menu pages; review reads each form's pages into
 * `<serial>/menu.json` on the `menu-pages` branch — the name, the kitchen and every dish with its
 * price and veg mark. The form's own row gets the name and the kitchen written back; the dishes
 * stay in the reading, where the page they came from is recorded beside each one. So publishing
 * takes the dishes from the reading, for any form whose row carries none of its own.
 *
 * Nothing is invented on the way: a dish with no readable price has none, and only a dish the menu
 * plainly marks vegetarian is tagged so.
 */

/** One dish as `menu.json` holds it. Only the fields publishing uses are named. */
export interface ReadDish {
  readonly name: string;
  readonly priceAed?: number | null;
  readonly veg?: boolean | null;
  readonly section?: string | null;
}

export interface MenuReading {
  readonly form: string;
  readonly dishes: readonly ReadDish[];
}

/** The shape `readDishes` in toRestaurant.ts accepts, as a report row would carry it. */
export interface ReportDish {
  readonly name: { readonly en: string };
  readonly tags: readonly string[];
  readonly priceAed?: number;
  readonly section?: string;
}

/**
 * The reading's dishes, once each: a menu that prints a dish twice (a combo page and its own
 * section) is one dish to a traveller searching for it.
 */
export function dishesFromReading(reading: MenuReading): readonly ReportDish[] {
  const seen = new Set<string>();
  const out: ReportDish[] = [];
  for (const dish of reading.dishes) {
    const name = dish.name.split(/\s+/).join(' ').trim();
    const key = name.toLowerCase();
    if (name === '' || seen.has(key)) continue;
    seen.add(key);
    const price =
      typeof dish.priceAed === 'number' && Number.isFinite(dish.priceAed) ? dish.priceAed : null;
    const section = typeof dish.section === 'string' ? dish.section.trim() : '';
    out.push({
      name: { en: name },
      tags: dish.veg === true ? ['vegetarian'] : [],
      ...(price === null ? {} : { priceAed: price }),
      ...(section === '' ? {} : { section }),
    });
  }
  return out;
}
