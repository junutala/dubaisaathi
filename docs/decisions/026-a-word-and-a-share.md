# 026 — बात: a word to us, and the app passed on

17 September. The owner, after the website's referral QR went live:

> I dont want another tile. That will be cluttered. I am thinking of one icon at the bottom
> strip and opening that will render a new screen, exactly the two functions one after the
> other - contact us and share us.

## The decision

A fifth item in the bar — **बात** — opening **घर.7**, one screen carrying two things in the
order he named them: tell us something, then pass the app on.

## Why the bar and not घर

घर is full. Four blocks and one tile is the whole of it (decision 018, and 020's addendum for
बोलना), and it never scrolls: the blocks give up their height to the pass tile as it is. A fifth
block would have come out of बोलना's, and a second tile would have put a referral button next to
the thing that takes money.

The bar is also the right place on its own merits. The moment a traveller has something to tell
us is the moment खाना did not have their dish — they are standing in 1.2 looking at an empty
result, not on घर. A route home and back is two taps we can save them.

Five is where the bar stops. On a 390px phone five items are 78px each, which is a label and an
icon with room around them; a sixth is 65px, and at 11.5px type that is a word that has to be
guessed at. The rule in `docs/design-rules.md` says so and `design/check-screens.py` counts.

## The label

**बात** — a word, a thing said. Not a pillar name: the three are in Devanagari and end in -ना,
and a fourth -ना word in the bar would read as a fourth pillar, which this is not. It is also
deliberately not बोलना's microphone: बोलना speaks to a stranger in Arabic, बात writes to us, and
a traveller may not be made to tell two features apart by reading carefully. The icon is two
speech bubbles; the English catalogue says "Say hi".

## Why it is written to the phone first

The traveller most likely to have something to tell us is the one in a Karama basement whose
dish was not in the pack — which is to say, the one with no signal. A form that refuses them is
worse than no form.

So घर.7 does what the question log does (`VoiceEvent`, and the `collect` function): the message
is a `ContactMessage` row in Dexie v7, written on the tap, and `sendOutbox()` walks the queue on
boot and on every `online` event. Nothing on the screen waits for the network, and the screen
says which of the two happened — "it has reached us" or "it is on your phone and goes the moment
there is a signal". Marking a row sent happens only on an answer from the server.

It posts to the same `contact` function the website's form uses (decision 023), with
`who: 'traveller'` — the operators and the outlets write from the website, where the form asks.
One table, one inbox, one admin screen later.

## Passing it on

The same invitation the website's QR carries: `wa.me/?text=…` with no number in it, so what
opens is the reader's own WhatsApp and their own contact picker. The message is shown in full on
the screen before it is sent — nobody should have to send something in their own name to find
out what it says.

WhatsApp is offered first because that is where a traveller's friends are; `navigator.share` is
the second button, and the clipboard is what a refused sheet falls to. None of it is decided in
advance by asking the browser what it supports: the sheet is opened and only a refusal walks to
the next way (CLAUDE.md — a capability query is not an answer). A sheet the traveller closed is
not a refusal and must not fall through to the clipboard behind it.

## What this is not

Not a chat, not a ticket queue, not a second पास लें. There is no thread, no status and no
notification: the reply comes by phone to the number given, which is how the website's form
already works and what the owner reads the table for.

## Consequences

- `design/generator/_chrome.sh` draws five items; every board regenerates with बात in the bar.
- `design/check-screens.py` rule 4 counts five and fails a four-wide grid.
- Dexie goes to v7 with `messages`. Every table above it is re-declared unchanged.
- The screen itself has no board, as बोलना's does not (decision 020): both arrived after the
  Sprint 1 freeze. The chrome around them is on every board and is checked.

---

## Reversed, 18 September, hours after it shipped

The owner, seeing it in the bar:

> _"KILL THIS BAAT at the bottom strip. This will never make to live. and BAAT was the old name
> we gave while trying offline chat. and this never worked and I clearly told that the old
> chapter is as good as closed."_

**बात is out of the bar and out of the app.** The bar is four items again: खाना · जाना · जानना ·
दस्तावेज़. The screen, its outbox, its share block, its strings, its styles, its icon and its
tests are deleted.

The name was the fault, and it was mine. बात is what the abandoned offline-chat work was called —
a chapter the owner had already closed — so putting it in the bar read as that thing coming back,
and it read that way to the one person who knows the history. I chose the word for how it sounds
beside the pillars and never checked what it had been used for here before. A name is not free
of its past in the codebase it lives in.

What stays, and why:

- **Dexie's v7 and the `messages` table.** Nothing writes one now. But a phone that opened this
  morning's build has a v7 database, and Dexie refuses to open a database whose version is above
  what the schema declares — the traveller's hotel and documents would go with it. A release
  never takes something away from a phone; the version and `ContactMessage` stay, unused.
- **The `contact` function and `contact_messages`.** Decision 023 stands: that is the website's
  form, which works and is unaffected.

Rule 4 in `docs/design-rules.md` goes back to four, and `design/check-screens.py` now fails a
board that carries बात in the bar — the reverse of what it checked this morning, so this cannot
return by accident.

**What is undecided.** The owner asked for the thing itself earlier the same day: _"one icon at
the bottom strip and opening that will render a new screen, exactly the two functions one after
the other - contact us and share us."_ That request is not withdrawn, the word and the bar
placement are. Nothing is built for it until he says where it goes and what it is called.
