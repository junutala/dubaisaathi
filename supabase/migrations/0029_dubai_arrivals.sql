-- Dubai arrivals on /admin (the owner, 2 October: "add the Dubai arrivals to admin"; decision
-- 056). A traveller can pay only once in Dubai, so the phones that got there are the real count of
-- who could pay. Two ways of knowing, side by side:
--
--   inDubai / in_dubai   phones that opened Saathi while the phone said Dubai — its fix, or its
--                        clock set to Dubai's time zone. Every past open carries this, so it
--                        reaches back to the first day. A Dubai resident counts here too.
--   landed               phones whose arrival the pass confirmed (repeated readings inside Dubai,
--                        the moment the trial starts) and that said so: a `landed` usage row,
--                        sent once by the app from this release on.
--
-- range_metrics() is redefined with both; everything else in it is as 0028 left it.

create or replace function range_metrics(p_from date, p_to date) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select (p_from::timestamp at time zone 'Asia/Kolkata') as lo,
           ((p_to + 1)::timestamp at time zone 'Asia/Kolkata') as hi
  ),
  arrived as (
    select distinct on (device_id) device_id, transcript as via, at
    from voice_events_counted
    where stt_engine = 'usage' and landed_on = 'arrived'
    order by device_id, at
  ),
  arrived_in as (
    select a.* from arrived a, bounds b where a.at >= b.lo and a.at < b.hi
  ),
  food as (
    select distinct device_id from app_events_counted where name = 'task_start' and pillar = 'food'
  ),
  offline_use as (
    select distinct device_id from app_events_counted where name = 'task_end' and net = 'offline'
  ),
  returned as (
    select device_id from voice_events_counted
    where stt_engine = 'usage' and landed_on = 'opened'
    group by device_id having count(distinct transcript) >= 2
  ),
  began as (select distinct device_id from orders_counted),
  paid as (select distinct device_id from orders_counted where status = 'paid'),
  in_dubai as (
    select distinct device_id from voice_events_counted
    where stt_engine = 'usage' and landed_on = 'opened' and region = 'dubai'
  ),
  landed as (
    select distinct device_id from voice_events_counted
    where stt_engine = 'usage' and landed_on = 'landed'
  ),
  in_span as (
    select v.* from voice_events_counted v, bounds b where v.at >= b.lo and v.at < b.hi
  ),
  visits as (
    select s.* from site_visits s, bounds b where s.started_at >= b.lo and s.started_at < b.hi
  ),
  days as (
    select d::date as day from generate_series(p_from, p_to, interval '1 day') d
  )
  select jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'firstOpens', (select count(*) from arrived_in),
    'fromAds', (select count(*) from arrived_in where via like 'meta-%'),
    'activePhones', (
      select count(distinct device_id) from in_span
      where stt_engine = 'usage' and landed_on = 'opened'
    ),
    'questions', (select count(*) from in_span where stt_engine <> 'usage'),
    'inDubai', (
      select count(distinct device_id) from in_span
      where stt_engine = 'usage' and landed_on = 'opened' and region = 'dubai'
    ),
    'landed', (
      select count(distinct device_id) from in_span
      where stt_engine = 'usage' and landed_on = 'landed'
    ),
    'offlineShare', (
      select round(avg(case when online then 0 else 1 end)::numeric, 3)
      from in_span where online is not null
    ),
    'siteVisits', (select count(*) from visits),
    'siteStayed', (select count(*) from visits where seconds_visible >= 10),
    'siteToApp', (select count(*) from visits where 'open-app' = any (taps)),
    'via', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.phones desc, t.via), '[]'::jsonb)
      from (
        select a.via,
          count(*) as phones,
          count(f.device_id) as food,
          count(o.device_id) as offline,
          count(r.device_id) as returned,
          count(bg.device_id) as began,
          count(p.device_id) as paid,
          count(d.device_id) as in_dubai,
          count(l.device_id) as landed
        from arrived_in a
        left join food f using (device_id)
        left join offline_use o using (device_id)
        left join returned r using (device_id)
        left join began bg using (device_id)
        left join paid p using (device_id)
        left join in_dubai d using (device_id)
        left join landed l using (device_id)
        group by a.via
      ) t
    ),
    'site', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.visits desc, t.tag), '[]'::jsonb)
      from (
        select tag,
          count(*) as visits,
          count(*) filter (where device = 'phone') as phones,
          percentile_disc(0.5) within group (order by seconds_visible) as median_seconds,
          count(*) filter (where seconds_visible >= 10) as stayed_10s,
          count(*) filter (where max_scroll >= 25) as scrolled,
          count(*) filter (where 'bolna' = any (reached)) as reached_bolna,
          count(*) filter (where 'hear-board' = any (taps)) as heard_board,
          count(*) filter (where 'open-app' = any (taps)) as opened_app,
          count(*) filter (where 'whatsapp' = any (taps)) as whatsapp
        from visits
        group by tag
      ) t
    ),
    'asks', (
      select coalesce(jsonb_agg(jsonb_build_object('text', text, 'times', n, 'phones', phones, 'on', landed) order by n desc), '[]'::jsonb)
      from (
        select lower(trim(transcript)) as text, count(*) as n, count(distinct device_id) as phones,
               min(landed_on) as landed
        from in_span
        where failure in ('nothing-in-pack', 'unresolved-place') and trim(transcript) <> ''
        group by lower(trim(transcript))
        order by count(*) desc
        limit 40
      ) t
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'firstOpens', (select count(*) from arrived_in a
                       where (a.at at time zone 'Asia/Kolkata')::date = d.day),
        'fromAds', (select count(*) from arrived_in a
                    where (a.at at time zone 'Asia/Kolkata')::date = d.day and a.via like 'meta-%'),
        'siteVisits', (select count(*) from visits s
                       where (s.started_at at time zone 'Asia/Kolkata')::date = d.day)
      ) order by d.day), '[]'::jsonb)
      from days d
    )
  );
$$;

revoke all on function range_metrics(date, date) from public, anon, authenticated;
grant execute on function range_metrics(date, date) to service_role;
