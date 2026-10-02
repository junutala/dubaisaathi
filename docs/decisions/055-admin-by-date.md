# 055 — /admin reads by date

**2 October 2026 · the owner**

## What happened

The owner asked: "can we do the admin page to display by date selector and cumulative". Every
table on /admin had its own fixed window: all time, the last 7 days, 28 days or 30 days. Read on
the campaign's second day, the numbers could not be compared with each other.

## Decision

A **period** sits at the top of /admin.

- **Presets:** Today, Yesterday, Last 7 days, Since the campaign and All time.
- **A From–To pair** for any other span.
- **Indian days**, because the ads run in India and the owner reads the page there.
- **It opens on "Since the campaign"**, 1 October.

The `admin` function takes `from` and `to` and asks `range_metrics()` (migration 0028) for the
span. A malformed date falls back to the campaign. The function reads the counted views, so our
own phones stay out (decision 054).

Everything down to "Asked for" follows the period:

- the line to share;
- the period's tiles;
- "How phones came to us" — phones whose first open fell in the span, followed to what they did
  afterwards;
- "How readers used the website";
- "Asked for, and we did not have".

**Cumulative** is a chart of running totals by Indian day: first opens from ads, and website
visits.

- It has one count axis, a legend and direct end labels, and each point's value shows on hover.
- The same numbers are also given as a table.
- Its two colours are a pair validated for colour-blind readers, chosen separately for light and
  dark.

Product intelligence keeps its own 7- and 28-day buttons, because its verdicts need a minimum of
data. Reach, Use and "Phones each day" say plainly which fixed window they cover.

Two older faults were fixed in the same pass:

- The passphrase card stayed on screen after the page had opened.
- Wide tables pushed the page sideways on a phone.
