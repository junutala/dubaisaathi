#!/usr/bin/env python3
"""Fails the build when a screen breaks a rule we have already agreed.

Every rule here exists because it was asked for once and then missed on a later screen. A rule
that only lives in a conversation gets forgotten; a rule that fails `npm run verify` does not.
The rules are numbered in docs/design-rules.md; add here whenever a new one is agreed.
"""
import json
import pathlib
import re
import sys

SCREENS = pathlib.Path(__file__).parent / 'screens'

PILLARS = ['खाना', 'जाना', 'जानना']
# The landing page and the names sheet are not screens with chrome.
NO_CHROME = {'Landing', 'Names'}
# घर.n screens and the pillars' children; everything else is home or a state of it.
HOME = {'Home', 'HomeDark', 'HomeTrial', 'HomePaid'}
NAME_MARK = 'दुबई साथी'
BACK_ICON = 'M15 5l-7 7 7 7'
TICKET_ICON = 'M4 8a2 2 0 0 1 2-2h12'
BAR_TOP = 'border-top: 1px solid'
LIGHT_SURFACES = ['#FFFDF9', '#F7F3EC', '#E6DED2', '#141826']

failures: list[str] = []


def fail(screen: str, rule: str) -> None:
    failures.append('%s: %s' % (screen, rule))


def main() -> int:
    files = sorted(SCREENS.glob('*.dc.html'))
    if not files:
        print('no screens found — run design/generate-screens.sh first')
        return 1

    for path in files:
        name = path.name[: -len('.dc.html')]
        text = path.read_text(encoding='utf-8')

        # Rule 1: no microphone anywhere. Not in the bar, not in a box, not as an icon.
        if re.search(r'\bmic\b|माइक|बोलिए|बोलकर', text):
            fail(name, 'a microphone, or an invitation to speak — voice is out (decision 016)')

        # Rule 2: red is reserved and appears on no screen.
        if re.search(r'#C62B2B|#D32F2F|#E53935|\bred\b', text, re.IGNORECASE):
            fail(name, 'red on a screen — red is reserved and belongs to no feature')

        if name in NO_CHROME:
            continue

        # Rule 3: the strip on every screen — the name, the network, the pass dot, the theme.
        if NAME_MARK not in text:
            fail(name, 'the strip does not carry the name')
        if 'ऑफ़लाइन' not in text and 'ऑनलाइन' not in text:
            fail(name, 'the strip does not say online or offline')
        if '>पास</span>' not in text:
            fail(name, 'the strip has no pass dot')
        if 'M20 14.5A8.5 8.5' not in text and 'M12 2.5v2.5' not in text:
            fail(name, 'no theme switch on the strip')
        # The hotel row reads "मेरा होटल जोड़ें" until there is one, then the hotel's own name
        # with बदलें beside it.
        if 'मेरा होटल' not in text and '>बदलें</span>' not in text:
            fail(name, 'the strip has no hotel row')

        # Rule 4: the bar on every screen — the three pillars and the documents, and nothing
        # else. The pass is the strip's dot and घर's tile (decision 018, 17 September); a पास लें
        # button in the bar duplicated both.
        bar_items = sum(1 for p in PILLARS + ['दस्तावेज़'] if ('>%s</span>' % p) in text)
        if bar_items < 4:
            fail(name, 'the bar is missing a pillar or the documents')
        if 'पास लें' in text[text.rfind(BAR_TOP):]:
            fail(name, 'the bar carries पास लें')
        if name == 'HomePaid' and 'पास लें' in text:
            fail(name, 'a paid traveller still sees पास लें')

        # Rule 5: home is the three pillars, in order, and nothing else.
        if name in HOME:
            order = [text.find('>%s</span>' % p) for p in PILLARS]
            if any(i < 0 for i in order):
                fail(name, 'home must carry all three pillars')
            elif order != sorted(order):
                fail(name, 'the pillars are out of order: खाना, जाना, जानना')
            if 'type="text"' in text or '<input' in text:
                fail(name, 'home carries a box')
            # Rule 13: the pass tile sits at the foot of घर — after the last pillar, before
            # the bar — and is never red (rule 2 covers the colour).
            tile = text.find(TICKET_ICON)
            bar = text.find(BAR_TOP)
            if tile < 0:
                fail(name, 'home has no pass tile')
            elif not (max(order) < tile < bar):
                fail(name, 'the pass tile is not between the pillars and the bar')

        # Rule 6: every screen that is not home has a way back.
        if name not in HOME and BACK_ICON not in text:
            fail(name, 'no back control')

        # Rule 7: dark screens carry no light surfaces. The mark's own cream is drawn inside its
        # SVG and is the mark, not a surface, so the drawings are set aside before looking.
        if name.endswith('Dark'):
            surfaces = re.sub(r'<svg.*?</svg>', '', text, flags=re.S)
            for hexv in LIGHT_SURFACES:
                if hexv in surfaces:
                    fail(name, 'light surface %s in a dark screen' % hexv)

        # Rule 8: nothing tech-facing reaches the traveller.
        for leak in re.findall(r'>\s*#[0-9A-Fa-f]{6}', text):
            fail(name, 'colour value rendered as visible text: %s' % leak.strip('> '))
        if re.search(r'\$\{|\$[a-z_]+\b', re.sub(r'<svg.*?</svg>', '', text, flags=re.S)):
            fail(name, 'an unsubstituted shell variable reached the screen')

    # The canvas and the files on disk must agree, and names must follow the pillars.
    canvas = json.loads((SCREENS / 'canvas.json').read_text(encoding='utf-8'))
    listed = {a['file'] for a in canvas['artboards']}
    on_disk = {p.name for p in files}
    for missing in sorted(listed - on_disk):
        failures.append('canvas.json: lists %s, which does not exist' % missing)
    for unlisted in sorted(on_disk - listed):
        failures.append('canvas.json: %s is not on the canvas' % unlisted)
    number = r'^(L|घर(\.\d+)?|\d\.\d) · '
    for artboard in canvas['artboards']:
        stem = artboard['file'][: -len('.dc.html')]
        title = artboard.get('title', '')
        if stem == 'Names':
            continue
        if title.startswith('घर'):
            continue  # home, one of its states, or a घर.n child
        if re.match(number, title):
            body = re.sub(number, '', title)
            head = body.split(' ›')[0].split(' ·')[0].strip()
            if head and head not in PILLARS + ['लैंडिंग']:
                failures.append('canvas.json: %s is named "%s" — names use the three pillars' % (stem, body))
        else:
            failures.append('canvas.json: %s has no screen number' % stem)

    if failures:
        print('design checks failed:\n')
        for f in failures:
            print('  - ' + f)
        return 1
    print('design checks passed: %d screens' % len(files))
    return 0


if __name__ == '__main__':
    sys.exit(main())
