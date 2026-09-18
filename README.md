# dubaisaathi

An offline information desk for Indian travellers in Dubai, as a PWA: खाना · जाना · जानना, the
traveller's hotel and documents on the phone, all of it with the network off.

- `apps/pwa` — the traveller's app: खाना, जाना, जानना, the hotel, the documents, the pass, and
  बोलना (online only). `npm run dev` to run it, `npm run verify` before every commit — it runs
  format, lint, typecheck, the design checks, the tests and both builds, and CI runs the same.
- `apps/field` — the collectors' app, live at `outlet.saafarsaathi.in`.
- `apps/site` — the one-page website.
- `supabase/` — the backend: ten tables and nine edge functions, and no accounts anywhere
  except the collectors' app.
- `data/` — the content packs, versioned and loaded into IndexedDB. `design/` — the generator and
  the boards, which are the design source of truth. `docs/` — the decisions, one per ADR.

Start with `CLAUDE.md`: what this is, how to work on it, and what is left.

Production is `main`, built by Railway into `dubai.saafarsaathi.in` (the app), `outlet.saafarsaathi.in` (the collectors' app) and `saafarsaathi.in` (the website, `apps/site`).
