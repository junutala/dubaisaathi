-- 0022 · What Arabic boards said, and what we told the traveller in Hindi (बोलना's board reader).
--
-- The owner, 28 September: keep the text, not the photographs — "the text tells us a lot". A row
-- is the Arabic read off a board and the Hindi given back. No photograph is kept anywhere, and
-- there is no device id here: a board is public, and the row is tied to no one.

create table if not exists board_readings (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  arabic text not null,
  hindi text not null,
  model text
);
create index if not exists board_readings_at on board_readings (at desc);
-- No policies: only the `readboard` function, with the service role, writes here.
alter table board_readings enable row level security;

-- A photograph with no Arabic we could read goes into the question log, so we see which boards
-- defeat the reader.
alter type voice_failure add value if not exists 'nothing-read';
