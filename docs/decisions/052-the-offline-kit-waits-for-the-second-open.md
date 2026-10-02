# 052 — The offline kit waits for the second open

**Date:** 2 October 2026 · **Status:** built

## The owner's ruling

> "Can we pause the download in the app. Maybe we can download if the device comes back the
> second time into our app."

## Why

On a phone's first open the app fetched its whole offline kit: the service worker's precache —
every screen, the fonts and the content packs, about 8 MB — and the street map, 16 MB, started by
the shell the moment it mounted. The landing page then held शुरू करें until the precache had
landed (or 20 seconds had passed). From a Meta ad, inside Facebook's own browser, the owner timed
it at 30 to 60 seconds before the app could be used. On 1 October 186 Facebook clicks became nine
phones in the app, and none of them reached खाना. A first open is someone deciding whether to
look; the kit is for someone who came back.

## What was built

`apps/pwa/src/app/offlineKit.ts` decides, before anything paints, whether this open fetches the
kit:

- **The second open does.** An open is a page load in a new browsing session, counted in
  `localStorage`; a reload in the same tab is the same open.
- **So does a phone that already holds a worker** — every traveller who has the kit today keeps it
  and keeps getting updates — and **an installed app** (home-screen launch).
- A browser that remembers nothing (private mode) is treated as a return, so the kit still comes.

The worker is registered by the app (`injectRegister: false` in `vite.config.ts`), only when the
open is due or a registration already exists. The shell starts keeping the street map only on a
due open; opening नक्शा still fetches it on the spot, as before.

On a first open the landing page waits for nothing: शुरू करें is live at once, and the box that
showed the download says "ऑफ़लाइन पैक अगली बार खोलने पर आएगा — दुबई जाने से पहले एक बार और खोलिए,
वाई-फ़ाई पर". From the second open the landing page behaves as before.

## What it costs

A traveller who opens the app once in India and never again before flying lands in Dubai without
the offline kit: until a second open, the app works only with a signal. The landing page says so
in words, and any later open with a signal fixes it. Rule 1 (offline-first) holds for every phone
that has opened the app twice, which is every phone that came back.
