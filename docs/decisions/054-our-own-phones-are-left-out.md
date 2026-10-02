# 054 — Our own phones are left out of every count

**2 October 2026 · the owner**

## What happened

/admin's first line said "50 downloads". The owner asked whether that meant his own attempts, and
it largely did. His words: "most important is to leave my device out. Otherwise, the numbers will
be inflated and we may draw wrong conclusions".

A web app cannot read a phone's own identity. Saathi's device id is a random number kept in the
browser's storage, so one phone carries several:

- one in Chrome;
- one in Facebook's in-app browser;
- one in WhatsApp's in-app browser;
- one in each incognito window or fresh profile;
- a new one each time site data is cleared, which is how the pass screen was tested unpaid.

Two phones and a laptop had made 17 ids between 27 September and 2 October. Five more came from ad
links checked during setup on 1 October, between 1:12 and 1:17 PM IST. That was hours before the
ads' first impression, so those were not travellers.

## Decision

A phone is ours once it has sent one `staff` usage row. Every count reads views that leave such
phones out, past rows included (migration 0027).

- **Marking.** Opening the app with `?staff=saathi` sends the row once.
  - Opening the website with the same link stops that browser counting its own visits.
  - The website then adds the mark to its "open the app" links, so the app in that browser is
    marked too.
  - Nothing changes on screen.
- **Counting.** `admin_metrics()`, `insight_metrics()` and `acquisition_metrics()` read
  `voice_events_counted`, `app_events_counted`, `orders_counted`, `passes_counted`,
  `devices_counted` and `coupon_redemptions_counted` in place of the tables.
  - The functions were rewritten from their own text, so they compute the same things over fewer
    phones.
  - A rolled-back dry run showed every output unchanged while no phone was marked.
- **Nothing is deleted.** The rows stay, and the question log still holds what our phones asked.
  The views are closed to the API.
- **The past.** On 2 October the 22 ids above were marked by hand, with a row reading "marked by
  hand, 2 October (decision 054)".
  - /admin then read 28 first opens, all from the ads.
  - It read no money and no passes, because every payment so far was the owner's own test.
  - Two website visits he confirmed as his (10:50 and 10:51 IST, about nine seconds each) are
    still in `site_visits`, because the delete was not approved in the session. They are the
    first rows of a new table and too small to mislead.

## A page that shows it took (same day)

The owner opened the link on his three devices, and his next two website visits were still
counted: a `?staff=saathi` that did not arrive left nothing to see, so neither of us could tell.
**saafarsaathi.in/staff** replaces the link. Opening it marks that browser at once, with no
parameter to lose on the way, and says on the screen whether it took ("✓ This browser is not
counted"). Its button opens the app with `?staff=saathi`. A phone still running an older app
keeps the mark through its update, because the app reloads the same address.

## What it cannot do

- An id is forgotten with the browser's data, so a cleared or new browser counts until it opens
  the link again.
- Tapping our own ad opens Facebook's browser, which is a new id that counts as a traveller unless
  it is marked.
- The website's own counter has no device id, so a browser is left out only from the moment it
  opens the link.
