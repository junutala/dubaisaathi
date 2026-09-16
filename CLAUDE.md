# CLAUDE.md — Dubai Saathi

Guidance for Claude Code working in this repository. Read this before making changes.

## What this is

Dubai Saathi is an **offline information desk for Indian travellers in Dubai**, a PWA. Three
pillars — खाना (where to eat), जाना (how to get there), जानना (what to know) — plus the
traveller's own hotel and documents on the phone, all of it working with the network off.

> "A Dubai-savvy Indian friend in your pocket."

**There is no microphone anywhere in the app** (decision 016, 16 September). Three days on a
real phone proved no offline recogniser hears Dubai place names in an Indian accent inside a
Hindi sentence. Every box is typed into; the script-agnostic matcher is what runs on it.

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
- **Delivered means deployed.** Work that is committed, merged or "pushed" has reached nobody.
  See "Shipping" below: take it to production, and say plainly when it did not get there.
- **Fix causes, not instances.** If one screen is wrong for a structural reason, the
  structure is wrong everywhere — fix it everywhere in the same pass, not one screen per
  round of review.
- **Every screen must be self-explanatory in isolation.** A traveller arriving at any screen
  must be able to tell where they are and how they got there without being told. If a screen
  only makes sense because someone explained it, the screen is wrong.
- **Never tell a traveller their phone cannot do something until it has refused.** A capability
  query is not an answer. Browser APIs report partial lists, answer only after a user gesture,
  and hide themselves on insecure origins — so "the API did not say yes" is not the same as "the
  device cannot". Attempt the operation, let the device answer, and say what it actually said.
  This cost most of a day: five separate bugs on 13 September, every one of them the app deciding
  something was impossible instead of trying it, and every one of them found by a person holding
  a phone rather than by a test.
- **A fallback that is never reached is not a fallback.** If a preferred path can fail, something
  must walk to the next one. Writing the alternative and not wiring it in is worse than not
  writing it, because it reads as handled.
- **Never make a traveller learn our phrasing.** _"I cannot teach Hindi to my user."_ If two
  ordinary sentences mean different things and only one of them reaches the right screen, that is
  our defect, not their mistake. "Discovery Gardens jaana hai" is _show me the transport_ in a hotel
  room and _tell the driver_ at a taxi door, and the difference is not in the words — so the answer
  is never a cleverer rule, and never a required form of words. It is a screen that serves both
  readings and lets them pick.
- **A way out is not a way through.** A screen with buttons on it can still make the task
  impossible: the microphone screen offered रद्द करें and "type it instead" — two live controls,
  both of which threw the speech away — and no way to say "I have finished speaking" at all. When
  checking that a screen works, ask what finishes the task, not what leaves it.
- **A release never takes something away from a phone.** A traveller's 42 MB voice download was
  deleted by our own deployments: it shared a cache with a chunk whose name changes every build,
  under a four-entry limit. Five releases in an hour evicted it, and the app then told the owner
  his phone could not recognise Hindi. Anything a traveller waited for — a model, a document, a
  pass — is theirs until they delete it. Shipping is not a reason to reclaim storage.

## The product, as decided

Sprint 1 was frozen on 16 September; `docs/decisions/016` is the record and the artboards on
the canvas are the shape. What is built follows the boards; where a board and the code differ,
the board is wrong and is regenerated from `design/generate-screens.sh`.

- **Three pillars, named in Devanagari in both interface languages.** खाना · Khaana, जाना ·
  Jaana, जानना · Jaanna. They are the brand, never a translation. Home is the three of them as
  deep blocks in their own hue with cream type, in that order, and nothing else. Screens are
  numbered by pillar: 1.x खाना, 2.x जाना, 3.x जानना; घर.1–घर.4 are the strip's and the bar's
  children (hotel, documents, a document, the pass).
- **The top strip is on every screen.** The mark and the name (tap → home), online/offline, the
  pass dot, language, theme, and under them **the traveller's hotel** — photographs, room, the
  desk's number, a note, a pin; whatever they want to keep, without limit, on the phone only.
