# 025 — Nothing ships ahead of its data, and there is no launch before the 25th

**18 September 2026.** The owner, on the pillar copy drafted the night before:

> _"In both the counts, we cannot ship before 22nd because one, we need data about Khana and
> then we also need data about this Jana because we are unable to get this Dubai RTA data. So in
> any case, I don't think we'll be launching this product anytime before 25th of this month. So
> unless we have the data, which we are bragging about, we will not launch it."_

## What was about to go wrong

`claude/the-claim-first` rewrites the three pillar blocks on the website so each leads with the
thing no other app does. The copy is right. The data underneath two of the three claims is not
there yet, and I had told the owner that जाना's was — which was wrong, and is the reason this is
written down rather than remembered.

**खाना.** `data/restaurants/restaurants.v1.json` holds **zero rows**. The pillar runs on
`restaurants.dev.json`, a fixture. A page that says _"the lanes of Karama, Meena Bazaar and Bur
Dubai"_ sends a reader to an app with three invented kitchens in it.

**जाना.** This is the one I got wrong. The network **is** in the pack — every bus route, both
metro lines, the tram, directional hops, first and last departures. But the committed feed is
`rta-gtfs.zip`, the **September 2021** edition off Transitland's stale mirror; the current one
(Dubai Pulse `rta_gtfs-open`, 21 January 2026) is reachable only from inside the UAE. The
network's _shape_ is largely right; its _numbers_ are five years old. The pack's own provenance
line says so: first/last departures and headways are "for a typical weekday (the feed's Monday
services)" — of 2021.

So the draft's headline claim — _"AED 5 and 46 minutes, or AED 23 and 16, on one screen, so you
can decide"_ — is a decision made on a 2021 timetable. The structure of the argument survives;
two of the four numbers in it may not. That is precisely the kind of claim this product cannot
afford to print, because the traveller who acts on it is standing at a bus stop.

## The decision

**A claim ships with its data, never before it.** A sentence on the website that the app cannot
honour the moment someone opens it is not marketing that is slightly early; it is the one
promise this product is built on, broken on the first tap.

**No launch before 25 September**, and not then either unless both sets are in:

1. **The 2026 RTA feed.** One download from a UAE connection — the owner is in Dubai from the
   22nd — then a file swap and `npm run publish:transport`. The workflow and the converter have
   been ready since the 16th. This is minutes of work behind a border.
2. **Real kitchens in खाना.** Meena Bazaar on the 22nd, Karama over the two days after, through
   `apps/field`, reviewed, published with `npm run publish:outlets`.

`claude/the-claim-first` stays unmerged until then. It is not abandoned and it is not a
draft to be rewritten: it is finished copy waiting on the facts it asserts.

## And a standing rule, stated by the owner in the same conversation

> _"always my stand has been that we do not want to promote other brands in our apps… unless I
> don't want to give unnecessary coverage for Talabat or Noon Eats or anybody like that. So we
> will commonly say that delivery apps."_

**No competitor is ever named** — not on the website, not in the app, not in the collectors'
tool. The category is named instead: _"on no delivery app"_. This is not only positioning; the
reader we write for is an Indian traveller in Kochi who has never heard of those names, so the
category is also the clearer sentence.
