# Transport data and maps — where the data comes from, and what it costs

Written 15 September, after research. It was a proposal with numbers; **the first of its two
owner's calls was settled on 16 September by decision 017** — the RTA's own GTFS feed became the
pack, and `npm run publish:transport` builds `data/transport/network.v1.json` from it. So the
"where we are today" table below is history: the hand-curated 59 nodes and 62 edges are gone, and
the shipped pack carries every bus route, both metro lines and the tram, with directional hops and
first and last departures.

**One thing the table does not say and the product must:** the committed feed
(`data/transport/rta-gtfs.zip`) is the **September 2021** edition off Transitland's mirror. The
current one (Dubai Pulse `rta_gtfs-open`, 21 January 2026) is reachable only from inside the UAE.
The network's shape is largely right; its timetable numbers are five years old, and decision 025
holds the launch until the 2026 file is in.

The map question below is still open and still the owner's.

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

## What the feed turned out to be (16 September, converter built)

The owner registered on Transitland (Interline's portal, free plan) and downloaded the RTA feed
it mirrors as `f-dubai~rta`. It is committed as `data/transport/rta-gtfs.zip` (11 MB) and
`npm run publish:transport --workspace @saathi/content-tools` writes the pack from it.

- **170 routes**: 156 bus, 3 metro (`MRed`, `MGrn`, and `MBrch`, the Jabal Ali–UAE Exchange
  branch), 1 tram, 10 marine (`route_type` 4, not carried: the app has no mode for them).
  2,584 stops, 58,113 trips, 1.44 million stop times. `shapes.txt` **is present** (154,830
  points) — the geometry for a map, when there is one. `translations.txt` carries an Arabic
  name for every stop.
- **It is the September 2021 edition** (`calendar.txt` runs 2021-09-09 to 2021-12-31, and the
  weekend is Friday–Saturday, as it was then). Transitland's crawl of the RTA stopped there.
  **That is not the network a 2026 traveller stands in** — routes and stops have changed — so
  the 2021 pack is the pipeline's proof, not the product's answer. The current edition is on
  Dubai Pulse: dataset `rta_gtfs-open`, resource `gtfs.7z`, last updated 21 January 2026, at
  `https://www.dubaipulse.gov.ae/dataset/73765e8f-e8c4-443c-9687-288072ed9d12/resource/11515bd3-bdba-466f-ab65-f057bd123ab5/download/gtfs.7z`.
  It is a 7z, which the converter does not read: extract it, zip the `.txt` files, replace
  `data/transport/rta-gtfs.zip`, re-run. The converter takes a zip with a folder inside it, a
  feed with only `calendar_dates.txt`, and `frequencies.txt`, so a differently shaped 2026 file
  should convert first time. The pack quotes a typical weekday (Monday services) and says so on
  2.3.
- **Rail platforms collapse into stations** (the feed lists "BurJuman Metro Station 1" and "…
  2"), named from `data/transport/stations.v1.json` — the sign's English, its Devanagari, and
  aliases including the feed's own spelling where it differs ("max" for Al Jafiliya). Bus stops
  keep the RTA's English name, one node per bay.
- **The pack**: 160 lines, 2,499 stops, 6,435 directed hops, 1.6 MB of JSON (about a quarter of
  that over the wire). Every hop carries its direction and the first and last departure from
  its stop; every line its measured daytime headway and the headsign each way. The planner
  (`routePlanner.ts`) no longer mirrors edges, indexes stops on a grid, and plans a journey in
  under 70 ms on a laptop.
- **Attribution**: "Transport data: Roads and Transport Authority (RTA), Dubai — open data" on
  2.3, from the pack's `attribution` field.
