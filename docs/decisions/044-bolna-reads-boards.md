# 044 — बोलना reads Arabic boards into Hindi

**Date:** 28 September 2026 · **Status:** built (घर.7)

## The owner's idea

"Take a picture of any Arabic board, we will translate to Hindi and display the Hindi translation
and also speak out in Hindi. English boards are available, but not Hindi." Dubai's boards carry
Arabic and English; a traveller who reads only Hindi gets nothing from either.

## What was decided

- **It lives in बोलना** (घर.7, reached by a button on घर.5), because बोलना is already the one
  online screen and the one place where the app translates for the traveller. Online only, like
  the rest of बोलना (decision 020): no offline reader and translator small enough for a phone
  reads Arabic signs well.
- **Arabic in, Hindi out.** The owner's spec: the Arabic on the board, its meaning in Hindi.
- **Claude reads the board** (`readboard`), in one call, and gives the meaning rather than a
  word-for-word string: signs need sense ("ممنوع الوقوف" is "यहाँ गाड़ी खड़ी करना मना है"). The
  model is not in the code (decision 043's rule): `READBOARD_MODEL`, else the newest Opus.
- **The photograph is never kept.** The phone draws it small onto a canvas before sending it —
  which also strips the place, the time and the phone model — and the server reads it and drops
  it. The screen says, before the photo is taken: only the board, not people; the photo is not
  kept.
- **The text is kept** (the owner, 28 September: "the text tells us a lot"): the Arabic read and
  the Hindi given, in `board_readings` (migration 0022). Written first with no device id; since
  decision 045 (the same day) the row carries the phone's random id, like everything else. A photograph with nothing readable goes into the
  question log as `nothing-read`.
- **The Hindi is read aloud** by the phone's own voice (`hi-IN`), attempted every time; "this
  phone has no Hindi voice" is said only after the phone has refused.
- **Bounded**: a shrunk photograph (the long edge at most 1600 px), at most 4 MB, and at most 3,000
  readings a day in all. It needs the `ANTHROPIC_API_KEY` secret; until it is set, the screen says
  board reading is not switched on yet.

## What else exists

A general camera translator already turns Arabic signs into Hindi, free. What this adds is being
inside the app the traveller already has open, meaning rather than words, the Hindi read aloud,
and the text of what travellers photograph — which shows which signs confuse Indians in Dubai,
and could become an offline sign list later.
