# 001 — No account. Entitlement is keyed to the device.

**Decided:** design review, September 2026. Deviates from the concept doc's "Phone/email OTP".

A utility app opens straight into its function, the way a map does. Nothing in Dubai Saathi
needs to know who the traveller is: the pass is bought on a device and lives on that device;
family devices join by scanning a short-lived QR token from the owner's phone; documents and
the hotel never leave the phone.

So there is no login, no OTP, no email. The backend keeps `Device`, `Pass`, `Family` and
`FamilyDevice`; `User` is retained in `packages/shared` only as the owner of a family pass and
carries no contact details.

Consequence: losing the phone loses the pass. That is the trade, and it is the same trade a
metro card makes.
