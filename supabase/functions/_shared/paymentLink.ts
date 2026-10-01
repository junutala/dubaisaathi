/**
 * Someone else pays (decision 049): the two ends of a Razorpay Payment Link, kept here so both
 * edge functions agree and a test can read them without Deno. No imports and no Deno globals on
 * purpose — `packages/content-tools/src/paymentLink.test.ts` imports this file as it is.
 *
 * - `linkRequest` is the body `order` `link` sends to `POST /v1/payment_links`: the order's own
 *   amount (priced on the server, never by the phone), our order id as `reference_id` and in the
 *   notes, a short description, and an end.
 * - `paidLinkOf` reads a `payment_link.paid` delivery back to our order.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LinkRequest {
  readonly amount: number;
  readonly currency: 'INR';
  readonly accept_partial: false;
  readonly reference_id: string;
  readonly description: string;
  readonly expire_by: number;
  readonly notify: { readonly sms: false; readonly email: false };
  readonly reminder_enable: false;
  readonly notes: { readonly orderId: string; readonly slots: string };
}

/** The Payment Link for one order: `expireBy` is Unix seconds, as Razorpay takes it. */
export function linkRequest(link: {
  readonly orderId: string;
  readonly amountInr: number;
  readonly slots: number;
  readonly expireBy: number;
}): LinkRequest {
  return {
    // Paise, like every amount Razorpay takes.
    amount: link.amountInr * 100,
    currency: 'INR',
    accept_partial: false,
    // Our order id, so `payment_link.paid` names the order it settles. Razorpay refuses a second
    // link with the same reference, which is what keeps two taps crossing to one link.
    reference_id: link.orderId,
    description: `Dubai Saathi pass · 14 days · ${String(link.slots)} phone${
      link.slots === 1 ? '' : 's'
    }`,
    expire_by: link.expireBy,
    // Nobody is messaged by Razorpay: the traveller sends the QR or the link themselves.
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: { orderId: link.orderId, slots: String(link.slots) },
  };
}

/**
 * Which of our orders a `payment_link.paid` is for: our order id, from the link's `reference_id`
 * or else its `notes.orderId` — only when it is a uuid, since anything else is not an id we made
 * and would fail the database's cast — and the link's own id, for the stored-column lookup when
 * neither is there.
 */
export function paidLinkOf(body: unknown): {
  readonly orderId: string | null;
  readonly linkId: string | null;
} {
  const none = { orderId: null, linkId: null };
  if (typeof body !== 'object' || body === null) return none;
  const payload = (body as { payload?: unknown }).payload;
  if (typeof payload !== 'object' || payload === null) return none;
  const entity = (payload as { payment_link?: { entity?: unknown } }).payment_link?.entity;
  if (typeof entity !== 'object' || entity === null) return none;
  const link = entity as { id?: unknown; reference_id?: unknown; notes?: unknown };
  const noted =
    typeof link.notes === 'object' && link.notes !== null
      ? (link.notes as { orderId?: unknown }).orderId
      : undefined;
  const orderId = [link.reference_id, noted].find(
    (value): value is string => typeof value === 'string' && UUID.test(value),
  );
  const linkId = typeof link.id === 'string' && link.id !== '' ? link.id : null;
  return { orderId: orderId ?? null, linkId };
}
