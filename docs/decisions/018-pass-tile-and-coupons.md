# 018 — The pass tile at the foot of घर, and coupons on the one purchase flow

**Status:** accepted 17 September · **Revises** 016 ("घर is the three pillars and nothing
else") · **Keeps** 002 (never red), 005 (a pass is a signed token; the family QR carries it),
006 (prices and the 14-day clock), 011 (no IP, no account)

## The tile

016 said घर is the three pillars and nothing else, with a nudge banner at the top from the
twentieth hour. The owner's reason for revising it: **the revenue action was hidden in the
bar.** A पास लें button among four navigation items reads as one more tab, and a banner that
appears only in the last four hours of the free day is invisible for the twenty hours before,
when the traveller is deciding whether this app is worth anything.

So घर is now three things, top to bottom: **the hotel above** (on the strip, as before), **the
product between** (the three blocks), and **the pass below** — one tile in the shape of the
strip's hotel row, in marigold, after the third block and above the bar. It says one line for
whichever state the counter is in, and a tap goes to घर.4 in every state:

| State                   | Line                                            |
| ----------------------- | ----------------------------------------------- |
| before landing          | दुबई में 24 घंटे मुफ़्त · पास ₹199 से           |
| the free day            | {hours} घंटे बाक़ी · पास लें                    |
| from the twentieth hour | the same line; the tile's tone warms            |
| the free day over       | मुफ़्त दिन पूरा · पास लें                       |
| a code waiting          | आपका कोड {code} · मुफ़्त पास लें (or · पास लें) |
| paid                    | पास · {days} दिन बाक़ी (· परिवार के लिए QR)     |
| paid and over           | पास पूरा · सब चलता रहेगा                        |

The top banner is gone. The blocks give up the tile's height; घर still never scrolls. The bar
kept पास लें while unpaid for one more morning (see the addendum below). The tile is built as a
list (`HOME_TILES`) so a later
tile — the owner is considering an online-only voice tile — is one more entry with its own
icon, strings, route and `visible` predicate. No such tile is added by this decision.

## Coupons

A coupon is **a discount on the one purchase flow, not a second way in.** There is no
"redeem a code" screen and no onboarding branch: the code goes into a field on घर.4, between
the phones and the total, and changes the total. What follows is whatever the total says —
₹0 and the pass is issued on the spot (`पास लें — मुफ़्त`); above ₹0 and the UPI and QR buttons
stand where they always stood, disabled until buying opens, with one line saying the balance
is payable then and the code is remembered.

A code arrives typed, or on the URL from an advertisement (`?code=SS-7K3M2X`; the website
carries it through to the app's link). It is remembered on the phone until redeemed or
replaced, and a code applied with no signal is applied when there is some.

**Prefix as convention, kind in the row.** `SS-` codes are `family` (1–4 phones on one code);
`OP-` codes are `single` (locked to one phone, for an operator handing them out). The app and
the function read `kind`; the prefix is for the person reading the code out. The generator
sets both, consistently. The alphabet has no 0/O/1/I.

**A redeemed code is paid.** It takes exactly the paid path: a family row, a signed pass per
slot, slot 1 bound to the redeeming phone, the 14-day clock from landing (decision 006,
unchanged: nothing stacks, India counts nothing, a pass redeemed before the plane waits for
it), and "paid once, never gated". The family's slots 2–4 are shown on घर.4 as QR codes that
carry the link `#/pass/<token>`, so the other phone's own camera opens them — there is no
scanner in the app — and a share button sends the same link on WhatsApp.

**Reconciliation, as decision 005 promised.** After a scan when there is signal, and at most
once a day, the phone reports its slot to `bind`. `taken` or `revoked` clears the pass on that
phone and says so in one line on घर.4. Nothing else ever does, and nothing runs offline.

**No admin screen now.** Codes are made by `npm run coupons` (a batch to stdout and a text
file for the advertiser) and read in the `coupon_uptake` view in the Supabase dashboard. An
admin surface belongs in the collectors' app in Sprint 2, once there is something to
administer.

## What this changed in code

- Migration `0007_coupons.sql`: `coupons`, `coupon_redemptions` (one phone, one code, once),
  `coupon_uptake`, and `redeem_coupon` — the ₹0 issue as one transaction. RLS on, no policies,
  no IP.
- Edge functions `redeem` and `bind`, sharing `_shared/sign.ts`; the signing key exists only
  as the secret `PASS_SIGNING_KEY`.
- One price rule, `passPriceInr`, in `packages/shared`, mirrored byte for byte into the
  functions' `_shared` for Deno and kept identical by a test.
- `features/pass/`: `coupon.ts`, `bind.ts`, `scan.ts`, `qr.ts`; the entitlement keeps the
  installed pass, the family's passes and why a pass was cleared. Route `pass/<token>`.
- `features/home/HomeTile.tsx` and `HOME_TILES`; the nudge banner and its strings are gone.
- Design rule 13 and the checker; the घर boards carry the tile in three states.

## What it costs

A code's worth is decided on the server, so applying one needs a connection for a moment —
the only moment in the pass's life that does. The tile takes 56px from the blocks on every
phone. And the QR is still a bearer link (decision 005's cost), bounded the same three ways.

## Addendum, 17 September — the bar's पास लें button is dropped

Decided by the owner later the same day, once the tile was on घर. The bar's पास लें · ₹199 से
button no longer earned its place, so it is gone from every screen:

- On घर it duplicated the pass tile one tap away.
- On every other screen the strip's pass dot (marigold from the twentieth hour, tap → घर.4)
  and the tile one tap away through the mark already do the job.
- The bar goes back to being tasks only: खाना · जाना · जानना · दस्तावेज़, four items evenly
  spaced. The ledger line the button carried, "the money, visible while it matters, gone once
  paid", moves to the pass tile word for word.

Design rule 4 and the checker now fail a board whose bar carries पास लें; `canBuy` and the
`nav.buyPass*` strings went with the button.
