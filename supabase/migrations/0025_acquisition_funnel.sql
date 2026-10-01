-- What each way in brought (the owner, 1 October, before the first Meta campaign: "we see
-- conversion and then decide"). A phone's first open already records how it came to us — `?via=`
-- on the link, or the ad's `utm_` tags — as one `arrived` row in the question log (0016). This
-- follows each of those phones into what it did after: searched खाना, used anything with no
-- signal, came back on another Dubai day, began paying, paid.
--
-- Joined on the device's random id only, as everything here; no IP, no position, no name. The
-- counts are phones, not events, so one keen phone cannot pass for a town.

create or replace function acquisition_metrics() returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with arrived as (
    -- One arrival per phone: the first one, should a phone ever send two.
    select distinct on (device_id) device_id, transcript as via
    from voice_events
    where stt_engine = 'usage' and landed_on = 'arrived'
    order by device_id, at
  ),
  food as (
    select distinct device_id from app_events where name = 'task_start' and pillar = 'food'
  ),
  offline as (
    select distinct device_id from app_events where name = 'task_end' and net = 'offline'
  ),
  returned as (
    select device_id from voice_events
    where stt_engine = 'usage' and landed_on = 'opened'
    group by device_id having count(distinct transcript) >= 2
  ),
  began as (
    select distinct device_id from orders
  ),
  paid as (
    select distinct device_id from orders where status = 'paid'
  )
  select coalesce(jsonb_agg(row_to_json(t) order by t.phones desc, t.via), '[]'::jsonb)
  from (
    select a.via,
      count(*) as phones,
      count(f.device_id) as food,
      count(o.device_id) as offline,
      count(r.device_id) as returned,
      count(b.device_id) as began,
      count(p.device_id) as paid
    from arrived a
    left join food f using (device_id)
    left join offline o using (device_id)
    left join returned r using (device_id)
    left join began b using (device_id)
    left join paid p using (device_id)
    group by a.via
  ) t;
$$;

revoke all on function acquisition_metrics() from public, anon, authenticated;
grant execute on function acquisition_metrics() to service_role;
