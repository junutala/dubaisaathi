# 029 — The rider's screen: the app owns the number, the paper gets a copy

**18 September 2026.** Collecting खाना's first content has two shapes, not one. A collector walks
into a kitchen and fills forty fields. A rider on a motorcycle drops numbered paper at fifty
counters in an afternoon and must not be asked to do anything else.

The owner, on who that rider is:

> _"I may hire a pakistani or bengali for this. SO, no shop name or anything that he gets annoyed
> at"_

and on the numbering, after working through the join:

> _"let the app generate the number and have the rider copy it onto the form"_

## What the rider does

Hands over an A5 form, asks nothing, collects it filled with a takeaway menu stapled to it. Then,
standing outside: opens the app, writes the number it is showing into the box on the form,
photographs the shop front if he can, presses the tick.

**The photograph is optional**, at the owner's instruction:

> _"if the guy sees a policeman or some women in shopfront, then he will hesitate to take a
> picture and will be struck."_

A screen that will not let him leave without a picture is a screen that strands him at that
doorway. The fix is what the pin is for; the frontage is a convenience for matching paper to
pins later, and a pin without one is still a pin.

**He types nothing.** Not a name, not a number, not a word. The screen is a number to copy, a
camera and a tick, and it is built to be used by somebody who reads neither Hindi nor English:
the fix is a pin and a count of metres, the queue is an arrow and a count, and both are numerals,
which is the one script everybody in that lane shares.

## Why the app owns the number and the press does not

The first plan had the printer punch a serial into every form. It was cancelled, and rightly.

- **A phone cannot lose count.** A rider keeping his own tally writes 37 twice at the
  thirty-seventh shop and skips 39, and then two menu cards claim one doorway's coordinates.
- **It removes the only field on his screen.** The number is already there; he copies it with the
  pen that is in his hand for the form anyway.
- **It removes a dependency on the press.** Nothing about the collection now waits on how the
  printing went.

The number advances only after a pin is safely in the queue, so the screen always shows the
number to write _now_, and an abandoned visit spends nothing.

## What the pin is, and what it is not

A thin `FieldReport`: `formSerial`, the fix, a frontage photograph when there is one, and no
name. `dietary` is
absent, which is why it is now optional on the entity — sending five `false`s would tell the pack
"no Jain food" about a kitchen nobody has asked, and absent is what a traveller reads as पूछकर.
`toRestaurant` refuses a row with no kitchen kind and no name, so a pin cannot publish as a bare
outlet before its paper is keyed in.

## How the paper meets the pin

At a desk, later, with a flatbed scanner. The app lists the pins still waiting — each with its
number, its frontage photograph and the time — and the owner picks one, which is what joins the
paper in his hand to the coordinates the rider took hours earlier.

**No OCR of the form.** An earlier design had the app read the printed serial and even the tick
boxes off a scan. A tick that spills outside its box, a cross instead of a tick, a circle drawn
round हाँ, a smudge of chai — any of those becomes "yes, Jain" about a kitchen that said no, which
is the one mistake this product cannot survive. The five answers are keyed by a person reading the
paper, in four seconds. The menu card is scanned, OCR proposes its dishes and prices, and a person
confirms them — the same rule the collectors' app has always followed.

The form itself is not scanned at all. It stays in a folder, which is where a signed piece of
paper is most useful: six months from now, "who told us this kitchen does a Jain sambar" is
answered by a sheet with a tick on it and the manager's name beside it.

## Consequences

- `apps/field` carries two screens now, switched by two small buttons and remembered on the
  phone. `outlet.saafarsaathi.in` stays one app, one deployment, one thing to open.
- `field_reports` gains `form_serial` (migration 0012) and the `outlet` function passes it.
- The function's duplicate check no longer compares names when there is none: an empty name
  matched every neighbour within 40 m, so every pin beside an existing shop was flagged a twin.
- The desk screen is the old capture form, modified rather than replaced: _"I recommend you
  modify the existing outlet form to suit our new flow. I dont think we will use the old form."_
  It opens with the picker, and the pins come from the function's new `GET`.
