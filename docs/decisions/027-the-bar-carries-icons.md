# 027 — The bar carries icons, and जाना stops being a metro train

**18 September 2026.** The owner, looking at the bar on his phone:

> _"the last two icons, documents and say Hi are still in english only"_

and then, after seeing the candidates:

> _"I like all. Your choice, but I do not want the labels below.... just the icons. Agreed that we
> should replicate the ones we use already. brand recall - and the 'The Circled i' can go into
> production."_

## What he had actually spotted

Not a bug. The three pillar names are Devanagari in both interface languages — they are the brand,
never a translation (design rule 8) — and `दस्तावेज़` was the one bar item that _did_ translate. So
in the English catalogue the bar read **खाना · जाना · जानना · Documents**: three Hindi words and
one English one, which looks like a job half done however it is explained.

There were two ways out: translate the pillars, which decision 016 forbids, or stop painting words
under the icons. The second is better than a fix — it makes the bar say the same thing in both
catalogues, and gives the screen above it the height the words were taking.

## The decision

**The bar is four icons and no words.** Each keeps its name as `aria-label`, because a screen
reader announces that and a glyph with no name is a button nobody blind can use. The lit tab keeps
its sand pill and its own hue; with no label to thicken, the pill is what carries "you are here".
The icons go up from 24px to 27px, because now they are the whole signal.

**जाना's icon is a signpost, not a metro train.** The pillar's promise is _metro, bus or taxi —
fare and time, side by side_, and a train said one mode and stayed silent about the choice. A post
with two ways off it says _choose a direction_ and names no vehicle. Four candidates were drawn at
the two sizes that matter (24px in the bar, large on घर's block): two routes between one pair of
points, this signpost, the owner's own starburst cut to four arms, and the train as a control.
The starburst — seven vehicles around a hub — cannot survive 24px; at four arms it reads as a
compass. The two routes read as a leaf. The signpost reads at both sizes.

**दस्तावेज़'s slot becomes ज़रूरी जानकारी, and its icon is a circled _i_.** That is the one glyph in
the set that needs no word at all: an Indian traveller has met it at every railway station and
airport in the country. It is what makes a wordless bar defensible rather than clever.

## What this does not do yet

The tab still opens the documents list. The screen behind it — the Indian consulate and the
numbers that decision 002 promised and never shipped, then the documents, then feedback and the
referral link — is agreed in outline and not built. Until it is, the _i_ is a promise the screen
has not met, and that is the next piece of work rather than a thing to be explained away.

## Consequences

- `icons.tsx` and `design/generator/_icons.sh` gain `signpost` and `info`; `metro` stays, because
  जाना's own screens still draw a metro leg.
- The boards regenerate with a wordless bar. `design/check-screens.py` can no longer count the
  tabs by their words, so it counts them by their glyphs — one distinctive path from each — and
  fails a board that paints a word under one.
- The website's जाना tile and जाना claim carry the signpost, because the owner's reason for using
  the app's own icons there was brand recall, and two drawings of one pillar defeat it. The
  decorative wash keeps its metro train: it is scenery, not a mark.
- All eight screenshots on the website were re-taken against this build. They are photographs of
  the app with the radio off, so a changed bar makes every one of them stale.
