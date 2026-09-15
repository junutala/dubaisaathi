# Transport data and maps — where the data comes from, and what it costs

Written 15 September, after research. This is a proposal with numbers, not a decision. Two
questions are the owner's to settle and are marked **OWNER'S CALL**.

## Where we are today

`data/transport/network.v1.json` is **hand-curated**: 59 nodes, 62 edges, 8 lines — the Metro Red
and Green lines plus six bus routes (C7, 8, 29, 102, 103, 104), typed from the RTA's published
route lists. It works, and it is a rounding error against the real network:

|                | We have        | Dubai actually has                                          |
| -------------- | -------------- | ----------------------------------------------------------- |
| Metro stations | ~55 (complete) | 55 across 2 lines                                           |
| Tram stations  | 0              | 11                                                          |
| Bus routes     | 6              | ~150 (35 metro-link, 8 express, 119 internal, 12 intercity) |
| Bus stops      | a handful      | 2,000+                                                      |

So रास्ता can plan a metro journey and almost no bus journey. For a traveller staying in
Discovery Gardens or International City — which is most of them — the bus is the journey.

## 1. Transit data: the RTA publishes a GTFS feed, and we may use it

**This is the find.** The Roads & Transport Authority publishes an official GTFS feed on Dubai
Pulse (`rta_gtfs-open`), and it is mirrored in the Transitland catalogue as `f-dubai~rta`.

**Licence — commercial use is permitted.** Dubai Pulse data is issued under the **UAE Federal
Open Data License** (TDRA). It allows copying, reproducing and exploiting the information for
**both commercial and non-commercial purposes**. Two conditions bind us:

- **Attribution** to the Dubai Government / RTA as the source.
- **No logos or trademarks** — the licence covers the data, not RTA's marks, so we never use the
  RTA roundel or the metro line logos. Our own line colours and names only.

It also forbids implying official status or endorsement. We must never look like an RTA app.

**Access.** Two routes, and one of them needs the owner:

- A **direct download** of the feed (a `.7z` archive) from the dataset page.
- An **API** at `api.dubaipulse.gov.ae`, which requires registering and receiving an API key and
  secret by email, then exchanging them for a 30-minute OAuth token per session.

> **OWNER ACTION:** register on Dubai Pulse and request access to `rta_gtfs-open`. I cannot do
> this — it needs an identity and an email. Registration appears to be free for open datasets,
> but confirm there is no fee before agreeing to anything.

### What we take from GTFS, and what we deliberately leave

A GTFS feed is mostly **timetables**, and timetables are the wrong thing to put on a phone:
`stop_times.txt` for 2,000 stops is tens of megabytes, it goes stale the moment RTA changes a
schedule, and it is not what a traveller asks. Nobody stands at a stop asking "does the 8 leave
at 14:37"; they ask "how do I get there" and "is it still running".

So the converter takes three things and drops the rest:

1. **Topology** — `stops.txt`, `routes.txt`, `trips.txt` and `stop_times.txt` collapsed into the
   stop _sequence_ per route. That is our existing `nodes` / `edges` / `lines` shape, so nothing
   in रास्ता changes: the planner already walks this graph.
2. **Typical headway** — how often a route runs, by day type, derived by counting departures per
   hour. We already model waiting as a constant (`waitSeconds`: metro 240, bus 600); this
   replaces a guess with a measured number per line.
3. **First and last service**, by day type. This is the transport version of the rule the owner
   insisted on for restaurants: Dubai does not sleep, and "the last metro has gone" is exactly
   the 1am question. It is two timestamps per line, not a timetable.

Everything else — individual trips, calendar exceptions, fare rules we already model in bands —
is dropped at build time. Estimated pack cost: **well under a megabyte**, against tens of
megabytes for the raw feed.

4. **`shapes.txt`, if the feed carries it**, is the route's real geometry — the line a bus
   actually follows rather than a straight hop between stops. That is what makes a route look
   right when drawn on a map, and it matters for section 2. _Unverified: I could not open the
   feed from this container to confirm shapes are present._

### Adapting the names — the part that needs judgement

GTFS gives English stop names. The app needs Hindi and Hinglish, and **we do not invent them**:
that rule was written the day "Burjuman Mall" resolved to "Dubai Mall" on a driver's screen.

- **Metro and tram: 66 stations.** Small enough to curate properly, with Hindi names and Roman
  aliases, exactly as the 55 existing nodes already are. A day's work, done once.
- **Bus stops: 2,000+.** Curating Hindi for these is not realistic and not needed. They keep
  their English names, and the parser's existing script-folding already matches Hinglish typing
  against them ("Karama bus stand" folds the same way whichever script it is typed in).

That split is honest about what we know, which is the rule this product runs on.

## 2. Maps: Protomaps PMTiles, and the size question

