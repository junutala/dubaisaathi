# 043 — Product intelligence: what the app records, and how it is judged

**Date:** 27 September 2026 · **Status:** Stage A (the log, the roll-ups, /admin) and Stage B
(the one question on घर, design rule 31) built. Stage C (the three agents) follows.

## The question

Is Saathi useful, and is _offline_ the reason? Until now the only evidence was the question log
(`voice_events`): what was typed, and whether it matched. It could not say how long a phone was
used, whether it had a signal, or whether a search ended with an answer.

## What was decided

1. **Deterministic first, models after.** Every figure on /admin is computed by SQL from rows
   the phone wrote by fixed rules. The agents (Stage C) read those figures and write about them;
   they never produce a figure, and every sentence they write is tagged _fact_, _inference_ or
   _hypothesis_ and cites the metric keys it rests on.
2. **One new log beside the question log.** `app_events` (migration 0020), written on the phone
   into Dexie v11 (`appEvents`) and sent by `collect` with the question log. Six names only:
   `session_start`, `active`, `net_change`, `task_start`, `task_end`, `offline_answer`.
3. **A session** ends after 30 minutes without use (`SESSION_GAP_MS`).
4. **Online or offline is confirmed, not assumed.** `navigator.onLine` saying yes is not a
   signal. Offline when the browser says so, or when our last request failed more recently than
   one succeeded; online when one succeeded in the last three minutes; otherwise _unknown_.
   Unknown is reported as unknown, never folded into either side.
5. **Active time** counts only while the screen is visible and touched in the last minute, in
   steps of at most ten seconds, by pillar and by network state.
6. **Tasks and NEED_SATISFIED** are inferred by the rules written at the top of
   `features/ask/tasks.ts` (a menu read for 8 s, a route's steps, the taxi screen, an attraction
   read for 10 s, the Arabic of a spoken sentence, a document opened). Satisfied means the
   traveller reached what the task exists to reach. It cannot mean they were pleased, and the
   dashboard labels it as inferred. A task started and never ended within an hour counts as
   abandoned.
7. **Saathi answer rate** = satisfied ÷ ended tasks, shown with a 95% Wilson range so a rate
   from eight tasks cannot pass for a rate from eight hundred.
8. **The Offline Value verdict** (`insight_metrics`):
   - not enough data under 30 meaningful sessions;
   - _negligible_ when even the top of the range of sessions using the app offline is under 5%;
   - _valuable_ when the bottom of that range is at least 10%, there are 20 offline tasks, and
     the offline answer rate's lower bound is at least 0.5 and no worse than online;
   - _used, not yet useful there_ when offline use is real (≥5%, 20 tasks) but answers are poor.
9. **The Product Signal** needs 20 phones and 30 sessions, then bands three measures —
   answer rate's lower bound (green ≥ 0.6, amber ≥ 0.4), phones back on another day (≥ 0.4,
   ≥ 0.2), asks we did not have (≤ 0.15, ≤ 0.3). Red if any is red, green if all are green.
10. **The agents use the Anthropic API**, and the model is an environment variable, not code
    (the owner, 27 September: "a moving target … keep it dynamic").
11. **The traveller may be asked one thing** (the owner: "a fair ask"): on घर, after a stretch
    the phone confirmed had no signal, "अभी कुछ देर इंटरनेट नहीं था — क्यों?" — सिग्नल नहीं था,
    डेटा बंद रखा था, or छोड़ें. On घर because there is no task there to interrupt; once a Dubai
    day, answered or skipped; recorded as `offline_answer` with the answer and nothing else.

## Privacy and cost

- Keyed to the device id only. **No IP, no coordinates**, no typed text in `app_events`
  (the text stays in the question log, as before). `meta` is at most twelve short scalars.
- **Kept 180 days** (`app-events-retention`, nightly), the owner's figure to start with.
- A snapshot of the 7- and 28-day figures is written nightly (`metric_snapshots`), so trends
  survive the retention window.
- The agents run weekly and on demand from /admin only; nothing a traveller does calls a model.

## What it replaces

Nothing is removed. The question log and `admin_metrics` (decision 039/040) stand; this sits
beside them on /admin under "Product intelligence".
