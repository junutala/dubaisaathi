# 009 — The parser folds both scripts into one form, and asks when it is not sure

**Status:** accepted · **Supersedes nothing** · **Affects** `apps/pwa/src/features/voice/`, `data/intents/`

## The problem

`CLAUDE.md` rule 4 says the parser must accept Devanagari and Roman interchangeably, freely mixed
with English words, and must never branch on script. Rule 5 says the KPI is the intent, not the
transcript. Rule 3 says no LLM in the core path. So the parser has to be a few hundred lines of
string work that is right about Hindi — and has to be honest when it is not.

## The decision

**Two levels of matching, and they carry different confidence.**

1. **The folded form.** Transliterate Devanagari to Roman with Hindi's own schwa deletion, then
   smooth the spellings Indians differ on. A match here is certain (1.0).
2. **The consonant skeleton.** The same word with the vowels removed. A match here is offered,
   not assumed (0.75), and only when the skeleton is at least three letters and unique across
   every place in the pack. Below three letters the collisions start, so those places carry
   curated aliases in both scripts instead.

A test asserts no two places share a usable skeleton, so adding a place that collides fails the
build rather than silently answering for its neighbour.

**Confidence decides whether a screen opens or a question is asked.** `ROUTING_CONFIDENCE` is
0.6. A verb alone reaches it — "rasta batao" opens the tile with nothing filled in, which is
right. A filled slot lifts it; a skeleton-matched place lifts it less, because a wrong
destination is worse than a question. A bare place name scores 0.5 and gets the two-button
question. Nothing ever scores above 0.95: the speech that fed the parser was not certain either.

**A place with no verb asks. A sentence with no signal is unknown, and unknown is never routed.**
The expensive failure is not "I did not understand" — it is confidently opening the wrong screen.
A traveller who asks about the weather and lands on a route plan stops using the mic.

**Keywords are curated in both scripts; places are not.** Keywords are a closed set we control,
so they are matched as folded substrings with no skeleton fallback and no false positives. Place
names are open-ended — a traveller can say any place — so they get the fuzzier match.

**The traveller always sees their own words.** `PlaceRef.spoken` carries the raw substring, not
the folded form: the clarifier asks about "करामा", never "karama".

## Why not the alternatives

- **An LLM, or a cloud NLU.** Rule 3, and rule 1. The core path cannot need a network.
- **One alias list in Roman only, transliterating everything into it.** That is what the folded
  form does, and it is not sufficient alone: four of sixteen place names genuinely do not meet
  across the scripts (see `docs/spikes/002`). Curated aliases in both scripts are the backstop.
- **Aggressive vowel folding (o→a, ai→a) to force those four to meet.** It would have merged
  words that are not the same word, and the failure mode — confidently opening the wrong screen —
  is the one we are most trying to avoid. The skeleton does the same job with the confidence
  marked down honestly.
- **Fuzzy edit-distance matching.** Cheap to add, expensive to trust: it produces near-misses
  with no principled confidence, on a corpus small enough that curated aliases are simply better.
  Revisit when the learning loop says a specific class of misses is common.

## Consequences

- Every parser failure is fixable in `data/`, not in code — which is what the learning loop
  produces (`CLAUDE.md`, "Learning loop").
- `data/intents/benchmark.v1.json` gates `npm run verify` at 100%. A new failing sentence is
  added with the fix that makes it pass, in the same commit.
- The parser is tested without a microphone, a browser or a tap, so the speech half of the spike
  can proceed independently.
