# Two more audiences — Dubai's residents, and BharatSaathi

**Status:** parked, 28 September 2026. Not for now: nothing here is built until Dubai Saathi is
stable. This is the owner's idea written down with a first market study, so it is not lost and is
not started by accident.

**A note on names.** This is an internal document, and the study below names existing apps
because a market study without them is useless. The standing rule still holds everywhere a
traveller or a customer can read: the app, the website and `apps/field` never name another brand.
Nothing in this file is to be quoted into any of them.

---

## The idea

Dubai Saathi is built from parts that are not about Dubai: a matcher that understands how people
actually type, offline content packs, field-collected kitchens with menus read off the card, an
offline map, a microphone that translates a whole sentence, and product intelligence that shows
what people asked for and did not get. Two other audiences could use the same parts.

1. **Indians living in Dubai** — खाना and बोलना only.
2. **Indians travelling inside India, to a state whose language they do not read** — the owner's
   example: a Telugu family visiting temples in Tamil Nadu, where more and more boards are in
   Tamil only. Local eateries, the important places, and two-way translation through बोलना.
   Working name: **BharatSaathi**.

---

## Audience 1 — Indians who live in Dubai

### How many

About **4.36 million Indians live in the UAE** (38% of the population, doubled in about a
decade), and **about 2 million of them in Dubai**. For comparison, Dubai received about 2.2
million Indian _visitors_ in 2024 — so the resident audience is roughly the size of a year of
visitors, and they are there all year.

### What they would use

- **खाना, unchanged in spirit.** Residents know the city and the metro; what they miss is a dish
  from home — a Gujarati thali, Andhra meals, a Jain kitchen, a proper filter coffee — in a
  kitchen that is on no delivery app. Dish first, constraint honoured, nearest first: exactly what
  खाना already does. It needs more ground: residents live in Al Nahda, International City,
  Sharjah's edge, JLT and Silicon Oasis, not only Karama and Bur Dubai.
- **बोलना, used differently.** Not "where is the metro" but the landlord, the clinic, the
  government counter, a traffic fine, a notice on the building. The board reader (Arabic → Hindi)
  matters more to a resident than to a visitor.
- **Not जाना, not जानना.** Residents do not need the tourist's attractions or a route planner they
  already know by heart.

### What is different from the traveller

- **The pass does not fit.** Fourteen days from landing makes no sense for someone who lives
  there. It would be a yearly price, or free with खाना's cost carried some other way — a decision
  for later.
- **Language.** Decision 007 limits input to Hindi and Hinglish, and decision 016's sizing dropped
  Tamil and Gujarati for travellers. Residents are different: Kerala is the largest single source
  of Indians in the UAE. A resident product that only understands Hindi leaves out its biggest
  group. That is a real decision, not a detail.
- **One app, or two?** CLAUDE.md's rule is one app. The honest reading is a resident mode inside
  Dubai Saathi (two blocks on घर instead of four, a different price), not a second app — unless
  the store listing and the name need to be separate to be found.

### Who else serves them (study)

No app found that is built for Indian residents in Dubai around food by dish plus Arabic help in
Hindi. Residents use the delivery apps (listings by restaurant, English-first, only kitchens that
deliver), general translators, and community WhatsApp and Facebook groups for "where do I find
…". The gap is real but narrow: the delivery apps are strong habits, and खाना wins only where it
has kitchens they do not.

---

## Audience 2 — BharatSaathi: Indians travelling in India

### How many

- **2.95 billion domestic tourist visits in 2024**, up 17.5% on 2023 (Ministry of Tourism).
- Pilgrimage is a large share, and mostly short trips: **Tirumala sees 30–40 million pilgrims a
  year**, Kashi Vishwanath over 20 million, Ayodhya about 50 million.
- Most of these trips cross a language line. A Telugu or Kannada family in Madurai, a Hindi
  speaker in Rameswaram, a Tamil family in Pandharpur.

### Why now

Signboards are moving to the local language:

- **Karnataka** approved an ordinance in January 2024 requiring 60% of commercial signage in
  Kannada; the Governor returned it, and a bill followed in the assembly.
- **Tamil Nadu** has told officials to issue government orders only in Tamil, amid the three-language
  debate.
