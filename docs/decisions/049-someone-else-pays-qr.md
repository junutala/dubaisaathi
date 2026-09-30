# 049 — Someone else pays: "QR कोड" on घर.4

**Date:** 30 September 2026 · **Status:** built, not deployed (server and flag pending — see
`docs/handoff/qr-pay-deploy.md`)

## The owner's ruling

Besides the one pay button, a traveller can have someone else pay. The app shows a QR for this
order's Razorpay Payment Link; another person — a family member in India — scans it with any UPI
or camera app and pays, and the pass arrives on the traveller's phone. His decisions:

- The control is **"QR कोड"** (en "QR code"), a secondary control under the main
  `₹{amount} भुगतान करें` button on घर.4.
- Tapping it shows the QR large, with the amount and one line saying what it is for: someone else
  scans and pays, the pass arrives on this phone. Under the QR, a small **"WhatsApp पर भेजें"**
  link opens `https://wa.me/?text=<short line + link>`, with no number in it.
- Methods are **UPI, cards and netbanking**. Wallets are not enabled on the account and are never
  mentioned.

This brings back, in a different shape, the second control that decision 019's 30 September
addendum removed. That addendum's reason — Checkout's own UPI QR covers someone else paying — holds
only when that someone is standing beside the traveller. A son in Pune is not: he needs a link he
can open on his own phone, sent to him, and a Payment Link is exactly that.

## What was built

**Server.** `order` gains a third action, `link`, taking the phone's own `orderId`:

- It looks the order up by id **and** device, as `status` does. Not found → `no-order` (404);
  not `created` → `not-open` (409).
- It asks `POST /v1/payment_links` with the same key id and secret as the order, for the order's
  **own** `amount_inr` (priced by `create` from the one price rule; the phone sends no amount), in
  INR, `accept_partial: false`, `reference_id` = our order id, `notes.orderId` = our order id, a
  short description ("Dubai Saathi pass · 14 days · N phones"), `expire_by` 24 hours ahead, and no
  SMS or email from Razorpay. The body is built by `supabase/functions/_shared/paymentLink.ts`.
- It stores the link on the order — migration **0024** adds `payment_link_id` (unique when set),
  `payment_link_url` and `payment_link_expires_at` — and returns
  `{ orderId, paymentLinkId, shortUrl, expiresAt, amountInr, slots }`.
- **Idempotent.** A stored link is returned again without asking Razorpay. The row is written only
  where `payment_link_id is null`, and the answer is always read back from the row, so two taps
  crossing hand out the first link (Razorpay itself refuses a second link with the same
  `reference_id`). A stored link within 15 minutes of its end is refused with `link-expired` (410):
  that order cannot carry another, so the phone makes a new order.

`webhook` settles on **`payment_link.paid`** as well as `payment.captured` and `order.paid`, behind
the same signature check. A link has its own internal Razorpay order, so its payment's `order_id`
is never ours; the order is found by the link's `reference_id`, else `notes.orderId` (each only
when it is a uuid), else the stored `payment_link_id`. It then settles through the same
`settle_order`, so the same row lock and the same `already-settled` answer make Checkout and the
link paying one order issue **one** family. When an order with a link is settled by Checkout, the
webhook cancels the link (best effort — it expires within a day anyway) so a QR still sitting in
a family chat stops taking money. If both are paid before that happens, the second payment is the
"same payment taken twice" that decision 048's refund line already promises to return.

**App.** `purchase.ts` has `paymentLink(slots, code)` and `watchOrder(order, signal)`:

- The order is the remembered one when it is for the same phones and code, a new one otherwise; the
  link is kept on it (`saathi.order`), so a QR already made is drawn again with the radio off.
  A remembered order the server no longer calls open is checked for a pass (installed if paid) and
  then replaced, once.
- `buyPass` now also collects on a matching remembered order instead of always making a new one.
  Without that, tapping the pay button after showing a QR replaced the remembered order, and a son
  paying the QR later would have paid for a pass this phone never asked about again.
- While the QR is on screen the order's `status` is asked after 3 s, 5 s and then every 10 s, for
  as long as it is up; the pass installs the moment the webhook has signed it and the welcome
  (decision 022) takes the screen. Closing the QR stops asking; the order stays remembered and
  `startOrderResume` asks on the next open and when the signal returns.
- The QR is drawn on the phone with `qrPath`, the same encoder ऐप शेयर (घर.8) uses.

**The switch.** The control shows only when `VITE_QR_PAY_LIVE === 'true'` **and**
`VITE_PURCHASE_LIVE === 'true'` (`QR_PAY_IS_LIVE`). It is declared in `deploy/Dockerfile` like the
other `VITE_*`. It stays off until the migration and both functions are deployed: a control that
is there before its server is a promise broken on the tap.

## What this does not do

No second aggregator, no UPI-intent QR of our own (decision 019: a raw VPA payment carries no order
id), no link sent by Razorpay's SMS or email (we hold no number), and no order history. A UPI app's
own scanner may read only `upi://` codes; the QR carries an `https://` link, which every phone
camera opens and which lands on Razorpay's page where UPI, a card or netbanking pays it.
