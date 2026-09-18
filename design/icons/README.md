# Icons

Source artwork. Only one file here is used by the product.

| File                                                                                         | What it is                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Logo.svg`                                                                                   | **In use.** The mark. `apps/pwa/src/app/shell/Logo.tsx` and `apps/field/src/Logo.tsx` redraw it as a component, and the favicons and app icons are rendered from it (decision 021 — the mark only, never the wordmark, at icon sizes). |
| `Food.svg`, `Getting_around.svg`, `Important Info.svg`, `Speaking.svg`, `tile_icon_good.png` | **Not in use.** They belong to the four-tile home that decision 016 replaced with the three pillars and बोलना. Kept as the record of that round; nothing imports them.                                                                 |

Everything the app draws now lives in code: `apps/pwa/src/app/shell/icons.tsx` for the app and
`design/generator/_icons.sh` for the boards, one set of shapes each, both stroke-based on a 24px
grid. **An icon is added in those two files, not here** — a screen is generated from the
generator by `design/generate-screens.sh`, and `design/check-screens.py` fails the build if a
board and the rules disagree.
