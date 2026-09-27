-- Product intelligence (decision 043): the phone's deterministic log of sessions, active time,
-- network changes and tasks, and the one function that turns it into the owner's metrics and
-- verdicts. The AI agents (decision 043, stage C) read only what `insight_metrics` returns.
--
-- Keyed to the device and a session only: no text a traveller typed, no position, nothing
-- personal. RLS on with no policies, as every table here; `collect` writes, `admin` reads.

create table if not exists app_events (
  id uuid primary key,
  device_id uuid not null references devices (id) on delete cascade,
  session_id uuid not null,
  at timestamptz not null,
  received_at timestamptz not null default now(),
  name text not null check (
    name in ('session_start', 'active', 'net_change', 'task_start', 'task_end', 'offline_answer')
  ),
  pillar text check (pillar in ('food', 'go', 'know', 'bolna', 'docs', 'home')),
  net text not null check (net in ('online', 'offline', 'unknown')),
  task_id uuid,
  task_kind text,
  outcome text check (outcome in ('satisfied', 'failed', 'abandoned')),
  content_id text,
  seconds integer check (seconds >= 0),
  meta jsonb not null default '{}'::jsonb,
  app_version text
);

create index if not exists app_events_at on app_events (at);
create index if not exists app_events_name_at on app_events (name, at);
create index if not exists app_events_task on app_events (task_id);

alter table app_events enable row level security;

comment on table app_events is
  'The phone''s product-intelligence log (decision 043). Raw rows are kept 180 days.';

-- A week of metrics as it stood each night, kept after the raw rows are gone.
create table if not exists metric_snapshots (
  taken_at timestamptz primary key default now(),
  window_days integer not null,
  metrics jsonb not null
);
alter table metric_snapshots enable row level security;

-- A rate with its 95% Wilson interval: the honest way to show 3 of 4 as "somewhere between 30%
-- and 95%" rather than as 75%.
create or replace function wilson(k bigint, n bigint) returns jsonb
language sql immutable as $$
  select case when n = 0 then jsonb_build_object('k', k, 'n', n, 'rate', null, 'low', null, 'high', null)
  else (
    with p as (select k::numeric / n as p, 1.96::numeric as z)
    select jsonb_build_object(
      'k', k, 'n', n,
      'rate', round(p, 3),
      'low', round(greatest(0, (p + z*z/(2*n) - z*sqrt((p*(1-p) + z*z/(4*n))/n)) / (1 + z*z/n)), 3),
      'high', round(least(1, (p + z*z/(2*n) + z*sqrt((p*(1-p) + z*z/(4*n))/n)) / (1 + z*z/n)), 3)
    ) from p
  ) end;
$$;

create or replace function insight_metrics(p_days integer default 7) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => p_days);
  m jsonb;
  n_meaningful bigint; n_off_meaningful bigint; n_devices_meaningful bigint;
  n_tasks bigint; n_sat bigint; n_failed bigint;
  n_off_tasks bigint; n_off_sat bigint; n_on_tasks bigint; n_on_sat bigint;
  n_repeat bigint;
  prevalence jsonb; ar jsonb; ar_off jsonb; ar_on jsonb; repeat_share jsonb; unmet jsonb;
  offline_verdict text; offline_reason text;
  bands jsonb; signal text; signal_reason text;
