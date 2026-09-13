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
6. **Emergency layer never disappears.** It stays available offline, after trial expiry, and
   after pass expiry.
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
| Auth         | Phone/email OTP                                                                                  |
| Payments     | INR gateway (UPI + cards)                                                                        |
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
`Menu`, `TransportNode`, `TransportEdge`, `Route`, `Phrase`, `EmergencyPoint`, `ContentVersion`.
Reuse these names in code and schema rather than inventing synonyms.

## MVP features (the whole scope)

1. Ask / search — "How do I get to Bur Dubai?"
2. Offline transport — metro, tram, bus, walking, taxi estimate, multimodal
3. Indian food — vegetarian, Jain, Sattvik, no onion/garlic, eggless, vrat, quick snacks
4. Communication — Hindi/Hinglish → Arabic text + optional Arabic speech
   ("Say it for me" / "Show this to the driver")
5. Offline map — location and route context with no network
6. Emergency — always available
7. Trip pass — 24h Dubai trial; ₹199 solo / 7 days; ₹399 family / 7 days / 4 devices
8. Family QR — short-lived one-time activation token, shared expiry, revocable devices

Entitlement facts that affect code: trial starts on **confirmed arrival in Dubai** (repeated
GPS readings / geofence confidence, never a single fix); the product is fully usable in India
for testing before purchase; family devices share one expiry; QR carries a token, never
entitlement.

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
│   └── api/               # thin Node + TS backend (accounts, pass, entitlement, content)
└── packages/
    ├── shared/            # entity types shared by pwa and api — one definition, imported twice
    └── content-tools/     # build/validate/version the offline data pack
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

## Current state

Greenfield. Nothing scaffolded yet.

The very first commit of code must land the quality gate with it — ESLint (`--max-warnings 0`),
Prettier, `tsc --noEmit`, the test runner, an `npm run verify` script and a CI workflow that
runs it. Gates added after the fact never catch up.

Immediate priority per the concept doc is then the **technical spike**, before broad feature
work:

1. Android Chrome PWA, no internet: Hindi speech → intent
2. iPhone Safari PWA, no internet: Hindi speech → intent
3. Intent → Arabic phrase, locally
4. Arabic phrase → Arabic voice, locally

**PWA decision gate:** stay pure PWA only if browser offline Hindi STT is good enough on both
Android and iOS. If it is not, a thin native speech wrapper is acceptable — the USP beats
architectural purity. Do not treat "must remain 100% PWA" as settled.
