# 003 — Documents stay on the device, until the tourist deletes them

**Decided:** design review, September 2026.

Passports, insurance policies and flight bookings are photographed into the app because they
are the documents nobody can find at the desk. They are stored in the app's local storage on
the phone and never uploaded: we hold no passports, so there is nothing to breach and nothing
to be liable for, and the feature works offline like everything else.

They are kept until the tourist deletes them — one _हटाएँ_ per document. An automatic wipe was
considered and rejected: the documents cost us nothing, and a tourist may need the insurance
photo for a claim after the trip.

The app calls `navigator.storage.persist()` on first use so the browser treats the data as
persistent and does not evict it under storage pressure. Installed PWAs are granted this.
"On the phone" means inside the app, not in the photo gallery.
