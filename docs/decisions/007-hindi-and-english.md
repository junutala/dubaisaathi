# 007 — The interface ships in Hindi and English

**Decided:** September 2026. Extends CLAUDE.md rule 4, which said Hindi-Hinglish only.

Rule 4 was about the _speech_ surface, and it still holds there: the parser understands Hindi
and Hinglish, and nothing else, for the MVP. The interface is a separate question. A group
travelling together shares phones, not everyone in it reads Devanagari comfortably, and a
label nobody can read is worse than a language we did not plan to ship.

So the interface has two catalogues, `hi` and `en`, with every key present in both — the type
on `en` makes a missing key a build error, and a test fails if the two drift. The language
follows the phone until the traveller says otherwise, exactly as the theme does, and the
switch sits on the status strip next to it: both are "how the app presents itself", and
neither should be hunted for.

What the app _produces_ is unaffected. Arabic is what a Dubai local reads, and every phrase in
the pack carries Hindi, Hinglish, English and Arabic regardless of this setting.

Adding a third interface language is now a catalogue, not a refactor. That is not a licence to
add one: the MVP ships these two.
