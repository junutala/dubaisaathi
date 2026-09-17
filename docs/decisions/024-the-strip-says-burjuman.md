# 024 — In India the strip says BurJuman; the hotel is pinned in Dubai

**17 September 2026.** Decided with the owner, over three rounds, and he was right in all of them.

## What it replaces

घर.4 carried a switch, **दुबई में हूँ (टेस्ट)**, that wrote a landing time nobody had earned so
the trial could be watched from India. The owner's objection was where it sat: _"this revenue
story… I think an important component like revenue is hidden"_ — and then, of the switch itself,
_"We set the virtual location button in 'REVENUE TILE'. I think this is not the place."_

His first proposal was to move it into the strip's hotel row: virtual location while they are in
India, the hotel once they reach Dubai. One slot, contextual, gone when meaningless.

I argued against the slot, on the grounds that the hotel pin is what the three pillars measure
from when the phone is outside Dubai (`lib/here.ts`), so hiding the invitation in India hides the
one thing that improves the India experience.

**He overruled that, and the reason is the decision:**

> _"Even for a seasoned traveller like me, I booked ROLLA Residence, but my intent was rolla
> residence hotel apartments, both are just across the street — rolla street. So, even if they
> are in tour groups, they may know the hotel booking, but never the pictures and geo location.
> So, unless they are in the hotel, it's impossible and more often our functionality will break
> if they give some arbitrary geo location. So, we should push them to map the location while
> they are on-site and not before flying."_

The code agrees with him. घर.1's pin button is **यहीं पिन लगाएँ** — _pin it right here_ — and it
reads the phone's own position. In Kochi it cannot do its job. A traveller who forces it anyway
saves a fix from Kerala, or the right hotel name on the wrong building across Rolla Street.

**And a wrong pin is worse than no pin**, which is the part worth keeping in mind: BurJuman is
labelled a stand-in on every row it touches, so a traveller reading "650 m" knows what it is
measured from. A wrong hotel pin is labelled _your hotel_ and is quietly wrong in all three
pillars, with nothing on any screen to say so.

He then closed the question of a traveller-facing control entirely:

> _"Not necessary. Their current location does not matter to us at all, except for statistical
> purpose. So, when they are in india, unlimited usage and the location is set to Burjuman Mall —
> with a clear note that this is set to experience our apps. Once they reach Dubai, this will
> disappear and they will enter their 'real place of stay'."_

## The decision

**The strip's second row, in four states:**

| State                                             | What the row is                                       |
| ------------------------------------------------- | ----------------------------------------------------- |
| A hotel is saved                                  | The hotel. Always — India, Dubai, during and after    |
| No hotel, the phone answered from outside Dubai   | The stand-in note: _showing Dubai from BurJuman Mall_ |
| No hotel, the phone says Dubai                    | **मेरा होटल जोड़ें**, and now the pin means something |
| No hotel, the phone refused or has not been asked | **मेरा होटल जोड़ें** — see below                      |

A saved hotel wins in every state. It is the traveller's own and nothing takes it back — not a
flight home, not an expired pass.

**The test switch is gone**, with its strings and both functions. A phone that used it still
carries `pretendingDubai` and an invented `landedAt`, and with nothing left to turn it off it
would count down a trial forever from a landing that never happened — so `read()` undoes the
pretence the first time it sees it, field by field, keeping everything that was paid for.

## Two things this required

**The strip may not ask for location.** It is on every screen, including the first one a traveller
ever opens, and design rules 9 and 30 say the reason goes on the screen before the phone's own
prompt. So it watches rather than asks: `useKnownHere` reports whatever answer a pillar has
already obtained and reports nothing until one has. That is what the fourth row above is —
we genuinely do not know yet, and guessing would be the same mistake in the other direction.

**Which leaves the invitation reachable in India**, on a first launch, before any pillar has
asked. Hiding the button would not have fixed that; it would only have hidden it. So the guard is
at the point of action, where it belongs: **घर.1 refuses a pin that lands outside Dubai** and says
when to come back — _"You are not in Dubai yet. Drop the pin once you are there, standing in the
hotel — everything else on this screen you can fill in now."_ The phone is still asked, the phone
still answers, and what it said is what the traveller is told.

Everything else on घर.1 — the name, the room, the desk's number, photographs, a note — can be
filled in from India as before. It is only the pin that has to be taken where it means something.
