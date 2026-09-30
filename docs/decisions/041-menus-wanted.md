# 041 — Menus wanted, in the collectors' app

27 September. The owner: _"in the collector app I have no way of identifying the price list with
the sequence number … I only need those outlets that have NO MENU in our app"_. Asked to choose
between a list in the app and a list to upload against on Drive, the app won on the week's
evidence: the three worst Bur Dubai menus were exactly the Drive files over 5 MB, which could only
be read through Drive's text recognition, and one file had been named `007` for form 0007.

## What it is

- **A third button in the collectors' app, मेन्यू · Menus**, beside फ़ॉर्म and पिन. It lists every
  pinned form with no menu in the app, and keeps the last list on the phone for a
  shop with no signal.
- **"No menu" is decided by the server** (`outlet?open`, migration 0018): a form with no menu page
  uploaded on it and no `menu_in_app_at`, or one review has put back with `menu_wanted`. A form
  leaves the list by itself the moment a page arrives on it.
- **In number order, each with its own name and its own cover** (the owner, same morning: _"I
  want to match the shop with the physical menu that I have … which shop is 30 and not 29 or
  31"_). The first version showed the shops pinned before and after; that answered the wrong
  question and went. Names are read off the covers at review into `field_reports.name`.
- **A cover is not a menu.** Fifteen Karama forms held only the cover photographed to recognise
  the shop, and four held one page of several; review puts each back on the list with
  `menu_wanted` saying what is missing.
- **Camera and Upload, and nothing between one page and the next** (the owner, same morning:
  "the first CTA is sitting idle … make camera and Upload and then go straight from there"). Both
  sit at the top of a form; each page goes to the server as it is taken, one send at a time, and
  the line under them is the server's own count. A form put back with `menu_wanted` leaves the
  list by itself once it holds more pages than it did then (`menu_wanted_pages`, migration 0019).
- **Pages land on the form** (`outlet?pages=`): photographed, or a PDF from the counter's QR drawn
  into pages on the phone, shrunk as every menu page is. Each waits on the phone until the server
  answers for it, and the screen says how many pages the form then holds.
- **Bur Dubai is complete for now** (the owner, 27 September): forms 0001–0026 carry
  `menu_in_app_at`, their menus having come from Drive, and the small gaps listed that morning are
  set aside.
- **Review sets `menu_in_app_at`** on any form whose menu is published from somewhere other than
  its own pages, so it does not stay on the list.

## Addendum — a cover is kept apart, and any form opens by its number (30 September)

The owner, the morning after the Karama walk: _"even the outlets where I have pictured the first
page are now missing on my outlet apps."_ The pin had stored the cover as the menu's page 0, so the
server counted the form as having a menu and it left the list — with no way back to it to add its
pages.

- **The pin takes the cover in its own slot** (`front`, which no shop photograph has used since 23
  September). A form with only a cover has no menu page and stays on the list.
- **The Menus screen opens any pinned form by the number on its paper**, whether the list carries
  it or not. That reaches the forms pinned before this change, whose cover is still page 0; the
  pages added land after it.
- **The camera stays open** (the owner: _"forty times I have to move between screens"_): अगला
  takes a page and stays, जमा करें takes the last and closes, हो गया closes. It is the phone's own
  camera inside the app; when the phone refuses it, the screen says what it said and falls back to
  the phone's camera one page at a time.
- **The QR and WhatsApp options on the pin are gone**; the note stays.
