# Future strategy — Dubai's residents, and BharatSaathi

**Status:** parked, 28 September 2026. Nothing here is built until Dubai Saathi is stable. This
records the owner's two ideas and the market study he asked for **before** any of it starts, under
his rule: _"If there are apps and they are in the market or failed at some point, no use
developing."_

**A note on names.** This is an internal document, and the study names existing apps because a
market study without them is useless. The standing rule still holds everywhere a traveller or a
customer can read — the app, the website, `apps/field`: no other brand is ever named there, and
nothing in this file is to be quoted into them.

---

## The verdict first

Applying the owner's rule to each piece rather than to each audience, because every audience is
a bundle of pieces and the pieces fare differently:

| Piece                                                                | Already in the market, or failed?                                                                                                                                      | Verdict under the rule                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Translation between Indian languages, spoken or typed                | Yes — free: the government's Bhashini (all 22 scheduled languages), Google Translate, offline translators                                                              | **Do not build as a product**            |
| Reading a board from a photo                                         | Yes — free: Bhashini reads photographed text in Indian languages; Google's camera translates Arabic → Hindi and Tamil ↔ Telugu instantly                               | **Do not build as a product**            |
| A pilgrimage one-stop shop (bookings, puja, prasad)                  | Tried and failed: My Tirth India shut down in August 2024 after heavy losses                                                                                           | **Do not build**                         |
| Temple facts (timings, dress code, darshan)                          | Partly: each temple trust has its own app or portal, for its own temples only; state tourism apps list places in Hindi and English only                                | Only as part of a bundle                 |
| Where to eat, dish first, with the constraint honoured               | Not as such: listing and delivery apps list restaurants, English-first; a vegan/vegetarian listing app exists; no one is dish-first in the visitor's language, offline | **Gap — this is the product**            |
| All of it together, for one trip, offline, in the visitor's language | Nobody found                                                                                                                                                           | **Gap — worth doing after Dubai Saathi** |

So the honest reading is: **translation and board reading are features, never the reason to build
an app** — they exist free and they are good. What does not exist is the bundle, and at its centre
the thing Dubai Saathi is learning to do the hard way: field-collected kitchens with real menus,
searched by dish, in the traveller's language, working with no signal.

That applies to बोलना's own board reader too (decision 044): a free camera translator already turns
Arabic into Hindi. Ours earns its place only as part of the app the traveller already has open —
meaning rather than words, read aloud, and the text of what Indians photograph in Dubai.

---

## Idea 1 — Indians who live in Dubai: खाना and बोलना only

### How many

About **4.36 million Indians live in the UAE** (38% of the population, doubled in about a decade),
and **about 2 million of them in Dubai**. Dubai received about 2.2 million Indian _visitors_ in
2024 — so residents are roughly a year of visitors, present all year.

### What they would use

- **खाना, unchanged in spirit.** Residents know the city; what they miss is a dish from home — a
  Gujarati thali, Andhra meals, a Jain kitchen, a proper filter coffee — in a kitchen that is on
  no delivery app. It needs more ground: Al Nahda, International City, Sharjah's edge, JLT,
  Silicon Oasis, not only Karama and Bur Dubai.
- **बोलना, used differently.** The landlord, the clinic, a government counter, a notice on the
  building.
- **Not जाना, not जानना.** Residents know the metro and do not need the tourist's attractions.

### The market (study)

- **No app was found built for Indian residents of Dubai around food by dish plus Arabic help in
  Hindi.** Residents use the delivery apps, general translators, and community WhatsApp and
  Facebook groups.
- **The delivery field is crowded and has already had casualties.** Zomato sold its UAE delivery
  business to Talabat's owner in 2019 and shut the service in November 2022, redirecting users to
  Talabat — delivery there is a fight between very large players. खाना must stay out of it: no
  delivery, no marketplace (the scope guard), only the kitchens and dishes they do not show.
- **बोलना for residents fails the owner's rule on its own**: free translators already do it.

### Verdict

Worth doing **only as खाना-led**, and only once खाना has enough kitchens beyond the tourist
streets. बोलना comes along as a convenience, not as a reason.

### Decisions it will need

- **One app or two.** CLAUDE.md says one app; the natural reading is a resident mode inside Dubai
  Saathi (two blocks on घर, a yearly price) rather than a second listing.
