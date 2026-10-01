# 051 — "I'm on this bus": the ride countdown

**Date:** 1 October 2026 · **Status:** built

## The owner's ruling

Sprint 2's first item: a countdown of the stops left to the one the traveller gets off at, with a
buzz one stop before, the screen kept on, and the timetable's running times as the fallback where
GPS fails. And the fact it rests on, from the owner on 1 October:

> "No bus or metro will skip stops. Even if they find no passenger in the bus stand, they will
> stop and open the door and close them."

## What was built

**2.3 · क़दम दर क़दम** gains one pill on each metro, bus and tram step: **बैठ गए? स्टॉप गिनिए**.

**2.7 · सवारी** (`RideScreen.tsx`, `rideProgress.ts`):

- **The ride arrives whole** in the address: line, direction, boarding and alighting stop
  (`#/ride/<place>/<option>~<line>~<direction>~<from>~<to>`). It is never re-planned on this
  screen, because the planner starts from where the phone is, and on a moving bus that changes
  every few seconds.
- **The stops are the line's own**, from the network the phone holds: a breadth-first walk along
  that line and direction, because a few bus lines branch (29 points in the August 2025 feed).
  Each stop carries the RTA's running time from the boarding stop.
- **The count, in order of trust:**
  1. **The traveller.** Every stop in the list is a tap that says "I am here". A count that cannot
     be corrected is a way out, not a way through.
  2. **GPS.** A fix within 120 m of one of the next four stops (250 m for metro, whose platforms
     sit under long roofs) moves the count there. Never backwards. A fix worse than 300 m is ignored.
  3. **The timetable.** After a minute with no fix (underground, or a phone that gave no location),
     the running times carry the count on from the last stop anyone was sure of.
- **The screen says how it knows**: GPS से, समय-सारणी से, or आपके बताए स्टॉप से. A guess in a
  tunnel is not shown as a fact.
- **The alert:** when the next stop is theirs, the card turns marigold ("अगला स्टॉप आपका है —
  दरवाज़े के पास आ जाइए") and the phone vibrates and beeps twice. At the stop: "यही आपका स्टॉप
  है — यहाँ उतरिए", with a longer vibration and three beeps. Each happens once. The beep is made
  on the phone (Web Audio), with no file and no network.
- **The phone is asked, and its answer is shown** (CLAUDE.md: never say a phone cannot until it
  has refused). The screen asks for a wake lock (and asks again when the page comes back into
  view), watches the location and vibrates. If the phone refuses any of these, the screen says
  what it said, and the count goes on without that thing.

Offline throughout: the network, the GPS and the timetable are all on the phone.

## Not built

The alert while the phone is locked: a web page cannot vibrate from the background. That is why
the screen is kept on, and why the screen says so when the phone refuses to keep it on.
