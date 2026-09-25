-- What admin.saafarsaathi.in shows the owner (decision 040): how Saathi is used, what travellers
-- asked for and did not get, how collection stands, and the money and the messages. One function,
-- returning one JSON document of totals and short lists. It is callable only by the service role,
-- which only the `admin` edge function holds, and only after the owner's passphrase.
--
-- Totals, not people: no device id leaves this function, and nothing here places anyone anywhere.

create or replace function admin_metrics() returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with usage as (
    select device_id, landed_on, transcript, online, at
    from voice_events
    where stt_engine = 'usage'
  ),
  opened as (
    select device_id, transcript as day from usage where landed_on = 'opened'
  ),
  days_per_phone as (
    select device_id, count(distinct day) as days from opened group by device_id
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'success', jsonb_build_object(
      'phones', (select count(*) from days_per_phone),
      'phonesThreePlusDays', (select count(*) from days_per_phone where days >= 3),
      'phoneDays', (select coalesce(sum(days), 0) from days_per_phone),
      'devicesEverSeen', (select count(*) from devices),
      'offlineShare', (
        select round(avg(case when online then 0 else 1 end)::numeric, 3)
        from voice_events where online is not null
      ),
      'rowsWithSignalKnown', (select count(*) from voice_events where online is not null),
      'opened', (
        select coalesce(jsonb_object_agg(landed_on, n), '{}'::jsonb) from (
          select landed_on, count(*) as n from usage
          where landed_on in ('menu', 'steps', 'map', 'place', 'topic')
          group by landed_on
        ) t
      ),
      'arrivedVia', (
        select coalesce(jsonb_object_agg(via, n), '{}'::jsonb) from (
          select transcript as via, count(*) as n from usage where landed_on = 'arrived'
          group by transcript
        ) t
      ),
      'searches', (select count(*) from voice_events where stt_engine <> 'usage'),
      'byDay', (
        select coalesce(jsonb_agg(jsonb_build_object('day', day, 'phones', n) order by day), '[]'::jsonb)
        from (
          select day, count(distinct device_id) as n from opened
          where day >= to_char((now() at time zone 'Asia/Dubai') - interval '13 days', 'YYYY-MM-DD')
          group by day
        ) t
      )
    ),
    'asks', jsonb_build_object(
      'notInPack', (
        select coalesce(jsonb_agg(jsonb_build_object('text', text, 'times', n, 'phones', phones, 'on', landed) order by n desc), '[]'::jsonb)
        from (
          select lower(trim(transcript)) as text, count(*) as n, count(distinct device_id) as phones,
                 min(landed_on) as landed
          from voice_events
          where failure in ('nothing-in-pack', 'unresolved-place') and trim(transcript) <> ''
            and at > now() - interval '30 days'
          group by lower(trim(transcript))
          order by count(*) desc
          limit 40
        ) t
      )
    ),
    'collection', jsonb_build_object(
      'pinsByDay', (
        select coalesce(jsonb_agg(jsonb_build_object('day', day, 'pins', n) order by day desc), '[]'::jsonb)
        from (
          select to_char(captured_at at time zone 'Asia/Dubai', 'YYYY-MM-DD') as day, count(*) as n
          from field_reports group by 1
        ) t
      ),
      'forms', (
        select coalesce(jsonb_agg(row order by serial desc), '[]'::jsonb)
        from (
          select r.form_serial as serial,
                 jsonb_build_object(
                   'form', r.form_serial,
                   'at', to_char(r.captured_at at time zone 'Asia/Dubai', 'DD Mon HH24:MI'),
                   'name', nullif(r.name, ''),
                   'status', r.status,
                   'pages', (select count(*) from field_photos p where p.report_id = r.id and p.kind = 'menu'),
                   'notes', r.notes
                 ) as row
          from field_reports r
          where r.form_serial is not null
          order by r.form_serial desc
          limit 300
        ) t
      )
    ),
    'money', jsonb_build_object(
      'ordersByStatus', (
        select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
          select status::text, count(*) as n from orders group by status
        ) t
      ),
      'paidInr', (select coalesce(sum(amount_inr), 0) from orders where paid_at is not null),
      'passes', (select count(*) from passes),
      'couponRedemptions', (select count(*) from coupon_redemptions)
    ),
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object('at', to_char(at at time zone 'Asia/Dubai', 'DD Mon HH24:MI'), 'name', name, 'ring', ring, 'message', message, 'handled', handled_at is not null) order by at desc), '[]'::jsonb)
      from (select * from contact_inbox order by at desc limit 50) t
    )
  );
$$;

revoke all on function admin_metrics() from public, anon, authenticated;
grant execute on function admin_metrics() to service_role;