- **Puducherry** announced in March 2025 that shops must display their names in Tamil.

Whatever one thinks of it, the visitor reads fewer boards than they used to — which is exactly
the owner's "in a lurch".

### What it would do

- **खाना** — local eateries near the temple and the lodge: meals, tiffin, pure-veg, Jain,
  no-onion-garlic for vrat, with prices off the card. The same field collection and menu reading
  as Dubai.
- **जानना** — the temples and places that matter: darshan timings, dress code, how long the queue
  usually is, what to carry, what is not allowed inside, whom to ring. Booking stays with the
  temple's own site; we link, we do not book (scope guard).
- **बोलना** — two-way between the visitor's language and the local one, spoken, and the board
  reader for signs, menus and notices.
- **जाना** — probably not at first. Buses and trains across a state are a much bigger job than one
  city's RTA feed. Later, per circuit, if the question log asks for it.

### What is different from Dubai Saathi

- **Input is not Hindi.** The visitor speaks Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali,
  Gujarati or Hindi, and reads the answer in the same. This is the opposite of decision 007 and
  needs its own decision. The matcher's design — normalise, never branch on script — extends to
  Indic scripts, but every alias list has to be written again per language.
- **Language pairs, not one language.** The product must be neutral: _your language ↔ their
  language_. A Hindi-first app in Tamil Nadu reads as the imposition the state is fighting, and
  would be rejected on sight. BharatSaathi should help a visitor respect the local language, not
  route around it.
- **The name.** "Bharat" is a neutral word to most, but it is not neutral everywhere in the
  south. Worth testing with a Tamil and a Kannada family before it goes on a store listing.
- **Offline matters even more.** Rural temples and hill shrines often have no signal. Content
  would ship as packs per circuit (for example, "Tamil Nadu temple circuit": Madurai, Rameswaram,
  Thanjavur, Kumbakonam, Chidambaram), each downloaded once.
- **Price.** Domestic travellers are more price-sensitive than a Dubai visitor. A per-trip pass
  somewhere around ₹49–₹99, or selling through tour operators who run pilgrimage packages (the
  website already has a section for tour operators).

### Who else does parts of it (study)

| What exists                                              | What it does                                                                                                                                                | What it does not do                                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Bhashini** (Government of India, free)                 | Speech-to-speech translation across all 22 scheduled languages; photograph printed text in 25 Indian languages or English, translate it and read it aloud   | No food, no places, no trip. A translator, not a companion                                    |
| **Google Translate / Lens**                              | Camera translation of signs into Tamil, Telugu, Kannada, Bengali, Gujarati, Marathi and Urdu, some offline once a language is downloaded; conversation mode | Generic; knows nothing about the temple or the kitchen                                        |
| **Sarvam's Indus** (launched February 2026)              | An AI chat app built for Indian languages                                                                                                                   | A general chatbot — exactly what our scope guard says we are not                              |
| **Offline translator apps** (for example TapSay)         | Offline translation across India's official languages, marketed for temples and heritage sites without signal                                               | Translation only                                                                              |
| **Official temple apps** (TTD; Tamil Nadu HR&CE portals) | Darshan and seva booking, timings, dress code — for their own temples                                                                                       | One temple trust each; nothing about food or language; HR&CE's app is for staff, not visitors |
| **Ministry of Tourism / state tourism apps**             | Places to visit, state-wise and district-wise                                                                                                               | Hindi and English only; no food, no translation                                               |
| **Food listing and delivery apps**                       | Restaurant listings and reviews in cities                                                                                                                   | English-first, city-centred, no "pure-veg meals near the temple, in my language"              |

**What the study says.**

1. **Translation alone is not a product.** It is already free and good: Bhashini is free,
   government-backed and covers every scheduled language, including photographs of text. If
   BharatSaathi were "a translator for travellers", it would lose.
2. **The gap is the bundle, for one trip, in the visitor's language, offline.** No one found
   combines where to eat (with the constraints pilgrims care about), what to know about the
   temple, and translation, packaged for a circuit and working without signal.
3. **The moat is content, not technology.** Field-collected kitchens with real menus and checked
   temple facts are slow to build and hard to copy. That is what Dubai Saathi is proving now,
   one form number at a time.
