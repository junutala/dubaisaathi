-- 0024 · Someone else pays: an order can carry a Razorpay Payment Link (decision 049).
--
-- घर.4's "QR कोड" shows a QR for a Payment Link made against the traveller's own open order, so
-- a son in Pune can scan it with any UPI or camera app and pay, and the pass lands on the
-- traveller's phone. The link is the aggregator's own object with its own internal order, so the
-- webhook cannot find ours by `aggregator_order_id` when it is paid: it finds it by the link's
-- `reference_id`, which is our order id, or by the link id stored here.
--
-- Three nullable columns and nothing else: an order without a link is exactly what it was, and
-- `settle_order` is unchanged — a link payment settles through the same one transaction, under
-- the same row lock, so Checkout and the link paying the same order can never issue two families.
--
-- Same rules as 0001 and 0008: no account, no contact details, NO IP ADDRESS COLUMN anywhere.
-- RLS stays on with no policies; only the edge functions, with the service role, touch these.

alter table orders
  add column payment_link_id text,
  add column payment_link_url text,
  add column payment_link_expires_at timestamptz;

-- One link, one order: the webhook's fallback lookup by link id must find at most one row.
create unique index orders_payment_link on orders (payment_link_id)
  where payment_link_id is not null;

comment on column orders.payment_link_id is
  'Razorpay Payment Link (plink_…) made for this order by `order` `link`; reused while it is open.';
comment on column orders.payment_link_url is
  'The link''s short_url, which the phone draws as a QR. Returned again rather than made twice.';
comment on column orders.payment_link_expires_at is
  'When Razorpay stops taking money on the link (expire_by). After it, the phone makes a new order.';
