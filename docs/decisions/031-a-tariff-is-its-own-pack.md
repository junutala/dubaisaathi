# 031 — A tariff is its own pack

**22 September 2026.** Decided after the morning's fare defect, and after a second opinion on the
architecture made the same point independently.

## What changed

Fares left the transport network. `data/transport/fares.v1.json` is now its own pack, with its own
`fareVersion`, its own `effectiveFrom`, and its own row in `content_packs`.

|                           | before                     | after                      |
| ------------------------- | -------------------------- | -------------------------- |
| Correcting a flag fall    | republish **1,774.8 kB**   | publish **1.2 kB**         |
| What moves                | the whole graph            | four numbers and two bands |
| What a phone re-downloads | 2,727 stops it already has | the tariff                 |

Measured with `npm run publish:packs -- --dry`.

## Why

The RTA re-sets the taxi per-km rate **every month**, against fuel. Under the old shape that was a
monthly 1.7 MB to every phone to change one number — and worse, it coupled a price correction to a
feed refresh: you could not fix a fare without republishing whatever state the graph happened to be
in, and you could not refresh the feed without reprinting the fares.

The morning's defect made the coupling concrete. `flagFallAed` had been **12** — the minimum fare,
entered in the flag-fall field as well — so every taxi quote carried AED 7 no meter charges. Fixing
four numbers meant shipping 1.7 MB of stations.

## How it is put together

- **The feed can never supply this.** The RTA's GTFS has no `fare_attributes.txt` and no
  `fare_rules.txt`, in the 2021 archive or the 2025 one. Every figure is entered by hand against
  the published tariff and carries the date it took effect. No feed refresh can refresh a price;
  the pack's `source` says so in as many words.
- **The network stopped carrying fares at all.** `TransportNetwork` has no `fares` field;
  `toTransport.ts` does not emit one and `publishTransport.ts` no longer carries one across.
- **The planner is handed a tariff** — `planRoutes(network, origin, destination, fares)` — rather
  than reaching into the network for one. A journey and the price on it can never come from
  different versions, and a test can price a journey against a tariff that is not today's.
- **It rides the existing pack system** (decision 030), so no new delivery path and no Dexie
  change: `fares` is a `PACK_ID`, `packBody('fares')` answers, and `sync.ts` already compares
  versions per pack.
- **The taxi card no longer loads the graph.** It needed the network only to reach `network.fares`.
  A fare quote is now 1.2 kB of tariff and a straight-line distance, so 2.4 answers before the
  1.6 MB graph has finished loading.

## What the parser refuses

`parseFarePack` rejects a tariff whose **minimum is not above its flag fall**. A minimum exists
because the flag fall plus a short ride comes to less than the tariff will accept; one that is not
above the flag fall is not doing anything. That is exactly the shape of the defect that ran for a
week — AED 12 in both fields — and the totals stayed plausible throughout, so nothing else would
have caught it.

## Addendum, the same afternoon: it is charged by zones

The owner brought back the RTA's published tariff, and the structure was the thing that was
wrong, not the amounts. `3 / 5 / 7.5` is exactly the Silver Card fare. But Nol is charged by
**zones passed through**, never by distance — RTA's wording is "you will be charged according to
the total number of zones you have passed" — and we were charging by the kilometre.

We only ever overcharged, which is why nobody noticed:

| journey                         | zones | Nol   | we charged |
| ------------------------------- | ----- | ----- | ---------- |
| Union → e&                      | 1     | AED 3 | AED 5      |
| BurJuman → Mall of the Emirates | 2     | AED 5 | AED 7.5    |
| Al Ghubaiba → National Paints   | 2     | AED 5 | AED 7.5    |

Al Ghubaiba to National Paints is 28 km inside two zones. Distance is simply the wrong axis.

So `TransportNode` now carries its `zone` — the feed has had `zone_id` on every stop all along,
'0001' to '0007', on 2,688 of our 2,727 nodes. The 39 without are Sharjah, Ajman, Fujairah,
Masafi and Dhaid, which run on a different tariff; a journey touching one is shown with its
steps and its time and no fare, rather than a Dubai price it will not be charged.

The pack carries **every class** the RTA publishes — Silver, Personal, Gold, Red Ticket and Red
Ticket Gold — and names the one we quote. A traveller on a 14-day trip holds a Silver card, so
that is what the card shows; the rest are there for a screen that wants them, without a data
change. The journey rules are in it too (3 transfers, 180 minutes, 30 between modes); no journey
we plan exceeds them today, and now something holds them.

### The bug inside the fix

Counting a leg's two ends is not counting the zones passed. `toLegs` collapses a whole ride on
one line into a single leg and keeps only where the traveller boarded and alighted — so the first
version priced BurJuman → Expo at AED 5, because the Red Line runs the length of zone 0002
without stopping at either end of it. Every fare it produced was a real published fare. The
zones are counted over the search's steps instead, before that collapse, and a test pins it: the
sabotage that restores the old behaviour fails three cases.

## What this still does not fix

Salik is still not modelled: AED 4 off-peak, AED 6 in the peak, and the pack has no gate positions.
Written down in the tariff's own `source` rather than left silent.
