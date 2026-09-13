# 012 — The app is served from `dubai.saafarsaathi.in`

**Status:** accepted · **Affects** the PWA manifest, the service worker scope, CORS on the edge
functions, and how the app is tested on a phone

## The decision

The owner has bought **`saafarsaathi.in`** (सफ़र साथी — travel companion). The app is served from
**`dubai.saafarsaathi.in`**: the brand is the parent domain, the city is the subdomain.

That shape matters for more than tidiness:

- **A PWA's identity is its origin.** IndexedDB, the service worker, the offline pack, the
  documents on the device and the installed home-screen icon all belong to one origin and cannot
  move. Whatever origin the first traveller installs from is the origin the product lives at for
  the life of that install. Choosing `dubai.` now means a second city later is a new subdomain
  with its own pack, not a migration of everyone's device.
- **Each city gets its own scope.** `scope` and `start_url` are the subdomain root, so a Dubai
  install caches Dubai's pack and nothing else. A traveller who goes to Bangkok next year
  installs a second app rather than downloading two cities' data.
- **A real origin is the only place speech and offline can be tested.** A shared artifact link
  runs in a cross-origin frame with no microphone permission and no service worker, so neither
  the mic nor offline can be tested through one. That is not an app fault and no amount of code
  fixes it — it needs this domain, or any real host.

## What has to be true before it is live

- **HTTPS, no exceptions.** Service workers, `getUserMedia`, `SpeechRecognition` and
  `navigator.storage.persist()` are all refused on plain HTTP. There is no partial offline mode
  without a certificate.
- **The app is served as a static bundle**, which it already is: `base: './'` and hash routing
  mean it runs from any path, so the host can be anything that serves files.
- **The edge functions allow exactly this origin.** CORS is `https://dubai.saafarsaathi.in` and
  nothing else — not `*`. Three functions take a device id and one takes an aggregator webhook;
  a wildcard on those is a free forgery surface.
- **`www.saafarsaathi.in` is the marketing site, not the app**, and sells the same device QRs to
  someone in India buying for people already in Dubai (decision 005). Keeping it off the app's
  origin keeps a CMS or a landing-page builder out of the service worker's scope.

## Not decided here

Which host serves it. Any static host with HTTPS and a custom domain does the job, and the
choice does not touch a line of app code.
