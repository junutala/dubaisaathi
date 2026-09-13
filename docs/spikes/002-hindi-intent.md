# Spike 002 — Hindi and Hinglish speech → intent

The spike that decides the architecture (`CLAUDE.md`, "PWA decision gate"). It has two halves,
and they fail for different reasons, so they are measured separately.

| Half                                        | State                |
| ------------------------------------------- | -------------------- |
| **Text → intent** (the parser)              | done, measured       |
| **Speech → text, offline, on a real phone** | open — needs a phone |

---

## Half one: text → intent

`apps/pwa/src/features/voice/` — no model, no network, no LLM (rule 3). Three pieces:

- **`normalise.ts`** turns Devanagari, Roman and the mix of both into one comparison form. It
  transliterates with Hindi's own schwa deletion (करामा → karama, बुर → bur, बुर्ज → burj), reads
  a nukta as changing the consonant it sits under (ख़लीफ़ा → khalifa, not khalipha), then smooths
  the spellings Indians differ on: q/k, w/v, z/j, x/ks, aa/a, ee/i, oo/u, doubled letters,
  aspirates, and a silent final h.
- **`corpus.ts`** builds the vocabulary from `data/intents/places.v1.json` and
  `keywords.v1.json`. Places match on the folded form, and — where the consonants are unique
  across every place — on the consonant skeleton alone, at 0.75 rather than 1.
- **`parseIntent.ts`** finds the few things that change what happens (a place, a mode, a diet,
  a verb, a ready sentence, a document) and ignores the rest of the sentence.

### What the folding buys

Of sixteen place names written both ways, twelve meet without anyone curating both spellings —
seven on the folded form, five on the skeleton. The four that do not are genuine differences no
rule should paper over, and each carries curated aliases in both scripts instead:

| Written                | and                  | why they do not meet                                   |
| ---------------------- | -------------------- | ------------------------------------------------------ |
| ग्लोबल विलेज (vilej)   | global village       | Hindi spells the English word as it is said, not spelt |
| एयरपोर्ट (eyaraport)   | airport              | ए + य for the English diphthong                        |
| देरा (dr)              | deira                | the skeleton is two letters — below the floor          |
| मॉल ऑफ़ द एमिरेट्स (d) | mall of the emirates | "the" transliterates as द                              |

### The number

`data/intents/benchmark.v1.json` — 64 sentences a traveller would actually say, both scripts,
freely mixed. It runs inside `npm run verify`.

