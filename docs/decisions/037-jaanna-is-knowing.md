# 037 · जानना is knowing, not only places

25 September 2026. The owner, after reading the metro fare board at BurJuman.

## Decision

जानना opens on tabs. **जगहें** is the attractions it always had (3.1, 3.2). **सफ़र** holds the
topics a traveller should know about getting around (3.3), and the first is **Nol कार्ड** (3.4):
Silver, Gold and the red ticket, what one trip costs by zones, the day ticket, the 7-, 30-, 90-
and 365-day passes, children riding free, the minimum balance and the one-journey rules.

The owner's words: "jaanna is knowing. This could be anything." The next tab is **ख़रीदारी**:
where to buy dates, oud and the rest. It appears the moment its first topic is written. **A tab
with nothing behind it is not shown**, because a tab that opens on nothing is a promise broken
on the tap (decision 025).

This takes back two lines of the 16 September freeze: "जानना is attractions only", and
"3.3 · काम की बातें is parked for Sprint 2". 3.3 is now the सफ़र tab, not a separate list.

## Why the Nol card first

Every route in जाना is quoted on a Silver card. A traveller at the machine has to choose between
Silver, Gold and a red ticket, and is charged AED 2 to issue a red one. Nothing on the route told
them that. The board also says a two-zone trip under 3 km is charged as one zone, and that
children under 5 or under 90 cm ride free.

## Where the figures live

They are in the fares pack (`data/transport/fares.v1.json`, fareVersion 3), the same pack जाना
prices journeys with. So the page and the fare on a route can never disagree, and a correction
is a one-kilobyte data release. Every figure was read off the board the owner photographed on
25 September. The trip fares match the RTA website transcription of 22 September to the dirham.
The new fields are optional, so an older pack still parses; the page leaves out what a pack lacks.

## Not done here

जाना still quotes every two-zone trip at the two-zone fare. A short hop across a zone line is
quoted AED 2 high until the planner measures the trip against `oneZoneWithinKm`.
