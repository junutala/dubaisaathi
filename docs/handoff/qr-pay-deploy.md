# Handoff — deploy "QR कोड" (someone else pays, decision 049)

Built on `claude/cool-wozniak-wb1164` and **not deployed**. Nothing below has been done yet. Do it
in this order: the switch goes on last, because a control that is there before its server is a
promise broken on the tap.

## 1. Apply migration 0024 to `pixlnjmpksmfqheotinp`

`supabase/migrations/0024_order_payment_link.sql` — three nullable columns on `orders`
(`payment_link_id`, `payment_link_url`, `payment_link_expires_at`) and a partial unique index
`orders_payment_link`. Additive only; no existing row changes. Apply it as migration
`0024_order_payment_link` (e.g. Supabase MCP `apply_migration`). Check afterwards:

```sql
select column_name from information_schema.columns
 where table_name = 'orders' and column_name like 'payment_link%';
```

`supabase/tests/payment_link.test.sql` exercises it on a plain Postgres (see its header).

## 2. Deploy `order` and `webhook` to `pixlnjmpksmfqheotinp`

Both import from `_shared/`, and both now import the new `_shared/paymentLink.ts` — deploy each
with its `_shared` files included, as they are deployed today (`source/order/index.ts`,
`source/webhook/index.ts`).

`verify_jwt`, as live on 30 September (read from the project, there is no config for it in the
repo): **`order` → true**, **`webhook` → false** (Razorpay sends no JWT). Keep both exactly so.

Secrets: nothing new. `order` already has `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`; `webhook`
uses the same two (project-wide secrets) to cancel a link once its order is paid in Checkout — if
they are not visible to it, that step is skipped and nothing else is affected.

The owner has already added `payment_link.paid` to the Razorpay webhook. Confirm it is ticked on
the live-mode webhook, not only the test one.

Check: `POST …/functions/v1/order` with `{"action":"link","deviceId":"<uuid>","orderId":"<not yours>"}`
answers `{"reason":"no-order"}` with 404 (an old deployment says `action must be create or status`).

## 3. Switch it on in the app

Set the Railway variable **`VITE_QR_PAY_LIVE=true`** on the `pwa` service
`fac16b33-79e1-4984-91f1-3e63fb0a60d2` (project `9f99330c-bfee-49c2-b49f-35e9a4061f80`, environment
`production`) and redeploy. It is a build variable: `deploy/Dockerfile` declares
`ARG VITE_QR_PAY_LIVE=""` and passes it to `vite build`, so it takes effect only on a new build of a
commit that contains this work — the branch must be merged to `main` first, or the build ignores
the variable. `VITE_PURCHASE_LIVE=true` must stay set; the control needs both.

## 4. Verify, then hand to the owner

- The deployment's commit is the merge that contains this work, and its status is SUCCESS.
- On `dubai.saafarsaathi.in` (after the app has picked up the new build on घर): घर.4 shows
  "QR कोड" under "₹199 भुगतान करें"; tapping it draws a QR and a `https://rzp.io/…` link, and
  "WhatsApp पर भेजें" opens WhatsApp with the line and the link and no number.
- In `orders`, the new row carries `payment_link_id` and `payment_link_url`; tapping again returns
  the same link.

Then tell the owner to try a real payment: QR on his phone, scanned and paid from a second phone
by UPI (and once by card), and watch the pass land on the first phone while the QR is up. Then
check the order is `paid` with one family, and that the webhook's log shows `payment_link.paid`
answered `{ ok: true }`.
