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

**This cannot be answered in this container, and was not faked.**

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
