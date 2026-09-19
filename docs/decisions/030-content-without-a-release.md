# 030 — Content reaches a phone without a release

**19 September 2026.** Every pack a traveller reads was compiled into the app bundle: the
outlets, the attractions, the RTA network, all of them `import`ed into JavaScript. So a kitchen
collected in Meena Bazaar on a Tuesday afternoon needed a code change, a merge, a deployment and
a service-worker handover before anybody could eat there.

The owner saw it as soon as the build-delivery trouble was explained:

> _"I am now more worried about the dataupload that we have to carry whenever we have new outlets
> and/or dubai introduces new routes or update their timetable."_

He was right, and the two problems are one problem: **anything that has to reach a phone must not
have to travel as code.**

## What changes

A pack is a row in `content_packs` (migration 0014), published by writing it. The phone asks the
`packs` function what versions exist — a few hundred bytes — downloads only what is newer than
what it holds, checks the bytes against the published digest, and stores it in IndexedDB.

`data/` stays the source of truth and stays in git. `npm run publish:packs` reads those files,
checks them, and writes the rows. Nothing is built and nothing is deployed.

## The order a feature reads in

1. **The pack this phone downloaded** — the only source that can be newer than the app.
2. **The copy compiled into this build** — which is why a first launch, and a launch with the
   radio off, work exactly as they did before any of this existed.

The bundled copies are not going anywhere. They are the floor, not the source.

## Rules this keeps

- **A pack only ever moves forward.** A phone holding version 7 ignores a 6 that somebody
  published by mistake.
- **A damaged body is not stored.** The digest is checked on the phone; a truncated pack that
  still parses is the dangerous one, because it would quietly remove outlets rather than fail.
- **Empty never replaces something.** The publisher refuses to publish an empty pack, and the
  app falls back to its bundled copy if one arrives anyway. A claim ships with its data
  (decision 025); publishing emptiness over a traveller's copy is that rule broken from our side.
- **A row that cannot be read is dropped, not the pack.** One attraction with an unknown category
  must not cost जानना its other twenty.
- **Applied at the next launch, never mid-task.** What is downloaded is stored; the features take
  it up when the app next starts. A traveller reading a menu does not have it change under them.
- **In IndexedDB, never in the worker's cache.** A deployment must not take from a phone what it
  spent somebody's data downloading — the rule a 42 MB voice model taught us.
- **Nothing about who is asking.** A pack is the same for everybody, so the function reads no
  device id and keeps no record of the request (decisions 001 and 011).

## What this does not do yet

- **The bundle is not smaller.** The bundled copies are still there, deliberately: proving the
  download path costs nothing while they stay. Dropping the 1.6 MB RTA network from the bundle is
  the obvious next step and is a separate change, with its own honest line on जाना for the first
  launch that has not fetched it yet.
- **No fleet view.** Phones do not yet report which pack versions they hold, so "stuck on old
  data" is still invisible to us. The registry carries the versions; the reporting is not built.
- **No screen says the data changed.** The app does not announce new content, and for outlets and
  timetables that is probably right — but it is a decision nobody has made yet.
