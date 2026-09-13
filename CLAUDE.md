# CLAUDE.md — Dubai Saathi

Guidance for Claude Code working in this repository. Read this before making changes.

## What this is

Dubai Saathi is an **offline-first PWA travel companion for Indian travellers in Dubai**.
It helps a traveller get somewhere, find food that fits their dietary needs, and communicate
in Arabic — in Hindi, without internet.

> "A Dubai-savvy Indian friend in your pocket."

Full product concept (source of truth for scope, pricing, GTM, data entities):
**[`docs/product-concept.md`](docs/product-concept.md)** — consult it before designing a feature.
This file is the working summary; the concept doc wins on any detail it covers.

## How to work on this project

> **Instructions MUST be followed in their entirety. Do not pick and choose.**

- **Discussion is where ideas belong.** Alternatives, objections and better options go there,
  before a decision. Say what you think, and say it plainly.
- **Once the discussion is over, the decision is the spec.** Build it as given. No options,
  no variants, no "I kept X because I thought it was better". That conversation already
  happened.
- **A list of instructions is a checklist, not a menu.** If five things are asked for, five
  things are done. Partially applying a list is a failure, not a judgement call.
- **If an instruction cannot be done, say so and stop.** Never silently substitute your own
  choice for the one you were given.
- **Fix causes, not instances.** If one screen is wrong for a structural reason, the
  structure is wrong everywhere — fix it everywhere in the same pass, not one screen per
  round of review.
- **Every screen must be self-explanatory in isolation.** A traveller arriving at any screen
  must be able to tell where they are and how they got there without being told. If a screen
  only makes sense because someone explained it, the screen is wrong.

## The product, as decided

These decisions were made in design review and override the concept doc where they differ.
The reasoning for each deviation is in `docs/decisions/`.

- **Four tiles, and everything else is a child of one.** Home is रास्ता · खाना · बोलना ·
  ज़रूरी जानकारी, plus the mic. Every other screen belongs to a tile and is numbered
  `tile.child` (1.3, 4.2); the two screens the status strip opens are `घर.1` पास and
  `घर.2` परिवार. Screen names use the tile names, never invented labels.
- **The mic is the AI agent, and it is one thing everywhere.** On home and in the bar of every
  child screen the mic means _ask Saathi anything_: speech → local intent → the right screen
  with the answer already on it. "Dubai Marina Mall jaana hai" opens 1.3 with the options;
  "driver ko bolo hotel le chalo" opens 3.3 with the hotel card; "Jain khana kahaan milega"
  opens 2.1 with जैन on. One-word ambiguity gets a two-button question, never a dead end. The
  landing screen shows what was understood (_आपने कहा: …_) with back one tap away. The mics
  on 1.1, 2.1 and 3.1 are the same mic biased toward that tile.
- **No emergency feature.** A tourist in distress reaches for the phone dialler and the hotel
  reception, not a seven-day app, and offline opening hours for clinics are a liability. The
  fourth tile is **ज़रूरी जानकारी** — the calm shelf: the hotel, documents, the consulate, and
  one line of numbers (an Indian otherwise dials 100). Red is reserved and appears on no screen.
- **मेरा होटल is the tourist's first SOS.** Captured by pinning where they stand, photographing
  the reception's card, or photographing the entrance — never typed. The card photo _is_ what
  gets shown to the driver.
- **Documents: any document, one photo, one name.** Insurance, passport, return flight —
  the tourist decides. Stored **on the device only**, never uploaded, kept until the tourist
  deletes it. The app requests persistent storage (`navigator.storage.persist()`) so the
  browser does not evict it under storage pressure. ज़रूरी जानकारी stays usable after the pass
  ends, because all of it is local.
- **No login, no account, no gate.** Entitlement is keyed to the device. Nothing in the app
  asks for a phone number or email.
- **A pass is a signed token on the device.** The server signs `{pass id, kind, slot, expiry}`;
  the app verifies it offline with the public key shipped in the app. Validity is never checked
  against the server — the strip reads the signature.
- **Paying: UPI first, by order, not by VPA.** The app asks the server for an order carrying the
  device id; the aggregator returns a UPI intent (same phone — the tourist's UPI app opens with
  the amount) and an order QR (someone else pays — the son in Pune scans it). The aggregator's
  webhook marks the order paid; the server issues the signed pass; the app, polling the order,
  flips the strip. Creating the order needs the tourist's phone online for a moment. A raw UPI
  QR (a VPA) is never used: it cannot be tied to a device.
