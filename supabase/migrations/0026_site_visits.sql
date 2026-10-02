-- The website's own visit counter (the owner, 2 October; decision 053). Until now the only way to
-- see what a reader did on saafarsaathi.in was to group the host's request log by browser and
-- guess: a reader who stayed two minutes at the top looked like one second, and a press of
-- "हिंदी में सुनिए" — which happens wholly on the reader's phone — was never seen at all.
--
-- One row per visit, written and rewritten by the `visit` function as the page reports it: how
-- long the page was actually on the screen, how far down it was read, which sections reached the
-- screen, and what was pressed. A visit is a random id that lives only as long as the browser
-- tab: no cookie, no IP, no name, nothing that joins to a traveller's device. Kept 180 days, as
-- the app's own events are.

create table site_visits (
  visit_id text primary key check (visit_id ~ '^[a-z0-9]{12,40}$'),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- How the reader came: the ad's utm tags joined the way the app joins them (`arrivalSource`),
  -- so 'meta-khaana1-gujarat-site' here is the same name as the phones it sent to the app.
  tag text not null check (tag ~ '^[a-z0-9-]{1,40}$'),
  device text not null check (device in ('phone', 'tablet', 'laptop')),
  lang text not null check (lang in ('hi', 'en')),
  seconds_visible integer not null default 0 check (seconds_visible between 0 and 3600),
  max_scroll smallint not null default 0 check (max_scroll between 0 and 100),
  reached text[] not null default '{}',
  taps text[] not null default '{}'
);

comment on table site_visits is
  'saafarsaathi.in visits (decision 053): a per-tab random id, no IP, no cookie. Kept 180 days.';

alter table site_visits enable row level security;
-- No policies: only the `visit` function (service role) writes, only `site_metrics()` reads.

create index site_visits_started_at on site_visits (started_at);

-- A visit reports itself more than once (on arrival, each time the tab is hidden, on a tap that
-- leaves the page). Each report is the whole visit so far, so a later one can only add: the
-- greatest time and scroll win, and the sections and taps are the union of every report.
create or replace function record_site_visit(
  p_visit_id text, p_tag text, p_device text, p_lang text,
  p_seconds integer, p_scroll integer, p_reached text[], p_taps text[]
) returns void
language sql
security definer
set search_path = public
as $$
  insert into site_visits (visit_id, tag, device, lang, seconds_visible, max_scroll, reached, taps)
  values (p_visit_id, p_tag, p_device, p_lang, p_seconds, p_scroll, p_reached, p_taps)
  on conflict (visit_id) do update set
    updated_at = now(),
    lang = excluded.lang,
    seconds_visible = greatest(site_visits.seconds_visible, excluded.seconds_visible),
    max_scroll = greatest(site_visits.max_scroll, excluded.max_scroll),
    reached = array(select distinct unnest(site_visits.reached || excluded.reached) order by 1),
    taps = array(select distinct unnest(site_visits.taps || excluded.taps) order by 1);
$$;

revoke all on function record_site_visit(text, text, text, text, integer, integer, text[], text[])
  from public, anon, authenticated;
grant execute on function record_site_visit(text, text, text, text, integer, integer, text[], text[])
  to service_role;

-- Each way in, and what its readers did: counted per visit, over the last p_days days.
create or replace function site_metrics(p_days integer default 28) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
    from site_visits
    where started_at > now() - make_interval(days => p_days)
    group by tag
  ) t;
$$;

revoke all on function site_metrics(integer) from public, anon, authenticated;
grant execute on function site_metrics(integer) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'site-visits-retention';
select cron.schedule('site-visits-retention', '19 23 * * *',
  $$delete from public.site_visits where started_at < now() - interval '180 days'$$);
