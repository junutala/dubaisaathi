# 021 — The lockup: one word, our pin, and a flight trail

17 September. The owner's, after seeing the mark and the name sitting side by side on every
screen and deciding they should be one thing rather than two.

## The decision

**The lockup is the pin, then the word `Dubaisaathi`, with a thin flight trail arcing over the
second half of the word and a small aeroplane at the end of it.** Light and dark, both.

- **One word, one capital.** `Dubaisaathi` — no space, no second capital, no `Saathi`. It is a
  name, not a description, and a name that a traveller types into a browser has no space in it.
- **Our pin, not the one in the drawing.** The lockup the owner supplied carried a pin of its
  own; the pin already drawn inline in `apps/pwa/src/app/shell/Logo.tsx` is the one that stays,
  unchanged — the silhouette, the two crescents of the साथी and the dot.
- **The trail and the plane are new,** and they are drawn in SVG in the same file, for the same
  reason the pin is: a mark fetched over HTTP is missing exactly when the app is proving its
  point. Nothing in the lockup is a request.
- **One lockup in both interface languages.** `app.name` is `Dubaisaathi` in `hi.ts` and in
  `en.ts`. A logo is not translated, and दुबई साथी was a translation of it.

## Why the Hindi interface stops saying दुबई साथी

This was the part worth arguing about, and the owner settled it: **the pillar names are the
brand, the app's own name is the logo, and they are different kinds of thing.**

खाना · जाना · जानना stay in Devanagari in both catalogues, exactly as decision 016 froze them,
because they are what the product does and a traveller reads them as words. `Dubaisaathi` is
what the product is called. A name rendered two ways is two names: the phone's home screen, the
website, the address bar and the strip would each show a different one, and the traveller who
recommends it to a cousin would have nothing single to say. So the lockup is one shape
everywhere, and the language switch does not touch it.

## The face

**Quicksand Bold.** The drawing is a bold rounded geometric sans with a single-storey `a` and
rounded terminals. Of the faces in that family on Google Fonts — Baloo 2, Quicksand, Comfortaa,
Nunito — Baloo 2 and Nunito have a double-storey `a` and are out on the first test; Comfortaa is
in the right family but very wide and idiosyncratic at bold, and `Dubaisaathi` set in it runs
past the strip. Quicksand is the geometric one: single-storey `a`, circular bowls, rounded ends,
and a bold that holds at 22px on a phone.

**Subset and self-hosted**, because decision 008 says the app never asks the network for its own
typeface and rule 1 says it must install and run offline. The wordmark needs eight glyphs —
`D u b a i s t h` — so `pyftsubset --text="Dubaisaathi" --flavor=woff2` turns Quicksand Bold into
**1.2 kB**, committed as `quicksand-wordmark-700.woff2` in the traveller's app, the collectors'
app and the website. A whole family for one word would not have been affordable; ten glyphs are.
The family is registered as `Quicksand Wordmark` with a `unicode-range` of those letters only,
and is used by one CSS class and nothing else.

One thing the build got wrong first, recorded so it is not rediscovered: **Vite inlines an asset
under 4 kB**, so the 1.2 kB font became a `data:` URL inside the stylesheet — which the app's own
CSP (`font-src 'self'`) refuses. The lockup would have fallen back to Mukta in production and
nowhere else. Fonts are now excluded from inlining in both Vite configs.

## Where it is

- The top strip on every screen, and the landing page — the pin from `Logo`, the word from
  `Wordmark`, both in `apps/pwa/src/app/shell/Logo.tsx`.
- The collectors' app header (`apps/field`), same two pieces, same subset font.
- The website header and footer (`apps/site`), the same markup in plain HTML.
- `design/generator/` draws it on every board; `design/check-screens.py` looks for
  `Dubaisaathi` in the strip.

## The icons stay the pin alone

`app-icon-192`, `app-icon-512`, `app-icon-maskable-512`, `apple-touch-icon` and the website's
`icon.png` are re-rendered from `design/icons/Logo.svg` at each size — **the mark only, never
the lockup**. A wordmark at 48 pixels is a smudge. The maskable one keeps its 80% inset because
Android crops a circle out of it.

## What it costs

A traveller downloads 1.2 kB they did not before. The Hindi interface loses a Devanagari name it
had since the first build, which is a real loss and the price of having one name. And the trail
is decoration on a screen whose whole argument is that it has none — earned, narrowly, because a
logo is the one place on a screen whose job is to be recognised rather than read.
