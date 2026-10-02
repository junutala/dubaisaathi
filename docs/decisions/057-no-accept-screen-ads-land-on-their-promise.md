# 057 — No accept screen; an ad lands on its promise

**2 October 2026 · the owner**

Supersedes the landing page of 045 and the one-time notice of 048. What is kept from 045 is
unchanged: text only, tied to the phone's random id, never to a name or a number.

## What happened

Of the first 44 phones that arrived from the Khaana 1 ads, none entered a pillar. The ad promises
vrat and veg food in Bur Dubai, without internet. The visitor got a screen asking them to press
"मंज़ूर है, शुरू करें" before seeing anything. The owner:

> "Why on earth should we go and ask him to have this manjur hai? What is he accepting? I'm not
> downloading anything. We agreed that the download will be on the second visit."

The offline kit already waits for the second open (decision 052), so a first open downloads
nothing. Opening a web page is not signing anything.

## Decision

- **No accept screen, for anyone.** The app opens on घर. The landing page, the one-time data-use
  notice and their code are gone.
- **The terms are accepted by paying.** "भुगतान करके आप नियम और शर्तें मानते हैं।" and "नियम और
  शर्तें पढ़ें" sit under घर.4's pay button. The small print on घर and घर.10 are unchanged.
  The terms now say that the ones in force on the day a pass is bought are the ones that apply.
- **An ad's visitor opens on what the ad promised.** `utm_campaign=khaana1` on an empty hash opens
  खाना with व्रत already on (`#/food-diet/vrat`), with घर pushed one step behind it so the back
  button stays inside the app. `CAMPAIGN_LANDINGS` in `app/routes.ts` maps each campaign to its
  screen. A later campaign adds a line there, and the ad's link needs no change.

The Facebook ads were not touched.