begin
  create temporary table if not exists _e on commit drop as
    select * from app_events where false;
  truncate _e;
  insert into _e select * from app_events where at >= since;

  -- Every task in the window: its end, or — for a start with no end after an hour (the app was
  -- killed) — abandoned, in the network state it started in.
  create temporary table if not exists _t on commit drop as
    select null::uuid session_id, null::uuid device_id, null::text kind, null::text pillar,
           null::text net, null::text outcome where false;
  truncate _t;
  insert into _t
    select session_id, device_id, task_kind, pillar, net, outcome from _e where name = 'task_end'
    union all
    select s.session_id, s.device_id, s.task_kind, s.pillar, s.net, 'abandoned' from _e s
    where s.name = 'task_start' and s.at < now() - interval '1 hour'
      and not exists (select 1 from app_events x where x.name = 'task_end' and x.task_id = s.task_id);

  select count(distinct session_id), count(distinct device_id) into n_meaningful, n_devices_meaningful from _t;
  select count(distinct session_id) into n_off_meaningful from _t where net = 'offline';
  select count(*), count(*) filter (where outcome = 'satisfied'), count(*) filter (where outcome = 'failed')
    into n_tasks, n_sat, n_failed from _t;
  select count(*), count(*) filter (where outcome = 'satisfied') into n_off_tasks, n_off_sat from _t where net = 'offline';
  select count(*), count(*) filter (where outcome = 'satisfied') into n_on_tasks, n_on_sat from _t where net = 'online';
  select count(*) into n_repeat from (
    select device_id from _e group by device_id
    having count(distinct (at at time zone 'Asia/Dubai')::date) >= 2
       and device_id in (select device_id from _t)
  ) r;

  prevalence := wilson(n_off_meaningful, n_meaningful);
  ar := wilson(n_sat, n_tasks);
  ar_off := wilson(n_off_sat, n_off_tasks);
  ar_on := wilson(n_on_sat, n_on_tasks);
  repeat_share := wilson(n_repeat, n_devices_meaningful);
  unmet := wilson(n_failed, n_tasks);

  -- Offline value: thresholds written down in decision 043 before any data arrived.
  if n_meaningful < 30 then
    offline_verdict := 'insufficient';
    offline_reason := format('%s meaningful sessions; at least 30 are needed before anything is concluded.', n_meaningful);
  elsif (prevalence->>'high')::numeric < 0.05 then
    offline_verdict := 'negligible';
    offline_reason := format('At most %s%% of meaningful sessions happen offline (95%% upper bound).', round((prevalence->>'high')::numeric*100));
  elsif (prevalence->>'low')::numeric >= 0.10 and n_off_tasks >= 20
        and (ar_off->>'low')::numeric >= 0.5
        and (ar_on->>'low' is null or (ar_off->>'high')::numeric >= (ar_on->>'low')::numeric) then
    offline_verdict := 'valuable';
    offline_reason := format('At least %s%% of meaningful sessions are offline, and at least %s%% of offline tasks are answered — no worse than online.',
      round((prevalence->>'low')::numeric*100), round((ar_off->>'low')::numeric*100));
  elsif (prevalence->>'low')::numeric >= 0.05 and n_off_tasks >= 20
        and ((ar_off->>'high')::numeric < 0.5
             or (ar_on->>'low' is not null and (ar_off->>'high')::numeric < (ar_on->>'low')::numeric)) then
    offline_verdict := 'used_not_important';
    offline_reason := 'Offline is used, but offline tasks are answered clearly less often than they need to be, or than online ones.';
  else
    offline_verdict := 'insufficient';
    offline_reason := 'The evidence sits between the thresholds; more sessions are needed to tell.';
  end if;

  -- Product signal: three published components, each banded; the weakest decides.
  bands := jsonb_build_object(
    'answerRate', case when ar->>'low' is null then null
      when (ar->>'low')::numeric >= 0.6 then 'green' when (ar->>'low')::numeric >= 0.4 then 'amber' else 'red' end,
    'repeat', case when repeat_share->>'rate' is null then null
      when (repeat_share->>'rate')::numeric >= 0.4 then 'green' when (repeat_share->>'rate')::numeric >= 0.2 then 'amber' else 'red' end,
    'unmet', case when unmet->>'rate' is null then null
      when (unmet->>'rate')::numeric <= 0.15 then 'green' when (unmet->>'rate')::numeric <= 0.3 then 'amber' else 'red' end
  );
  if n_devices_meaningful < 20 or n_meaningful < 30 then
    signal := 'insufficient';
    signal_reason := format('%s phones and %s meaningful sessions; at least 20 phones and 30 sessions are needed.', n_devices_meaningful, n_meaningful);
  elsif jsonb_path_exists(bands, '$.* ? (@ == "red")') then
    signal := 'red';
    signal_reason := 'At least one component is red.';
  elsif not jsonb_path_exists(bands, '$.* ? (@ != "green")') then
    signal := 'green';
    signal_reason := 'Every component is green.';
  else
    signal := 'amber';
    signal_reason := 'No component is red, and not every one is green.';
  end if;

  m := jsonb_build_object(
    'windowDays', p_days,
    'generatedAt', now(),
    'sessions', (select count(distinct session_id) from _e),
    'devices', (select count(distinct device_id) from _e),
    'meaningfulSessions', n_meaningful,
    'usefulSessions', (select count(distinct session_id) from _t where outcome = 'satisfied'),
    'offlineMeaningfulSessions', n_off_meaningful,
    'offlineUsefulSessions', (select count(distinct session_id) from _t where outcome = 'satisfied' and net = 'offline'),
    'devicesWithOfflineUse', (select count(distinct device_id) from _t where net = 'offline'),
    'repeatDevices', n_repeat,
    'activeSeconds', (select coalesce(jsonb_object_agg(net, s), '{}'::jsonb) from (
        select net, sum(seconds) s from _e where name = 'active' group by net) a),
    'activeSecondsByPillar', (select coalesce(jsonb_object_agg(pillar, s), '{}'::jsonb) from (
        select coalesce(pillar, 'home') pillar, sum(seconds) s from _e where name = 'active' group by 1) a),
    'sessionsWithOfflineActiveTime', (select count(distinct session_id) from _e where name = 'active' and net = 'offline'),
    'transitions', jsonb_build_object(
        'onlineToOffline', (select count(*) from _e where name = 'net_change' and meta->>'from' = 'online' and meta->>'to' = 'offline'),
        'offlineToOnline', (select count(*) from _e where name = 'net_change' and meta->>'from' = 'offline' and meta->>'to' = 'online')),
    'tasks', jsonb_build_object(
        'total', n_tasks, 'satisfied', n_sat, 'failed', n_failed,
        'abandoned', (select count(*) from _t where outcome = 'abandoned'),
        'offline', n_off_tasks, 'offlineSatisfied', n_off_sat, 'online', n_on_tasks, 'onlineSatisfied', n_on_sat),
    'tasksByKind', (select coalesce(jsonb_object_agg(kind, j), '{}'::jsonb) from (
        select kind, jsonb_build_object('total', count(*),
          'satisfied', count(*) filter (where outcome = 'satisfied'),
          'failed', count(*) filter (where outcome = 'failed'),
          'abandoned', count(*) filter (where outcome = 'abandoned'),
          'offline', count(*) filter (where net = 'offline')) j
        from _t group by kind) k),
    'tasksByPillar', (select coalesce(jsonb_object_agg(pillar, n), '{}'::jsonb) from (
        select coalesce(pillar, 'home') pillar, count(*) n from _t group by 1) p),
    'offlineAnswers', (select coalesce(jsonb_object_agg(a, n), '{}'::jsonb) from (
        select meta->>'answer' a, count(*) n from _e where name = 'offline_answer' group by 1) o),
    'answerRate', ar,
    'answerRateOffline', ar_off,
    'answerRateOnline', ar_on,
    'offlinePrevalence', prevalence,
    'repeatShare', repeat_share,
    'unmetRate', unmet,
    'unmetAsks', (select coalesce(jsonb_agg(jsonb_build_object('text', text, 'times', n, 'phones', phones, 'on', landed) order by n desc), '[]'::jsonb)
        from (select lower(trim(transcript)) text, count(*) n, count(distinct device_id) phones, min(landed_on) landed
              from voice_events where failure in ('nothing-in-pack', 'unresolved-place') and trim(transcript) <> ''
                and at >= since group by 1 order by count(*) desc limit 20) u),
    'offlineValue', jsonb_build_object('verdict', offline_verdict, 'reason', offline_reason),
    'productSignal', jsonb_build_object('verdict', signal, 'reason', signal_reason, 'components', bands)
  );
  return m;
end;
$$;

revoke all on function insight_metrics(integer) from public, anon, authenticated;
grant execute on function insight_metrics(integer) to service_role;

-- The two nightly jobs: raw rows older than 180 days go (the owner, 27 September: "180 days is
-- good to start with"), and a week of metrics is kept as a snapshot that outlives them.
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname in ('app-events-retention', 'metric-snapshot');
select cron.schedule('app-events-retention', '17 23 * * *',
  $$delete from public.app_events where at < now() - interval '180 days'$$);
select cron.schedule('metric-snapshot', '23 20 * * *',
  $$insert into public.metric_snapshots (window_days, metrics) values (7, public.insight_metrics(7))$$);
