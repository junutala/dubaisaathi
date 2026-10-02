-- Our own phones are not travellers (the owner, 2 October: "most important is to leave my device
-- out. Otherwise, the numbers will be inflated and we may draw wrong conclusions"; decision 054).
--
-- A phone is ours once it has sent one `staff` usage row: the app sends it when opened with
-- `?staff=saathi`. From then on every count /admin and the insight agents read leaves that phone
-- out, its past included. Nothing is deleted: the rows stay, and the "counted" views below are
-- what the metric functions read instead of the tables.

create view staff_device_ids with (security_invoker = true) as
  select distinct device_id from voice_events
  where stt_engine = 'usage' and landed_on = 'staff';

create view voice_events_counted with (security_invoker = true) as
  select * from voice_events v
  where not exists (select 1 from staff_device_ids s where s.device_id = v.device_id);

create view app_events_counted with (security_invoker = true) as
  select * from app_events e
  where not exists (select 1 from staff_device_ids s where s.device_id = e.device_id);

create view orders_counted with (security_invoker = true) as
  select * from orders o
  where not exists (select 1 from staff_device_ids s where s.device_id = o.device_id);

create view passes_counted with (security_invoker = true) as
  select * from passes p
  where p.device_id is null
     or not exists (select 1 from staff_device_ids s where s.device_id = p.device_id);

create view devices_counted with (security_invoker = true) as
  select * from devices d
  where not exists (select 1 from staff_device_ids s where s.device_id = d.id);

create view coupon_redemptions_counted with (security_invoker = true) as
  select * from coupon_redemptions c
  where not exists (select 1 from staff_device_ids s where s.device_id = c.device_id);

-- The API never sees these: they read tables that hold the question log and the money.
revoke all on staff_device_ids, voice_events_counted, app_events_counted, orders_counted,
  passes_counted, devices_counted, coupon_redemptions_counted from public, anon, authenticated;

-- The three metric functions read the counted views in place of the tables. Rewritten from their
-- own current text, so what each function computes is unchanged — only whom it counts.
do $$
declare
  fn text;
  def text;
begin
  foreach fn in array array['admin_metrics', 'insight_metrics', 'acquisition_metrics'] loop
    select pg_get_functiondef(p.oid) into def
    from pg_proc p
    where p.proname = fn and p.pronamespace = 'public'::regnamespace;
    def := regexp_replace(
      def,
      '\m(from|join)(\s+)(public\.)?(voice_events|app_events|orders|passes|devices|coupon_redemptions)\M',
      '\1\2\4_counted',
      'gi'
    );
    execute def;
  end loop;
end
$$;
