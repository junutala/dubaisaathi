# 017 · The RTA's GTFS feed is the transport pack

**Date:** 16 September 2026 · **Status:** decided

## Context

Until today `data/transport/network.v1.json` was hand-curated: 59 stops, 62 hops, two metro lines
and six bus routes. जाना could answer for the dozen places we shipped and nothing else, and the
steps could not say whether the last train had gone.

The RTA publishes its network as GTFS (`rta_gtfs-open` on Dubai Pulse; Transitland mirrors it as
`f-dubai~rta`). The owner registered and downloaded it. It is the September 2021 edition.

## Decision

1. **The feed is committed as data**, `data/transport/rta-gtfs.zip`, and converted by
   `packages/content-tools/src/publishTransport.ts` into the pack the app ships. Nothing is
   fetched at build or at runtime; a build that depends on a government portal being up fails
   on a Sunday.
2. **Topology, headway, first and last departure are taken; timetables are not.** Every hop
   carries the first and last departure from its stop on a typical weekday; every line carries
   its daytime headway and its two headsigns. Individual trips, calendar exceptions, shapes and
   the marine routes are dropped.
3. **Rail platforms become stations, bus stops stay bays.** Stations are named from
   `stations.v1.json` (English as signed, Devanagari, aliases). Two thousand bus stops keep the
   RTA's English name; the matcher's script folding meets Hinglish typing halfway, and we do not
   invent Hindi.
4. **Hops are directional.** The feed carries both directions as separate trips, so the planner
   stops mirroring edges; a one-way loop is one way in the app.
5. **The 2021 edition ships now.** Running times and first/last departures move slowly; the
   weekend they describe is the old Friday–Saturday one, so the pack quotes weekdays only and
   2.3 says so. A newer feed is a file swap and a re-run, and the version moves only when the
   rows do.
6. **Attribution** to the RTA is on the screen that shows the rows, from the pack itself.

## Consequences

- जाना answers for anywhere a bus goes, not a dozen places. The bus card is real.
- The pack is 1.6 MB of JSON in the bundle, about 400 KB over the wire. Acceptable; a smaller
  encoding is a later optimisation, not a blocker.
- `TransportNetwork` and its line, edge and fare types now live in `@saathi/shared`, so the
  writer and the reader cannot drift.
- The Arabic stop names and the route geometry are in the feed and not yet in the pack; they
  are there for the map and for the taxi screen when either needs them.
