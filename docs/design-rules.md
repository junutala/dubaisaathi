# Agreed design rules

Every rule here was asked for once. They are listed so that none has to be asked for twice,
and `design/check-screens.py` fails `npm run verify` for the ones a machine can check. When a
new rule is agreed, it is added here before the screen is drawn.

## Structure

| #   | Rule                                                                                                                                                                | Enforced by |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Home is the status strip, the four tiles and the mic. Nothing else — no brand mark, no profile icon, no settings icon, no counter card.                             | checker     |
| 2   | The four tiles are रास्ता · खाना · बोलना · ज़रूरी जानकारी. Every other screen is a child of one and is numbered `tile.child`; पास and परिवार are `घर.1` and `घर.2`. | checker     |
| 3   | Screen names use the tile names. No invented labels. Every screen has a number.                                                                                     | checker     |
| 4   | Every screen except landing and home carries the shared header: back, the tile trail, home.                                                                         | checker     |
| 5   | Every screen except landing carries the status strip at the very top: online/offline · validity (tap → घर.1) · theme switch.                                        | checker     |
| 6   | The bottom bar on child screens is घर + the other three tiles + the mic.                                                                                            | checker     |
| 7   | The landing page gates on the full pack download. _शुरू करें_ enables only when complete. Updates apply there at the next launch, never mid-trip.                   | review      |
| 8   | No login, no account, no gate before the app is usable.                                                                                                             | review      |
| 9   | Permissions at first use: location when 1.1 first opens, mic when first tapped. Never on landing.                                                                   | review      |

## The mic

| #   | Rule                                                                                                                   | Enforced by |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| 10  | The mic is one thing everywhere: ask Saathi anything. Speech → local intent → the right screen with the answer on it.  | review      |
| 11  | Ambiguity gets a two-button question, never a dead end. The landing screen shows _आपने कहा: …_ with back one tap away. | review      |
| 12  | Intent accuracy is the KPI, not the transcript. Hinglish is first-class input.                                         | review      |

## ज़रूरी जानकारी

| #   | Rule                                                                                                                                               | Enforced by |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 13  | No emergency feature, no red on any screen. The dialler and the reception desk are better tools; offline clinic hours are a liability.             | checker     |
| 14  | The hotel is captured by pin, card photo or entrance photo. Never typed. The card photo is what the driver sees.                                   | review      |
| 15  | Documents: any document, one photo, one name. On the device only, never uploaded, kept until the tourist deletes it. Persistent storage requested. | review      |
| 16  | ज़रूरी जानकारी stays usable after the pass expires.                                                                                                | review      |

## Fields and copy

| #   | Rule                                                                                                                                            | Enforced by |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 17  | Every field has a one-line justification in `docs/field-ledger.md`, written from the tourist's seat, before it is added. No line, no field.     | review      |
| 18  | Nothing tech-facing reaches the tourist: no model names, sizes, version numbers, percentages of unseen things. Time left, and what still works. | review      |
| 19  | No colour value, template token or markup ever renders as visible text.                                                                         | checker     |
| 20  | Every control is at least 48px. Controls declare themselves with `data-tap`.                                                                    | checker     |
| 21  | Marigold means "press here"; on light grounds it uses the darker tone. Teal means offline-and-ready.                                            | review      |
| 22  | The offline status is on the strip. The pass screen says the opposite — _ख़रीदने के लिए इंटरनेट ज़रूरी_ — because paying needs a connection.    | review      |
| 23  | Dark screens carry no light surfaces. Theme follows the phone; the switch is on the strip.                                                      | checker     |
| 24  | The canvas and the files on disk agree.                                                                                                         | checker     |

## Dropped, so they are not proposed again

- Find-my-family: needs a connection on both phones; a PWA cannot track location in the background.
- SOS to a contact in India: outgoing SMS is not available without a local plan; the promise is offline.
- A settings screen: hotel is in 4.1, the pack is on landing, theme is on the strip. Nothing left to set.
- Auto-deleting documents: they are local, cost nothing, and a tourist may need them after the trip.
- A language row: one language in the MVP.
