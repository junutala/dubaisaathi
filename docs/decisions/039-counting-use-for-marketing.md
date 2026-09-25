# 039 · Counting how Saathi is used, for marketing, never on the traveller's screen

25 September 2026. The owner.

## Decision

Saathi counts how it is used, so its success can be shown: to travel agents, the press, anyone
the owner takes it to. **Nothing of it appears in the traveller's app** ("do not clutter the
customer app"). The numbers are read by the owner, from the database for now, and on an admin
page when one is built.

What is counted, each as one row in the question log through the `collect` door (so no new path
sits between a phone and the server):

- **Days used.** One `opened` row per phone per Dubai day, on launch and whenever the app comes back
  into view. This gives phones, daily users, and phones that came back on 3 or more days.
- **The offline share.** Every row, searches included, carries `online`, meaning whether the
  phone had a signal at that moment (migration 0015). It is the proof of the product's one promise.
- **What was opened:** a menu (`menu`, the outlet), a route's steps (`steps`, place and mode), the
  map (`map`), an attraction (`place`) and a जानना topic (`topic`).
- **How a phone came to us.** One `arrived` row, ever, with the source: `?via=` on a link or a QR
  (`site` on the website's buttons, `wa` on its WhatsApp share, and a counter card or an agent's
  list when those exist), `family-pass` for a pass handed over by QR, otherwise `direct`.

Usage rows are `stt_engine = 'usage'`, `intent = 'use'`, with `landed_on` saying what happened.
They never set `resolved_place_id`, so they never count as demand for a place.

## What it is not

It stays keyed to the device id only: no name, no number, no IP (decision 011), no location.
Opening a route's steps says what someone looked at, as a search already does. It never says
where they went: "I do not want to know if and where Arun went during his 5 day trip" (0004)
still holds. Nothing is shown to the traveller, and nothing blocks a screen.

## Why

The owner: "I want to build a tool for marketing and not sell. Dubai Saathi should be a success,
not the money behind it." The plan is a launch in Dubai while he is there, then taking the numbers
to travel agents. For that, "112 phones, 71 came back on 3 or more days, 64% of use with no
signal" is the sentence that matters, and until tonight none of it was recorded. Kitchens are
never charged for anything (the owner, the same evening). The person Saathi speaks to is the
young one in the family who carries the phone.
