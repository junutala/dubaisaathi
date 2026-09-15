/**
 * Turning what a camera read off a menu board into dish names a collector can tick.
 *
 * OCR of a laminated menu under a shop light is never clean: it returns section headers, prices,
 * a phone number, "WE ACCEPT CARDS", and the dishes mixed together in one column. None of that
 * can be published, and none of it can be fixed later — by the time anyone reads it, the menu is
 * three days away. So this narrows the text to lines that could plausibly be a dish, and the
 * collector, standing in front of the board, decides which of them are.
 *
 * That is the whole design: the machine does the typing, the person does the knowing. Typing
 * 400 menus by hand is not a job anybody finishes; ticking them is.
 *
 * Nothing here is published on its own. A candidate becomes a `ConfirmedDish` only when a
 * collector taps it, which keeps the rule this product runs on — a dish we claim is a dish a
 * person confirmed.
 */

export interface Candidate {
  /** The line, cleaned of price, bullets and stray punctuation. */
  readonly text: string;
  /** A price sat next to it. The strongest signal on a menu that a line is a dish. */
  readonly hadPrice: boolean;
}

/**
 * Words that are on a menu but are never a dish. Section headers earn their place here: they
 * survive every other rule, because "STARTERS" is short, alphabetic and looks exactly like food.
 */
const NOT_A_DISH = new Set([
  'menu',
  'menus',
  'starters',
  'starter',
  'main',
  'mains',
  'maincourse',
  'desserts',
  'dessert',
  'beverages',
  'beverage',
  'drinks',
  'drink',
  'specials',
  'special',
  'today',
  'todaysspecial',
  'price',
  'prices',
  'rate',
  'rates',
  'aed',
  'dhs',
  'dirham',
  'dirhams',
  'tel',
  'telephone',
  'phone',
  'mobile',
  'whatsapp',
  'delivery',
  'takeaway',
  'takeaways',
  'dinein',
  'wifi',
  'open',
  'closed',
  'timing',
  'timings',
  'welcome',
  'thankyou',
  'thanks',
  'address',
  'branch',
  'branches',
  'halal',
  'veg',
  'nonveg',
  'vegetarian',
  'cash',
  'card',
  'cards',
  'gst',
  'vat',
  'total',
]);

/**
 * Words that disqualify a whole line wherever they appear in it.
 *
 * The set above only matches a line that is nothing but a header. It cannot catch "We accept
 * cards" or "FREE DELIVERY ABOVE 30 AED" — both of which are short, alphabetic, and survive
 * every shape rule, the second one looking even more like a dish once its price is stripped.
 * These are the words a shop sign uses and a kitchen never does.
 */
const NEVER_IN_A_DISH = new Set([
  'accept',
  'accepted',
  'cards',
  'delivery',
  'deliveries',
  'takeaway',
  'tel',
  'telephone',
  'phone',
  'mobile',
  'whatsapp',
  'wifi',
  'thank',
  'thanks',
  'welcome',
  'address',
  'branch',
  'branches',
  'timing',
  'timings',
  'closed',
  'minimum',
  'charges',
  'vat',
  'gst',
  'discount',
  'offer',
  'offers',
]);

/** A trailing price: "Chicken Biryani .... 24", "Masala Dosa AED 12.50", "Idli 8/-". */
const TRAILING_PRICE =
  /[\s.·—–-]*(?:aed|dhs?|rs\.?|₹)?\s*\d+(?:[.,]\d{1,2})?\s*(?:\/-|\/=|aed|dhs?)?\s*$/i;
/** Leading list marks the camera picks up: bullets, dashes, item numbers. */
const LEADING_MARK = /^[\s•*·—–\-–—>»]+|^\d{1,2}[).\]]\s*/;

function fold(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Candidates, in the order they appeared, deduplicated.
 *
 * Order is kept rather than sorted by likelihood: a menu is read top to bottom, and a collector
 * checking against the board in front of them should find the list in the same order as the
 * board. Sorting by a score would make them hunt.
 */
export function dishCandidates(raw: string): readonly Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const withoutMark = line.replace(LEADING_MARK, '');
    const hadPrice = TRAILING_PRICE.test(withoutMark);
    const text = withoutMark
      .replace(TRAILING_PRICE, '')
      // Dot leaders between a dish and its price survive the price strip on their own.
      .replace(/[\s.·]{3,}$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length < 3 || text.length > 40) continue;
    const letters = text.replace(/[^a-zA-Z]/g, '').length;
    // Mostly digits or symbols: a price list, a phone number, a stray barcode.
    if (letters < 3 || letters < text.length / 2) continue;
    // A menu is not a paragraph. More than six words is a description or an address.
    if (text.split(' ').length > 6) continue;

    const key = fold(text);
    if (key === '' || NOT_A_DISH.has(key) || seen.has(key)) continue;
    if (text.split(' ').some((word) => NEVER_IN_A_DISH.has(fold(word)))) continue;
    seen.add(key);
    out.push({ text, hadPrice });
  }

  return out;
}
