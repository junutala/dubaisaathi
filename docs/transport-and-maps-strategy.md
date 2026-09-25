# Transport data and maps — where the data comes from, and what it costs

Written 15 September, after research. It was a proposal with numbers; **the first of its two
owner's calls was settled on 16 September by decision 017** — the RTA's own GTFS feed became the
pack, and `npm run publish:transport` builds `data/transport/network.v1.json` from it. So the
"where we are today" table below is history: the hand-curated 59 nodes and 62 edges are gone, and
the shipped pack carries every bus route, both metro lines and the tram, with directional hops and
first and last departures.

**The committed feed is now the RTA's own `GTFS_20250823`** (22 September 2026), downloaded in
Dubai. It replaced the September 2021 edition off Transitland's mirror, which had been the
pipeline's proof rather than the product's answer. Dubai Pulse answers only from a UAE connection:
this container cannot reach it and neither can a GitHub runner, so refreshing the feed is a person
with a Dubai connection and nothing else will do. See "What four years changed" below.

The map question below was answered on 25 September by the owner — our own map, offline — and is
built as decision 035: option (c), zoom 14, 16 MB, downloaded on the first launch with a signal and
kept.

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
  name for every stop. **All of this is the 2021 feed and is kept here as the before picture;
  what ships is the 2025 one described below.**
- **It was the September 2021 edition** (`calendar.txt` ran 2021-09-09 to 2021-12-31, and the
  weekend was Friday–Saturday, as it was then). Transitland's crawl of the RTA stopped there,
  which is why it had to be replaced.
