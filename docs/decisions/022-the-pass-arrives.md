# 022 — The pass arriving is a moment, not a receipt

**Status:** accepted 17 September · **Extends** 018 (घर.4 is one flow from the counter to the
button) · **Keeps** 002 (never red), 005 (a pass is a signed token, installed offline), 006 (the
fourteen days start on landing), 019 (buying)

## What was wrong

A family member opened a shared pass link on a second phone. The app installed itself, took the
offline pack, verified the token and applied the pass — and said so in one small grey line,
`पास लग गया — इस सफ़र में अब कुछ बंद नहीं होगा`, in the same type, the same size and the same
place as _"this code has already been used"_. Under it, most of the screen was white: once a
pass is in, the tiers, the code field and the buttons all go, and nothing took their place.

The owner, holding that phone:

> _"we should brag about this. You hid such an important message as a plain text… I think you
> should animate it like 'HEY…. you now have been gifted a 14 day pass to DUBAISAATHI - your
> offline companion when you visit dubai next - Happy trip'! something like that. very boring."_

He is right, and the reason it matters is not decoration. This is the one instant in the product
where somebody has just been **given** something, and it is also the instant a suspicious person
asks _"so is my fortnight running down while I sit in Pune?"_. Both belong on the screen.

## The decision

**A pass landing on a phone takes घर.4 for one read.** It carries the mark with a ticket on it,
`पास आ गया`, the gift in one line, what it does with the radio off, when the counter starts, a
send-off, and one control — `साथी खोलिए` — which goes to घर, where the three pillars are.

- **All three ways a pass lands get it**, because to the traveller they are the same event: a
  family QR or link scanned on a second phone, a code redeemed to zero, and a purchase settling
  after Razorpay. All three end in `installPass`, so the question is asked in one place —
  `unwelcomedPass()` — and घर.4 asks it on every render.
- **Once per pass.** `welcomedPassId` sits beside `passId` in the entitlement and is written when
  the traveller closes the welcome. A reload does not replay it; a different pass later — a
  second trip, a QR from a friend — is a different id and gets its own welcome.
- **It works with the network off.** A second phone installs a scanned pass with no connection at
  all (decision 005). Nothing here fetches, and no image is loaded from anywhere: the mark is the
  same inline SVG as every other icon in the app.
- **One control, and it is a way through.** It marks the pass welcomed and lands the traveller on
  घर. It never discards the pass and never leaves them on the same screen. The family's QR codes
  are one tap away from where it puts them: घर's tile says `पास · {days} दिन बाक़ी · परिवार के
लिए QR` (decision 018).
- **Under the welcome, घर.4 is no longer white.** Where the tiers were, a paid traveller now
  reads what the pass gives — the landing screen's own four promises, in the same words.

## How it moves

One orchestrated arrival, and then it rests: the card rises into place, the mark settles, the
lines lift one after another, and a single sweep of marigold crosses the card. Everything is
over inside about 1.2 seconds. No confetti, no bounce loop, no sound, and never red.

Two rules hold it honest, and both are in the stylesheet rather than in a component:

- **The card is readable at rest on the first frame.** Every rule is the finished state and the
  animations move _into_ it; nothing is parked at `opacity: 0` waiting on a timer or an observer,
  and the lines are staggered by duration rather than by a delay that would leave one blank while
  it waited its turn. A phone that drops every frame still shows the whole gift.
- **`prefers-reduced-motion: reduce` gets the same words in the same places, and no movement.**

## Consequences

- One new persisted field, `welcomedPassId`, carried through `stopPretending` with the rest of
  the pass so testing the counter from India does not replay the welcome.
- An install that already holds a pass from before this change sees the welcome once, on its next
  open of घर.4. That is the right side to err on: nobody is shown it twice, and the only people
  it can surprise are the handful who already paid.
- `HomePassWelcome.dc.html` joins the boards; design rule 16 records the shape and the motion.
