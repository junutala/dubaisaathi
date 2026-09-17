# 019 — Buying a pass: an order, Razorpay Checkout, and a webhook that signs it

**Status:** accepted 17 September · **Keeps** 001 (no account), 005 (a pass is a signed token
verified offline), 006 (prices and the 14-day clock from landing), 011 (Supabase, no IP),
018 (coupons are a discount on the one purchase flow) · **Splits** one build switch into two

## The path

Four steps, and only one of them is ours:

1. **`order` `create`** prices the pass — the list price, or what the code leaves after
   `passPriceInr`, the same rule the app and `redeem` use — asks Razorpay for an order, writes
   our own `orders` row (`created`, with `coupon_code`) and hands the phone back the
   aggregator's order id, the **publishable** key id and the amount. The secret never leaves
   the function.
2. **Razorpay Checkout** collects the money on Razorpay's own page, opened over that order.
   `UPI से — इसी फ़ोन पर` preselects UPI; `QR — कोई और भरे` leaves the method alone, which is
   what puts a QR in front of a son in Pune and the app list in front of a phone.
3. **`webhook`** takes `payment.captured` / `order.paid` from Razorpay, verifies the HMAC over
   the raw body, signs one pass per slot with `PASS_SIGNING_KEY`, and calls `settle_order`
   (migration 0008): the family, every pass, slot 1 bound to the buying phone, the coupon
   burned and the order `paid`, in one transaction under a row lock on the order.
4. **`order` `status`** is what the phone polls once Checkout closes. `paid` re-signs the
   family's passes from the rows and hands them back; the phone verifies every one of them
   against the public key in its bundle before installing anything (005).

## Why a personal UPI QR cannot work

The cheapest thing imaginable is a printed VPA QR: no aggregator, no fees, no integration. It
cannot work here, and the reason is structural rather than commercial.

A payment to a VPA carries **no order id and fires no callback.** Money lands in a bank account
with a payer name and a reference the payer's app chose. Nothing in it says _which device_ paid
— and the device is the entire identity of this product (001). There is no account to credit,
no email to send a link to, and no login for the traveller to come back through. We would be
matching amounts and timestamps by hand and then asking a stranger which phone was theirs,
which is both a support queue and an obvious way to take somebody else's pass.

An aggregator order fixes exactly that: the order is created **before** the money, carries our
own uuid and the device id in its notes, and the webhook names it when the money arrives. That
is the whole reason for the fee.

## Why the two switches are separate

`PURCHASE_IS_LIVE` (`VITE_PURCHASE_LIVE`) did two jobs: it enabled the buy buttons **and** it
allowed `isGated` to close रास्ता and खाना on a trial that had run out. One switch cannot
express the state the product is actually in. The owner needs to buy a real pass with real money
on the live build — the only way to know the path works end to end — weeks before any traveller
should ever be turned away.

So they are split:

- **`VITE_PURCHASE_LIVE`** enables the buy buttons on घर.4, and nothing else.
- **`VITE_GATE_LIVE`** (new, default **false**) is the only thing `isGated` reads.

Nothing else about the counter changes: the trial still starts on confirmed arrival, the nudge
still comes from the twentieth hour, and **a traveller who has paid once is never gated**,
whatever either switch says. Turning the gate on is a separate decision, taken once the
purchase path has taken money and given back a pass.

## ₹0 goes through `redeem`, anything above it goes through `order`

A code that brings the price to ₹0 is issued on the spot by `redeem` and never becomes an order:
`order` `create` refuses it with `free`, and `orders.amount_inr` has a `> 0` check behind that.
One price, one way in. The alternative — a ₹0 order through Checkout — is a payment screen that
asks for nothing, an aggregator order that can never be captured, and a second code path that
issues the same pass.

A **partial** code is the opposite and now works: the order carries `coupon_code`, and
`settle_order` writes the `coupon_redemptions` row when the order is paid. Before this, a 50%
code left no trace once the balance was paid by UPI, so its `max_redemptions` cap counted only
the free ones. A phone that had already quoted and redeemed that code still gets its purchase:
the duplicate-key violation on `(code, device_id)` is swallowed, because refusing there would
take money and give back nothing.

## What the phone does, and does not, believe

The phone never decides it has paid. Checkout closing is not a payment, and a `handler` callback
is script on a page anyone can edit. The **webhook is the authority**, and the only thing the app
trusts is a signature it verifies itself.

- Checkout's script is loaded **on demand**, when a buy button is tapped — never at boot, never
  as a build dependency. This app installs and runs with the network off, and a payment page on
  somebody else's CDN may not become part of that. A script that will not load is one honest
  line (`भुगतान का पन्ना नहीं खुल पाया`), not an exception.
- After Checkout closes, the phone polls `status` on a short backoff capped at about a minute.
  Closed without paying gets a glance rather than the full minute — but it does get a glance,
  because a traveller may have paid in their UPI app and then dismissed our page.
- The open order id is kept in `localStorage` under `saathi.order`, so a traveller who closed
  the app mid-payment is polled again on the next open and whenever signal returns. The pass
  arrives even though nobody was watching the screen when the money did. It is cleared once the
  pass is installed, or once the server calls the order failed, expired or unknown.
- A pass that fails verification is a **failure, not a pass**, however confidently the server
  called it one.

## What this does not do

No refunds, no receipts, no order history screen, and no second aggregator. There is no
`paid_signature` column: Checkout's client-side signature proves a browser saw a payment, not
that money settled, and the webhook already proves the latter — storing the former would invite
somebody to trust it later.

## Secrets

`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` on `order`; `RAZORPAY_WEBHOOK_SECRET` and
`PASS_SIGNING_KEY` on `webhook` (`order` needs `PASS_SIGNING_KEY` too, to re-sign on `status`).
None of them is in the repo, and a missing webhook secret is a 503 with a reason rather than a
crash — an unconfigured function must not silently eat a real payment.