- **A multi-device pass = one signed pass per device at purchase.** One installs on the
  buyer's phone; the others are QR codes on घर.2, each carrying `family id · slot · Counter
Off Time · signature`. A member scans one — **fully offline** — the app verifies the signature and
  installs the pass with the same end date. A QR can be sent as an image on WhatsApp to a
  member arriving separately; the website sells the same one or four QRs for someone in India
  buying for people already in Dubai. Reconciliation on sync: each phone reports its slot; a
  second phone reporting an already-bound slot is rejected at its next sync. हटाएँ on घर.2
  drops a binding server-side and kills that phone's pass at its next sync.
- **One number runs entitlement: the Counter Off Time.** Install → +365 days (free in India for
  a year of trying). **Land in Dubai** → +24 hours. Pay → +14 days **from landing** — the counter
  never starts outside Dubai; a pass bought in India waits for landing. A paid pass extinguishes
  the trial. Recharge on a running counter adds 14 days to it; on an expired one, starts now.
  Landing is detected offline: the GPS geofence, or the phone's clock switching to Gulf time.
- **Pricing (overrides the concept doc, decision 006):** ₹199 / ₹299 / ₹399 / ₹499 for 1 / 2 /
  3 / 4 named devices, 14 days — ₹199 plus ₹100 per extra phone; no combination of smaller
  packs beats a bigger one. Above four: _contact us_ (a WhatsApp link; this is the tour-operator
  lead). The multi-device passes issue one signed QR per extra device at purchase, all with the
  master Counter Off Time. The strip carries a **रिचार्ज** button in the trial, last-day and
  expired states; in the days-left state it stays quiet.
- **Location is the one permission the app needs, and the design says so.** Asked at first
  need — the first time 1.1 opens — with the reason on the screen: _रास्ता बताने के लिए साथी को
  आपकी जगह चाहिए._ Denied: one screen saying what will not work (रास्ता from here, आस-पास,
  hotel pin, landing) with a button to the phone's settings, then the rest of the app carries
  on without nagging. GPS never overrides the phone's permission; nothing does.
- **The landing page gates on the pack.** First open downloads the whole offline pack with time
  remaining shown; _शुरू करें_ enables only when complete. Updates download silently while the
  app is open and apply on the landing page at the next launch — never mid-trip.
- **A status strip tops every screen after landing.** Left: online/offline. Middle: plan
  validity as a depleting line with four states (before Dubai / trial / pass / expired),
  tapping it opens घर.1. Right: the theme switch. Same component, same place, every screen.
- **Theme follows the phone by default**, with the manual switch on the strip. Browsers cannot
  read the ambient light sensor; the phone's own dark-mode schedule is the automatic path.
- **Permissions at first use.** Location the first time 1.1 opens, microphone the first time it
  is tapped. Never on the landing page.
- **Dropped, and why:** find-my-family (location sharing needs a connection on both phones and
  a PWA cannot track location in the background); SOS to a contact in India (without a local
  plan, outgoing SMS is not available, and the product's promise is offline).
- **Drivers.** Many Dubai taxi drivers now speak only Arabic (Egyptian and African drivers are
  common; South Asian drivers less so). Spoken Arabic (TTS) matters as much as the text.
- **Every command the app could not understand or fulfil is captured.** The learning loop:
  transcript, script, what the parser produced and how confident it was, which screen opened,
  and what the tourist did next (backed out within seconds, retried, picked the other option
  in a clarifier). Queued on the device, synced when online, keyed to the device only. This is
  the data that retrains aliases and intents — see "Learning loop" below.
- **Content is collected in the field by our own people**, with a small separate app
  (`apps/field`): restaurant photo, menu photos, Jain / vrat / Sattvik availability asked in
  person, delivery number, hours, price band, GPS. Reviewed, then published into the pack.

## Non-negotiable rules

1. **Offline-first, not offline-enabled.** Every core user journey (search, transport, food,
   translation, map, emergency) must complete with the network fully off. Network is for
   freshness, payments, entitlement, sync and _optional_ cloud fallback only.
   If a feature cannot work offline, it is not a core feature — gate it, don't block on it.
2. **One app.** No separate online/offline builds or code paths that fork the UX.
3. **No LLM in the core path.** Predictable traveller commands are handled by local intent
   parsing + structured local data + rules + local search. Cloud LLM is an optional
   online-only fallback for out-of-intent questions. Never make a core screen depend on it.
4. **Hindi-Hinglish only for the MVP.** One language surface, and **Hinglish is first-class,
   not a fallback** — real travellers say "Mujhe Karama jaana hai, metro se kaise jaaun?", not
   textbook Hindi. So:
   - Accept Devanagari and Roman-script Hindi interchangeably, freely mixed with English words
     (`metro`, `taxi`, `mall`, `vegetarian`, `restaurant`, `airport`).
   - Every place name, food term and intent keyword needs Roman **and** Devanagari aliases, plus
     common misspellings, in the data — `Karama` / `करामा` / `Karma` / `Qarama` all resolve.
   - The intent parser is script-agnostic: normalise to a comparison form before matching,
     never branch on script.
   - Test fixtures must include mixed-script input. A parser test that only feeds pure Devanagari
     does not reflect a real user.
   - Responses go out in Hindi. Input is wherever the user actually lives.

   Do not add Telugu/Tamil/Malayalam/etc. Keep language handling pluggable, but ship
   Hindi-Hinglish only.

5. **Intent accuracy > transcription accuracy.** For voice, the KPI is correct
   `{intent, destination, mode, dietary}` extraction, not a perfect transcript.
6. **ज़रूरी जानकारी never disappears.** The hotel, documents, consulate and numbers stay
   available offline, after trial expiry, and after pass expiry — it is all on the device.
7. **Map/tile licensing.** Never bulk-download public tile services for offline use. Only
   OSM-derived data or tiles whose terms explicitly permit offline/prefetch.
8. **Scope guard.** Dubai Saathi is _not_ hotel/flight booking, food delivery, a restaurant
   marketplace, an itinerary planner, a content portal, or a general AI chatbot. Push back on
   requests that drift there.

## Stack

| Layer        | Choice                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Frontend     | React + TypeScript, Vite                                                                         |
| PWA          | Service Worker + Workbox                                                                         |
| Local DB     | IndexedDB via Dexie.js                                                                           |
| Local search | FlexSearch or MiniSearch                                                                         |
| Maps         | MapLibre GL JS, offline vector tiles (OSM-derived)                                               |
| Routing      | Local precomputed routing graph (no routing API at runtime)                                      |
| Backend      | Node.js + TypeScript                                                                             |
| Database     | PostgreSQL + PostGIS                                                                             |
| Auth         | None. Entitlement keyed to the device; family devices join by short-lived QR token               |
| Payments     | UPI-first INR aggregator (Razorpay / Cashfree / PhonePe PG): order → intent or QR → webhook      |
| Hindi STT    | sherpa-onnx / IndicConformer (primary); Vosk Hindi (baseline); Whisper (accuracy reference only) |
| TTS          | Device TTS first; sherpa-onnx if device TTS is inadequate                                        |

Deviating from this table needs a reason recorded in `docs/decisions/`.

## Architecture split

**Client owns** everything needed to answer the common traveller request: local DB, local
search index, routing graph, offline tiles, phrase/intent engine, GPS, audio, saved places.

**Backend owns only** accounts, payments, pass activation, family/device entitlements,
content versioning + updates, analytics, and optional online fallback. Keep the backend thin —
it is a cost and failure surface, not a dependency of the core experience.

## Data entities

`User`, `Device`, `Pass`, `Family`, `FamilyDevice`, `DubaiPlace`, `Restaurant`, `FoodTag`,
`Menu`, `TransportNode`, `TransportEdge`, `Route`, `Phrase`, `EmergencyPoint`, `ContentVersion`,
plus `VoiceEvent` (the learning loop) and `FieldReport` (field collection, pre-review).
Reuse these names in code and schema rather than inventing synonyms.

## Learning loop

The intent parser will be wrong, and the only way to make it less wrong is to see where.
Every voice interaction produces a `VoiceEvent`; the ones that matter are the failures:

- `intent = unknown`, or confidence below the routing threshold
- a clarifier was shown (and which option was picked, or none)
- the tourist backed out of the landing screen within a few seconds, or retried immediately
- a destination, dish or document name that resolved to nothing

Rules: stored on the device first, synced when online, never blocks the tourist. Keyed to the
device id only. Transcript text always; a short audio clip only for failures, only with a
one-time consent line, deleted from the device after sync. The STT engine and model version
travel with every event so a regression is visible. Reviewed in `packages/content-tools`;
the output is new aliases, new phrases and new intents in `data/`, versioned like any content.

## Field collection

`apps/field` is a second, separate PWA for our own collectors — not tourists. It is the one
place accounts exist (collectors are staff). Offline-capable, because collectors roam: a
`FieldReport` is filled in at the restaurant (photos of the front and the menu, the dietary
questions asked in person — Jain, vrat, Sattvik, no onion/garlic, eggless — delivery number,
hours, price for one, GPS captured on the spot), queued, and uploaded when online. Nothing a
collector submits reaches the tourist pack unreviewed: a report is approved in
`packages/content-tools`, becomes a `Restaurant` + `Menu`, and ships in the next
`ContentVersion`. The same form covers places, pharmacies and hotels with fewer fields.

## MVP features (the whole scope)

1. Ask / search — "How do I get to Bur Dubai?"
2. Offline transport — metro, tram, bus, walking, taxi estimate, multimodal
3. Indian food — vegetarian, Jain, Sattvik, no onion/garlic, eggless, vrat, quick snacks
4. Communication — Hindi/Hinglish → Arabic text + optional Arabic speech
   ("Say it for me" / "Show this to the driver")
5. Offline map — location and route context with no network
6. ज़रूरी जानकारी — hotel (pin / card photo / entrance photo), documents (on-device),
   consulate, numbers; usable after expiry
7. Trip pass — free in India; 24h free on landing; ₹199 / ₹299 / ₹399 / ₹499 for 1–4 named
   devices, 14 days from landing; contact us above four
8. Device QRs — one signed pass per extra device, same Counter Off Time, scanned offline

The mic is not a feature on this list because it is the way into all of them.

Entitlement facts that affect code: trial starts on **confirmed arrival in Dubai** (repeated
GPS readings / geofence confidence, never a single fix); the product is fully usable in India
for testing before purchase; family devices share one expiry; a family QR carries a signed
pass for one slot, bounded by the master expiry and reconciled on sync (see
`docs/decisions/005`).

## Working conventions

- TypeScript strict. No `any` in new code.
- Colocate feature code by domain (`transport/`, `food/`, `phrases/`, `emergency/`,
  `pass/`, `map/`, `voice/`) rather than by technical layer.
- All user-facing strings go through the i18n layer — never hardcode Hindi or English in JSX.
- Any new persisted data needs a Dexie schema version bump and a migration.
- Content (places, restaurants, phrases, transport) is **data, not code**: seed files under
  `data/`, versioned via `ContentVersion`, loaded into IndexedDB. Do not hardcode content in
  components.
- Test the offline path explicitly. A feature test that only passes with network is incomplete.
- Curated content is fine for the MVP (including menu photographs) — don't block a feature on
  a live data source.

## Code quality gates

**Lints must never accumulate.** A clean checkout runs clean, and every change leaves it clean.

- Before any commit, run the full gate and get zero output:
  `npm run lint && npm run typecheck && npm run test && npm run build`
  (`npm run verify` runs all four — use it.)
- **Zero-warning policy.** ESLint runs with `--max-warnings 0`. A warning is a failure. Do not
  raise the threshold, and do not commit with a red gate "to fix later".
- Never silence a finding to get green. `eslint-disable`, `@ts-expect-error` and `as unknown as`
  need a one-line comment saying _why_, and are only acceptable at a genuine external boundary
  (a browser API, an untyped dependency). Blanket file-level disables are not acceptable.
- Fix the lint you touched _and_ any lint your change exposes in the same file. Leaving a file
  dirtier than you found it is a regression.
- Formatting is not a judgement call: Prettier decides. Never hand-format around it or argue
  with it in review.
- CI runs the same gate on every push. If CI is red, that is the task — nothing else lands
  until it is green.
- Dead code goes. No commented-out blocks, no unused exports, no `TODO` without an owner and a
  reason.

## Repository layout

Structured for reference: you should be able to guess where something lives from its name.

```
dubaisaathi/
├── CLAUDE.md              # this file — working rules
├── README.md              # what it is, how to run it
├── docs/
│   ├── product-concept.md # source of truth for product scope
│   ├── decisions/         # one ADR per non-obvious choice: NNN-short-title.md
│   └── spikes/            # spike findings, incl. the Hindi STT benchmark results
├── design/                # screen designs (.dc.html artboards) — the design source of truth
├── data/                  # CONTENT, not code — seed JSON, versioned, loaded into IndexedDB
│   ├── places/            # DubaiPlace
│   ├── restaurants/       # Restaurant, Menu, FoodTag
│   ├── transport/         # TransportNode, TransportEdge, fares
│   ├── phrases/           # Phrase: Hindi → Arabic, by situation
│   └── emergency/         # EmergencyPoint
├── apps/
│   ├── pwa/               # the React + TS + Vite client — the product
│   ├── field/             # collectors' PWA: FieldReport capture, offline queue, upload
│   └── api/               # thin Node + TS backend (entitlement, content, voice events, field)
└── packages/
    ├── shared/            # entity types shared by pwa and api — one definition, imported twice
    └── content-tools/     # build/validate/version the pack; review FieldReports; mine VoiceEvents
