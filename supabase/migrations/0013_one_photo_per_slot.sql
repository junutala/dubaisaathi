-- 0013 — a photograph has a place, so sending it twice does not store it twice.
--
-- The queue re-sends a whole report whenever it is not yet marked uploaded: after a lost
-- response, and now after a pin is completed into a full outlet on the same phone (decision 029,
-- the one flow). Photographs rode along with an id minted fresh on every send, so each retry
-- wrote another copy of the same picture — the report was idempotent and its photographs were
-- not.
--
-- The slot is what identifies a photograph: this report's front, or its third menu page. The id
-- stays the primary key and now has a default, so the function never mints one and an upsert on
-- the slot updates the row it already has.
alter table field_photos alter column id set default gen_random_uuid();

alter table field_photos add column if not exists ord smallint not null default 0;

create unique index if not exists field_photos_one_per_slot
  on field_photos (report_id, kind, ord);

comment on column field_photos.ord is
  'Which photograph of its kind this is: front 0, menu 0,1,2… One row per slot, however many times it is sent.';
