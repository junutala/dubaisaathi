-- 0023 · Data use, as the traveller accepts it on the first screen (decision 045).
--
-- The owner, 28 September: what is typed or said in खाना, जाना, जानना and बोलना may be kept for
-- training, tied to the phone's random id and never to a name or a number. So बोलना's sentences
-- and the boards it reads carry the device id like the question log does, and the one place a
-- phone id could be joined to a person — the payer details in an order — is emptied after 30 days.

alter table board_readings add column if not exists device_id uuid;

create table if not exists bolna_sentences (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  device_id uuid,
  -- What went in (the sentence as the traveller left it) and what came out, in Arabic.
  text text not null,
  arabic text not null,
  source_lang text
);
create index if not exists bolna_sentences_at on bolna_sentences (at desc);
-- No policies: only the `translate` function, with the service role, writes here.
alter table bolna_sentences enable row level security;

-- The aggregator's record of who paid (a UPI id, masked card digits) is kept 30 days for a
-- disputed payment and then emptied, so a phone id is never joinable to a person after that.
select cron.schedule('orders-payer-purge', '41 22 * * *', $$
  update public.orders set webhook_payload = null
  where webhook_payload is not null and coalesce(paid_at, created_at) < now() - interval '30 days'
$$);