```

Inside `apps/pwa/src/`, organise by domain, not by technical layer:

```
src/
├── app/            # shell, routing, providers, service-worker registration
├── features/
│   ├── ask/        # feature 1 — ask/search entry point
│   ├── transport/  # feature 2
│   ├── food/       # feature 3
│   ├── phrases/    # feature 4 — say-it-for-me / show-to-driver
│   ├── map/        # feature 5
│   ├── emergency/  # feature 6
│   ├── pass/       # features 7 + 8 — trial, purchase, family QR
│   └── voice/      # mic, STT, intent parser, TTS — used by the features above
├── db/             # Dexie schema + migrations, one file per version bump
├── i18n/           # all user-facing strings; nothing hardcoded in components
└── lib/            # genuinely cross-cutting helpers only, no feature logic
```

Rules that keep this navigable:

- A feature folder owns its UI, hooks, logic and tests together. Cross-feature imports go
  through a feature's `index.ts` barrel, never deep into its internals.
- `lib/` is not a dumping ground. If it is used by one feature, it belongs in that feature.
- One concept, one home. Before adding a file, check whether the thing already has a place.
- File names say what they are, not what they are made of: `routePlanner.ts`, not `utils.ts`.
- Every non-obvious decision gets a short ADR in `docs/decisions/` so the next reader does not
  have to reverse-engineer the reasoning.

## Design baseline

The screens are the design source of truth and live in `design/`:

- `design/generate-screens.py` generates every screen from one set of tokens, icons and
  components; `design/screens/*.dc.html` is its output. Edit the generator, never the output.
  Run it twice: plain for light, `SAATHI_THEME=dark` for the dark variants.
- `design/check-screens.py` runs inside `npm run verify` and fails the build when a screen
  breaks an agreed rule. When a rule is agreed, it is added here first.
- `docs/design-rules.md` — every agreed rule, numbered, marked checker or review.
- `docs/field-ledger.md` — every field on every screen with the one line that earns its place.
  A field with no line does not exist. Write the line before adding the field.
- `docs/decisions/` — why the product deviates from the concept doc where it does.
- The reviewed canvas: https://claude.ai/code/artifact/3e0e153e-76fe-4a9d-bf95-a5ca966848c5
  — republish to that URL, never a new one.

## Current state

Tooling and the quality gate are in place (`npm run verify`, CI). `packages/shared` holds the
entity types and the `ParsedIntent` contract. No app code yet.

The screen set is mid-rework in `design/generate-screens.py` (see the last commit): the
fourth tile, status strip, landing gate and home are applied; the universal mic, the canvas
layout for the 4.x screens, the checker and the docs are the remaining steps before the
screens are regenerated and republished.

After the screens are final, the priority is the **technical spike**, before broad feature
work:

1. Android Chrome PWA, no internet: Hindi speech → intent
2. iPhone Safari PWA, no internet: Hindi speech → intent
3. Intent → Arabic phrase, locally
4. Arabic phrase → Arabic voice, locally

**PWA decision gate:** stay pure PWA only if browser offline Hindi STT is good enough on both
Android and iOS. If it is not, a thin native speech wrapper is acceptable — the USP beats
architectural purity. Do not treat "must remain 100% PWA" as settled.
