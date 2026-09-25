# 035 — Our own map, offline

**25 September 2026.** The day after 034 shipped नक्शा as a hand-off to the phone's map app, the
owner opened Woodlands' नक्शा in Dubai with the radio off. The other app said "Can't connect".

> _"I think the reason we added the coordinates to these outlets is to enable our maps and not
> google maps. because, its erroring out when we are offline. This is not the intent"_

That settles the question `docs/transport-and-maps-strategy.md` left open since 15 September
("OWNER'S CALL 1 — how much map, and when does it download?"). Dubai Saathi ships its own map, and
it works offline like every other core journey (rule 1).

## What is built

- **2.6 · नक्शा** (`features/map/`). The way to a place drawn on our own map: the streets, and on
  top of them the journey from the same planner जाना uses. The walk to the station is dashed, the
  ride goes through every stop it passes in the RTA line's colour, the change of train is marked,
  and the traveller and the place are two dots named above the map. Chips switch between the ways
  2.2 offers (metro, bus, walk, taxi). The line above the map gives the distance, the time and the
  fare; the button below opens the steps (2.3), or 2.4 for the taxi. The taxi is the straight line
  between the pins, dashed, because its road is the driver's to choose. Reached from a kitchen's
  नक्शा (1.3), inside खाना; the screen takes any place जाना knows (`#/map/<placeId>`).
- **The streets are OpenStreetMap**, cut out of Protomaps' daily build as one PMTiles archive
  covering Jebel Ali to Mirdif at zoom 14, where street names are legible. That is option (c) in
  the strategy doc. With the glyphs and sprites the style names, it is **16 MB**. Licence: ODbL
  (a produced work), attribution shown on the map ("© OpenStreetMap", beside "RTA"). This is the
  one case rule 7 allows: our own extract of open data whose terms permit offline use. No
  public tile service is fetched from, at runtime or at build.
- **Built at deploy, served from our origin.** `deploy/build-map.sh` runs in a stage of
  `deploy/Dockerfile` on the Railway build machine, which has open internet (the development
  container does not). It writes `/map/v1/`: `dubai.pmtiles`, `fonts/`, `sprites/` and
  `files.json`, the list the phone downloads, with the total size. Docker's layer cache keeps
  the same map across releases until the script changes.
- **On the phone, for good.** The map downloads by itself the first time the app is open with a
  signal, and again whenever the signal returns if it was cut off. It goes into its own cache,
  `saathi-map`, which `repairToLatest` spares by name. No release takes it back (CLAUDE.md, the
  voice-model rule). The archive is written last, so a half-finished download never looks
  finished. Offline, MapLibre reads the archive straight from that cache (`pmtiles` FileSource),
  and the glyphs and sprites come through the `saathimap://` protocol, kept copy first.
- **Before it has arrived**, नक्शा still works. Online, the streets are read from our server while
  the download runs, and the screen shows its progress. Offline, the journey is drawn on a plain
  ground, still to scale, with the distance, time and fare above it, and one line saying the
  streets will download with the next signal.
- **MapLibre GL JS** renders it, loaded only when नक्शा opens but kept in the precache, so it
  opens offline. Its worker is a file on our own origin, because the policy allows no worker from
  a blob. That adds about 1.5 MB to the precache.

## What this changes

- CLAUDE.md's Stack row "Maps: None ships" now names this.
- 034's नक्शा bullet (a hand-off to the phone's map app) is replaced by this decision. जाना and
  फ़ोन are unchanged.
- `docs/transport-and-maps-strategy.md` section 2 is answered: (c), downloaded on first launch
  with a signal and kept.

## What the map showed on its first day

The planner's walks are straight lines. Drawn on streets, the bus option to Woodlands from Al
Rigga ended in a kilometre's "walk" across the Creek. That is a planner defect the map made
visible, not one the map introduced. It is recorded to be fixed in the planner: a walk must not
cross the Creek except at a bridge or an abra.
