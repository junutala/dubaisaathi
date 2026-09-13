# 010 — Speech recognition is a seam, and the keyboard is one of its engines

**Status:** accepted · **Affects** `apps/pwa/src/features/voice/stt.ts`, screen 1.2

## The problem

The PWA-vs-native gate rests entirely on whether a phone can turn Hindi speech into text with the
network off. That cannot be answered in this container — Vosk's and Hugging Face's hosts are both
blocked by the proxy, and there is no microphone — and it must not block the rest of the build.

## The decision

**`SttEngine` is the only thing the app knows about speech.** It reports an id, whether it works
offline, whether it is available on this phone, and streams partial text until it produces a
`SpeechResult`. Everything downstream — the parser, the screens, the learning loop — consumes
`SpeechResult`. Vosk or sherpa-onnx drops in by implementing that interface and being registered;
no screen changes.

**The engine id travels on every `VoiceEvent`.** "How often did the mic produce nothing, and on
which engine" is then a query over the device queue, not an opinion.

**`processLocally` is asked for first.** Chrome 138+ lets a page demand that the recogniser keep
the audio on the device. If that works on a real phone in aeroplane mode, the gate is passed with
no native wrapper — so the app asks for it before it asks for anything else, and reports
`unknown` rather than `no` on browsers that cannot answer.

**The keyboard is an engine, not an apology.** `typedStt` reports `worksOffline: true` and
`available: true`, because it is the only input that works on every phone with no network and no
permission. It reaches the same parser and the same screens. Screen 1.2 always offers it, and
every way the mic can fail ends on a screen that offers it — which is what keeps the mic from
being a dead end on a cheap phone, and this product is aimed at cheap phones.

## Why not the alternatives

- **Wait for the spike before building the mic.** The parser, the routing, the clarifier, the
  learning loop and screen 1.2 are all independent of which engine speaks. Waiting would have
  left the mic doing nothing — which is what the traveller was holding last week.
- **Ship a cloud recogniser and call it done.** It breaks rule 1 outright. `cloudStt` exists and
  is never preferred over an offline engine.
- **Pretend browser speech is offline.** It usually is not. `worksOffline` is a claim the spike
  checks, not a hope.

## Consequences

- The mic works end to end today on any phone: speech where the browser allows it, the keyboard
  everywhere else.
- A shared artifact link runs in a cross-origin frame with no microphone permission, so speech
  cannot start there. That is the frame, not the app, and the keyboard is how that link is tested.
- `VoiceFailure` gained `no-permission`, `no-speech`, `no-engine` and `stt-error`, which are the
  four numbers the gate decision will be made on.
