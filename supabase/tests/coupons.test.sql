-- What the coupon schema must refuse, and what it must allow.
--
-- Same shape as entitlement.test.sql: `ON_ERROR_STOP off`, numbered headings, and every ERROR
-- under a heading marked "must fail" is the schema doing its job. Run after that file, against
-- the same database, with 0007 applied:
--
--   psql -d saathi -v ON_ERROR_STOP=1 -f supabase/migrations/0007_coupons.sql
--   psql -d saathi -f supabase/tests/coupons.test.sql
--
-- The one that matters commercially is 4: one phone cannot take one code twice, which is what
-- stops a 100% code being a free pass for every relative of whoever received it.

\set ON_ERROR_STOP off
insert into devices (id, platform) values
  ('44444444-4444-4444-4444-444444444444','android'),
  ('55555555-5555-5555-5555-555555555555','android')
  on conflict (id) do nothing;
insert into coupons (code, kind, discount_percent, max_redemptions, batch) values
  ('SS-7K3M2X', 'family', 100, 2, 'test batch'),
  ('OP-4HXR9B', 'single', 50, 10, 'test operator');

\echo '== 1. a discount of 101 (must fail)'
insert into coupons (code, kind, discount_percent, max_redemptions, batch)
  values ('SS-AAAAAA', 'family', 101, 1, 'bad');

\echo '== 2. a kind other than family or single (must fail)'
insert into coupons (code, kind, discount_percent, max_redemptions, batch)
  values ('SS-BBBBBB', 'corporate', 10, 1, 'bad');

\echo '== 3. a code with an ambiguous character, or no dash (must fail, twice)'
insert into coupons (code, kind, discount_percent, max_redemptions, batch)
  values ('SS-0O1I2X', 'family', 10, 1, 'bad');
insert into coupons (code, kind, discount_percent, max_redemptions, batch)
  values ('SS7K3M2X', 'family', 10, 1, 'bad');

\echo '== 4. a redemption of five slots (must fail)'
insert into coupon_redemptions (code, device_id, slots)
  values ('SS-7K3M2X', '44444444-4444-4444-4444-444444444444', 5);

\echo '== 5. the same phone taking the same code twice (first succeeds, second must fail)'
insert into coupon_redemptions (code, device_id, slots)
  values ('SS-7K3M2X', '44444444-4444-4444-4444-444444444444', 2);
insert into coupon_redemptions (code, device_id, slots)
  values ('SS-7K3M2X', '44444444-4444-4444-4444-444444444444', 1);

\echo '== 6. the atomic path: the second phone takes the last use (should succeed)'
select redeem_coupon(
  'SS-7K3M2X', '55555555-5555-5555-5555-555555555555',
  'bbbbbbbb-0000-0000-0000-000000000001', 3::smallint, '2026-10-15T06:00:00Z',
  array['bbbbbbbb-0000-0000-0000-000000000011','bbbbbbbb-0000-0000-0000-000000000012','bbbbbbbb-0000-0000-0000-000000000013']::uuid[],
  array['s1','s2','s3']);

\echo '== 7. a third phone on the exhausted code (must fail with "exhausted")'
insert into devices (id, platform) values ('66666666-6666-6666-6666-666666666666','ios')
  on conflict (id) do nothing;
select redeem_coupon(
  'SS-7K3M2X', '66666666-6666-6666-6666-666666666666',
  'bbbbbbbb-0000-0000-0000-000000000002', 1::smallint, null,
  array['bbbbbbbb-0000-0000-0000-000000000021']::uuid[], array['s1']);

\echo '== 8. two phones on a single code (must fail with "single")'
select redeem_coupon(
  'OP-4HXR9B', '66666666-6666-6666-6666-666666666666',
  'bbbbbbbb-0000-0000-0000-000000000003', 2::smallint, null,
  array['bbbbbbbb-0000-0000-0000-000000000031','bbbbbbbb-0000-0000-0000-000000000032']::uuid[], array['s1','s2']);

\echo '== 9. a code nobody made (must fail with "unknown")'
select redeem_coupon(
  'ZZ-ZZZZZZ', '66666666-6666-6666-6666-666666666666',
  'bbbbbbbb-0000-0000-0000-000000000004', 1::smallint, null,
  array['bbbbbbbb-0000-0000-0000-000000000041']::uuid[], array['s1']);

\echo '== 10. a code whose window has closed (must fail with "ended")'
insert into coupons (code, kind, discount_percent, max_redemptions, batch, valid_from, valid_until)
  values ('SS-ENDED2', 'family', 100, 5, 'old ad', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z');
select redeem_coupon(
  'SS-ENDED2', '66666666-6666-6666-6666-666666666666',
  'bbbbbbbb-0000-0000-0000-000000000005', 1::smallint, null,
  array['bbbbbbbb-0000-0000-0000-000000000051']::uuid[], array['s1']);

\echo '== final state: slot 1 bound to the redeeming phone, 2 and 3 issued'
select slot, status, device_id from passes
  where family_id = 'bbbbbbbb-0000-0000-0000-000000000001' order by slot;
select code, kind, redeemed, devices, slots_issued, status from coupon_uptake order by code;
