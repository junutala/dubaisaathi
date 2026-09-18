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
photographs the shop front, presses the tick.

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

A thin `FieldReport`: `formSerial`, the fix, a frontage photograph, and no name. `dietary` is
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
- Still to build: the desk screen — the picker, and the read endpoint that lists pins waiting for
  their paper.
