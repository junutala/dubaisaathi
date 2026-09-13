# 005 — A pass is a signed token; a family QR carries the pass

**Decided:** design review, September 2026. Deviates from the concept doc, which says the QR
carries "a short-lived one-time activation token, not permanent entitlement".

There is no account, so the device is the identity, and the product's promise is offline —
so validity cannot depend on asking a server. A pass is therefore a token signed by our
server — `{pass id, kind, slot, expiry}` — that the app verifies with the public key shipped
inside it. The strip reads the signature; nothing is checked live.

Buying a family pass issues four such tokens at once: one installed on the buyer's phone,
three shown as QR codes on घर.2. A member scans one and their phone installs the pass with no
connection at all — the moment this happens is a hotel room or a metro platform, and the
family is standing together. The same QR travels as an image on WhatsApp to a member on a
later flight, and the website sells the same one or four QRs to a relative in India paying
for people already in Dubai. One mechanism for every case.

The cost is that a QR is a bearer token: whoever scans it gets the slot. It is bounded three
ways — by the master expiry, by the slot count, and by reconciliation: each phone reports its
slot when next online, and a second phone reporting an already-bound slot is rejected at its
own next sync. A forwarded QR therefore works on a fifth phone only until that phone
connects, and never past the expiry. For a ₹399, seven-day product that is the right amount
of protection; a live server check at scan time would have bought a little more and cost the
offline join entirely.

Revocation is server-side and takes effect at the revoked phone's next sync. Losing the
owner's phone loses the ability to add or remove members for the rest of the trip; the
members' passes keep running to expiry.
