-- How Saathi is used, not only where it failed (the owner, 25 September: "a tool for marketing,
-- not for selling" — the measure of success is travellers helped, and the proof is use).
--
-- Usage rides the same log and the same `collect` door as the learning loop, so nothing new sits
-- between a phone and the server. A usage row is `stt_engine = 'usage'`, `intent = 'use'`, and
-- `landed_on` says what happened: `opened` (once per phone per Dubai day), `arrived` (the first
-- open, with how the phone came to us in `transcript`), `menu`, `steps`, `map`, `topic`, `place`.
-- Keyed to the device id only, as every row here is; no name, no number, no IP (decision 011).
--
-- `online` is whether the phone had a signal at that moment. It is the one number that proves the
-- product's one promise: the share of use that happened with no network at all. Null on rows
-- recorded before this column existed.

alter table voice_events add column if not exists online boolean;

comment on column voice_events.online is
  'Whether the phone had a signal when the row was recorded. The offline share of use is the proof of the product''s promise.';
