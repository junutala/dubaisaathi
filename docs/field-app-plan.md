# apps/field — collecting the outlets nobody else has

**Status:** built and live. Written 14 September as a plan; `apps/field` has been serving
collectors at `outlet.saafarsaathi.in` since 16 September. What shipped differs from this plan in
three ways, all from using it: the GPS is watched from the moment the form opens rather than taken
by a button, the area comes from the shared `AREAS` list rather than free text, and each dish
keeps the price the camera read beside it (migration 0006 and the `outlet` function carry the two
new columns). The costs and the walking-job argument below are unchanged — and untested against
reality until the owner collects Meena Bazaar on 22 September.
Entities already exist in `packages/shared`: `FieldReport`, `Restaurant`, `Menu`, `FoodTag`.
This proposes the app around them, the pipeline behind it, and what it costs to fill.

## Why this is the product, not a tool for the product

खाना is only as good as its content, and the content that matters has **no web presence**.
A traveller can already find Ravi and Bikanervala on their phone. What they cannot find is
the Kerala mess two lanes behind Karama Centre, the Gujarati thali on a first floor above a
mobile shop, the kitchen that will do a Jain thali if you ask the day before. Those places
have no website, no Zomato page and often no English signboard — so no scraper reaches them,
and that is exactly why having them is worth something.

Collecting them is a walking job. That is the whole reason this app exists.

## The unit of work

**One visit to one outlet produces one `FieldReport`.** Never a batch, never a spreadsheet
afterwards — the dietary answers have to be asked of a person standing there, and a form filled
in at the end of the day is a form filled in from memory.

A report is `draft` while the collector is in the shop, `queued` when they submit, `uploaded`
when the phone next has signal, then `approved` or `rejected` by a reviewer. **Nothing a
collector submits reaches a traveller unreviewed.**

## The capture flow

Five screens, in the order a collector actually moves through a shop. The target is **under
four minutes per outlet**, because a collector who needs twelve will do six a day.

1. **नई जगह** — kind (restaurant · place · pharmacy · hotel), then GPS captured on the spot
   with the area resolved from the place pack. No address typed, ever.
2. **नाम और फ़ोटो** — name as written on the board, optional Hindi name, front photo. The
   photo is the proof the visit happened.
3. **खाना** (restaurants only) — the five dietary questions as three-way controls:
   **yes · on request · no**. "On request" is the honest and most common answer for Jain and
   vrat, and flattening it to yes/no is how an app sends someone to a kitchen that cannot feed
   them. Plus the `FoodTag` chips that apply.
4. **मेनू** — menu photographs, as many as it takes. Curated content is fine for the MVP
   (CLAUDE.md), and a photograph of a real menu is better than a typed one: it carries prices,
   it carries Hindi and Arabic, and it cannot be mistyped.
5. **बाक़ी** — price for one, hours, delivery phone, a free note. Then submit.

Nothing on these screens blocks on the network. Photos go to IndexedDB as blobs, the report
queues, and the upload happens whenever signal returns — a basement restaurant in Deira is the
normal case, not the edge case.

## What the app must get right

- **Offline is not optional here either.** Same rule as the traveller app: a collector roams,
  and losing an hour's visits to a dead spot is how collectors stop trusting the tool.
- **A queued report is never silently lost.** The queue is visible, with its count, and a
  failed upload says so and stays queued. This is the same lesson as the traveller's 42 MB
  model: anything a person did work for is theirs until they discard it.
- **Duplicate guard on the spot.** Before capture, warn if a report already exists within
  ~40 m with a similar name. Two collectors working one street is the normal failure.
- **Collector accounts exist here and only here.** `apps/field` is staff software, so it has
  logins; the traveller app still has no account, no phone number and no email (decision 001).
- **The collector's own location is work data, not tracking.** Captured per report, at the
  moment of capture. No background location, no trail.

## From report to pack

```
collector → FieldReport (queued, on phone)
          → upload           → Supabase, status uploaded
          → review           → packages/content-tools: approve / reject with a note
          → approved         → Restaurant + Menu rows
          → publish          → data/restaurants/*.vN.json, ContentVersion bumped
          → traveller's app  → downloaded with the next pack
```

Review is a person looking at the photographs against the answers — the one check that catches
a collector who ticked "Jain: yes" without asking. Rejection carries a note, because a collector
who is told no without being told why makes the same mistake again.

## What filling it costs

This is the number that decides whether खाना ships with ten restaurants or four hundred.

|                               |                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Areas that matter first       | Karama, Bur Dubai, Deira/Al Rigga, Satwa, Discovery Gardens, International City, Al Qusais, Al Nahda |
| Outlets worth having per area | 40–60                                                                                                |
| Target for a usable tile      | **~400 outlets**                                                                                     |
| Realistic rate, with travel   | 15–20 outlets per collector-day                                                                      |
| **Total**                     | **~20–25 collector-days**                                                                            |

Two collectors for a fortnight fills the tile. That is a small, knowable cost, and it buys the
one thing competitors cannot copy quickly — which is a better reason to spend it than any
feature on the roadmap.

## Open decisions — these need the owner

1. **Does `apps/field` ship as a PWA or is it a page behind a login on the same domain?**
   A PWA gets offline and a home-screen icon, which collectors need. Recommend PWA.
2. **Who reviews, and how fast?** A day's collecting is ~35 reports. If review lags, collectors
   stop seeing their work land. Recommend same-day review by one person.
3. **Are collectors paid per outlet or per day?** Per-outlet pay and a four-minute form produce
   exactly the fraud the photographs are there to catch. Recommend per-day.
4. **Menu photographs and permission.** A shop owner letting us photograph a menu is the norm,
   but it should be asked, and the answer recorded on the report.
5. **Which comes first — this app, or seeding खाना by hand?** A hundred outlets typed in by us
   would unblock the tile's screens now. It does not scale, and it never becomes the pipeline.
   Recommend building the app, and seeding by hand only what is needed to develop against.
