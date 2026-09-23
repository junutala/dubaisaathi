# 033 — Claude reads the menus

**23 September 2026.** The first evening of keying real forms from the Bur Dubai walk. The phone's
OCR (tesseract, decision 029) turned 0004's clean printed PDF into "Onion Uthappam 7.00 Idiyappam
· 1.5" and "f FoodBowl Restaurant", and asked the owner to tick the dishes it had found. He spent
three hours and finished nothing:

> _"if this OCR is not reading properly, let's find another one. instead of wasting time like this
> 3 hours wasted..."_ — _"menu upload is one time effort and we are internet... so let's be a bit
> responsible."_ — _"try claude on the existing data and let's see what that brings us"_

The same evening Claude read the four forms keyed so far, straight from the pages on the server:

| form | restaurant             | kitchen  | dishes | pages                  |
| ---- | ---------------------- | -------- | ------ | ---------------------- |
| 0002 | Buhari Restaurant      | mixed    | 324    | 24, the restaurant PDF |
| 0004 | FoodBowl Restaurant    | mixed    | 393    | 8, the restaurant PDF  |
| 0013 | Sita Ram Chole Bhature | pure-veg | 34     | 2 phone photographs    |
| 0014 | Woodlands Restaurant   | pure-veg | 204    | 11 phone photographs   |

Spot checks against the pages (0014's Special Dosas, 0002's biryanis, 0013's front) matched name
for name and price for price. It left prices blank rather than guess where glare hid them, left out
dishes struck through by hand, and caught a menu that printed the veg mark on its chicken samosas.

The owner: _"good. so, let's continue with this approach. A couple of issues can be corrected by
hand, but if you throw the entire weight on me, i do not understand your value. So, freeze this
tool/OCR that you used and we will scan the 25 tomorrow."_

## What is frozen

- **The menu reader is Claude**, reading the page images themselves. The phone's tesseract is out
  of the menu path; the desk form's "Read the menu" is folded away under "More" and nothing depends
  on it. Google Vision, which the owner uses elsewhere, is not adopted; it can be compared on the
  same pages if a reading ever disappoints.
- **The flow:** the desk keys a form in four steps (decision 029's addendum) and Save waits for the
  server to hold every page. Review pulls the pages with the `Pull menu pages for review` workflow
  (the development container cannot reach Supabase; a runner can) onto the `menu-pages` branch,
  reads each form into `menu.json` — name, kitchen, cuisines, address, phones, hours, every dish
  with its price, section, veg mark and page — and writes the name, the kitchen and the desk's
  number back to the form's row. The readings are kept beside the pages on that branch, never on
  `main`.
- **What the reader must not do:** invent a dish or a price it cannot see; count a repeated page
  twice; call a dish veg unless it plainly is; mark anything Jain that the menu does not mark. A
  collector's Jain answer stays the collector's — Sita Ram's card marks nothing Jain, and the
  owner's "yes" on the form is what stands.
- **Nothing publishes by itself.** A read form stays held until it is published by hand into the
  outlets pack (decision 030), as before.

## What is not built yet

The reading is run by Claude in the working session, not by the app. Reading at upload time, so
the desk sees the name and the dish count before moving on, is the next step once the owner has
seen a full day of it.