| Measure                                                     | Result  |
| ----------------------------------------------------------- | ------- |
| Intent correct (rule 5's KPI)                               | 64 / 64 |
| Slots correct (destination, mode, diet, sentence, document) | 66 / 66 |
| Out-of-scope sentences kept out of a screen                 | 4 / 4   |
| Bare place names that asked instead of guessing             | 3 / 3   |

**Read that honestly: the same hand wrote the corpus and the benchmark.** 100% here means the
net has no holes in it _yet_, not that the parser is right about Hindi. The number that matters
comes from `VoiceEvent`s off real phones, and every failure it finds is added to the benchmark
with the pack change that fixes it, in the same commit. The floors are 100% and do not move down.

### Four cases the first run got wrong, and what fixed them

All four were fixed in `data/`, which is where a parser failure should be fixable:

| Sentence                             | Was       | Fix                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------ |
| पैदल जुमेरा जा सकते हैं              | `place`   | "जा सकते हैं" added; a named mode + a named place is a route |
| बिना प्याज़ लहसुन का खाना चाहिए      | one tag   | the compound curated against both no-onion and no-garlic     |
| samaan yahin rakh sakte hain poochho | `unknown` | "poochho" as a phrase verb; the trigger widened              |

---

## Half two: speech → text, offline

### Measured on a real phone, 13 September 2026

Android, Chrome, 5G, on `https://dubai.saafarsaathi.in` — the first real-device run.

| Test                           | Result                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Online: mic → Hindi transcript | **Works.** "मुझे आज दुबई मॉल तक जाना है कैसे जाऊं मै"                                                    |
| Online: transcript → intent    | **Works.** `route`, destination `dubai-mall` at confidence 1.0, landed on the tile with _आपने कहा_ on it |
| **Aeroplane mode: app opens**  | **Works.** Shell, tiles, strip showing offline — the whole app with the radio off                        |
| **Aeroplane mode: mic**        | **Fails.** No on-device Hindi model on this phone                                                        |

So the online transcript came from Google's servers, not the handset. That is the expected state
of most Android phones today: Chrome 138+ can run speech recognition locally, but only against a
language pack that has to be downloaded first, and nothing downloads Hindi by default.

**What this does and does not settle.** It settles that we cannot _assume_ offline Hindi speech
on Android. It does not settle the gate, because of the next section.

### RESOLVED, 13 September: offline Hindi speech works in a pure PWA

Vosk's small Hindi model, compiled to WebAssembly, served from our own origin and downloaded once
by the traveller. Measured on the same Android phone, in aeroplane mode:

| Test                                         | Result                                 |
| -------------------------------------------- | -------------------------------------- |
| Download the voice (42 MB) on wifi           | **Works**, with progress               |
| Aeroplane mode: mic → Hindi transcript       | **Works.** "मुझे माला एमरेट्स तक जाना" |
| Aeroplane mode: transcript → intent → screen | **Works**                              |

**The PWA gate is passed.** No native wrapper, no app store, no OS language pack, no Google. The
stack table's "sherpa-onnx primary, Vosk baseline" now has a measured baseline.

### What it costs: accuracy on proper nouns

Vosk is markedly worse than Google's cloud recogniser, and it fails in a specific, predictable way.
Spoken "Mall of the Emirates" came back as **माला एमरेट्स**, and "तक जाना है" lost its auxiliary
and came back as **तक जाना**.

The second is the more interesting failure. It meant no route verb matched at all, so an ordinary
sentence parsed as `unknown` — not as the wrong destination. **The confidence model held**: a
mangled proper noun produced no route rather than a confident wrong one, which is the behaviour the
whole design exists to guarantee. A traveller sent to the wrong mall is worse than a traveller
asked to repeat themselves.

That is not a guarantee, though, and the residual risk should be stated plainly: if Vosk mishears
one corpus place as **another corpus place**, the parser will route confidently and wrongly. The
mitigations are already in the design — _आपने कहा: …_ on every landing screen with back one tap
away — and they matter more now than they did when the transcript came from Google.

The fix for both failures is data, not code, which is what the corpus is for: what the phone
actually heard is now an alias, and auxiliary-dropped route verbs are now keywords. Both are in
`benchmark.v1.json` as verbatim transcripts, so a later corpus change cannot quietly undo them.

**What this means for the model choice.** Vosk small is proof the architecture works, not proof it
is the right model to ship. The next question is whether a larger Vosk model or sherpa-onnx with
IndicConformer gets proper nouns right at an acceptable size — and place names are most of what
this product needs to hear correctly.

### The other thing that could have kept this a pure PWA

Chrome 138+ exposes an install path alongside the availability probe the app already calls —
asking the browser to download the on-device model for a language. If that works for `hi-IN`,
offline Hindi speech becomes a one-time download rather than a missing capability, and it fits
the product exactly: the landing page already downloads the offline pack with progress shown
before _शुरू करें_ enables. The speech model would be part of that same download.

Untested. It needs a phone, a network, and a willing tester; it cannot be checked here. It is the
next thing to try, and it is worth trying before anyone writes a native wrapper.

### Still open

- iPhone Safari, aeroplane mode. iOS on-device dictation may behave differently from Chrome's,
  and Safari has no `processLocally` to ask about.
- Whether an installed on-device model, once present, reaches the right intent often enough
  (rule 5's KPI) when the speech is real rather than typed.

### Why this was not measured earlier

**Not in this container, and not faked.**

- `alphacephei.com` (Vosk) and `huggingface.co` (Whisper, IndicConformer) both return 403 through
  the proxy, so no model can be downloaded, let alone benchmarked.
- There is no microphone and no phone.

What is built instead is the seam, so the answer can be dropped in when a phone is available:
**`stt.ts`** defines `SttEngine`, and everything downstream consumes `SpeechResult` and does not
care what produced it. Vosk or sherpa-onnx implements that interface, is registered in `ENGINES`,
and is preferred automatically because it reports `worksOffline`.

Three engines are wired today:

| Engine        | id                  | Offline    | What it is                                                                                                                                                                                                                  |
| ------------- | ------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onDeviceStt` | `browser-on-device` | claims yes | The phone's recogniser with `processLocally = true` (Chrome 138+): the browser refuses to send audio to a server. If this works on a real phone with the network off, the PWA gate is passed with no native wrapper at all. |
| `cloudStt`    | `browser-cloud`     | no         | The same recogniser without that condition — usually a server hears the audio. A convenience, never depended on.                                                                                                            |
| `typedStt`    | `typed`             | yes        | The keyboard. Works on every phone, no permission, no network, same parser, same screens.                                                                                                                                   |

The engine id travels on every `VoiceEvent`, so "how often did the mic produce nothing, and on
what" is a query, not a guess. `onDeviceHindi()` asks Chrome whether a Hindi model is installed
and reports `unknown` rather than `no` on every other browser.

### What to measure on a phone, in this order

1. Android Chrome, installed PWA, **aeroplane mode**: does `processLocally` produce a Hindi
   transcript at all?
2. If it does — 30 of the benchmark sentences spoken aloud: what share still reach the right
   intent? (Rule 5: the transcript may be wrong as long as the intent is right.)
3. iPhone Safari, installed PWA, aeroplane mode: same two questions. Safari has no
   `processLocally`; iOS on-device dictation may or may not reach `webkitSpeechRecognition`.
4. Only if 1 and 3 both fail does a native speech wrapper get considered, and then the seam is
   already the only thing that changes.

### Known, and not a phone problem

Inside a shared artifact link the app runs in a cross-origin frame with no `allow="microphone"`,
so speech cannot start there however good the phone is. The keyboard path is how that link is
tested; real speech needs the app served from its own origin or installed to the home screen.

## The grammar round (13 September, decision 013)

The offline recogniser now decodes against our own 205-word list, with the model's unconstrained
recogniser running beside it on the same audio. Nothing about this has been measured on a phone —
it cannot be, from here — so this is the round that decides whether step 2 of the plan passes.

### Before you start

Offline voice has to be on the phone already: open the mic screen on wifi, tap **download the
voice**, wait for 100%, then turn the radio off. The offer disappears once the model is cached.

### Say these, in this order, with the network off

The first column is what to say. The second is what the app must do — not what it must print.

| Say                                          | Must                                               |
| -------------------------------------------- | -------------------------------------------------- |
| मॉल ऑफ़ द एमिरेट्स जाना है                   | open रास्ता — **this is the sentence that failed** |
| मुझे करामा जाना है                           | open रास्ता                                        |
| मेट्रो से दुबई मॉल जाना है                   | open रास्ता                                        |
| बुर्ज ख़लीफ़ा कैसे पहुँचूँ                   | open रास्ता                                        |
| ग्लोबल विलेज ले चलो                          | open रास्ता                                        |
| ड्राइवर को कहो मीटर चालू करे                 | open the Arabic for the meter                      |
| जैन खाना कहाँ मिलेगा                         | open खाना                                          |
| **आज मौसम कैसा रहेगा**                       | **ask — must NOT open a place**                    |
| **मेरी पत्नी को फ़ोन लगाओ**                  | **ask — must NOT open a place**                    |
| a place we have never curated — say अल क़ूज़ | ask, and the event must carry what it heard        |

The last three are the ones that decide it. The first seven only confirm the gain; those three
measure the cost.

### What a pass looks like

1. **The place names arrive.** Line 1 opens रास्ता. If it still comes back as "माला एमरेट्स" and
   opens nothing, grammar biasing has not solved the problem and step 3 (sherpa-onnx) is next.
2. **Nothing is invented.** Lines 8 and 9 must land on the two-button question, not on a screen.
   A place name appearing in either is biasing attracting rather than filtering, and it is worse
   than the defect it was meant to fix: a wrong location delivered confidently.
3. **The uncurated place is still heard.** Line 10 will not route — nothing knows अल क़ूज़ — but the
   unconstrained recogniser should have heard something like it, and that is what teaches the pack.

### What to send back

The `VoiceEvent` queue, which is on the device at `synced: false`. Each row now carries both
readings: `transcript` is what the app acted on, `unconstrainedTranscript` is what the model heard
with nothing constraining it, and they are only both present when they differ. Ten rows answer the
question that cannot be answered from here — for each command, what each recogniser heard and which
one the app believed.

Also worth noting by hand, because no event carries it: how long the mic takes to come up on the
first tap after a cold start (two decoders instead of one), and whether the phone gets warm.