- **The bar is on every screen.** खाना · जाना · जानना · दस्तावेज़, the current pillar lit in its
  colour, and **पास लें** while the counter is a trial. The button goes once a pass is bought.
- **The pass stays and is never a wall.** The dot is green while the counter runs and marigold
  when the Dubai day is ending; never red (decision 002). From the twentieth hour of the Dubai
  day every open of घर nudges toward a pass. **A traveller who has paid once is never gated
  again**, however long ago the fourteen days ran out. Prices: ₹199 / ₹299 / ₹399 / ₹499 for
  1–4 phones, 14 days from landing (decision 006). Buying needs the order endpoint and the
  aggregator, which do not exist yet; until they do the buttons say so and nothing is gated.
- **खाना is dish first.** The dish is the search, the place is the answer: kitchens where a
  collector confirmed it first, kitchens of its kind after, nearest first. A constraint the
  traveller states (pure veg, Jain, no onion-garlic, vrat, open now) is honoured; a taste is
  never predicted. An answer nobody asked shows as पूछकर, never as a no. The menu is a **grid**
  of dishes and prices the collector read off the card by OCR, not a photograph.
- **Hours are Dubai's.** Open or closed is computed in Asia/Dubai, never on the phone's clock,
  and the row shows the closing time while open and the opening time while closed.
- **जाना is a box, a suggestion, and every way there.** A place we know goes to the options;
  a near spelling is a question ("क्या आपका मतलब बुरजुमान है?") carrying the place's own
  Devanagari name, never a transliteration of the traveller's letters; words we do not know go
  to the taxi screen as they are. Options carry time and fare, the steps carry the legs, and
  the taxi screen carries the Arabic name, the fare estimate, a Careem link and the store for a
  phone without it. The steps carry the RTA's own network: every bus route, both metro lines,
  the tram, the direction the vehicle is headed, and the first and last departure from the stop
  the traveller boards at (decision 017).
- **जानना is attractions only.** Hours, ticket, how long, whom to ring, a Hindi blurb, and a
  जाना button. No hotels or homestays. A line at the bottom lets the traveller name a place we
  missed; it goes into the question log for the next pack. **3.3 · काम की बातें is parked for
  Sprint 2.**
- **No login, no account, no gate.** Entitlement is keyed to the device. A pass is a signed
  token verified offline (decision 005). Location is asked at first need with the reason on the
  screen; a refusal gets one screen saying what will not work and what still does.
- **A traveller in India sees Dubai.** A phone fix outside Dubai is not "no route": the three
  pillars measure from the saved hotel's pin, or from BurJuman when there is no hotel, and every
  row and the options screen say so ("आप दुबई से बाहर हैं"). The trial clock is separate and
  still needs repeated readings inside Dubai; the stand-in never starts it.
- **Every command the app could not fulfil is captured** in the question log (`VoiceEvent`,
  the entity name kept), synced by the `collect` edge function, keyed to the device only.
- **Content is collected in the field** by our own people with `apps/field`: dietary answers
  asked in person, the menu read by OCR and confirmed dish by dish with the price the camera
  read, the area from the shared list, the number on the board, hours, price for one. The GPS
  is watched from the moment the form opens and saved with the report; there is no button for
  it.

## Non-negotiable rules

1. **Offline-first, not offline-enabled.** Every core user journey (search, transport, food,
   translation, map, emergency) must complete with the network fully off. Network is for
   freshness, payments, entitlement, sync and _optional_ cloud fallback only.
   If a feature cannot work offline, it is not a core feature — gate it, don't block on it.
2. **One app.** No separate online/offline builds or code paths that fork the UX.
3. **No LLM in the core path.** Predictable traveller commands are handled by local intent
   parsing + structured local data + rules + local search. Cloud LLM is an optional
   online-only fallback for out-of-intent questions. Never make a core screen depend on it.
4. **Input is Hindi-Hinglish only for the MVP; the interface is Hindi and English**
   (decision 007). The matcher understands Hindi and Hinglish and nothing else. The interface
   has two catalogues, every key in both, switched on the strip and following the phone by
   default. The three pillar names stay in Devanagari in both.
   **Hinglish is first-class, not a fallback** — real travellers say "Mujhe Karama jaana hai, metro se kaise jaaun?", not
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

   Do not add Telugu/Tamil/Malayalam/etc. Adding a third interface language is now a
   catalogue rather than a refactor — which is not a licence to add one.