- **One flow, and the pin is its door** (the owner, 18 September, correcting a wrong reading of
  his own words). He carries blank forms so that he can fill one _the moment he sees an Indian
  kitchen_ — standing there, as his own rider. So the coordinates are not useless at all; they
  are taken where they always were, at the door, by the pin. What the long form must never do is
  take a fix of its own, because the phone holding it may be at a hotel table an hour later, and
  a table in Deira must not be stamped onto a kitchen in Meena Bazaar. It has no geolocation
  watch and no frontage section; the place comes from the pin, always.
- **The tick offers the way on.** After a pin is saved, the confirmation carries _"fill this one
  in now"_, which opens the long form on that pin. Same screens whether the paper is keyed in on
  the pavement a minute later or at a desk that night, and nothing about the door is asked twice.
  A rider who only drops forms never sees the button — it is there only when the app has a long
  form to hand off to — and the confirmation clears itself after four seconds either way.
- **The picker lists this phone's pins as well as the server's.** A pin dropped ninety seconds
  ago in a basement has not been uploaded, and a list that only knew what the server knew would
  be empty exactly when it is needed. The phone's own copy wins on a tie; a frontage that will
  not read costs the picture and never the row.
- **A photograph now has a slot rather than a fresh id** (migration 0013). The queue re-sends a
  whole report until the server acknowledges it, and completing a pin on the same phone sends its
  frontage a second time — with `crypto.randomUUID()` on the server, every one of those wrote
  another copy. `(report_id, kind, ord)` is unique, so a photograph lands once however many times
  it is sent.
- Numbers are per phone, not global. Two riders would both start at 0001; the owner's answer was
  _"That does not bite me"_ — there is one rider — and the pin's own id, not its serial, is what
  the row is keyed by.

## Addendum, 23 September: no photograph of the shop, and the desk is four steps

The owner, after the first real walk (forms 0001–0026 in Bur Dubai):

> _"shopfront photos is a NO GO. Taking photos in dubai is a risky subject and you find
> plainclothsmen all around"_

The camera on the rider's screen was "optional", which still put a camera on the screen and still
had the server mark every pin without one `no-front-photo`, as if something were missing. Both
are gone: the pin screen is the number and the tick, and the flag is no longer raised. The one
photograph already held as a front (0025) is a menu page he took when his pen went missing, and
is filed as that form's menu.

And on the desk, after an hour spent failing to submit 0004:

> _"select the sequence, menu questions, upload, submit. you take care from there."_

So the desk form is that sequence: the form number, the paper's dietary questions, the menu
(photos or a PDF, turned into pages on the laptop), Submit. Only the number is required. The name,
the kind of kitchen, the dishes and the prices are read off the menu at review, so a submitted
form carries `keyedAt` — that, not a kitchen, is what takes a pin off the waiting list — and the
server holds it as `read-from-menu` until review has filled what the menu says. Everything else
the old form asked is still there, below Submit, folded under "More, if you know it".

## Addendum, 23 September, later: Save means the server has it

The first three forms keyed that way came back wrong: 0002 with no pages and 0004 with 32. The
24-page 0002 PDF was still opening when Save was pressed; 0002 went up empty, and its pages landed
in 0004 when they finished. The owner: _"Your code combined 0002 and 0004"_, and then: _"Unless
you are sure that the server captured the document, do not enable the CTA."_

- Save is locked while any menu file is still opening ("Wait — the menu is still opening"), and a
  file that finishes after its form was saved is dropped, never added to the next form.
- Save sends the form there and then and stays on the screen, counting pages onto the server. The
  form clears only when the server has answered every batch and counted every photograph in it
  ("Form 0004 is on the server, 8 menu page(s)"). Anything less says so beside the button, keeps
  the form, and Save sends it again.
- A form keyed again replaces its pages on the laptop, and only the pages a form lists are sent.
- On the server, 0002's 24 pages (1375 × 2000) were moved back from 0004, whose own eight
  (943 × 2001) became pages 0–7 again.
