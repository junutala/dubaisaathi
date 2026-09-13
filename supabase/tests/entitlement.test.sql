-- What the entitlement schema must refuse, and what it must allow.
--
-- Seven of these statements MUST fail and five MUST succeed; `ON_ERROR_STOP off` lets the file
-- run past the failures so the whole list is checked in one pass. Read the output: each ERROR
-- under a numbered heading is the schema doing its job.
--
-- The one that matters commercially is 5: one phone cannot hold two slots of a family pack, so
-- a ₹499 four-device purchase cannot be installed on one phone and re-sold.
--
-- Run it against any empty Postgres 16:
--   createdb saathi
--   psql -d saathi -v ON_ERROR_STOP=1 -f supabase/migrations/0001_entitlement.sql \
--                                     -f supabase/migrations/0002_voice_events.sql
--   psql -d saathi -f supabase/tests/entitlement.test.sql
--
-- It is not in `npm run verify` because that would need a Postgres in CI for two migrations.
-- When the backend grows past these five tables, that trade stops being worth it.

\set ON_ERROR_STOP off
insert into devices (id, platform) values
  ('11111111-1111-1111-1111-111111111111','android'),
  ('22222222-2222-2222-2222-222222222222','android'),
  ('33333333-3333-3333-3333-333333333333','ios');
insert into families (id, slots, counter_off_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 4, '2026-10-01T06:00:00Z');
insert into passes (family_id, slot, kind, expires_at, signature) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 1, 'paid', '2026-10-15T06:00:00Z', 'sig1'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 2, 'paid', '2026-10-15T06:00:00Z', 'sig2'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 3, 'paid', '2026-10-15T06:00:00Z', 'sig3'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 4, 'paid', '2026-10-15T06:00:00Z', 'sig4');

\echo '== 1. a fifth slot in a four-slot family'
insert into passes (family_id, slot, kind, signature) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 5, 'paid', 'sig5');

\echo '== 2. two passes on the same slot'
insert into passes (family_id, slot, kind, signature) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 2, 'paid', 'sig2b');

\echo '== 3. bound with no device'
update passes set status = 'bound' where slot = 1
  and family_id = 'aaaaaaaa-0000-0000-0000-000000000001';

\echo '== 4. slot 1 bound properly (should succeed)'
update passes set status='bound', device_id='11111111-1111-1111-1111-111111111111', bound_at=now()
  where slot = 1 and family_id='aaaaaaaa-0000-0000-0000-000000000001';

\echo '== 5. the SAME phone claiming a second slot — the anti-sharing rule'
update passes set status='bound', device_id='11111111-1111-1111-1111-111111111111', bound_at=now()
  where slot = 2 and family_id='aaaaaaaa-0000-0000-0000-000000000001';

\echo '== 6. a different phone on slot 2 (should succeed)'
update passes set status='bound', device_id='22222222-2222-2222-2222-222222222222', bound_at=now()
  where slot = 2 and family_id='aaaaaaaa-0000-0000-0000-000000000001';

\echo '== 7. हटाएँ — revoke slot 2, then a third phone takes it (should succeed)'
update passes set status='revoked', device_id=null, bound_at=null, revoked_at=now()
  where slot = 2 and family_id='aaaaaaaa-0000-0000-0000-000000000001';
update passes set status='bound', device_id='33333333-3333-3333-3333-333333333333', bound_at=now(),
  revoked_at=null where slot = 2 and family_id='aaaaaaaa-0000-0000-0000-000000000001';

\echo '== 8. a five-device order'
insert into orders (device_id, aggregator, aggregator_order_id, amount_inr, slots)
  values ('11111111-1111-1111-1111-111111111111','razorpay','ord_1',59900,5);

\echo '== 9. the same aggregator order twice (a replayed webhook)'
insert into orders (device_id, aggregator, aggregator_order_id, amount_inr, slots)
  values ('11111111-1111-1111-1111-111111111111','razorpay','ord_2',39900,3);
insert into orders (device_id, aggregator, aggregator_order_id, amount_inr, slots)
  values ('22222222-2222-2222-2222-222222222222','razorpay','ord_2',39900,3);

\echo '== 10. a voice event with impossible confidence'
insert into voice_events (id, device_id, at, stt_engine, stt_model, transcript, script, intent, confidence, landed_on)
  values (gen_random_uuid(),'11111111-1111-1111-1111-111111111111',now(),'browser-on-device','hi-IN','मुझे करामा जाना है','devanagari','route',1.4,'transport');

\echo '== 11. a real voice event and the failure query (should succeed)'
insert into voice_events (id, device_id, at, stt_engine, stt_model, transcript, script, intent, confidence, landed_on, failure)
  values (gen_random_uuid(),'11111111-1111-1111-1111-111111111111',now(),'browser-on-device','hi-IN','मुझे करामा जाना है','devanagari','route',0.9,'transport',null),
         (gen_random_uuid(),'33333333-3333-3333-3333-333333333333',now(),'typed','none','aaj mausam kaisa rahega','roman','unknown',0,'listen','unknown-intent');

\echo '== final state'
select slot, status, device_id from passes
  where family_id='aaaaaaaa-0000-0000-0000-000000000001' order by slot;
select failure, count(*) from voice_events group by 1 order by 1 nulls last;
