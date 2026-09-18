# 028 — ज़रूरी जानकारी is three capsules, and it carries no hotel row

**18 September 2026.** The owner, on the screen the circled _i_ opens:

> _"Here I want three Capsules prominently on the top. And we already have My hotel at the top.
> Why again? Remove it.
> The first capsule: Contacts - Indian consulate, police, ambulance, fire
> Second Capsule : Documents - This is a from where the user can upload and view multiple documents
> Third Capsule : Feedback - Here he can give feedback to us and also refer our apps to his friends
> using native whatsapp."_

## The decision

**Three capsules at the top of घर.2, in that order: संपर्क · दस्तावेज़ · फ़ीडबैक.** They open on
संपर्क, because the traveller who opens this screen in a hurry is opening it for a number.

**संपर्क — four numbers, each one tap from dialling.** The Indian consulate, police, ambulance and
fire. This is the half of decision 002 that never shipped: that decision kept _"the Indian
consulate, and one line of numbers because an Indian otherwise dials 100"_, and four days of
building went past it. The line under them says exactly that — भारत का 100 यहाँ नहीं लगता.

The numbers are 999 (police), 998 (ambulance) and 997 (fire, Civil Defence), confirmed against
dubai.ae and eight other sources on 18 September rather than recalled. 112 from a mobile routes to
999 and 901 is Dubai Police's non-emergency line; neither is shown, because somebody in trouble
needs one number per situation and not five. The consulate is +971 4 397 1222, Bur Dubai.

They live in `data/emergency/contacts.v1.json` with a `checkedAt`, like every other fact in the
pack, and they are read off the phone. A number a traveller needs is needed in the situation where
there is no signal.

**दस्तावेज़ — घर.2 exactly as it was:** any document, as many as they like, on the phone, opened
with the radio off, gone only when they delete it (decision 003).

**फ़ीडबैक — a word to us, then the app passed on.** The form writes a `ContactMessage` to the
phone and sends it when there is a signal, to the same `contact` function the website's form uses
(decision 023). Under it, the invitation in full and a WhatsApp button carrying `wa.me/?text=…`
with no number in it, so what opens is the reader's own WhatsApp and their own contact picker.

This is the work that was built as बात and taken out of the bar on the same day (decision 026).
The owner's objection then was the name and the bar slot, never the function; both are gone and
the function is where he asked for it.

## No hotel row on this screen

The strip's second row is on every other screen and not on this one, at his instruction. The
argument is the screen's own: three capsules are what belongs at the top of it, and a row about
where you are sleeping is a fourth errand in the way of three. The hotel is one tap away from
everywhere else, including घर.

Design rule 3 now says "every screen but this one", `design/check-screens.py` enforces both halves
— the row present everywhere else, absent here — and the generator's `strip` takes `hidden`, which
is not `none`: `none` has always meant "no hotel saved yet" and draws the dashed invitation.

## What is not here

No personal emergency contact. The owner raised it and doubted it in the same breath, and he was
right: every phone has contacts and a native emergency contact that works from the lock screen,
where ours would not, and it is the only thing on this screen that would have us holding a third
party's name and number.
