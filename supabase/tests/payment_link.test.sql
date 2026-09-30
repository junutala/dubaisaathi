-- Someone else pays (decision 049): an order's Payment Link, and the settlement it shares.
--
-- Same shape as orders.test.sql: `ON_ERROR_STOP off`, numbered headings, and every ERROR under a
-- heading marked "must fail" is the schema doing its job. Run after orders.test.sql, against the
-- same database, with 0024 applied:
--
--   psql -d saathi -v ON_ERROR_STOP=1 -f supabase/migrations/0024_order_payment_link.sql
--   psql -d saathi -f supabase/tests/payment_link.test.sql
--
-- The one that matters commercially is 3: the son in Pune pays the link and the traveller, tired
-- of waiting, pays the same order in Checkout. Both webhooks arrive; one family is issued.

\set ON_ERROR_STOP off
insert into devices (id, platform) values
  ('99999999-9999-4999-8999-999999999999','android')
  on conflict (id) do nothing;

insert into orders (id, device_id, aggregator, aggregator_order_id, amount_inr, slots,
                    payment_link_id, payment_link_url, payment_link_expires_at)
values
  ('eeeeeeee-0000-0000-0000-000000000001','99999999-9999-4999-8999-999999999999',
   'razorpay','order_TESTLINK1', 299, 2,
   'plink_TESTAAAA', 'https://rzp.io/rzp/TESTAAAA', now() + interval '24 hours');

\echo '== 1. a second order carrying the same link (must fail — one link, one order)'
insert into orders (id, device_id, aggregator, aggregator_order_id, amount_inr, slots, payment_link_id)
  values ('eeeeeeee-0000-0000-0000-00000000000f','99999999-9999-4999-8999-999999999999',
          'razorpay','order_TESTLINKF', 199, 1, 'plink_TESTAAAA');

\echo '== 2. the link is paid: settled through the same function (should succeed)'
select settle_order(
  'eeeeeeee-0000-0000-0000-000000000001',
  'ffffffff-0000-0000-0000-000000000001', 2::smallint, null,
  array['ffffffff-0000-0000-0000-000000000011','ffffffff-0000-0000-0000-000000000012']::uuid[],
  array['s1','s2']);

\echo '== 3. Checkout paid the same order as well (must fail with "already-settled")'
select settle_order(
  'eeeeeeee-0000-0000-0000-000000000001',
  'ffffffff-0000-0000-0000-000000000002', 2::smallint, null,
  array['ffffffff-0000-0000-0000-000000000021','ffffffff-0000-0000-0000-000000000022']::uuid[],
  array['s1','s2']);

\echo '== 4. orders without a link are untouched: many may carry none (should succeed)'
insert into orders (id, device_id, aggregator, aggregator_order_id, amount_inr, slots)
  values ('eeeeeeee-0000-0000-0000-000000000002','99999999-9999-4999-8999-999999999999',
          'razorpay','order_TESTLINK2', 199, 1),
         ('eeeeeeee-0000-0000-0000-000000000003','99999999-9999-4999-8999-999999999999',
          'razorpay','order_TESTLINK3', 199, 1);

\echo '== final state: the link order paid once, one family, slot 1 bound to the traveller'
select id, status, payment_link_id, family_id is not null as has_family
  from orders where id::text like 'eeeeeeee%' order by id;
select family_id, slot, status, device_id from passes
  where family_id = 'ffffffff-0000-0000-0000-000000000001' order by slot;
