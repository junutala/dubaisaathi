# 050 — Every station and stop is somewhere to go

**Date:** 1 October 2026 · **Status:** built

## The owner's ruling

> "Let's get all the metro, bus stops into the system. We have the data and it's a crime not to
> use them."

And, the same afternoon: the RTA writes "Al Rashidiya" and "Al Karama"; in ordinary speech it is
Rashidiya and Karama. Either must reach the place.

## Why

जाना's box knew the twenty-eight curated places in `data/intents/places.v1.json` while the
planner already routed through 2,727 stops. A real search from a phone, "healthcare city", was
told the place was not one we have — and Dubai Healthcare City is a metro station in the pack.

## What was built

`apps/pwa/src/features/ask/transitPlaces.ts` turns the network the app already ships
(`data/transport/network.v1.json`) into destinations, in two tiers:

- **Named** — the metro and tram stations, hand-named in Devanagari in `stations.v1.json`. They
  are matched as the curated places are: exact, consonant skeleton and near spelling, a near one
  asked as a question. A renamed station keeps its old name ("noor bank" reaches onpassive,
  "rashidiya" reaches Centrepoint).
- **Exact** — the bus stops. About 1,300 destinations after the bays are folded together ("Gold
  Souq Bus Station 4", "… 5", "… 7" are one place, at the middle of the bays). A bus stop is
  reached only by its own name typed out. A near match over that many English street-and-building
  names would answer ordinary sentences with a random stop.

Rules that keep the curated places and the language safe (`corpus.ts`):

- **A curated place answers for its own stops.** A stop whose name, without the bay and "Bus
  Station", is a curated place (or within one edit of one) is that place: "Al Karama Bus Station"
  is Karama, "BurJuman Metro Bus Stop" is BurJuman. The curated place carries the driver's Arabic
  and the neighbourhood.
- **A curated alias is never taken.** Where a stop's name collides with a curated alias, the stop
  loses that alias.
- **A name two stops share names neither.** "Union Coop" stands in Abu Hail, Al Barsha and Al Twar.
- **A station outranks a bus stop** for a shared name ("Rashidiya").
- **No kind-word is a name.** A stop alias made only of words like Street, Masjid, School, Mall,
  Bus Station and numbers is dropped; single words shorter than five letters too; and so is any
  word the language packs already know.
- **"Al" is optional.** Every stop name is reachable with or without its leading "Al", and the
  consonant skeleton ignores a leading "Al"/"El", so "Al Seef" and "Al Sufouh" no longer sound
  alike to the matcher because they share the article.

A stop is reached by where it is: the planner routes to the place's location, so a newer network
downloaded later (decision 030) routes to it just the same.

A stop the RTA names only in English keeps that English name in both interfaces — the name we
ship, never a guess at its Devanagari (16 September). The taxi screen shows it once, not twice.

## Cost

The vocabulary is built once at launch: about 0.2 s measured, guarded by a test at 2 s. Wide
windows (a long stop name) are only ever looked up exactly; near spellings stay within the width
of the curated and station names.
