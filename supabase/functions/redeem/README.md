# redeem · bind — the pass functions

Two edge functions and one shared module (`../_shared/sign.ts`, `../_shared/passPrice.ts`).

| Function | Does                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `redeem` | Takes a coupon code and a phone count; quotes the balance, or at ₹0 issues the family, signs one pass per slot, binds slot 1 and records the use. |
| `bind`   | Takes an installed pass; verifies the signature and reports whether the slot is this phone's (`bound`), somebody else's (`taken`) or `revoked`.   |

## Secrets

Set on the function in the Supabase dashboard (Edge Functions → Secrets). Never in the repo.

| Name                        | Function         | What it is                                                                                 |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `PASS_SIGNING_KEY`          | `redeem`, `bind` | Base64 PKCS8 of the P-256 private key. `npm run pass:key` prints a fresh pair.             |
| `PASS_PUBLIC_KEY`           | `bind` (option)  | Base64 SPKI of the public half, if the private key should stay on `redeem` alone.          |
| `SUPABASE_URL`              | both             | Provided by the platform.                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY` | both             | Provided by the platform. RLS is on with no policies; the service role is the only way in. |

The public half also goes to the traveller's app as `VITE_PASS_PUBLIC_KEY` on the Railway
`pwa` service, so a pass signed by `redeem` verifies offline on the phone (decision 005). A
key pair made by `npm run pass:key` is never written to disk by the script: copy the two lines
it prints into the two places above and close the terminal.

## Deploy

```
supabase functions deploy redeem
supabase functions deploy bind
```

Migration `0007_coupons.sql` must be applied first: `redeem` calls its `redeem_coupon` RPC.

## Requests

`POST /functions/v1/redeem` with
`{ deviceId, code, slots, quoteOnly?, platform?, appVersion?, landedAt? }`

- `{ payable: 149, code, kind, listPrice, discount, issued: false }` — a balance remains, or
  `quoteOnly` was set (then `payable` may be 0 and the app's button asks again without it).
- `{ payable: 0, issued: true, passes: SignedPass[] }` — slot 1 first; the app installs it and
  keeps 2–4 as the family QRs.
- `{ reason }` with a 4xx: `unknown` · `not-yet` · `ended` · `exhausted` · `already-redeemed` ·
  `slots` · `single`. `unsigned` (503) means the key is not set.

`POST /functions/v1/bind` with `{ deviceId, passId, familyId, slot, counterOffAt?, hours?, signature }`

- `{ bound: true }` · `{ bound: false, reason: 'taken' | 'revoked' | 'unknown' }`.