- **Language.** Decision 007 limits input to Hindi and Hinglish. Kerala is the largest single
  source of Indians in the UAE; a resident product in Hindi only leaves out its biggest group.
- **Price.** The fourteen-day pass does not fit someone who lives there.

---

## Idea 2 — BharatSaathi: Indians travelling in India

The owner's example: a Telugu family visiting temples in Tamil Nadu, where more and more boards are
in Tamil only. Local eateries, the important places, and two-way translation.

### How many

- **2.95 billion domestic tourist visits in 2024**, up 17.5% on 2023 (Ministry of Tourism).
- Pilgrimage is a large and short-trip share: **Tirumala sees 30–40 million pilgrims a year**,
  Kashi Vishwanath over 20 million, Ayodhya about 50 million.

### Why now

- **Karnataka** approved an ordinance in January 2024 requiring 60% of commercial signage in
  Kannada; the Governor returned it, and a bill followed in the assembly.
- **Tamil Nadu** has told officials to issue government orders only in Tamil.
- **Puducherry** announced in March 2025 that shops must display their names in Tamil.

The visitor reads fewer boards than before — the owner's "in a lurch".

### The market (study)

| What exists                                         | What it does                                                                                                                | What it does not do                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Bhashini** (Government of India, free)            | Speech-to-speech in all 22 scheduled languages; photograph printed text in 25 Indian languages, translate it, read it aloud | No food, no places, no trip                                                              |
| **Google Translate / camera**                       | Instant camera translation, including Tamil and Telugu, some offline; conversation mode                                     | Generic; knows nothing about the temple or the kitchen                                   |
| **Offline translator apps** (for example TapSay)    | Offline translation across India's languages, sold for temples without signal                                               | Translation only                                                                         |
| **Sarvam's Indus** (February 2026)                  | An AI chat app for Indian languages                                                                                         | A general chatbot — what our scope guard says we are not                                 |
| **Temple trusts' own apps** (TTD; TN HR&CE portals) | Darshan and seva booking, timings, dress code, for their own temples                                                        | One trust each; nothing about food or language; HR&CE's app is for staff                 |
| **Ministry of Tourism / state tourism apps**        | Places to visit by state and district                                                                                       | Hindi and English only; no food, no translation                                          |
| **Vegetarian listing and pure-veg delivery apps**   | A worldwide vegan/vegetarian listing; a pure-vegetarian delivery app                                                        | Not dish-first, not in the visitor's language, not built around a temple town or offline |
| **My Tirth India** — _failed_                       | A pilgrimage one-stop shop: packages, online puja, astrologers, prasad delivery                                             | Shut down in August 2024 after heavy losses and a funding crisis                         |

### What the failure teaches

My Tirth India did not fail for want of pilgrims; it failed on the economics of doing services —
bookings, pujas, deliveries — with funding that ran out. That is exactly what our scope guard
already forbids. BharatSaathi, if built, stays **thin**: information that works offline, not
services that need staff and stock.

### Verdict

- **As "a translator for travellers": do not build.** It exists, it is free, it is good.
- **As a pilgrimage services platform: do not build.** It has been tried and has failed.
- **As the bundle — where to eat and what to know, for one circuit, in the visitor's own
  language, offline, with translation as one feature: a real gap**, and the one worth building
  after Dubai Saathi. Its moat is content, not technology, and the translation layer could come
  from Bhashini's open models rather than be built again.

### Decisions it will need

- **Input is not Hindi.** The visitor speaks Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali,
  Gujarati or Hindi — the opposite of decision 007, and a decision of its own.
- **Neutral, never Hindi-first.** _Your language ↔ their language._ A Hindi-first app in Tamil
  Nadu reads as the imposition the state is fighting.
- **The name.** "Bharat" is not neutral everywhere in the south; test it with a Tamil and a
  Kannada family before it goes on a store listing.
- **Packs per circuit**, downloaded once, because rural temples often have no signal — for
  example Madurai, Rameswaram, Thanjavur, Kumbakonam, Chidambaram.
- **Price and channel.** More price-sensitive than a Dubai visitor: a per-trip pass around ₹49–₹99,
  or through the tour operators who run pilgrimage packages.

---

## What Dubai Saathi must prove first

Before either idea starts, Dubai Saathi's own figures on /admin should show:

