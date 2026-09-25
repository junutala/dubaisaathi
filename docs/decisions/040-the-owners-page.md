# 040 — The owner's page, at admin.saafarsaathi.in

25 September. The owner: _"do not clutter the customer app — build an admin app if it helps"_, and
then _"the time is now"_ for the `/admin` screen decision 023 put off until the volume earned it.
The page is **marketing, not selling** (decision 039): numbers an owner can say to a travel agent
or an investor — downloads, phones in Dubai and in India over the last seven days, phones that came
back, how much of the use happened with no signal — plus what he needs to run the week: forms still
waiting for a menu, what travellers asked for and did not find, orders, the website's messages.

## What it is

- **Its own origin and its own service** (`admin` on Railway, `deploy/Dockerfile.admin`), static
  files and nginx, in `apps/admin`. Nothing of it is in the traveller's bundle; nothing of the
  traveller's app is on this origin.
- **One call.** The page posts a passphrase to the `admin` edge function, which checks its SHA-256
  in constant time and returns `admin_metrics()` (migrations 0016, 0017) — a security-definer
  function only the service role may run. There is no table access from the page, no account, and
  no second endpoint.
- **A passphrase, not an account** (decision 001 still holds for everyone else). Only its hash is
  in the repository. "Remember on this phone" keeps it in that browser's storage; the lock button
  forgets it.
- **Every value is drawn as text.** Searches and messages are what strangers typed.
- **The region is a country bucket** — Dubai, India, elsewhere — taken from a Dubai fix the app
  already holds or the phone's time zone, on a day's first open only. The app never asks for
  location for this and no coordinate is stored (the owner: "I do not want to know if and where
  Arun went").
- **Never indexed, never framed, never cached**; `/sw.js` is a real file that unregisters any
  worker it finds, so nothing that was ever served here can hold the address.
