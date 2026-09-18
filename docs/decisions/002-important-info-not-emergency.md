# 002 — ज़रूरी जानकारी, not an emergency layer

**Decided:** design review, September 2026. Deviates from the concept doc's "Emergency —
always available".

> **Partly unbuilt, as of 18 September.** The shelf shipped as घर.1 (the hotel) and घर.2–घर.3
> (the documents), and both work offline as this decision requires. **The Indian consulate and
> the line of numbers did not ship.** `data/emergency/consulate.v1.json` is in the repo and no
> screen reads it; `EmergencyPoint` in `packages/shared` is exported and imported nowhere. That is
> a gap between this decision and the build, not a reversal of it — it needs the owner's word on
> whether the consulate belongs on घर for the launch or is Sprint 2 work.

A tourist in distress reaches for the phone dialler, WhatsApp and the hotel reception — not a
seven-day app. Reception knows which clinic is open at 11pm; our offline data does not, and
sending someone to a closed clinic costs the minutes that matter. Mall security finds a lost
child with CCTV; we cannot. An emergency tile would have been the reflex nobody has.

What survives is the calm shelf a tourist looks at before anything goes wrong: **मेरा होटल**
(their first SOS — pin, card photo or entrance photo, shown to the driver), **documents**
(any document, one photo, one name), the **Indian consulate**, and one line of numbers
because an Indian otherwise dials 100.

Red is reserved and appears on no screen.

## The icon, too (added after the first artwork round)

The first drawing of this tile put a **medical cross** on the booklet. It was caught in review
and replaced with a shield before it shipped, because the symbol makes the promise the whole
decision exists to avoid: a tourist in trouble taps a cross expecting a hospital and finds a
passport photo and a consulate number. That is the moment they stop trusting the app.

The rule is now written down as design rule 17: no cross, red cross or first-aid symbol on this
tile's icon, its screens, or the app icon. The shield says _your papers, kept safe_, which is
what the tile actually does.
