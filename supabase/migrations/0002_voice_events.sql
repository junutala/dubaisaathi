-- The learning loop (CLAUDE.md, "Learning loop"). The commands travellers gave us that we could
-- not fulfil — which is the data that makes the parser less wrong.
--
-- Queued on the device first and synced when there is a connection, so nothing here is ever in
-- the path of a traveller trying to get to Karama.

create type voice_failure as enum (
  -- The speech never arrived. These four decide the PWA-vs-native gate.
  'no-permission', 'no-speech', 'no-engine', 'stt-error',
  -- The speech arrived and the parser could not use it. These retrain the packs in data/.
  'unknown-intent', 'low-confidence', 'clarifier-shown',
  'unresolved-place', 'unresolved-dish', 'unresolved-document',
  'backed-out', 'retried'
);

create type transcript_script as enum ('devanagari', 'roman', 'mixed');

create table voice_events (
  -- Generated on the device, so a retried sync cannot duplicate a row.
  id uuid primary key,
  device_id uuid not null references devices (id) on delete cascade,
  -- When the traveller spoke, from the phone's clock. received_at is ours, and the two can differ
  -- by days: a phone can be offline for a whole trip.
  at timestamptz not null,
  received_at timestamptz not null default now(),
  -- Which engine and model produced the transcript, so a regression is visible rather than
  -- argued about. 'typed' when they used the keyboard.
  stt_engine text not null,
  stt_model text not null,
  -- What they said. No name, no location, no contact details — just the sentence, which is the
  -- only thing that can teach the parser anything.
  transcript text not null,
  -- What the engine heard, when the traveller corrected it before pressing send. The transcript is
  -- then what they meant; this is what was recognised. A labelled pair from the one person who
  -- knows the right answer, and the strongest signal in this table.
  corrected_from text,
  -- What the offline model heard with nothing constraining its vocabulary, when it differs from
  -- the transcript. The transcript comes from a recogniser biased toward the words in
  -- data/intents/, which is how it hears place names at all; this is the unbiased reading, and
  -- the only place a word nobody has curated yet can turn up. Null for every other engine.
  unconstrained_transcript text,
  script transcript_script not null,
  -- What the parser made of it, and how sure it was.
  intent text not null,
  confidence real not null check (confidence between 0 and 1),
  landed_on text not null,
  failure voice_failure,
  clarifier_choice text,
  -- A short clip, kept only for failures, only with a one-time consent line, deleted from the
  -- device after sync. Storage path only; no audio in this table.
  audio_clip_path text
);

-- The two queries content-tools actually runs: what is failing, and what is failing lately.
create index voice_events_failures on voice_events (failure, at desc) where failure is not null;
create index voice_events_device on voice_events (device_id, at desc);

comment on table voice_events is
  'The learning loop. Keyed to the device only; the output is new aliases and keywords in data/.';

alter table voice_events enable row level security;
