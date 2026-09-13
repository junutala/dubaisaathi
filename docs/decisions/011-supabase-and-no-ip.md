# 011 — Supabase is the backend, and it stores no IP address

**Status:** accepted · **Affects** `supabase/`, the stack table

## The problem

Three things need a server, and nothing else does:

1. **Signing passes.** A pass is a signed token the app verifies offline (decision 005). The
   private key must live somewhere that is not a phone.
2. **Stopping one paid slot from becoming five.** A ₹499 four-device pack must not be installable
   on one phone and re-sold.
3. **Receiving the commands we could not fulfil** — the learning loop, which is the only thing
   that makes the parser less wrong.

The question the owner asked was where the device ids, IPs and expiry dates live. This answers it.

## The decision

**Supabase: Postgres for the five tables, edge functions for the three jobs.** This deviates from
the stack table's "Node.js + TypeScript" backend, which is why this record exists. The reason is
that the backend is genuinely thin — issue a signature, bind a slot, take a webhook, accept a
queue — and running a Node service to do that means owning a deploy, a TLS certificate, a
secret store and an uptime problem for something that must not be in the traveller's critical
path anyway. Edge functions are Deno, not Node; nothing in `packages/shared` cares.

**Five tables, no more:** `devices`, `families`, `passes`, `orders`, `voice_events`.
`docs/product-concept.md` lists `User`; there is no users table, because there are no accounts
(decision 001). PostGIS is not enabled: places and restaurants ship in the pack and are queried
on the device. `field_reports` comes with `apps/field` and is not guessed at now.

**RLS is on with no policies.** The anon key can read and write nothing. That is deliberate and
not an unfinished job: with no login there is no "this traveller's own row" for a policy to
describe. Every table is reached only by an edge function using the service role, which checks
the device id itself.

**The pass signing key is an edge function secret.** Never in the client bundle, never in a
migration, never in this repository. If it ever reaches a phone, every pass in the world is
forgeable and the product's offline verification is worthless.

**No IP address column, anywhere.** The owner raised this and has ruled: no IP is stored. The
reasoning, for whoever reads this next:

- The product promises no account and nothing collected about the traveller. An IP address is
  personal data under the DPDP Act. Storing it obliges us to a stated purpose, a retention period
  and a deletion path — for a person we have deliberately kept no way to identify or contact.
- It buys nothing the device id does not. Entitlement is keyed to the device. Sharing is caught by
  a unique index, not by geography. Payment fraud is the aggregator's problem, with the
  aggregator's data.
- Supabase's own request logs hold IPs for their retention window regardless. That is a platform
  log we do not control and do not join to anything.

Reversing this is one migration — `add column last_ip inet` plus a retention job — so it is not a
door that closes. But it is now a decision, not a default: reopening it needs a reason written in
this file, not a shrug.

## What is verified

The migrations were applied to a real Postgres 16 and the constraints exercised:
`supabase/tests/entitlement.test.sql`. Seven statements that must fail, failed; five that must
succeed, succeeded — including one phone being refused a second slot of the same family pack, and
हटाएँ freeing that slot for a different phone.

**The project exists.** `dubai-saathi`, ref `pixlnjmpksmfqheotinp`, region `ap-south-1` (Mumbai —
closest to both the traveller buying in India and the traveller using it in Dubai), $10/month,
created on the owner's instruction. The project ref is public information and lives in
`supabase/config.toml`; the service-role key and the pass-signing key do not, and never will.

## Consequences

- `apps/api` in the repository layout is now the edge functions under `supabase/functions/`, not a
  Node service. The layout section in CLAUDE.md is updated to say so.
- Nothing syncs yet. The device's `VoiceEvent` queue sits at `synced: false` with no server to
  send it to, which is the correct state until a project exists.
- The traveller is unaffected if this database is down. Every pass verifies offline.
