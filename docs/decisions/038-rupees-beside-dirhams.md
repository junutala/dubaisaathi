# 038 · Rupees beside dirhams, at a fixed rate

25 September 2026. The owner.

## Decision

Every price in **जाना** and **खाना** shows rupees beside dirhams: **AED 5 · ≈ ₹130**. That covers the
route fares on the options, steps and map screens, the taxi estimate, every dish on a menu, the
price for one, and the searched dish's price on each kitchen's row in 1.2. जानना's prices stay in
dirhams for now.

**The rate is fixed at ₹26 to the dirham.** It is not a daily rate. The owner asked for one rate
to go with, not a figure that moves every day. On 24 September USD/INR closed at 95.73; against the
dirham's peg of 3.6725 that is ₹26.07. The rate lives in the fares pack (`inrPerAed`, with
`inrRateOn` for the day it was fixed). It changes only when we decide the gap has grown too wide,
and then by republishing the pack.

Rupees are rounded to the nearest ₹10, because the owner said they need not be exact. A price
that is not free never reads ≈ ₹0. They are grouped the Indian way (₹1,300) and always carry "≈",
because they are never what is charged.

## Why

The budget traveller is the market. A family of four pays AED 20 more for chai and samosa at one
counter than at the next. In rupees that is ₹520, and a person feels it at once in rupees and not
in dirhams. On the options screen, the metro at ≈ ₹160 beside a taxi at ≈ ₹910 is the app's case
made without a word.

## And so

1.2 now shows the **searched dish's own price** at each kitchen, off that kitchen's menu, in
dirhams and rupees. That is where the owner's chai-and-samosa comparison happens. The list is still
nearest first; price is shown, not sorted on.
