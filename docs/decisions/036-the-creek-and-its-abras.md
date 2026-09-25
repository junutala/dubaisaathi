# 036 — The Creek is water, and the abra crosses it

**25 September 2026.** On its first day, नक्शा (decision 035) drew the bus journey from Al Rigga to
Woodlands in Meena Bazaar. It ended in a kilometre's "walk" straight across Dubai Creek. The
planner's walks are straight lines between two points, which is honest on land and wrong over
water. The owner, standing in Deira that morning:

> _"but I think there will be footbridges over the creek.... or abra. SO we are not really off.
> And besides, now I am in dierra . our outlets and focus area is bur dubai. Its on the other side
> of the creek. So let's do the cost benefit analysis..... the overhead of keeping offline data on
> the mobile. If its light, go ahead"_

He was right that the crossing is real. From Deira to Meena Bazaar it is the abra, for a dirham,
and blocking every walk across the water would have removed the one way a traveller actually goes.
So both halves are built.

## What changed

- **A walk never crosses the Creek or the Dubai Water Canal.** `features/transport/water.ts`
  measures how much of a straight walk lies on the water, using OpenStreetMap's outline of the two
  (`data/transport/water.v1.json`, 26 kB: the water polygons the named centrelines run through,
  from the same Protomaps build as नक्शा, ocean excluded, simplified to about 8 m). More than 30 m
  is a crossing, not a bank brushed. That applies to the walk to a station, the walk from one, a
  change between two stops and the direct walk.
- **The abra is a way to go**, next to the metro, the bus and the taxi on 2.2, 2.3 and नक्शा: walk
  to the pier, cross, walk on. It covers the Creek's four crossings as OpenStreetMap maps them:
  - Bur Dubai ↔ Deira Old Souk
  - Dubai Old Souk ↔ Al Sabkha
  - Al Fahidi ↔ Deira Old Souk
  - Al Fahidi ↔ Al Sabkha

  They live in `data/transport/abras.v1.json`, 6 kB, in the network's own shape (nodes, lines,
  edges). The RTA's GTFS carries only the Al Fahidi pair (CR4, CR5), so the abras ride beside the
  RTA pack. `withAbras` adds them to whichever pack the phone holds, shipped or downloaded.

- **The step says what it is:** "अब्रा से खाड़ी पार — Deira Old Souk Abra Station · AED 1 नक़द, नाव में ·
  भरते ही चलती है". The fare is the AED 1 cash fare per crossing, carried on the edge, not Nol.
  Crossing times are estimates by length (4–7 minutes). The wait is half a ten-minute headway,
  because abras leave when full.
- `abra` joins `TRANSPORT_MODES`, with a boat icon and its own colour on the map.

## What it costs a phone

- **Data:** 32 kB of JSON in the bundle (about 10 kB compressed). That is less than one menu photo.
- **Time:** the first journey planned in a session builds the graph once. The water check adds
  about 40 ms to that on a laptop, 60 → 100 ms; allow a few times that on a phone. Every journey
  after it is unchanged, about 12 ms.

## Not done

- **Footbridges.** The Creek's crossings on foot are the road bridges and Al Shindagha, and a
  traveller walking a bridge is a route the planner has no streets for. A walk that needs a bridge
  is simply not offered. The metro, the bus and the taxi already cross on them.
- **The water buses** (Al Ghubaiba, Baniyas, Al Seef, Festival City) run along the Creek rather
  than across it, on Nol. They are left out until someone asks for one.
