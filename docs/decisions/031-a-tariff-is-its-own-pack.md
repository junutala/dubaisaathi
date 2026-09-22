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

## What this does not fix

The Nol bands are still **distance** bands, and the real tariff is **zonal**. The feed gives every
stop a `zone_id` (0001–0007 across 2,755 of 2,819 stops), so the exact fare is computable from data
already in the repository. Today we overstate: Union → e& is 9 km inside one zone, a AED 3 journey
we quote at AED 5.

It is not done here because the counting rule is not established — whether the RTA charges by zones
crossed or zones passed through — and the stop sequence supports either. Guessing is how AED 12
became a flag fall. It waits on a real Nol tap.

Salik is still not modelled: AED 4 off-peak, AED 6 in the peak, and the pack has no gate positions.
Written down in the tariff's own `source` rather than left silent.
