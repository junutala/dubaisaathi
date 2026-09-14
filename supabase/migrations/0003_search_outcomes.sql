-- Two kinds of drift between this schema and what the app actually records, both of which would
-- have been discovered as rejected rows on the first day sync ever worked.
--
-- `insecure-context` has been in the client's VoiceFailure since the origin bug on 13 September
-- and was never added here. `nothing-in-pack` is new: a sentence understood perfectly that we
-- had nothing to answer with.
--
-- That second one is the most useful row in this table and it is deliberately NOT a parser
-- failure. "Forty-seven people asked for Jain sambar near Karama" is a work order for the
-- collectors and a feature request for version 2 — counted apart so it can never be mistaken
-- for the recogniser being wrong.

alter type voice_failure add value if not exists 'insecure-context';
alter type voice_failure add value if not exists 'nothing-in-pack';

-- How many results the traveller was shown. Null for anything that was not a search; zero with
-- `nothing-in-pack` is the row that says what to go and collect.
alter table voice_events add column result_count integer check (result_count >= 0);

comment on column voice_events.result_count is
  'Results shown for a search. Zero with nothing-in-pack is unserviced demand — what to collect next.';
