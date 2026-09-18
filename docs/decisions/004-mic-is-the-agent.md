# 004 — The mic is the AI agent, and it is one thing everywhere

**Decided:** design review, September 2026.

> **Superseded, 16 September, by decision 016, and finally by 020.** There is no microphone in
> खाना, जाना or जानना: three days on a real phone showed no offline recogniser hears Dubai place
> names in an Indian accent inside a Hindi sentence (`docs/spikes/002`). Every box is typed into.
> The product's one microphone is बोलना (020) — online, on घर, and it hands its sentence to a
> person rather than to the matcher. Kept because the reasoning below is why the mic was tried at
> all, and because a later reader should find the argument and its answer together.

The mic on home and in the bar of every child screen means _ask Saathi anything_. Speech goes
through the offline STT and the local intent parser and lands on the screen that answers it,
with the answer already on it:

| Said                            | Intent                      | Opens                                      |
| ------------------------------- | --------------------------- | ------------------------------------------ |
| "Dubai Marina Mall jaana hai"   | route · destination         | 1.3, the options                           |
| "Driver ko bolo hotel le chalo" | phrase · hotel              | 3.3, the driver screen with the hotel card |
| same, no hotel saved            | phrase · hotel missing      | 4.2 होटल जोड़ें                            |
| "Jain khana kahaan milega"      | food · जैन                  | 2.1 with जैन on                            |
| "Beema dikhao"                  | document                    | 4.4, the document                          |
| "Karama"                        | destination, intent unclear | a two-button question                      |

The landing screen shows _आपने कहा: …_ so a misheard sentence is caught with back one tap
away. Intent accuracy, not transcript accuracy, is the KPI — `ParsedIntent` in
`packages/shared` is the contract.

The mics on 1.1, 2.1 and 3.1 are the same mic with a bias toward that tile. No LLM is
involved; this is the local intent parser the concept doc specifies.
