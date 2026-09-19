-- 0014 — content stops being code (decision 030).
--
-- Every pack a traveller reads — the outlets, the attractions, the RTA network — is compiled
-- into the app bundle today, so a new kitchen in Meena Bazaar or a timetable change at the RTA
-- is a code change, a release and a service-worker handover. The owner, 18 September: "I am now
-- more worried about the dataupload that we have to carry whenever we have new outlets and/or
-- dubai introduces new routes or update their timetable."
--
-- So a pack lives here and is published by writing a row. The phone asks what the current
-- versions are, downloads only what changed, and stores it in IndexedDB — where no deployment
-- of ours can evict it.
create table content_packs (
  -- 'restaurants', 'transport', 'attractions': the pack's name in the app, not a uuid. There is
  -- exactly one current row per pack and it is replaced in place.
  id text primary key,
  -- Monotonic, and the only thing a phone compares. It never goes backwards: a phone holding 7
  -- ignores a 6 that somebody published by mistake.
  version integer not null check (version > 0),
  published_at timestamptz not null default now(),
  -- What the phone is about to download, so it can say so before spending somebody's data.
  bytes integer not null check (bytes > 0),
  -- Of the body, so a half-written row is caught on the phone rather than parsed.
  sha text not null,
  body jsonb not null
);

comment on table content_packs is
  'One row per pack, replaced in place. Published by hand; phones poll the versions.';

-- Nobody reaches this table with the publishable key: the `packs` function reads it with the
-- service role and hands out exactly what a traveller needs.
alter table content_packs enable row level security;
