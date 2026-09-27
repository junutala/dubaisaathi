-- 0021 · The three agents' reports (decision 043, stage C).
--
-- The Needs agent, the Usage agent and the Product Strategist read `insight_metrics()` and write
-- about it; they never make a figure. Each run is one row here, written by the `insights` edge
-- function: 'running' when it starts, then 'done' with the three reports or 'failed' with why.
-- Runs weekly from pg_cron and on demand from /admin.

create extension if not exists pg_net;

create table if not exists insight_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null check (trigger in ('weekly', 'manual')),
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  model text,
  metrics jsonb,
  needs jsonb,
  usage jsonb,
  strategy jsonb,
  tokens jsonb,
  error text
);
create index if not exists insight_reports_created on insight_reports (created_at desc);
-- No policies: only the service role, through `insights` and `admin`, reads or writes this.
alter table insight_reports enable row level security;

-- The weekly caller's key, kept in the vault and never in code. `insights` asks this function
-- whether a key matches; the key itself never leaves the database.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'insights_key') then
    perform vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'insights_key',
      'The weekly pg_cron call to the insights function (decision 043)');
  end if;
end $$;

create or replace function insights_key_ok(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'insights_key' and decrypted_secret = p_key and length(p_key) > 0
  );
$$;
revoke all on function insights_key_ok(text) from public, anon, authenticated;
grant execute on function insights_key_ok(text) to service_role;

-- Monday 03:07 UTC — 08:37 in India, 07:07 in Dubai: the week's reading is there by breakfast.
select cron.schedule('insights-weekly', '7 3 * * 1', $$
  select net.http_post(
    url := 'https://pixlnjmpksmfqheotinp.supabase.co/functions/v1/insights',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-insights-key', (select decrypted_secret from vault.decrypted_secrets where name = 'insights_key')
    ),
    body := '{"trigger":"weekly"}'::jsonb,
    timeout_milliseconds := 10000
  )
$$);
