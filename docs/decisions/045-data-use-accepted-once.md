# 045 — What travellers type and say is kept, and they accept it once

**Date:** 28 September 2026 · **Status:** built

## The owner's ruling

"Let's get the user to accept that we may store information on the खाना, जाना, जानना and बोलना
data for our training purposes, but will not be linked to the user. Let them accept this
notification and then proceed." And, on the phone's random id: tie the whole interaction to it,
because a phone that comes back to Dubai on a later trip is "a huge scoring point in front of
potential investors". What a traveller chooses to say in बोलना is their choice; we do not mask it.

## What was decided

- **One line, accepted once.** The landing page carries it above its one button, which now reads
  "मंज़ूर है, शुरू करें" — starting is accepting. A phone that was already past the landing page
  sees the same line once, on its own screen, with "मंज़ूर है, आगे बढ़ें". No decline button, and it
  never comes back. Design rule 9 now names this as the one thing before the app.
- **The line is true as written**: text only — never the voice (बोलना's audio is not stored) and
  never a photograph (घर.7's photo is not kept) — and not linked to a name or a number.
- **Everything carries the phone's random id** (`saathi.deviceId`, made on the phone): the question
  log and product intelligence as before, and now बोलना's sentences with their Arabic
  (`bolna_sentences`, migration 0023, written by `translate`) and the boards it reads
  (`board_readings.device_id`).
- **The id exists from the first open.** It used to be made at the first search, so a phone that
  only read menus had no id and its usage never left the phone.
- **The one join to a person is cut after 30 days.** An order keeps the payment aggregator's record
  of who paid (a UPI id, masked card digits) for a disputed payment; a nightly job
  (`orders-payer-purge`) empties it after 30 days, so a phone id is never joinable to a name after
  that.

## What this is not

Not an account and not a login. The id is random and lives on the phone; clearing the browser's
data makes a new one. In law it is still personal data — pseudonymous, not anonymous — which is
why the line is shown and accepted rather than assumed.