5. **Intent accuracy is the KPI.** What matters is the right `{place, dish, constraint}` out
   of what was typed, in either script, with a mistyping answered by a question.
6. **The hotel and the documents never disappear.** They stay available offline, after the
   trial and after the pass — it is all on the device, and nobody who paid is ever gated.
7. **Map/tile licensing.** Never bulk-download public tile services for offline use. Only
   OSM-derived data or tiles whose terms explicitly permit offline/prefetch.
8. **Scope guard.** Dubai Saathi is _not_ hotel/flight booking, food delivery, a restaurant
   marketplace, an itinerary planner, a content portal, or a general AI chatbot. Push back on
   requests that drift there.

## Stack

| Layer        | Choice                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Frontend     | React + TypeScript, Vite                                                                          |
| PWA          | Service Worker + Workbox                                                                          |
| Local DB     | IndexedDB via Dexie.js                                                                            |
| Local search | FlexSearch or MiniSearch                                                                          |
| Maps         | MapLibre GL JS, offline vector tiles (OSM-derived)                                                |
| Routing      | Local precomputed routing graph (no routing API at runtime)                                       |
| Backend      | Supabase edge functions (Deno) — decision 011, replaces a Node service                            |
| Database     | Supabase Postgres. PostGIS not enabled: place data ships in the pack and is queried on the device |
| Auth         | None. Entitlement keyed to the device; family devices join by short-lived QR token                |
| Payments     | UPI-first INR aggregator (Razorpay / Cashfree / PhonePe PG): order → intent or QR → webhook       |
| Speech       | None. No recogniser, no synthesis, no microphone (decision 016)                                   |

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

1. खाना — dish-first search over collected eateries, the outlet with what a person was asked,
   the menu grid
2. जाना — place or address in, every way there with time and fare, the steps, the taxi hand-off
3. जानना — attractions with hours, tickets, how long, whom to ring, in Hindi
4. मेरा होटल — on the strip, whatever the traveller wants to keep, on the phone only
5. दस्तावेज़ — any document, without limit, on the phone only
6. The pass — free in India; 24 hours free on landing; ₹199 / ₹299 / ₹399 / ₹499 for 1–4
   phones, 14 days from landing; paid once, never gated
7. Device QRs — one signed pass per extra device (decision 005; the server side is not built)

Entitlement facts that affect code: trial starts on **confirmed arrival in Dubai** (repeated
GPS readings, never a single fix); the product is fully usable in India before purchase; family
devices share one expiry.

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

## Shipping — "done" means live, or it means nothing

**A change is not delivered until it is running at `dubai.saafarsaathi.in` and the owner can
open it on his phone.** Commits, branches, merges and green CI are steps on the way; none of
them is the destination. Saying "pushed" or "done" about work that is sitting on a branch reads
as delivery and is not — it cost this project ten days once, and an owner testing yesterday's
build while being told today's was shipped.

So, every time:

- **Take the change to production.** A pull request's logical end is a deployment, not a merge.
  If it is merged and not deployed, the task is not finished.
- **Say where it actually got to, every time, in plain words.** Not "pushed". Either
  _"live at dubai.saafarsaathi.in, deployed «when», open it and look"_, or _"NOT deployed —
  «reason»"_. If the deployment did not happen, or failed, or was skipped, **say so first and
  plainly**, before anything else in the message. An unmentioned non-deployment is a false
  report of completion.
- **Check, do not assume.** Read the deployment's status and the commit it actually built. A
  deploy that was triggered is not a deploy that succeeded, and a service can be building from
  a branch nobody has pushed to for a week.
