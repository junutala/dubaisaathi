# 034 — The kitchen is its menu

**24 September 2026.** The first five real kitchens reached खाना that morning (decision 033). The
owner opened Woodlands on his phone and wrote:

> _"There seems no functionality between these two screens. I feel the first screen is a liability
> and not appealing. Second is good. Navigate to the second screen directly once the restaurant is
> clicked. Also, the route map is missing and the CALL button is way below. I think we should keep
> both these at the top. Maybe scroll resistant. Also, can we group the menu just like the
> restaurant did. Because, breakfast items may not be available in the afternoon."_

and then: _"Maybe a couple of more buttons - Map and Jaana. Map shows the route and distance. Jaana
will show them the options with approximate cost. If bus and metro are not available, say so."_

## What changed

- **1.3 and 1.4 are one screen.** A row in 1.1/1.2 opens the kitchen's menu. Whatever only the old
  1.3 carried — area, distance, hours, kind, price for one, the five answers and who gave them —
  moves into the menu screen's head. `#/outlet/<id>` links saved before today open it too. The
  boards are regenerated: K3 is `1.3 · खाना › मेनू`, and K4 is gone.
- **नक्शा · जाना · फ़ोन sit at the top and stay there** (`position: sticky`) while the menu scrolls.
  - **नक्शा** hands the kitchen's pin to the phone's own map app, which draws the route and says the
    distance. Dubai Saathi still ships no map of its own (CLAUDE.md, Stack; the MapLibre question
    stays open in `docs/transport-and-maps-strategy.md`) — this is a hand-off, like 2.4's to Careem,
    and the phone decides whether it can answer offline.
  - **जाना** goes straight to 2.2 with the kitchen itself as the destination — its pin, not its
    neighbourhood. Before today the button sent the traveller to the area's centre. जाना now takes a
    `restaurant` place (`outlet:<id>`), resolved from the outlets pack.
  - **2.2 says when there is no metro or no bus** instead of leaving the row out, so a missing row
    reads as a fact rather than as the app forgetting.
- **The menu is grouped under the headings the restaurant printed**, in the card's own order;
  a heading the card prints twice is one group. `ConfirmedDish.section` carries it, from review's
  reading (033) through `publish:outlets --readings`.
