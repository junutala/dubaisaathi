# Hand-off: finalise the screens, then build

Read, in this order, before touching anything:

1. `CLAUDE.md` — the working rules (**instructions are followed in their entirety**) and
   "The product, as decided".
2. `docs/design-rules.md` — 24 numbered rules; 11 are enforced by `design/check-screens.py`.
3. `docs/field-ledger.md` — every field on every screen and why. **No line, no field.**
4. `docs/decisions/001–004` — why the product deviates from `docs/product-concept.md`.
5. `design/generate-screens.py` — the single source of every screen. Read it top to bottom.

## Step 1 — finish the screen rework (generator is mid-edit; see the last WIP commit)

Already applied in the generator: the fourth tile ज़रूरी जानकारी (4.1–4.4), the status strip
injected on every screen after landing, the landing page gated on the download, home reduced
to the four tiles, मदद and the settings screen removed, pass screen updated, brand sheet
updated.

Remaining, in one pass:

- **The mic as the agent (rules 10–12, decision 004).** Put the mic back on home under the
  tiles and in the centre of the bottom bar, as one component (`data-tap="mic"`, ≥48px, the
  marigold glow). Remove the checker's rule that limits mics to 1.1/2.1/3.1. Add the
  _आपने कहा: …_ line at the top of 1.3, 2.1 and 3.3 for the mic-arrival state — one line, back
  one tap away.
- **Canvas and numbering.** `GROUPS`/`TITLES` at the bottom of the generator: replace
  `Emergency` with `InfoHome`, `InfoHotelAdd`, `InfoDocAdd`, `InfoDocView` titled
  `4.1 · ज़रूरी जानकारी`, `4.2 · ज़रूरी जानकारी › होटल जोड़ें`, `4.3 · … › दस्तावेज़ जोड़ें`,
  `4.4 · … › दस्तावेज़`; remove `Settings`; the घर group is `Pass`, `FamilyQR` only. Dark
  screens: `MainDark`, `FoodListDark`, `InfoHomeDark` (update `THEME_ONLY` near the top).
- **Checker.** `TILES` gains `ज़रूरी जानकारी` and loses `मदद`; `NO_HEADER` unchanged; add: the
  strip marker (`data-tap="validity"`) present on every screen except `Welcome`/`Brand`; home
  has exactly four tiles and one mic; no `#C62B2B` (red) on any screen except `Brand`.
- **Regenerate and verify:** `rm design/screens/*.dc.html && python3 design/generate-screens.py
&& SAATHI_THEME=dark python3 design/generate-screens.py && npm run verify`.
- **Republish to the same canvas** with the `design` skill: seed all `design/screens/*.dc.html`
  plus `canvas.json` with the title "Dubai Saathi Screens", then publish with
  `url: https://claude.ai/code/artifact/3e0e153e-76fe-4a9d-bf95-a5ca966848c5`,
  `contract: "0.1.31"`, favicon 🚕. Never create a new artifact.
- **Money screens (rules 25–28, decision 005).** The strip gains the रिचार्ज button in three
  of its four states. घर.1 becomes three states on one screen (before purchase / pass active
  with 7 दिन और बढ़ाएँ / expired) with UPI-same-phone and QR-someone-else-pays as the two
  ways to pay; add घर.1c पास चालू as the return from the aggregator. घर.2 becomes the three
  family QR codes, each marked free or used, with the WhatsApp line and the slot list.
- **Ledger and rules** are already written for the final state; if a screen ends up differing
  from the ledger, the screen is wrong, not the ledger.
- Commit with `npm run verify` green; push to `claude/affectionate-bohr-ppyrd3`.

Then stop and hand the canvas back for review by screen number.

## Step 2 — the technical spike (only after the screens are signed off)

Per `CLAUDE.md` "Current state": Android Chrome and iPhone Safari, no internet — Hindi/Hinglish
speech → `ParsedIntent` → Arabic phrase → Arabic voice. Scaffold `apps/pwa` with the gate
green from the first commit. Do not start feature screens until the spike has a result.

## Step 3 — the learning loop and the field app (after the spike)

- `VoiceEvent` and `FieldReport` are already typed in `packages/shared/src/entities.ts`; the
  rules are in `CLAUDE.md` under "Learning loop" and "Field collection".
- The learning loop is part of the voice pipeline from day one: every parse writes a
  `VoiceEvent` to the device, a sync job uploads when online, `packages/content-tools` mines
  them into new aliases and intents in `data/`.
- `apps/field` is a separate PWA for collectors, with accounts (the only place they exist),
  an offline queue, and photo capture. Its screens are designed the same way as the tourist
  app's — generator, ledger, checker — but it is a staff tool, so density over delight.

## How to work

- A list of instructions is a checklist, not a menu.
- Fix causes, not instances. If one screen is wrong structurally, fix the structure.
- Every screen self-explanatory in isolation: tile trail, back, home.
- When a new rule is agreed, add it to `docs/design-rules.md` (and the checker if it can be
  checked) before drawing the screen.
- Report by screen number. Say plainly what was done, what was left, and why.
