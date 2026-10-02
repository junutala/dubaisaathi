# 056 — Dubai arrivals on /admin

**2 October 2026 · the owner**

## What happened

A traveller pays only in Dubai: the 24-hour trial starts when the pass confirms the arrival, and
the pass is bought after that. So the phones that reach Dubai are the real count of who could pay.
The Khaana 1 ads reach Indian towns, and most of those phones will travel weeks later, if they
travel at all. Without this count, a quiet payment line could not be told apart from a failing
one. The owner: "add the Dubai arrivals to admin".

## Decision

/admin counts Dubai arrivals two ways, side by side, for the chosen period (decision 055) and for
each way in.

- **Opened in Dubai.** The phone said Dubai when it opened Saathi, either from a location fix it
  already held or from its clock being set to Dubai's time zone.
  - Every `opened` row has carried this since 25 September, so the count reaches back to the
    first day.
  - A Dubai resident counts here too, so it is a ceiling.
- **Landed.** The pass confirmed the arrival: repeated readings inside Dubai, never one fix, the
  moment the trial starts. Only these phones can pay.
  - The app sends this once, as a `landed` usage row carrying the day and no place
    (`noteLanding`).
  - A phone that landed before this release sends it on its next open.

`range_metrics()` is redefined with both (migration 0029). The app change is the one call in
`App.tsx` beside the existing location reading, with a test in `usage.test.ts`.

## How to read it

Until "Landed" rises, payments cannot. Read Diwali to New Year (6 November to January) as the
first real test of whether arrivals pay. Before then, a quiet payment line is expected.
