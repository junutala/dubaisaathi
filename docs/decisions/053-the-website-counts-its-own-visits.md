# 053 — The website counts its own visits

**2 October 2026 · the owner**

## What happened

The Khaana 1 ads moved from the app to saafarsaathi.in on 1 October. The next morning's question
was "do people stay?", and the only answer was the host's request log, grouped by browser:

- A reader who stayed two minutes at the top of the page showed up as about one second.
- Scrolling could only be guessed from which phone screenshots were fetched.
- A press of "हिंदी में सुनिए" happens entirely on the reader's phone, so it was never seen.

## Decision

The page reports what each visit did to our own `visit` function, which writes one row per visit
into `site_visits` (migration 0026). A row holds:

- how long the page was actually on the screen;
- how far down it was read;
- which sections reached the screen;
- what was pressed: open the app, हिंदी में सुनिए, WhatsApp, share, the language switch, a sent
  message;
- phone, tablet or laptop;
- how the reader came, as a tag named the way the app names an arrival (`arrivalSource`), so
  `meta-khaana1-gujarat-site` means the same on both lines of /admin.

The page sends a report on arrival, at 10 and 45 seconds, whenever the tab is hidden, and on a
tap. Each report is the whole visit so far, and `record_site_visit()` keeps the most of each, so
a lost report costs nothing. /admin shows the totals per tag as "How readers used the website".

## Rules it keeps

- **No cookie, no IP, no name.** A visit is a random id kept in the tab's session storage only.
  Nothing joins it to the app's device id. The privacy page says so, in both languages.
- **Our own, not a third party's.** No Google Analytics. The Meta Pixel is a separate question,
  for after the long weekend: it would mean editing the ads, which sends them back for review.
- **The function trusts nothing in the body.**
  - `sendBeacon` can carry no headers, so `visit` runs with `verify_jwt` off.
  - It accepts only the website's origins, a body under 2 kB, and ids, tags and words from fixed
    patterns and lists. Anything else is dropped.
- **Kept 180 days**, as the app's events are, by a nightly job.