4. **We could build on Bhashini rather than against it.** Its models are open for developers; the
   translation layer could come from there, leaving our effort for the content.

---

## What Dubai Saathi must prove first

These are not for today. Before either audience is started, Dubai Saathi should show, in its own
figures on /admin:

- the answer rate holding up with real travellers, not only the owner's testing;
- phones coming back on another day (repeat share);
- whether offline is valued (the Offline Value verdict), because BharatSaathi's case rests on it;
- that field collection and menu reading scale beyond one person's walks.

## What can be reused as it is

The matcher and its normaliser; content packs and publishing without a release (decision 030);
`apps/field` and the menu-reading pipeline (decisions 029, 033, 041, 042); the offline map
pipeline (decision 035) with another OSM extract; बोलना and the board reader; the question log
and product intelligence (decision 043).

## Questions for the owner, when this is picked up

1. Residents: a mode inside Dubai Saathi, or a separate listing?
2. Residents: is Malayalam in, given that Kerala is the largest group?
3. BharatSaathi: which circuit first? Tamil Nadu's temples for Telugu and Kannada visitors is the
   owner's example and a strong one.
4. BharatSaathi: sell to travellers, to tour operators, or both?
5. The name, tested in the south before it is fixed.

---

## Sources

- [Gulf News — Indian expat population in UAE doubles to 4.36 million, more than half in Dubai](https://gulfnews.com/uae/people/indian-expat-population-in-uae-doubles-to-436-million-more-than-half-live-in-dubai-envoys-1.500129223)
- [DD News — Dubai welcomes 9.88 million visitors in H1 2025, India a key market](https://ddnews.gov.in/en/dubai-welcomes-record-9-88-million-visitors-in-2025-india-remains-key-market/)
- [Ministry of Tourism — India Tourism Data Compendium 2024](https://www.data.tourism.gov.in/mrd/Uploads/tourism_data/India%20Tourism%20Data%20Compendium%202024.pdf)
- [Dharmik Vibes — How Indians travelled in 2024 for religious purposes](https://blog.dharmikvibes.com/p/how-indians-traveled-in-2024-for-religious-travel)
- [Deccan Herald — 60% Kannada on all signboards, ordinance](https://www.deccanherald.com/amp/story/india%2Fkarnataka%2F60-kannada-on-all-signboards-karnataka-govt-to-issue-ordinance-2837678)
- [Deccan Herald — Governor returns the Kannada signage ordinance](https://www.deccanherald.com/amp/story/india%2Fkarnataka%2Fgovernor-rejects-ordinance-on-60-signage-in-kannada-2871822)
- [Deccan Herald — Tamil Nadu: government orders only in Tamil](https://www.deccanherald.com/india/tamil-nadu/issue-government-orders-only-in-tamil-tn-govt-tells-officials-3496917)
- [Business Today — Puducherry to order shops to display names in Tamil](https://www.businesstoday.in/india/story/out-of-love-and-respect-for-tamil-puducherry-to-order-shops-to-display-names-in-tamil-468325-2025-03-18)
- [Bhashini on Google Play](https://play.google.com/store/apps/details?id=com.dibd.bhashini&hl=en_IN) and [Bhashini — Wikipedia](https://en.wikipedia.org/wiki/Bhashini)
- [Google Translate adds offline and instant camera translation in 7 Indian languages](https://www.fonearena.com/blog/249912/google-translate-offline-translation-indian-languages.html)
- [Business Today — Indus by Sarvam, a first look](https://www.businesstoday.in/technology/news/story/indus-by-sarvam-a-first-look-at-indias-homegrown-ai-chat-app-built-for-local-languages-517385-2026-02-21)
- [TapSay — translator app for India](https://tapsay.me/best-translator-app-for-india)
- [TTDevasthanams app on Google Play](https://play.google.com/store/apps/details?id=com.ttdapp&hl=en) and [TN HR&CE temple darshan booking](https://templedarshan.hrce.tn.gov.in/)
- [HRCE app on Google Play (staff app)](https://play.google.com/store/apps/details?id=com.thirukkoil.hrce&hl=en_IN)
- [India Tourism app on Google Play](https://play.google.com/store/apps/details?id=com.mittal.skmittal.incredibleindia&hl=en_IN)
