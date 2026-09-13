# Agreed design rules

Every rule here was asked for once. They are listed so that none of them has to be asked for
twice, and `design/check-screens.py` fails `npm run verify` for the ones a machine can check.

| #   | Rule                                                                                                             | Enforced by |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Every screen except home and the splash shows the tile it belongs to, its trail, a back control and a way home.  | checker     |
| 2   | Screen names use the four tiles (`रास्ता`, `खाना`, `बोलना`, `मदद`) or `घर`. No invented names.                   | checker     |
| 3   | Every screen carries a number so it can be referred to directly.                                                 | checker     |
| 4   | No colour value, template token or markup ever reaches the traveller as visible text.                            | checker     |
| 5   | Every control is at least 48px. Controls declare themselves with `data-tap`; decorative boxes are not controls.  | checker     |
| 6   | Dark screens carry no light surfaces.                                                                            | checker     |
| 7   | Every artboard on the canvas exists, and every screen is on the canvas.                                          | checker     |
| 8   | Red means emergency and nothing else.                                                                            | review      |
| 9   | Marigold means "press here" and nothing else; on light grounds it uses the darker tone.                          | review      |
| 10  | No login, no account, no gate before the app is usable.                                                          | review      |
| 11  | A state is not a different app: no screen inverts the theme on its own.                                          | review      |
| 12  | Every field earns its place. Nothing is added because another app has it.                                        | review      |
| 13  | The traveller's offline status is visible; the pass screen says the opposite, because paying needs a connection. | review      |
| 14  | Emergency stays reachable after the trial and after the pass expire.                                             | review      |

Rules marked "review" are judgement calls a script cannot make. When one of them is missed,
either it becomes checkable and moves up, or it gets stated more sharply here.
