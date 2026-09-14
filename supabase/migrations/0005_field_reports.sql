-- Where the collectors' app puts a visit.
--
-- Two people fill this: the owner and his driver (14 September). So there is no human approval
-- queue — a report publishes into the next pack by default, and only the machine checks below
-- hold one back. The gate was never really about fraud; it is about error, and the one error
-- that can hurt somebody is a hard dietary "yes" ticked off a signboard rather than asked of a
-- cook. That one waits for a person.

create type report_status as enum ('queued', 'uploaded', 'flagged', 'approved', 'rejected');

create table field_reports (
  -- Made on the phone, so a retried upload cannot duplicate a visit.
  id uuid primary key,
  -- A name, not an account: there is no login here either, and "who said this kitchen does a
  -- Jain sambar" has to have an answer six months from now.
  collector text not null,
  captured_at timestamptz not null,
  received_at timestamptz not null default now(),
  kind text not null default 'restaurant',
  lat double precision not null,
  lng double precision not null,
  name text not null,
  name_hi text,
  kitchen text check (kitchen in ('pure-veg', 'mixed', 'non-veg')),
  -- The five questions, as asked. 'on-request' is a real answer and the commonest true one.
  dietary jsonb not null default '{}'::jsonb,
  -- Named dishes the kitchen said it will make. Worth more than any tick box.
  confirmed_dishes jsonb,
  -- Structured, because "11am to late" answers nothing at 2am. A close earlier than the open
  -- means past midnight, which in Dubai is the normal case rather than the odd one.
  hours jsonb,
  hours_confirmed_at timestamptz,
  delivers text check (delivers in ('yes', 'no')),
  delivery_phone text,
  price_for_one_aed integer check (price_for_one_aed > 0),
  spoke_to text,
  notes text,
  status report_status not null default 'uploaded',
  -- What the machine checks found, so a person only reads what needs judgement.
  flags text[] not null default '{}',
  review_note text
);

create index field_reports_status on field_reports (status, captured_at desc);
-- "What is near this?" is the duplicate check, and it runs on every upload.
create index field_reports_where on field_reports (lat, lng);

create table field_photos (
  id uuid primary key,
  report_id uuid not null references field_reports (id) on delete cascade,
  kind text not null check (kind in ('front', 'menu')),
  -- The bytes. A front photo is the proof the visit happened; the menu is the content.
  image bytea not null,
  content_type text not null default 'image/jpeg'
);

create index field_photos_report on field_photos (report_id);

alter table field_reports enable row level security;
alter table field_photos enable row level security;

comment on table field_reports is
  'One visit to one outlet. Published by default; only a flag holds it back.';
