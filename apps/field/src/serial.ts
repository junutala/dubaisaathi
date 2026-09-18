/**
 * The number the rider writes on the paper (decision 029).
 *
 * It is generated here rather than printed by the press, on the owner's call: then the phone
 * owns the sequence and cannot lose count. A rider keeping his own tally at the thirty-seventh
 * shop of an afternoon writes 37 twice and skips 39, and two menu cards end up claiming one
 * doorway's coordinates.
 *
 * It advances only after a pin is saved, so the screen always shows the number to write *now*.
 * Four digits, because that is what a man writes into a box with a pen while holding a helmet.
 *
 * Two phones would both start at 0001. Every pin also carries its collector, so the desk can
 * tell one rider's 0042 from another's — and the picker shows the frontage photograph, which
 * settles it by eye in any case.
 */

const KEY = 'saathi.pinCounter';

function count(): number {
  try {
    const raw = Number(localStorage.getItem(KEY));
    return Number.isInteger(raw) && raw > 0 ? raw : 1;
  } catch {
    return 1;
  }
}

/** The number to write on the form in front of him, as four digits. */
export function currentSerial(): string {
  return String(count()).padStart(4, '0');
}

/** Called once a pin is safely in the queue — never before, or an abandoned visit eats one. */
export function advanceSerial(): string {
  const next = count() + 1;
  try {
    localStorage.setItem(KEY, String(next));
  } catch {
    /* the same number would come up again, and the desk sees two photographs to choose from */
  }
  return String(next).padStart(4, '0');
}
