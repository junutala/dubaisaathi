# 008 — The app carries its own typeface

**Decided:** September 2026, after running the app with the network off.

The screens specify Anek Devanagari, Mukta and Noto Naskh Arabic, and the first build loaded
them from Google Fonts with a `<link>`. That quietly broke rule 1: on a first run with no
network the app has no typeface, and on a cheap Android the fallback for Devanagari and
Arabic is whatever the phone happens to ship — often nothing good, sometimes nothing at all.
An offline-first app cannot rent its own alphabet.

The three families are now in `apps/pwa/public/fonts`, declared in `src/fonts.css` and
precached by the service worker with everything else. Only the subsets the app renders are
carried — Devanagari, Arabic and Latin — and only the weights it uses: Anek 600 (Anek 700 was
dropped because nothing used it, and the Arabic face's Latin subsets went because Arabic text
never falls back into it). That is **992 KB**.

That is a real cost on a first download, and it is the right one: the pack is already tens of
megabytes, the fonts are the one part without which nothing is legible, and the alternative is
a traveller in a taxi looking at boxes.

Consequence for the screens: `design/generate-screens.py` still links Google Fonts, because an
artboard renders inside a sandboxed frame that allows exactly that one host. The app and the
artboards therefore load the same faces by different routes — the same files either way.

To re-vendor after a font change: fetch the `css2` URL for each family with a desktop Chrome
user-agent, keep the `devanagari`, `arabic` and `latin` blocks, download each `woff2` to
`public/fonts`, and rewrite the `url()` to `/fonts/<file>`.
