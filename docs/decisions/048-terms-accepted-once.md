# 048 — Terms, privacy and refunds: accepted once, on the phone and on the website

**Date:** 30 September 2026 · **Status:** built

## The owner's ruling

Terms and conditions a traveller accepts on first open, and on the website what a live payment
account asks for: terms, privacy, refunds and cancellation, contact. His decisions:

- **The seller is Sixera Software Solutions**, a registered company. Contact:
  hello@saafarsaathi.in, WhatsApp +91 78421 78350, saafarsaathi.in.
- **No refunds.** One exception, stated: money taken and no pass arrived, or the same payment taken
  twice — that amount is refunded within 7 days, through Razorpay, to the method paid with.
- **Governing law: India. Courts: Chennai.**
- **जाना is not an offline map.** "I don't want people to think this is an offline map and they
  can search for any location and get disappointed." Said prominently: a route only to the places
  on our list, and what happens to any other place, exactly as the code does it.
- **The small print on घर** — "keep it as a small print, just to cover us legally", pointing to the
  website. One line, the smallest type on घर, under the pass tile, above the bar.

## What was built

- **One text, two places.** The words are catalogue keys (`terms.*`, `privacy.*`, `refund.*`,
  `contact.*`) in `hi.ts` and `en.ts`; `features/terms/terms.ts` is their order. The app shows them
  on **घर.10 · नियम और शर्तें** (`#/terms`), bundled, so they read offline. The website has the same
  words as `/terms`, `/privacy` and `/refund` (`apps/site/*.html`, served without the extension by
  `try_files $uri $uri.html …`). `features/terms/terms.test.tsx` fails when a page and the
  catalogues differ in either language. The prices are filled from `listPriceInr`, the one price
  rule, so they cannot drift from what the order charges.
- **Accepted with the same button.** The landing page and the one-time notice carry "जारी रखकर आप
  नियम और शर्तें मानते हैं" and "नियम और शर्तें पढ़ें" above their one button; pressing it accepts the
  data-use line (045) and the terms together. Before the app has started, घर.10 opens without the
  strip and the bar, like the landing page, and back returns to the page still waiting for its
  button.
- **A version, so existing phones are asked once.** `features/landing/consent.ts` keeps
  `saathi.terms` = `{ version, at }` in localStorage beside `saathi.dataConsent`, read before the
  first paint as before (no Dexie change). `TERMS_VERSION` is `2026-09-30`. A phone that accepted only
  the data-use line, or an older version, sees the notice once more; then never again for that
  version. Changing `TERMS_VERSION` is how a significant change is asked again — the terms say so.
- **The later way in is घर's small print** (the owner's choice, 30 September), and nowhere else:
  "नियम, निजता और रिफ़ंड — saafarsaathi.in/terms". The website's address is in the words; the tap
  opens घर.10, the same text offline. Its tap area reaches into the gap and padding around it so it
  clears 48px (rule 26) while drawing one 10px line; घर still does not scroll.
- **The website's footer** names the company and links the three pages and the contact section.
- Design rule 36 and the boards `Consent` (the one-time notice, now drawn), `HomeTerms` (घर.10),
  the landing page and the four घर boards; `check-screens.py` checks the line, the small print and
  जाना's sentence.

## How each claim was checked

Every sentence is true of the code on 30 September; what could not be checked was left out.

- जाना for a place not on the list: `GoScreen` says "यह जगह अभी साथी के पास नहीं है" and offers
  "टैक्सी से जाएँ", which opens 2.4 with the typed words as the destination — no Arabic (`name.ar`
  exists only for a known place) and no fare (`taxiFareBand` needs a known place).
- The timetable is RTA open data (the site's footer and 2.3's note already credit it); the abras are
  partly our own (036), so the sentence names the metro, bus and tram only. Fares: `fares.v1.json`,
  from the RTA's published fares.
- खाना: menus read off the card at review (033, 042), including a kitchen's own online menu, so the
  sentence says "visited, or from the kitchen's own online menu". पूछकर means the card did not say.
- The pass: `entitlement.ts` — nothing counts before a confirmed landing, `TRIAL_HOURS = 24`,
  `PAID_HOURS = 336` from landing, `isGated` false for anyone who paid, the hotel and documents read
  no pass; family passes end at `groupEndsAt`. Checkout opens with no method restriction
  (`purchase.ts`).
- Privacy: 045 and migration 0023 (text kept with the random id; बोलना's audio and board photos not
  kept; `orders-payer-purge` empties the payer record after 30 days); 043 and migration 0020
  (`app_events`, no IP — `collect` never reads `x-forwarded-for` — no coordinates, 180 days);
  0004/0017 (a country bucket, never a position); `maplink` (a short map link from a card goes to
  our server and is not stored); the feedback form and the website's form (023) keep a name and a
  number. The app shows the phone's id nowhere, so the deletion line promises no id.

## What was left out, because nothing in the code or the docs says it

That we never sell data; how long question-log text, बोलना's sentences, board readings or contact
messages are kept (no retention job exists for them); whether prices include taxes; a delivery
time for a pass after payment. The processors behind बोलना and the board reader are described, not
named: rule 25 keeps model and vendor names off the traveller's screens.
