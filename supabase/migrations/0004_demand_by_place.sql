-- Demand for a place, countable.
--
-- The owner's question is "how many travellers asked the way to Dubai Aquarium in the last 30
-- days", so he can take that number to the attraction and negotiate. Counting it from the
-- transcript would undercount badly: the same place arrives as "mall of emirates",
-- "माला एमरेट्स" and "MOE", and the recogniser mangles proper nouns besides. The parser already
-- resolved it, so the id is kept.
--
-- This is an id, not a position. Nothing in this schema records where a traveller physically
-- went — there is no location column anywhere — so this aggregates to "40 devices asked about
-- Mall of the Emirates" and cannot reconstruct one person's trip, which is the owner's own
-- stated line: "I do not want to know if and where Arun went during his 5 day trip."

alter table voice_events add column resolved_place_id text;

-- The one query this exists for: demand per place over a window.
create index voice_events_place_demand
  on voice_events (resolved_place_id, at desc)
  where resolved_place_id is not null;

comment on column voice_events.resolved_place_id is
  'Place asked about, for aggregate demand. Never a position and never a trail.';
