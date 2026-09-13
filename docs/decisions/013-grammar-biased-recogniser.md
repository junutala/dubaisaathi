# 013 — The offline recogniser decodes against our own word list, with the model's own beside it

**Status:** accepted, unmeasured on a phone · **Affects**
`apps/pwa/src/features/voice/speechGrammar.ts`, `voskStt.ts`, `ListenScreen.tsx`,
`data/intents/keywords.v1.json`, `VoiceEvent`, `supabase/migrations/0002_voice_events.sql`

## The problem

Offline Hindi speech works. Measured on a real Android phone in aeroplane mode on 13 September,
with Vosk's small Hindi model compiled to WebAssembly: the phone hears Hindi with the radio off,
and the PWA gate is passed (`docs/spikes/002`).

What it hears is the problem. Asked for "Mall of the Emirates" it returned **"माला एमरेट्स"**. The
owner's reaction was the right one: _"Maybe this will take the tourist to a wrong location!!"_

The cause is not the acoustic model, it is the language model. Vosk small decodes against a general
vocabulary of roughly fifty thousand Hindi words, weighted by how often they appear in ordinary
text. Place names are rare in ordinary text, so whenever a commoner word sounds roughly like one,
the commoner word wins. That is the language model working exactly as designed, on a product whose
entire job is to hear the rare words.

Going bigger does not fix it, and there is nothing to go bigger to: between Vosk's 42 MB Hindi
model and its 1489 MB one there is nothing, and 1.5 GB is not a download a traveller accepts. That
was settled with the owner: _"1.5GB is a far bigger ask and may dwarf the benefits. So, drop it."_

## The decision

**Two recognisers on one model, listening to the same audio.**

**The first is biased.** Kaldi can be told to decode against a supplied vocabulary instead of the
model's own — `KaldiRecognizer(sampleRate, grammar)`. The grammar is every Devanagari word in
`data/intents/`: the place names, their aliases, the intent verbs, the modes, the diets, the
documents, the phrase triggers, and the function words a traveller says around them. Two hundred
and five words, against fifty thousand. A decoder choosing between two hundred words makes a
different class of mistake than one choosing between fifty thousand, and the mistakes it stops
making are precisely the proper nouns.

**The second is the model as it comes**, decoding against everything it knows. It is there because
biasing is a trade, and this is the side of it that has to be paid:

- A grammar can only return words it holds. The day a traveller says a place nobody has curated,
  the biased recogniser is **deaf to it by construction**.
- The learning loop lives on words we have not seen. If the only transcript we keep is one filtered
  through our own vocabulary, the loop can never learn a word outside it — the list would stop
  growing on the day it was written.
- Which words of our grammar are in the model's own lexicon cannot be checked from here. A grammar
  word the lexicon lacks is silently dropped by Kaldi, and then the biased recogniser cannot hear
  that place at all. The unbiased one still can.

So both readings reach the screen. `SpeechResult.alternatives` carries the unbiased one; the screen
parses each reading **separately** — they are competing readings of the same seconds of audio,
never two halves of a sentence — and acts on the first that yields something it can act on. The
worst case is therefore the behaviour that shipped before this existed.

**Both readings are recorded.** `VoiceEvent` gained `unconstrainedTranscript`: what the model heard
with nothing constraining it, stored only when it differs from the transcript that was acted on.
That single field is what makes the biasing question answerable from data — for each command, what
each recogniser heard and which one the app believed.

**The engine id changed to `vosk-hi-0.22+grammar`.** The same model decoding against a different
vocabulary is a different recogniser, and the learning loop has to be able to tell the two apart
when it compares what travellers were heard to say.

**The grammar is generated, never written.** `buildSpeechGrammar` reads the same two pack files the
parser reads, so the recogniser can hear exactly what the parser can resolve. When the learning
loop adds an alias, the recogniser gains it in the same commit. There is no second list.

## What was rejected

**A grammar of phrases rather than words.** Kaldi accepts either. Phrases constrain harder and so
recognise better — but only the phrases given, in the order given, and real Hinglish word order is
not something to bet a trip on. The saving that matters comes from the vocabulary being two hundred
words instead of fifty thousand, and a word list keeps free word order for free.

**Dropping the unbiased recogniser to halve the decoding.** It would have made the grammar's
blind spot permanent and the learning loop blind with it. The decode of a small model is a fraction
of real time; two are still a fraction.

**Leaving `[unk]` out of the grammar.** Without Kaldi's out-of-vocabulary token the grammar is a
closed world, and anything else a traveller says is forced onto the nearest word in the list — a
confidently wrong answer, which is the worst thing this product can hand someone standing on a
kerb. With it, uncovered speech comes back marked unknown and the screen asks.

## What is measured, and what is not

Measured here, with no phone and no model (`speechGrammar.test.ts`):

- Every place name's Devanagari words are in the grammar. Removing one fails the test.
- The grammar holds words, not phrases; no Roman text; the out-of-vocabulary token present.
- **What the grammar costs.** For each Devanagari benchmark sentence, every word the grammar does
  not hold is deleted — the most a grammar-constrained recogniser could lose — and the parser must
  still reach the same conclusion. Twelve distinct words are dropped across the 35 sentences and no
  conclusion changes. Six of the twelve are dropped correctly: they belong to sentences that must
  come out `unknown` (the weather, phoning a wife), and a grammar that could hear them would be a
  grammar that routes them.
- No sentence gains confidence by passing through the grammar, which is the over-eagerness the
  simulation can see.

**Not measured, and only a phone can:** whether biasing makes the recogniser _over_-eager in the
acoustic sense — pushing a genuinely different word onto a place name because a place name is now
one of few things it is allowed to say. The simulation cannot see this, because it models what the
grammar removes and not what the grammar attracts. "आज मौसम कैसा रहेगा" is the sentence to watch: if
it comes back containing a place name, biasing is attracting, and the confidence floor is the only
thing between that and a traveller sent to the wrong end of Dubai.

Also unmeasured: which of the 205 words the model's lexicon actually holds, and what two decoders
cost on a low-end phone.

`docs/spikes/002-hindi-intent.md` says what to say into the phone, in order.
