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
 *
 * Vrat is the card's mark, or the dish itself: the owner, 28 September — any khichdi, and anything
 * made of sabudana, is vrat food. Its name says which, in whatever spelling the card uses. Whether
 * the kitchen may be offered for a fast at all is the kitchen's kind, decided in toRestaurant.
 */

/** Khichdi and sabudana, as menus spell them: the owner's rule for vrat food (28 September). */
const VRAT_FOOD = /(kh?ichd[iy]|kh?ichad[iy]|khichri|khichdee|sab[ou]+d[h]?ana|\bsago\b)/i;

/** A dish fit for a fast: marked so on the card, or khichdi or sabudana by name. */
export function isVratDish(dish: {
  readonly name: string;
  readonly vrat?: boolean | null | undefined;
}): boolean {
  return dish.vrat === true || VRAT_FOOD.test(dish.name);
}

/** One dish as `menu.json` holds it. Only the fields publishing uses are named. */
export interface ReadDish {
  readonly name: string;
  readonly priceAed?: number | null;
  readonly veg?: boolean | null;
  /** True only where the card marks the dish for a fast (vrat, upvas, farali). */
  readonly vrat?: boolean | null;
  /** True only where the card marks the dish Jain — its own mark, or "Jain" in its name. */
  readonly jain?: boolean | null;
  readonly section?: string | null;
}

export interface MenuReading {
  readonly form: string;
  readonly dishes: readonly ReadDish[];
  /**
   * The number the card prints for delivery — "Home delivery", "Free delivery", "Order on
   * WhatsApp" — as printed (the owner, 29 September). Absent when the card prints none; the
   * board's own number is not a delivery number unless the card says so.
   */
  readonly deliveryPhone?: string | null;
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
      tags: [
        ...(dish.veg === true ? ['vegetarian'] : []),
        ...(isVratDish({ name, vrat: dish.vrat }) ? ['vrat'] : []),
        ...(dish.jain === true ? ['jain'] : []),
      ],
      ...(price === null ? {} : { priceAed: price }),
      ...(section === '' ? {} : { section }),
    });
  }
  return out;
}