- **Know which branch production builds from.** `main` is production: Railway builds
  `junutala/dubaisaathi` on `main` into the `production` environment, and a push to it deploys.
  Three services, three origins: `pwa` (deploy/Dockerfile) is the traveller's app at
  `dubai.saafarsaathi.in`; `outlet` (deploy/Dockerfile.field) is the collectors' app at
  `outlet.saafarsaathi.in`; `site` (deploy/Dockerfile.site, static, no build) is the one-page
  website at `saafarsaathi.in`. Work on any other branch reaches nobody until it is merged
  there. It built from a working branch until 14 September, which is how a day's work went
  live to no one — check the service source rather than trusting this line to stay current.
- **If deploying needs the owner, ask for that decision on its own** and do not bury it under a
  summary of the code. It is the only part he cannot do for himself by reading.

**A service worker outlives the deploy that installed it, and a domain remembers.** On 15
September `outlet.saafarsaathi.in` kept showing the traveller's app for six hours after the build
that fixed it — correct image, correct Dockerfile, correct commit, and the owner still looking at
the tourist tiles. Nothing was wrong with the server. A worker the traveller's app had registered
while it was briefly served there was answering every navigation from its own cache, so the
browser never asked. The http logs said so in one glance: twenty-three requests, all for `/sw.js`,
not one for the page.

So, when a deployment is provably correct and the screen still disagrees:

- **Read the http logs before touching the build again.** A request that never arrives cannot be
  fixed by changing what would have answered it. Requests for the worker script with no request
  for the page is that signature exactly.
- **Never let an SPA fallback answer `/sw.js`.** `try_files $uri /index.html` returning HTML to a
  worker update check is what made this permanent rather than temporary: the browser rejects the
  wrong content type, keeps the worker it has, and retries for ever. That path gets an exact-match
  location on every static host we run, and a real file behind it.
- **A wrong app served on a domain is not over when the deploy is fixed.** Whatever it registered
  is still out there on real phones. Serving a worker that unregisters itself is the only thing
  that reaches them; asking someone to clear site data is not a fix, it is a fix for one phone.

**Deployed to the server is not delivered to the phone, and only the phone counts.** A service
worker answers before the network, so a green deploy can sit unseen for days while the owner
tests the previous build and is told the new one is live. On 15 September that happened twice in
one morning on two different origins — the wrong app on one, a stale build on the other — and
the second was still running an hour after the first was "fixed", because only the instance was
fixed and not the cause. The traveller app's own nginx config carried a comment warning of
exactly this, in a file that had just been edited.

So delivery is a property of the app, not of the pipeline:

- **The app asks for updates; it does not wait to be told.** On launch, every half hour it stays
  open, and whenever the phone regains signal. The browser's own check can be a day away.
- **"Never mid-trip" means never mid-task, not never this session.** A new build is applied the
  moment the traveller is on घर, where there is no typed sentence and no half-finished journey to
  lose. Reading it as "next launch only" is what made releases arrive a launch late.
- **When a stale worker is found on one origin, check every origin.** The same defect wears
  different costumes: "wrong app" and "old build" are one bug.

**A missing style is invisible to every other check.** खाना shipped with its whole outlet card
unstyled — eleven classes in the JSX with no rule behind any of them — so the name ran into the
distance and the tags concatenated into "Pure vegVegEgglessNo onion". Nothing failed: a missing
rule is not a type error, a test failure or a lint. `npm run check:classes` now fails the build
when a className has no CSS, and it runs inside `npm run verify`.

A release also never takes something away from a phone (see the rule above): a deploy must not
evict a traveller's voice model, documents or hotel. That is a property of what is shipped, and
it is checked before shipping, not after.

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
├── design/                # generator/ + generate-screens.sh → screens/*.dc.html — the design source of truth
├── data/                  # CONTENT, not code — seed JSON, versioned, loaded into IndexedDB
│   ├── places/            # attractions (जानना)
│   ├── intents/           # DubaiPlace aliases and keywords for the matcher
│   ├── restaurants/       # Restaurant, dishes, FoodTag
│   ├── transport/         # TransportNode, TransportEdge, fares
│   ├── phrases/           # Phrase: Hindi → Arabic, by situation
│   └── emergency/         # EmergencyPoint
├── apps/
│   ├── pwa/               # the React + TS + Vite client — the product
│   ├── field/             # collectors' PWA: FieldReport capture, offline queue, upload
│   └── site/              # the one-page website at saafarsaathi.in — static, Hindi and English
├── supabase/              # the backend (decision 011) — replaces apps/api
│   ├── migrations/        # the five tables: devices, families, passes, orders, voice_events
│   ├── functions/         # edge functions: sign a pass, bind a slot, take a webhook, take a queue
│   └── tests/             # SQL that checks what the schema must refuse
└── packages/
    ├── shared/            # entity types shared by pwa and api — one definition, imported twice
    └── content-tools/     # build/validate/version the pack; review FieldReports; mine VoiceEvents