- the answer rate holding up with real travellers, not only the owner's testing;
- phones coming back on another day, and on another trip;
- whether offline is valued (the Offline Value verdict) — BharatSaathi's whole case rests on it;
- that field collection and menu reading scale beyond one person's walks.

## What is reused as it is

The matcher and its normaliser; content packs published without a release (decision 030);
`apps/field` and menu reading (decisions 029, 033, 041, 042); the offline map pipeline (decision 035) with another OpenStreetMap extract; बोलना and the board reader (decisions 020, 044); the
question log and product intelligence (decision 043).

---

## Sources

- [Gulf News — Indian expat population in UAE doubles to 4.36 million, more than half in Dubai](https://gulfnews.com/uae/people/indian-expat-population-in-uae-doubles-to-436-million-more-than-half-live-in-dubai-envoys-1.500129223)
- [DD News — Dubai's 2025 visitors, India a key market](https://ddnews.gov.in/en/dubai-welcomes-record-9-88-million-visitors-in-2025-india-remains-key-market/)
- [The National — Zomato to scrap UAE food delivery, customers redirected to Talabat](https://www.thenationalnews.com/uae/2022/11/15/zomato-uae-food-delivery-scrapped-talabat/)
- [Ministry of Tourism — India Tourism Data Compendium 2024](https://www.data.tourism.gov.in/mrd/Uploads/tourism_data/India%20Tourism%20Data%20Compendium%202024.pdf)
- [Dharmik Vibes — How Indians travelled in 2024 for religious purposes](https://blog.dharmikvibes.com/p/how-indians-traveled-in-2024-for-religious-travel)
- [HnayaSkills — My Tirth India: sacred vision to silent exit](https://hnayaskills.com/my-tirth-india-sacred-vision-to-silent-exit/)
- [Deccan Herald — 60% Kannada on all signboards, ordinance](https://www.deccanherald.com/amp/story/india%2Fkarnataka%2F60-kannada-on-all-signboards-karnataka-govt-to-issue-ordinance-2837678)
- [Deccan Herald — Governor returns the Kannada signage ordinance](https://www.deccanherald.com/amp/story/india%2Fkarnataka%2Fgovernor-rejects-ordinance-on-60-signage-in-kannada-2871822)
- [Deccan Herald — Tamil Nadu: government orders only in Tamil](https://www.deccanherald.com/india/tamil-nadu/issue-government-orders-only-in-tamil-tn-govt-tells-officials-3496917)
- [Business Today — Puducherry to order shops to display names in Tamil](https://www.businesstoday.in/india/story/out-of-love-and-respect-for-tamil-puducherry-to-order-shops-to-display-names-in-tamil-468325-2025-03-18)
- [Bhashini on Google Play](https://play.google.com/store/apps/details?id=com.dibd.bhashini&hl=en_IN) and [Bhashini — Wikipedia](https://en.wikipedia.org/wiki/Bhashini)
- [VentureBeat — Google Translate's camera reads Arabic, Hindi and 11 more languages](https://venturebeat.com/ai/google-translates-camera-now-reads-arabic-hindi-and-11-other-new-languages)
- [Fone Arena — Google Translate offline and instant camera translation in 7 Indian languages](https://www.fonearena.com/blog/249912/google-translate-offline-translation-indian-languages.html)
- [Business Today — Indus by Sarvam, a first look](https://www.businesstoday.in/technology/news/story/indus-by-sarvam-a-first-look-at-indias-homegrown-ai-chat-app-built-for-local-languages-517385-2026-02-21)
- [TapSay — translator app for India](https://tapsay.me/best-translator-app-for-india)
- [TTDevasthanams app](https://play.google.com/store/apps/details?id=com.ttdapp&hl=en), [TN HR&CE temple darshan booking](https://templedarshan.hrce.tn.gov.in/), [HRCE staff app](https://play.google.com/store/apps/details?id=com.thirukkoil.hrce&hl=en_IN)
- [India Tourism app on Google Play](https://play.google.com/store/apps/details?id=com.mittal.skmittal.incredibleindia&hl=en_IN)
- [HappyCow on Google Play](https://play.google.com/store/apps/details?id=com.hcceg.veg.compassionfree&hl=en_IN) and [Foodie — pure vegetarian food on Google Play](https://play.google.com/store/apps/details?id=com.hellios.foodie&hl=en)
