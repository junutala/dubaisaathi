# 006 — Pricing ladder and the Counter Off Time

**Decided:** design review, September 2026. Overrides the concept doc's ₹199 solo / ₹399
family for 7 days.

The customer is the cost-conscious traveller — the one who waits for hotel wifi to make a
call, buys no local SIM, and checks arithmetic. So the ladder has one rule they can verify in
their head: **₹199, then ₹100 per extra phone** — ₹199 / ₹299 / ₹399 / ₹499 for 1 / 2 / 3 / 4
named devices. No combination of smaller packs beats a bigger one, per-device price falls
with each phone, and four people for two weeks stays under ₹500 — less than one tourist SIM
with data at the airport, which is the comparison the customer is already making. "Named
device" rather than "couple" or "family": office teams travel too. Above four, _contact us_ —
the lead channel for tour operators.

**14 days** covers nearly every Indian Dubai trip in one purchase, so recharge is an edge
case rather than a flow, and the variable cost is the pack, not the days.

**One number runs all of it — the Counter Off Time.** Install sets it 365 days out, so the
app is free in India for a year of trying. Landing in Dubai sets it 24 hours out. Paying sets
it 14 days out **from landing** — never from payment, so a pass bought on the sofa in Pune
waits for the flight. A paid pass extinguishes the trial; free is not a right. A recharge on
a running counter adds 14 days; on an expired one, starts now — the prepaid-mobile rule an
Indian traveller already expects. Every device QR carries the master Counter Off Time, so a
second, third or fourth phone is enabled offline and ends at the same moment.

Landing is detected offline by the GPS geofence, with the phone's clock switching to Gulf
time as the second signal for a phone that has denied location.