```

Inside `apps/pwa/src/`, organise by domain, not by technical layer:

```
src/
├── app/            # shell, routing, providers, service-worker registration
├── features/
│   ├── ask/        # the box, the script-agnostic matcher, the question log and its sync
│   ├── food/       # 1 · खाना
│   ├── transport/  # 2 · जाना
│   ├── know/       # 3 · जानना
│   ├── info/       # घर.1–घर.3 — the hotel and the documents
│   ├── pass/       # घर.4 — trial, pass, entitlement
│   ├── home/       # घर
│   └── landing/    # L
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

- `design/generate-screens.sh` generates every screen from one set of tokens, icons and chrome
  in `design/generator/`; `design/screens/*.dc.html` is its output. Edit the generator, never
  the output.
- `design/check-screens.py` runs inside `npm run verify` and fails the build when a screen
  breaks an agreed rule. When a rule is agreed, it is added here first.
- `docs/design-rules.md` — every agreed rule, numbered, marked checker or review.
- `docs/field-ledger.md` — every field on every screen with the one line that earns its place.
  A field with no line does not exist. Write the line before adding the field.
- `docs/decisions/` — why the product deviates from the concept doc where it does.
- The reviewed canvas: https://claude.ai/code/artifact/3e0e153e-76fe-4a9d-bf95-a5ca966848c5
  — republish to that URL, never a new one.

## Start here (written 16 September, end of day)

**Sprint 1 is built to the frozen boards** (decision 016): three pillars, the hotel on the strip,
documents in the bar, the pass as a dot, no microphone. `npm run verify` is green. What is left
is the server and the content, in this order:

1. **Buying a pass.** The `orders` table exists; no function creates an order, takes the
   aggregator's webhook or signs a pass. Until it does, `VITE_PURCHASE_LIVE` stays off, the
   buttons on घर.4 say so, and nothing is gated.
2. **The RTA feed is in, and it is the wrong year.** `data/transport/rta-gtfs.zip` is the
   September 2021 edition Transitland mirrors, converted by `npm run publish:transport` into
   the pack (160 lines, 2,499 stops, 6,435 hops, first and last departure per stop and line).
   The current edition is on Dubai Pulse, `rta_gtfs-open`, last updated 21 January 2026, as
   `gtfs.7z`: extract it, zip the `.txt` files, replace `rta-gtfs.zip`, re-run. The converter
   already takes a zip with a folder inside, a feed with only `calendar_dates.txt`, and
   `frequencies.txt` (decision 017). Weekend times are not carried.
3. **Content.** `restaurants.v1.json` is empty and खाना runs on the fixture; the collectors'
   app is live and the pipeline publishes approved reports. `attractions.v1.json` carries hours
   and tickets as known on 16 September, unchecked on the ground; every row has `checkedAt`.
4. **3.3 · काम की बातें** is parked for Sprint 2, on the canvas's second page.

The question log is the thing to read first each morning: `voice_events` rows with
`nothing-in-pack` are places and dishes travellers asked for and did not get.

## The spike, for the record

Offline Hindi speech was measured on a real phone in aeroplane mode on 13–15 September with
Vosk small and Whisper base, and online with Google's recogniser. All three mangled Dubai place
names in an Indian accent inside a Hindi sentence; nothing at a size a traveller accepts did
better. `docs/spikes/002` holds the numbers. The decision (016) is that there is no voice in the
product; the seam that would take an engine back is gone with it, on purpose.