**The approach.** [Protomaps](https://docs.protomaps.com) publishes a basemap built from
OpenStreetMap as **PMTiles** — a single-file tile archive. MapLibre reads it directly with HTTP
range requests, so there is no tile server and no per-tile request. Crucially, `pmtiles extract`
pulls **only our region's bytes** out of their hosted daily planet build, so we never download a
planet to get a city.

**Licence.** The Protomaps basemap is an **ODbL Produced Work** from OpenStreetMap. Attribution
to OpenStreetMap contributors is required and must be visible on the map. This satisfies rule 7
properly: we are not bulk-downloading somebody's tile service, we are building our own extract
from open data that permits exactly this.

**Size is the whole decision.** Each additional zoom level roughly doubles the archive.

| Option                                                                                    | What it gives                                                  | Rough size    |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------- |
| **(a) No basemap** — draw the route line, stops and the traveller's dot on a plain canvas | "Which way, roughly" and the shape of the journey              | **~0 MB**     |
| **(b) Dubai corridor, z0–13**                                                             | Streets and blocks. Enough to orient, see where a station sits | **~10–20 MB** |
| **(c) Dubai corridor, z0–14**                                                             | Sharper; individual street names legible                       | **~25–45 MB** |
| **(d) z0–16**                                                                             | Walking-level detail, "which exit, which side of the road"     | **100 MB+**   |

The voice model is already 42 MB. Option (c) roughly doubles the first-open download; option (d)
is not a download a traveller on hotel wifi accepts, which is the same reasoning that ruled out
the 1.5 GB speech model.

Two further levers worth knowing:

- **A tighter bounding box beats a lower zoom.** Travellers are in Bur Dubai, Karama, Deira,
  Downtown, Marina, Discovery Gardens and International City — not the whole emirate. A corridor
  polygon rather than a rectangle cuts a lot of empty desert out of the archive at no cost to
  anyone.
- **The map need not be in the first-open pack.** It could download on first opening नक्शा, the
  way the voice model does, with the size stated. That keeps the landing page fast for a
  traveller who never opens a map.

> **OWNER'S CALL 1 — how much map, and when does it download?** My recommendation: build **(a)
> now**, because it is nearly free, needs no new download, and immediately unblocks
> "नक्शे पर देखें" on 1.4 — a button that has been missing because the screen behind it did not
> exist. Then add **(b)** as an opt-in download and measure whether anyone wants (c). Starting at
> (c) or (d) spends the traveller's megabytes before we know the screen is useful.

> **OWNER'S CALL 2 — is the map a core offline feature or an enhancement?** Rule 1 says every
> core journey completes with the network off, and the map is listed as MVP feature 5. Option (a)
> is fully offline. Options (b)–(d) are fully offline _once downloaded_. If the map must work
> offline for a traveller who never opted in, then it has to be in the first-open pack and the
> size lands on everyone.

## 3. How this gets built, and what blocks it

**Neither dataset can be fetched from the development container** — Dubai Pulse, Transitland,
OSM and the Protomaps builds are all refused by the egress proxy, exactly as the Vosk model and
the OCR language data were. That is not a blocker, because the **Railway build machine has open
internet**, and this repository already solves the problem twice: `deploy/Dockerfile` downloads
the 42 MB Hindi speech model at build time, and `deploy/Dockerfile.field` now downloads the OCR
language data the same way.

So the shape is known and proven:

1. `packages/content-tools/src/publishTransport.ts` — reads a GTFS archive, emits
   `data/transport/network.v1.json` in the shape रास्ता already consumes. Pure and testable, like
   `toRestaurant.ts`: the graph conversion is where the bugs will be, so it gets tests against a
   real feed fixture.
2. The GTFS archive is fetched once and committed as data, **not** downloaded per build — a
   transit network changes a few times a year, and a build that depends on a government portal
   being up is a build that fails on a Sunday.
3. For the map, a build stage runs `pmtiles extract` against Protomaps' hosted build with our
   region polygon and maxzoom, and serves the archive from our own origin under `/map/`.
4. Attribution lines — RTA for transit, OpenStreetMap for the map — go on the map screen and in
   ज़रूरी जानकारी. Both licences require it and neither is optional.

## What I could not verify

Said plainly rather than assumed:

- **Whether the RTA feed contains `shapes.txt`.** Without it, route lines are straight hops
  between stops, which looks wrong on a map but plans journeys just as well.
- **The feed's actual size and its update cadence.** Transitland lists four feed versions, so it
  is maintained, but I could not read the fetch dates.
- **Whether Dubai Pulse registration is free** for this dataset. It is published as open data,
  which implies yes, but the owner should confirm before agreeing to terms.
- **A real size for a Dubai PMTiles extract.** The table above is extrapolated from Protomaps'
  own guidance that each zoom roughly doubles an archive, and a published example of a local-area
  extract at 46 MB. The honest way to get the real number is to run the extract once.

## Sources

- Dubai Pulse, `rta_gtfs-open`: https://www.dubaipulse.gov.ae/data/rta-public-transports/rta_gtfs-open
- RTA Open Data: https://www.rta.ae/wps/portal/rta/ae/home/open-data
- Transitland feed `f-dubai~rta`: https://www.transit.land/feeds/f-dubai~rta
- Protomaps PMTiles docs: https://docs.protomaps.com/pmtiles/
- Protomaps CLI (`extract`): https://docs.protomaps.com/pmtiles/cli
- Protomaps basemap downloads and licence: https://docs.protomaps.com/basemaps/downloads
