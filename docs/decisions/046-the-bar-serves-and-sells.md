# 046 — The bar serves and sells: घर, दस्तावेज़, सुझाव, ऐप शेयर

**Date:** 28 September 2026 · **Status:** decided; boards drawn · **Supersedes** 027 (icons
without words) and 028 (ज़रूरी जानकारी's three capsules) · **Amends** 016 and 018 for the bar
· **Spends** the red that 002 reserved, on one line

## The decision

**The bar is four places, each an icon with its word under it**, in this order:

| Place     | English    | Icon                  | Ground                                |
| --------- | ---------- | --------------------- | ------------------------------------- |
| घर        | Home       | `home`                | filled marigold, icon and word in ink |
| दस्तावेज़ | Documents  | `docs`                | plain, on the bar's own ground        |
| सुझाव     | Contribute | `bulb` (new)          | plain, on the bar's own ground        |
| ऐप शेयर   | Share app  | `qr` (already in set) | filled teal, icon and word in cream   |

घर and ऐप शेयर are the bookends, each on its own colour; the two in the middle are plain. The lit
place gets the sand pill if it is plain, or an inset ink ring if it is filled. A pillar's own
screens light none of the four — their header carries the pillar's colour, and घर's blocks are
the way into them.

**The thali, the signpost, the lantern and the circled ⓘ leave the bar.** The three pillars are
reached from घर's blocks, as they always were from घर; the ⓘ's screen is retired (below).

**ज़रूरी जानकारी is retired.** Its three capsules go three ways:

- **दस्तावेज़** becomes the bar's second place, घर.2: the plain list of documents and जोड़ें, as
  it was before decision 028 — any document, as many as they like, on the phone only (decision
  003). घर.3 opens one.
- **फ़ीडबैक** becomes the second half of सुझाव: the same form — नाम, नंबर, आपकी बात — written to
  the phone first and sent when there is a signal, to the `contact` function (decision 023).
- **संपर्क's four numbers** move to **जानना**, as one slim red line above its tabs:
  "आपातकाल: पुलिस 999 · एम्बुलेंस 998 · आग 997" and a **सब नंबर** link to the full list, where
  the Indian consulate and the line about 100 still live. The numbers are the ones 028 confirmed
  on 18 September and they still come from `data/emergency/contacts.v1.json`.

**The hotel row is on every screen**, the ones that used to hide it included. The one exception
was ज़रूरी जानकारी (028); that screen is gone, and a row that is sometimes there is a row nobody
learns to reach for.

**ऐप शेयर (घर.8)** is a big QR code for `https://dubai.saafarsaathi.in`, drawn on the phone so it
works with the radio off, and under it, word for word:

- Dubai Saathi
- दुबई में आपका हिंदी साथी — खाना, रास्ता, बोर्ड पढ़ना
- 24 घंटे मुफ़्त
- dubai.saafarsaathi.in
- a **WhatsApp पर भेजें** button

**सुझाव (घर.9)** is two things, one under the other: **कोई जगह छूट गई?** — a kitchen, a place or
anything we missed, which goes to the question log (`VoiceEvent`) with the words as typed — and
**सुझाव या राय**, the feedback form. **Every nothing-found state in खाना, जाना and जानना** gets a
bold, full-width button, **"यह नहीं मिला? बताइए — हम जोड़ेंगे"**, that opens सुझाव with the
traveller's own words already in the box, saying where they came from (design rule 30).

**A pass can be renewed — decided, not yet built.** _Never gated_ means never forced; it has never
meant refusing a traveller who wants to pay again. But a pass is landing plus fourteen days, on the
phone and on the server alike, so showing the buy buttons again would take ₹199 for nothing: the
pass would end on the same day. Renewal needs a pass that can be extended (fourteen more days from
today, or from the end of the current one) and the webhook issuing that extension. Purchase itself
is not live yet (decision 019), so renewal is built with it — a button that buys nothing is worse
than no button.

**बात stays out of the bar** (decision 026), and so does पास लें (018). The checker still fails a
board that carries either.

## The discussion

### Why words came back

Decision 027 took the words away for one reason: two of the four items were words that
translate and three were pillar names that never do, so the English catalogue read as three
Hindi words and one English one. That reason is gone. None of the four new places is a pillar
name — every one of them has a Hindi word and an English one — so the bar reads as one language
in either catalogue.

And the reason to want the words is stronger than the one that removed them: an icon alone is a
guess the traveller has to make, and the evidence says most travellers guess wrong:

- **Material 3** — a navigation bar is for **three to five destinations**, and **every item
  carries a text label**. An icon-only bar is not one of its patterns.
- **Nielsen Norman Group** (icon usability research) — only a handful of icons are recognised
  near-universally without a word: **home, print and search** (the magnifying glass). A
  lightbulb for "contribute" and a QR square for "share this app" are not on that list; nor, for
  that matter, were a thali or a lantern.
- **WhatsApp's 2023 bottom bar** — the app every one of our travellers already uses daily puts an
  icon **and** a word on each of its four tabs. That is the bar they have learned to read.
- **Google Maps' bottom bar has a "Contribute" tab.** The owner: _"We are young and new. A giant
  like Google accepts from users, who are we?"_ सुझाव is that tab, for the same reason: the pack
  is small, and the fastest way it grows is the traveller telling us what was not in it.

### Why the pillars leave the bar

घर is the pillars. Four deep blocks, one tap each, and the traveller is on घर whenever the app
opens. The bar carrying the same three again was two routes to one place, and it cost the three
slots that serving the traveller (their papers) and selling the app (the QR) now need. On a
pillar's own screens the header names the pillar in its colour; the bar lights nothing there.

### Where we depart from Material, on purpose

Material's bar holds **destinations**. ऐप शेयर is, in the end, an **action** — show a QR, send a
link — and Material would put it in a menu or a floating button. We put it in the bar anyway,
for a business reason the owner stated plainly: the share is our growth channel. The moment that
matters is a stranger in a souk watching a traveller point the phone at an Arabic board and hear
it in Hindi, and asking _"what is that?"_ The traveller must be **one tap** from a code that
scans, not three taps into a menu. _"Even an angel wants a profit."_ It gets its own screen
(घर.8), so it behaves like a destination when tapped, and its own colour, so it is found.

### Why red, now

Decision 002 reserved red and put it on no screen, and 028 kept the numbers off red. 046 spends
it on exactly one thing: the emergency line above जानना's tabs. Red is what an emergency number
looks like everywhere a traveller has seen one, and one slim line is the whole of it — it is not
a tile, a banner or a layer, so 002's argument against an emergency layer stands. Two tokens
carry it, `alarm` (#B3261E; dark #F2B8B5) and `alarmSoft` (#FCE8E6; dark #3A1614), and design
rule 2 now says red appears **there and nowhere else**. The pass dot is still never red.

### Why the numbers go to जानना

The traveller who needs 999 is out, not at home in the app. जानना is the pillar about being out
in Dubai — places, getting around, what not to do — and its tabs are where someone who is lost
already is. One line costs जानना 48 pixels and gives every one of its screens with tabs the three
numbers, one tap each.

## Consequences

- `design/generator/`: the bar is the four with words; `home` and `bulb` join the icon set (the
  same drawings as the app's); `strip` no longer takes `hidden`; `sosline` draws जानना's line. New boards: **घर.8 · ऐप शेयर** (`HomeShare`, with a real
  QR drawn by the `qr` package the app uses) and **घर.9 · सुझाव** (`HomeContribute`). The
  ज़रूरी जानकारी board is gone; **घर.2 · दस्तावेज़** (`HomeDocs`) is the documents list. The
  emergency line is on 3.1 and 3.3, above the tabs.
- `design/check-screens.py`: rule 4 counts four places, in order, each with its glyph and its
  word, घर and ऐप शेयर filled in two different colours and the middle two plain, and no pillar
  glyph or ⓘ; rule 5 checks which place each board lights; rule 3 wants the hotel row on every
  board; rule 2 allows red inside the emergency line only; rule 19 fails any board that still
  names ज़रूरी जानकारी; new rules 32–34 check the emergency line, सुझाव and ऐप शेयर.
- No board draws a nothing-found state yet, so the button is a review rule (33) until one does.
- `docs/design-rules.md`, `docs/field-ledger.md` and `CLAUDE.md` follow.
- Decision 027's signpost stays as जाना's icon — on घर's block and in जाना's header — and the
  circled ⓘ stays in the icon set for जानना's topics. Only their places in the bar are gone.
