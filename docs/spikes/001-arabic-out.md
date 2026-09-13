# Spike 001 — Arabic out: text and voice, on the device

**Status:** items 3 and 4 of the spike are done. Items 1 and 2 — Hindi speech in — are next.

## What was proved

A traveller can pick or say a Hindi sentence and get Arabic text and Arabic speech, **with the
radio off**, in a browser. Verified by loading the app, cutting the network, reloading, and
walking 3.1 → 3.2 → 3.3: zero external requests, no errors, Arabic rendered.

## Arabic text

Trivial, and that is the point. The phrase pack is sixteen curated sentences in IndexedDB,
each with Hindi, Hinglish, English and Arabic. No model, no service, no latency. For the
sentences a tourist actually needs — a taxi, a hotel desk, a shop, a dietary question — a
curated pack beats machine translation on accuracy and costs nothing to run.

The open question is not quality, it is **coverage**: sixteen sentences is a demo. The real
question the closed user test has to answer is how far a curated pack goes before a traveller
wants something not in it, and whether the intent parser can compose (destination + phrase)
rather than only look up.

## Arabic voice

The Web Speech API's synthesis half is on-device on both platforms and needs no network. What
it does _not_ guarantee is that an Arabic voice exists:

| Platform                           | Arabic voice                                                 |
| ---------------------------------- | ------------------------------------------------------------ |
| iPhone / iPad                      | Present on iOS 16+ (Maged, and Siri Arabic voices); reliable |
| Android with Google TTS            | Present when the Arabic language pack is installed; often is |
| Android without it, older WebViews | Absent — and cannot be installed from inside a PWA           |
| Desktop Chromium (this container)  | Absent, which is how the fallback got tested                 |

`speak.ts` prefers a Gulf voice (`ar-AE`, `ar-SA`, …) so a Dubai driver hears something
ordinary rather than Egyptian-accented, falls back to any on-device Arabic voice, and reports
`no-arabic-voice` when there is none. The UI then disables the listen button and says
_इस फ़ोन में अरबी आवाज़ नहीं है — दिखाकर काम चल जाएगा_. Showing the text still works, which is
why this degrades rather than fails.

## Measured on a real phone, 13 September 2026

Android, Chrome, **aeroplane mode**, on the live domain:

| Test                                   | Result                                                   |
| -------------------------------------- | -------------------------------------------------------- |
| Arabic text, radio off                 | **Works.** خذني إلى هذا العنوان, rendered and readable   |
| Show-the-driver screen, radio off      | **Works**                                                |
| Interface switched to Hindi, radio off | **Works**                                                |
| Arabic voice                           | **Absent.** Button disabled, and the app said so plainly |

Not yet distinguished: whether this phone has no Arabic voice at all, or has one that is
network-only and therefore invisible with the radio off. The same screen with the network on
answers it, and the answer changes the remedy rather than the design — showing the text works
either way, which is why this was built to degrade.

## The pattern both spikes found

Speech **in** (Hindi recognition) and speech **out** (Arabic synthesis) failed offline on the
same phone for the same underlying reason: the operating system can do the job, but the language
pack was never downloaded, and nothing downloads either by default.

That reframes the problem. It is not "browsers cannot do this" — it is "this phone has not been
prepared". Both packs are free, both are one-time, both need a network, and the product already
has the right moment for it: the landing page, where the offline content pack is downloaded
before _शुरू करें_ enables — while the traveller is still in India on their own Wi-Fi.

Preparing the phone there, rather than discovering the gap in a Dubai taxi, is worth designing
properly. It may also be what keeps this a pure PWA: see `docs/spikes/002`.

Rate is set to 0.85: the driver hears it once, over traffic.

**To measure on real devices:** what share of target phones have an Arabic voice at all. If it
is low on the cheap Android end of the market, the options are bundling a small offline TTS
(sherpa-onnx has Arabic models) or accepting text-only on those phones. That is a data
question, not a design one, and it belongs in the closed user test.

## What this says about the PWA-versus-native gate

Nothing yet. Voice **out** is comfortable in a browser. The gate rests entirely on voice
**in** — offline Hindi STT — which is items 1 and 2 and has not been touched.
