# 047 — The card's delivery number

**29 September 2026.** The owner: _"When the menu card has a delivery number, please capture this
number so that the customers can order directly without the price bulge."_ Asked whether it should
be a button — WhatsApp with the hotel filled in, or a call — he said: _"Nothing, show the number.
Let them call from hotel landline."_

## What is decided

- **Review reads it.** When Claude reads a card (decision 033), `menu.json` carries
  `deliveryPhone`: the number the card prints for delivery — "Home delivery", "Free delivery",
  "Order on WhatsApp" — exactly as printed. A card that prints none has none; the board's own
  number is not a delivery number unless the card says so.
- **It travels apart from the board's number.** `field_reports.delivery_phone` already existed;
  the pack now carries it as `Restaurant.deliveryPhone` instead of folding it into `phone`. फ़ोन
  still rings the board's number (or the delivery number when the card printed no other).
- **A card that prints a delivery number says the kitchen delivers.** `delivers` is `yes` for it,
  whatever nobody asked.
- **1.3 shows it as a number, not a button**: "होम डिलीवरी · 055 123 4567", large enough to read
  off the screen while dialling from the room. Only when the card prints one.
- **No delivery app is named** — here or anywhere. The reason for the number is the kitchen's own
  prices; the copy says that and nothing about anyone else.

This is not food delivery (CLAUDE.md, scope guard): the app takes no order and passes none on. It
shows a number the kitchen printed, as it shows the one on its board.
