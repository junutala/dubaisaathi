import { describe, expect, it } from 'vitest';
import { linkRequest, paidLinkOf } from '../../../supabase/functions/_shared/paymentLink.ts';

/**
 * Someone else pays (decision 049): the Payment Link `order` asks Razorpay for, and the
 * `payment_link.paid` delivery `webhook` reads back to our order. The functions run on Deno and
 * are not executed here; the two pure halves they share are, from the very file they import.
 */

const ORDER_ID = '99999999-9999-4999-8999-999999999999';

/** A `payment_link.paid` delivery in Razorpay's shape, trimmed to what matters here. */
function delivery(link: Record<string, unknown>) {
  return {
    entity: 'event',
    event: 'payment_link.paid',
    payload: {
      payment_link: { entity: { amount: 29900, status: 'paid', ...link } },
      // The link's own internal order, which is not ours and must never be looked up.
      order: { entity: { id: 'order_LINKINTERNAL', amount: 29900 } },
      payment: { entity: { id: 'pay_TEST', order_id: 'order_LINKINTERNAL', status: 'captured' } },
    },
  };
}

describe('the link order asks for', () => {
  it('charges the order’s own amount in paise, names our order, and ends', () => {
    const body = linkRequest({ orderId: ORDER_ID, amountInr: 299, slots: 2, expireBy: 1_900_000 });
    expect(body).toEqual({
      amount: 29900,
      currency: 'INR',
      accept_partial: false,
      reference_id: ORDER_ID,
      description: 'Dubai Saathi pass · 14 days · 2 phones',
      expire_by: 1_900_000,
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: { orderId: ORDER_ID, slots: '2' },
    });
    // Razorpay caps reference_id at 40 characters; a uuid is 36.
    expect(body.reference_id.length).toBeLessThanOrEqual(40);
  });

  it('says one phone, not one phones', () => {
    expect(
      linkRequest({ orderId: ORDER_ID, amountInr: 199, slots: 1, expireBy: 1 }).description,
    ).toBe('Dubai Saathi pass · 14 days · 1 phone');
  });

  it('never mentions a wallet — the account takes UPI, cards and netbanking only', () => {
    const text = JSON.stringify(
      linkRequest({ orderId: ORDER_ID, amountInr: 199, slots: 1, expireBy: 1 }),
    );
    expect(text.toLowerCase()).not.toContain('wallet');
  });
});

describe('payment_link.paid, read back to our order', () => {
  it('takes our order from the link’s reference_id', () => {
    expect(paidLinkOf(delivery({ id: 'plink_TEST', reference_id: ORDER_ID }))).toEqual({
      orderId: ORDER_ID,
      linkId: 'plink_TEST',
    });
  });

  it('falls back to the notes when the reference is not ours', () => {
    expect(
      paidLinkOf(
        delivery({ id: 'plink_TEST', reference_id: 'INV-7', notes: { orderId: ORDER_ID } }),
      ),
    ).toEqual({ orderId: ORDER_ID, linkId: 'plink_TEST' });
  });

  it('keeps the link id alone when neither names a uuid, for the stored-column lookup', () => {
    expect(
      paidLinkOf(delivery({ id: 'plink_TEST', reference_id: "x'; drop table orders" })),
    ).toEqual({ orderId: null, linkId: 'plink_TEST' });
  });

  it('is nothing at all for a delivery with no link in it', () => {
    expect(paidLinkOf({ event: 'payment.captured', payload: { payment: { entity: {} } } })).toEqual(
      { orderId: null, linkId: null },
    );
    expect(paidLinkOf(null)).toEqual({ orderId: null, linkId: null });
    expect(paidLinkOf('not json')).toEqual({ orderId: null, linkId: null });
  });
});
