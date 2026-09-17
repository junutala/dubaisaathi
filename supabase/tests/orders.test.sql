-- What the paid path must refuse, and what it must allow (decision 019).
--
-- Same shape as entitlement.test.sql and coupons.test.sql: `ON_ERROR_STOP off`, numbered
-- headings, and every ERROR under a heading marked "must fail" is the schema doing its job.
-- Run after those two, against the same database, with 0008 and 0009 applied:
--
--   psql -d saathi -v ON_ERROR_STOP=1 -f supabase/migrations/0001_entitlement.sql
--   psql -d saathi -v ON_ERROR_STOP=1 -f supabase/migrations/0007_coupons.sql
--   psql -d saathi -v ON_ERROR_STOP=1 -f supabase/migrations/0008_orders_and_coupon.sql
--   psql -d saathi -v ON_ERROR_STOP=1 -f supabase/migrations/0009_codes_without_a_dash.sql
--   psql -d saathi -f supabase/tests/orders.test.sql
--
-- The one that matters commercially is 3: Razorpay retries a webhook it did not hear a 200 for,
-- and a second settlement of one payment would hand the traveller a second family — four more
-- slots for one price, and a cap on a coupon walked past every retry.

\set ON_ERROR_STOP off
insert into devices (id, platform) values
  ('77777777-7777-7777-7777-777777777777','android'),
  ('88888888-8888-8888-8888-888888888888','ios')
  on conflict (id) do nothing;
insert into coupons (code, kind, discount_percent, max_redemptions, batch) values
  ('SSPAID11', 'family', 50, 5, 'test paid batch')
  on conflict (code) do nothing;

insert into orders (id, device_id, aggregator, aggregator_order_id, amount_inr, slots, coupon_code)
values
  ('cccccccc-0000-0000-0000-000000000001','77777777-7777-7777-7777-777777777777',
   'razorpay','order_TESTAAAA', 149, 2, 'SSPAID11'),
  ('cccccccc-0000-0000-0000-000000000002','88888888-8888-8888-8888-888888888888',
   'razorpay','order_TESTBBBB', 199, 1, null);

\echo '== 1. an order priced with a code nobody made (must fail)'
insert into orders (id, device_id, aggregator, aggregator_order_id, amount_inr, slots, coupon_code)
  values ('cccccccc-0000-0000-0000-00000000000f','77777777-7777-7777-7777-777777777777',
          'razorpay','order_TESTZZZZ', 199, 1, 'ZZZZZZZZ');

\echo '== 2. an order of ₹0 (must fail — a free code goes through redeem, never through an order)'
insert into orders (id, device_id, aggregator, aggregator_order_id, amount_inr, slots)
  values ('cccccccc-0000-0000-0000-00000000000e','77777777-7777-7777-7777-777777777777',
          'razorpay','order_TESTYYYY', 0, 1);

\echo '== 3. settling with a slot count that is not the order''s (must fail with "slots")'
select settle_order(
  'cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001', 3::smallint, '2026-10-15T06:00:00Z',
  array['dddddddd-0000-0000-0000-000000000011','dddddddd-0000-0000-0000-000000000012','dddddddd-0000-0000-0000-000000000013']::uuid[],
  array['s1','s2','s3']);

\echo '== 4. an order nobody made (must fail with "unknown-order")'
select settle_order(
  'cccccccc-0000-0000-0000-0000000000ff',
  'dddddddd-0000-0000-0000-0000000000f1', 1::smallint, null,
  array['dddddddd-0000-0000-0000-0000000000f2']::uuid[], array['s1']);

\echo '== 5. the happy path: two slots, the code burned (should succeed)'
select settle_order(
  'cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001', 2::smallint, '2026-10-15T06:00:00Z',
  array['dddddddd-0000-0000-0000-000000000011','dddddddd-0000-0000-0000-000000000012']::uuid[],
  array['s1','s2']);

\echo '== 6. the same webhook delivered twice (must fail with "already-settled")'
select settle_order(
  'cccccccc-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000002', 2::smallint, '2026-10-15T06:00:00Z',
  array['dddddddd-0000-0000-0000-000000000021','dddddddd-0000-0000-0000-000000000022']::uuid[],
  array['s1','s2']);

\echo '== 7. a phone that had already redeemed the code still gets its purchase (should succeed)'
insert into coupon_redemptions (code, device_id, slots)
  values ('SSPAID11', '88888888-8888-8888-8888-888888888888', 1);
update orders set coupon_code = 'SSPAID11'
  where id = 'cccccccc-0000-0000-0000-000000000002';
select settle_order(
  'cccccccc-0000-0000-0000-000000000002',
  'dddddddd-0000-0000-0000-000000000003', 1::smallint, null,
  array['dddddddd-0000-0000-0000-000000000031']::uuid[], array['s1']);

\echo '== final state: both orders paid, slot 1 bound to the buying phone, the code burned once'
select id, status, slots, amount_inr, coupon_code, family_id is not null as has_family
  from orders where id like 'cccccccc%' order by id;
select family_id, slot, status, device_id from passes
  where family_id in ('dddddddd-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000003')
  order by family_id, slot;
select code, redeemed, devices, slots_issued from coupon_uptake where code = 'SSPAID11';
