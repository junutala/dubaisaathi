-- contact_messages: the one table in this database that holds a person's name and number.
--
-- Everything else here is deliberately anonymous. Decision 011 says no account, no contact
-- details and no IP address, and decision 001 says the device id is the whole identity — those
-- rules are about what the app records ABOUT a traveller while they use it, silently, without
-- being asked.
--
-- This is the opposite of that. Somebody typed their name into a form on saafarsaathi.in,
-- picked +91 or +971, wrote a sentence and pressed send, because they want to be rung back: a
-- traveller with a question, a tour operator who wants codes for their group, a cafeteria owner
-- who wants their kitchen in खाना. Refusing to store what they just handed over would not be
-- privacy, it would be losing the message.
--
-- So the separation is kept where it matters instead. Nothing in the traveller's app writes
-- here; no device id is recorded against a message; and nothing here joins to `devices`,
-- `passes` or `voice_events`. A person who writes in is not thereby identified in the app.
-- No IP address column here either — same rule as everywhere else in this schema.
--
-- Read by the owner (through Claude, or in the dashboard) until the admin screen exists; the
-- plan is an inbox in that screen once tour operators arrive in numbers worth a screen.

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),

  -- Who is writing, picked on the form. This is the whole point of the field: an operator's
  -- enquiry and a traveller's question want different answers on different days, and sorting
  -- them by hand out of one pile is work nobody will keep doing.
  who text not null check (who in ('traveller', 'operator', 'outlet')),

  name text not null check (char_length(name) between 1 and 80),

  -- The dialling code as picked, and the number as digits only. Two columns rather than one
  -- string, because "+971 50 123 4567" and "0501234567" are the same person and only one of
  -- them can be rung from a contacts list.
  country text not null check (country in ('IN', 'AE')),
  phone text not null check (phone ~ '^[0-9]{6,12}$'),

  message text not null check (char_length(message) between 1 and 2000),

  -- Which catalogue the page was in when they wrote, so the reply goes out in the language they
  -- chose to read rather than the one their name looks like.
  locale text not null check (locale in ('hi', 'en')),

  -- Answered, and what was said. Set by hand for now; the admin screen will set it.
  handled_at timestamptz,
  handled_note text
);

comment on table contact_messages is
  'Messages from the website contact form. Name and number are volunteered, never collected. No device id, no IP, no join to the traveller tables.';

-- The one question asked of this table every time: what has come in that nobody has answered.
create index contact_messages_unanswered on contact_messages (at desc) where handled_at is null;

-- The guard against a script filling this table: at most a few messages from one number a day.
-- The function counts with this before it inserts.
create index contact_messages_by_phone on contact_messages (country, phone, at desc);

alter table contact_messages enable row level security;
-- No policies, like every other table here: unreachable except through an edge function holding
-- the service role. The form is a public endpoint; the table is not.

-- --------------------------------------------------------------------------------------------
-- contact_inbox — what the owner actually reads
-- --------------------------------------------------------------------------------------------

-- Unanswered first, newest first, with the number already dialable. `security_invoker` so this
-- view can never be a way around the RLS above.
create view contact_inbox with (security_invoker = true) as
select
  id,
  at,
  who,
  name,
  case country when 'IN' then '+91 ' else '+971 ' end || phone as ring,
  locale,
  message,
  handled_at,
  handled_note
from contact_messages
order by handled_at nulls first, at desc;

comment on view contact_inbox is 'The contact form inbox: unanswered first, number ready to dial.';