- **Rail platforms collapse into stations** (the feed lists "BurJuman Metro Station 1" and "…
  2"), named from `data/transport/stations.v1.json` — the sign's English, its Devanagari, and
  aliases including the feed's own spelling where it differs ("max" for Al Jafiliya). Bus stops
  keep the RTA's English name, one node per bay.
- **The pack, from the 2021 feed**: 160 lines, 2,499 stops, 6,435 directed hops, 1.6 MB of JSON
  (about a quarter of that over the wire). Every hop carries its direction and the first and last departure from
  its stop; every line its measured daytime headway and the headsign each way. The planner
  (`routePlanner.ts`) no longer mirrors edges, indexes stops on a grid, and plans a journey in
  under 70 ms on a laptop.
- **Attribution**: "Transport data: Roads and Transport Authority (RTA), Dubai — open data" on
  2.3, from the pack's `attribution` field.

## What four years changed (22 September 2026, the 2025 feed)

The owner downloaded `gtfs.7z` on a Dubai connection and it went into the repository as
`data/transport/rta-gtfs.zip`. The archive inside is `GTFS_20250823`: 201 routes, 2,817 stops,
66,563 trips, 1.44 million stop times. The pack it converts to is **186 lines, 2,727 stops,
6,360 directed hops** (v3) — 26 more lines and 228 more stops than the 2021 pack, and 75 fewer
hops, because the bus network was renumbered: 11A and 11B became 11, the 20 became 20A and 20B.

### Getting the file

Dubai Pulse serves only from inside the UAE. A `curl` from this container is refused by the
proxy; a GitHub Actions runner gave up after 133 seconds on `Failed to connect to
www.dubaipulse.gov.ae`. So the download is a person standing in Dubai, and the workflow at
`.github/workflows/fetch-rta-feed.yml` will not do it for you. The dataset is `rta_gtfs-open`,
resource `gtfs.7z`, at
`https://www.dubaipulse.gov.ae/dataset/73765e8f-e8c4-443c-9687-288072ed9d12/resource/11515bd3-bdba-466f-ab65-f057bd123ab5/download/gtfs.7z`.

### Repacking it

It arrives as a 7z, which the converter does not read. Unpack it and zip the `.txt` files. Two
files do not go in:

- `shapes.txt` (11 MB) is map geometry and nothing reads it.
- `translations.txt` is **130 MB**, and 1,327,940 of its 1,330,759 rows are `stop_times`
  headsigns. Keep the 2,819 `stops` rows — an Arabic name for every station, which the taxi
  screen will want — and drop the rest. That is 226 KB instead of 130 MB.

The result is 9.8 MB, against 11 for the 2021 archive.

### The Red Line was re-cut

`MRed` and `MBrch` are gone. The two services are now `MRed1` (Centrepoint–Expo) and `MRed2`
(Centrepoint–Life Pharmacy) — the same two lines under new codes. `RAIL_LINE_IDS` in
`toTransport.ts` carries both spellings, so an older archive still converts to the same ids and
the pack's edge ids do not churn. The branch went from 8 hops to 56; it was barely represented
in the 2021 feed.

### Ten metro stations were renamed

| was               | is now                                                 |
| ----------------- | ------------------------------------------------------ |
| Al Khail          | Al Fardan Exchange                                     |
| GGICO             | Al Garhoud                                             |
| Etisalat          | e&                                                     |
| Mashreq           | InsuranceMarket                                        |
| UAE Exchange      | Life Pharmacy                                          |
| Jabal Ali         | National Paints                                        |
| Deira City Centre | City Centre Deira _(word order only; our name stands)_ |
| Al Safa           | Onpassive _(already curated)_                          |
| Umm Al Sheif      | Equiti _(already curated)_                             |
| EXPO              | Expo 2020 _(spelling only)_                            |

Each keeps its old name as an alias in both scripts. A traveller who last came in 2019 still
asks for Etisalat, and the sign they are standing under says e&.

### What the renames exposed

Six of them came out of the converter named in English **with the English repeated in the Hindi
field**. A curated name is matched by name first and by distance second, so when the name stops
matching, the coordinate is all that is left — and 56 of the 74 curated coordinates were more
than 100 m out, one by 4 km. They were typed off a map by hand and had never been tested,
because the name had always matched first. **Every location in `stations.v1.json` now comes from
the feed itself.**

The same fault had already reached a live screen: **"Al Sabkha" was printed over Deira Post
Office.** The Sabkha bay left the feed, the curated entry fell through to the nearest stop 200 m
away, and a traveller told to get off at अल सबख़ा would have got off at the post office. Three
things came of it:

- A pinned bay is now genuinely pinned. `busStop()` keeps pinned entries out of the distance
  fallback, so no neighbour can take a name by being reached first — Dubai Mall's name had
  landed on bay 2 while the pin said bay 7.
- `publishTransport.ts` prints a line when a curated `stopId` is not in the feed. The RTA
  retires bay ids, and a dead pin must never be absorbed quietly.
- Sabkha points at `Sabkha, Turnoff` (107001), Satwa at bay 9 (503009), Dubai Mall at 888807.

### The shrink guard

`publishTransport.ts` refused this feed outright — 6,360 hops against 6,435 — which was its rule
working and its rule being wrong. A renumbering really does lose hops. It is now a 10% floor on
hops and stops, which still catches a collapsed conversion, and the publisher prints which lines
the refresh added and dropped.

### The calendar is expired, and it does not matter

`calendar.txt` runs 2025-08-29 to 2025-12-31. The converter reads it only for which services run
on a Monday, never for whether a date is in range, so the typical-weekday times it quotes are
unaffected: metro 05:00–23:56, tram 06:00–00:51.

## Fares (22 September 2026)

**The RTA's GTFS feed has no fares in it.** No `fare_attributes.txt`, no `fare_rules.txt`, in the
2021 archive or the 2025 one. A refresh of the feed can never refresh a price.

**Fares are their own pack** (decision 031): `data/transport/fares.v1.json`, versioned with
`fareVersion` and published on its own. Correcting a tariff is **1.2 kB**, not the 1,774.8 kB of
stations it used to drag along — which matters because the RTA re-sets the taxi per-km rate every
month against fuel. Edit that file, bump `fareVersion`, and `npm run publish:packs -- --only fares`.

What the pack holds:

|                 | value            | where it comes from                                      |
| --------------- | ---------------- | -------------------------------------------------------- |
| Nol, Silver     | AED 3 / 5 / 7.5  | one zone, two zones, more — from rta.ae, 22 Sep 2026     |
| Nol, Red Ticket | AED 4 / 6 / 8.50 | what a traveller pays before they own a card             |
| Nol, Gold       | AED 6 / 10 / 15  | double, and the pack carries it                          |
| Taxi flag fall  | AED 5            | street hail, 06:00–22:00; AED 5.50 after 22:00           |
| Taxi per km     | AED 2.20         | RTA revises it monthly with fuel, 2.14–2.26 through 2026 |
| Taxi minimum    | AED 12           | a street-hail fare cannot come to less                   |
| Spread          | ±15%             | a meter is not a timetable; the answer is a range        |

### Two things that were wrong until today

**The flag fall was AED 12** — the minimum fare, entered in the flag-fall field as well, so every
taxi quote carried AED 7 that no meter charges. `parseFarePack` now refuses a tariff whose minimum
is not above its flag fall, which is that defect exactly.

**2.3 and 2.4 disagreed.** Each screen worked the fare out for itself. The taxi card allowed for
roads not being straight (a 1.2 factor) and the options card did not, and they rounded to
different things, so BurJuman → Mall of the Emirates read **AED 45–60 on the card and AED 50–70
one tap later**. The totals were not far off, because the inflated flag fall happened to cancel
the missing road factor — which is why nobody caught it. A traveller who sees two prices for one
journey believes neither, and the second one is the screen they hold up to the driver.

Both now call `features/transport/taxiFare.ts`, which is the only place a taxi fare is worked
out. `taxiFare.test.ts` pins it, including that the minimum binds the bottom of the range: quoting
AED 10 would be quoting a fare the tariff does not permit.

### Zones, not kilometres

Nol is charged on **the number of zones a journey passes through**, never on its length. RTA's
wording: "you will be charged according to the total number of zones you have passed". Dubai has
seven, and the feed puts a `zone_id` on every stop — so `TransportNode` carries it and the fare
is counted, not measured.

Two things that are easy to get wrong here, and both were:

- **Counting the ends is not counting the zones passed.** `toLegs` collapses a whole ride on one
  line into a single leg, keeping only where the traveller boarded and alighted. Counting those
  priced BurJuman → Expo at AED 5, because the Red Line crosses the whole of zone 0002 without
  stopping at either end of it. The count runs over the search's steps, before the collapse.
- **Not every stop is in a Nol zone.** 39 of our 2,727 are Sharjah, Ajman, Fujairah, Masafi and
  Dhaid, on a different tariff entirely. Those journeys are shown with their steps and their time
  and no fare, rather than a Dubai price the traveller will never be charged.

The metro's zone bands are contiguous — Red runs `0002 | 0006 | 0005`, Green `0006 | 0005` — so
rail never doubles back through a zone. Buses can, which is why the count is over every hop.

### Salik is not modelled

A toll gate is AED 4 off-peak and AED 6 in the peak (06:00–10:00 and 16:00–20:00, nothing between
01:00 and 06:00). The pack does not know where the gates are or which ones a road crosses, so any
Sheikh Zayed Road journey is quoted light by AED 4–12. Modelling it needs gate positions and a
road geometry we deliberately do not ship (`shapes.txt` is dropped). Left out and written down
rather than guessed at — the owner's call whether it is worth the data.

### Checking them

The fares are the one part of the pack a web page cannot settle. A real meter reading in Dubai —
distance travelled and final fare — is better evidence than any of the sources above, and one
trip is enough to confirm or correct the per-km rate.
