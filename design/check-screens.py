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
# बोलना — घर's fourth block from 17 September, and the one screen that needs a signal.
SPEAK = 'बोलना'
# The names sheet is not a screen with chrome. (The landing page and its one-time notice went on
# 2 October, decision 057: the app opens on what was asked for, with nothing to accept.)
NO_CHROME = {'Names'}
# घर.n screens and the pillars' children; everything else is home or a state of it.
HOME = {'Home', 'HomeDark', 'HomeTrial', 'HomePaid'}
# The terms (decision 048): the small print at the foot of घर, and on घर.10 the owner's line that
# जाना is not a map of every address. घर.10's prose names बोलना as a word in a sentence.
SMALL_PRINT = 'नियम, निजता और रिफ़ंड — saafarsaathi.in/terms'
TERMS_GO = 'जाना हर पते वाला ऑफ़लाइन नक्शा नहीं है'
TERMS_BOARDS = {'HomeTerms'}
# The lockup's word, the same in both interface languages (decision 021).
NAME_MARK = 'Dubaisaathi'
BACK_ICON = 'M15 5l-7 7 7 7'
TICKET_ICON = 'M4 8a2 2 0 0 1 2-2h12'
# The bar is found by its own marker, not by its border: other rows on a board have borders too.
BAR_MARK = '<div data-bar style='
# The bar since 28 September (decision 046): four places, in this order, each an icon WITH its word.
# (key, word, one distinctive path from the glyph). A missing glyph or word is a missing place.
BAR_ITEMS = [
    ('home', 'घर', 'M4 10.6 12 4.2l8 6.4'),            # the roof
    ('docs', 'दस्तावेज़', 'M13.5 3.5v5h5'),              # the folded corner
    ('contribute', 'सुझाव', 'M9 17.5h6M10 21h4'),      # the bulb's base
    ('share', 'ऐप शेयर', 'M14 14h2v2h-2z'),            # the QR's small module
]
# What left the bar on 28 September: the three pillars' glyphs and ज़रूरी जानकारी's circled i.
# घर's blocks are the way into the pillars; the i's screen is retired (decision 046).
BAR_GONE = {
    'खाना': 'M12 2.5v1.6',                 # the thali's steam
    'जाना': 'M12 7.4h6.6l2 2.1-2 2.1H12',  # the signpost's upper arm
    'जानना': 'M10.4 21.5h3.2',              # the lantern's foot
    'ⓘ': 'M12 11.1v5.4',                   # the circled i's stem
}
# Which of the four each board lights. घर and its states light घर; a pillar's own screens light
# none — their header carries the colour. Every board not named here lights nothing.
BAR_LIT = {
    'Home': 'home', 'HomeDark': 'home', 'HomeTrial': 'home', 'HomePaid': 'home',
    'HomeDocs': 'docs', 'HomeDocView': 'docs',
    'HomeContribute': 'contribute',
    'HomeShare': 'share',
}
# जानना's emergency line (decision 046): the boards that carry जानना's tabs carry it above them,
# and no other board carries it. It is the one place red is spent (rule 2).
SOS_MARK = '<div data-sos '
SOS_LINE = 'आपातकाल: पुलिस 999 · एम्बुलेंस 998 · आग 997'
KNOW_TABS = {'N1', 'N3'}
# ऐप शेयर (घर.8): the QR, and the lines under it word for word as the owner gave them.
SHARE_LINES = [
    'Dubai Saathi',
    'दुबई में आपका हिंदी साथी — खाना, रास्ता, बोर्ड पढ़ना',
    '24 घंटे मुफ़्त',
    'dubai.saafarsaathi.in',
    'WhatsApp पर भेजें',
]
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

        # Rule 1: no microphone in the three pillars, and no invitation to speak in any box —
        # every box is typed into (decision 016). The one microphone is बोलना, which is घर's
        # fourth block and nowhere else, so the words below are barred on every board and the
        # block itself is checked under rule 6.
        if re.search(r'\bmic\b|माइक|बोलिए|बोलकर', text):
            fail(name, 'a microphone, or an invitation to speak — voice is out (decision 016)')
        if SPEAK in text and name not in HOME and name not in TERMS_BOARDS:
            fail(name, 'बोलना outside घर — its block is on घर and its screens have no board')

        # Rule 2: red is reserved. Since 28 September it is spent on one thing — जानना's emergency
        # line (decision 046) — so the line is taken out before looking, and red anywhere else fails.
        outside = re.sub(r'<div data-sos .*?</div>', '', text, flags=re.S)
        if re.search(r'#B3261E|#F2B8B5|#FCE8E6|#3A1614|#C62B2B|#D32F2F|#E53935|\bred\b', outside, re.IGNORECASE):
            fail(name, 'red on a screen — red is spent on जानना\'s emergency line and nothing else')

        # Rule 36: घर.10 says जाना is not a map of every address (decision 048).
        if name in TERMS_BOARDS and TERMS_GO not in text:
            fail(name, 'the terms do not say जाना is not a map of every address')

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
        # with बदलें beside it — on every screen, with no exception (decision 046; ज़रूरी
        # जानकारी's exception went with that screen). It is looked for in the strip itself, between
        # the pass dot and the first thing below it, so a hotel named in a screen's body cannot
        # stand in for it.
        top = text.find('>पास</span>')
        strip = text[top : top + 2500] if top >= 0 else ''
        if 'मेरा होटल जोड़ें' not in strip and '>बदलें</span>' not in strip:
            fail(name, 'the strip has no hotel row')

        # Rule 4: the bar on every screen — four places, in this order, each an icon with its word
        # under it: घर, दस्तावेज़, सुझाव, ऐप शेयर (decision 046, replacing 027's icons alone). The
        # pillars' glyphs and the circled i have left it. The pass is the strip's dot and घर's tile
        # (decision 018), never पास लें here; बात was added and taken out on 18 September (026).
        at = text.rfind(BAR_MARK)
        if at < 0:
            fail(name, 'no bar')
            bar = ''
        else:
            bar = text[at:]
        items = re.findall(r'<div data-bar-item="([a-z]+)" style="([^"]*)">(.*?)</div>', bar, flags=re.S)
        if len(items) != 4:
            fail(name, 'the bar has %d places, not four' % len(items))
        keys = [k for k, _, _ in items]
        if keys != [k for k, _, _ in BAR_ITEMS] and len(items) == 4:
            fail(name, 'the bar is out of order: घर, दस्तावेज़, सुझाव, ऐप शेयर')
        found = {k: (style, body) for k, style, body in items}
        for key, word, glyph in BAR_ITEMS:
            if key not in found:
                fail(name, 'the bar has no %s' % word)
                continue
            style, body = found[key]
            if glyph not in body:
                fail(name, 'the bar\'s %s has lost its glyph' % word)
            if not re.search(r'<span[^>]*>%s</span>' % re.escape(word), body):
                fail(name, 'the bar\'s %s has no word under its icon' % word)
        for label, glyph in BAR_GONE.items():
            if glyph in bar:
                fail(name, 'the bar still carries the %s glyph' % label)
        if 'बात' in bar:
            fail(name, 'the bar carries बात')
        if 'पास लें' in bar:
            fail(name, 'the bar carries पास लें')
        if name == 'HomePaid' and 'पास लें' in text:
            fail(name, 'a paid traveller still sees पास लें')
        # घर and ऐप शेयर are filled, each in its own colour; दस्तावेज़ and सुझाव are plain.
        if len(found) == 4:
            fill = {k: (re.search(r'background: ([^;]+);', st) or re.search('()', '')).group(1) for k, (st, _) in found.items()}
            lit_key = BAR_LIT.get(name)
            plain = {fill[k] for k in ('docs', 'contribute') if k != lit_key}
            if fill['home'] in ('', 'none') or fill['share'] in ('', 'none'):
                fail(name, 'घर and ऐप शेयर must each sit on its own colour')
            elif fill['home'] == fill['share']:
                fail(name, 'घर and ऐप शेयर are the same colour')
            if plain != {'none'}:
                fail(name, 'दस्तावेज़ and सुझाव must be plain, on the bar\'s own ground')
            # Rule 5: exactly the right one is lit — or none, on a pillar's screens.
            lit = [k for k, (st, body) in found.items() if 'font-weight: 800' in body]
            want = [lit_key] if lit_key else []
            if lit != want:
                fail(name, 'the bar lights %s, not %s' % (lit or 'nothing', want or 'nothing'))

        # Rule 6: home is the three pillars, in order, then बोलना, and nothing else.
        if name in HOME:
            order = [text.find('>%s</span>' % p) for p in PILLARS]
            if any(i < 0 for i in order):
                fail(name, 'home must carry all three pillars')
            elif order != sorted(order):
                fail(name, 'the pillars are out of order: खाना, जाना, जानना')
            if 'type="text"' in text or '<input' in text:
                fail(name, 'home carries a box')
            # Rule 14: बोलना is घर's fourth block, after जानना, and only where the strip says
            # ऑनलाइन. Everything behind it is online (decision 020), so a board drawn offline
            # with बोलना on it would be promising what the phone cannot do.
            speak = text.find('>%s</span>' % SPEAK)
            if 'ऑनलाइन' in text:
                if speak < 0:
                    fail(name, 'home is online and has no बोलना block')
                elif speak < max(order):
                    fail(name, 'बोलना comes before जानना — it is the fourth block, not the first')
            elif speak >= 0:
                fail(name, 'बोलना on an offline घर — it cannot work without a signal')
            # Rule 31: the one question is asked only after a stretch with no signal, so it is
            # never on a board whose strip says ऑनलाइन, and it sits after the last block.
            ask = text.find('इंटरनेट नहीं था')
            if ask >= 0:
                if 'ऑनलाइन' in text:
                    fail(name, 'the offline question on an online घर')
                elif ask < max(order):
                    fail(name, 'the offline question comes before the blocks')
            # Rule 13: the pass tile sits at the foot of घर — after the last block, before
            # the bar — and is never red (rule 2 covers the colour).
            tile = text.find(TICKET_ICON)
            bar = text.rfind(BAR_MARK)
            last = max(order + [speak])
            if tile < 0:
                fail(name, 'home has no pass tile')
            elif not (last < tile < bar):
                fail(name, 'the pass tile is not between the blocks and the bar')
            # Rule 36: the small print is the last thing on घर, under the pass tile, above the bar.
            small = text.find(SMALL_PRINT)
            if small < 0:
                fail(name, 'home has no small print to the terms')
            elif not (tile < small < bar):
                fail(name, 'the small print is not between the pass tile and the bar')

        # Rule 19: ज़रूरी जानकारी is retired (decision 046). Its name is on no board, its
        # capsules are gone, and घर.2 is the bar's दस्तावेज़ — the documents list and जोड़ें.
        if 'ज़रूरी जानकारी' in text:
            fail(name, 'ज़रूरी जानकारी is retired — its screen and its name are gone')
        if name == 'HomeDocs':
            if 'दस्तावेज़ जोड़ें' not in text:
                fail(name, 'दस्तावेज़ has no way to add one')
            if '>संपर्क</span>' in text or '>फ़ीडबैक</span>' in text:
                fail(name, 'दस्तावेज़ still carries ज़रूरी जानकारी\'s capsules')

        # Rule 32: the emergency line on जानना, above the tabs, and nowhere else (decision 046).
        sos = text.find(SOS_MARK)
        if name in KNOW_TABS:
            if sos < 0 or SOS_LINE not in text or 'सब नंबर' not in text:
                fail(name, 'जानना has no emergency line — पुलिस 999 · एम्बुलेंस 998 · आग 997 · सब नंबर')
            elif sos > text.find('>जगहें</span>'):
                fail(name, 'the emergency line is below जानना\'s tabs, not above them')
        elif sos >= 0 or SOS_LINE in text:
            fail(name, 'the emergency line outside जानना\'s tabs')

        # Rule 34: ऐप शेयर is a QR the phone draws and the owner's lines under it (decision 046).
        if name == 'HomeShare':
            if 'shape-rendering="crispEdges"' not in text:
                fail(name, 'ऐप शेयर has no QR')
            last = -1
            for line in SHARE_LINES:
                at = text.find(line)
                if at < 0:
                    fail(name, 'ऐप शेयर is missing "%s"' % line)
                elif at < last:
                    fail(name, 'ऐप शेयर\'s lines are out of order at "%s"' % line)
                last = max(last, at)

        # Rule 33: सुझाव is two things, the missing place first, then the word to us (decision 046).
        if name == 'HomeContribute':
            a, b = text.find('कोई जगह छूट गई?'), text.find('सुझाव या राय')
            if a < 0 or b < 0:
                fail(name, 'सुझाव needs both "कोई जगह छूट गई?" and "सुझाव या राय"')
            elif b < a:
                fail(name, 'सुझाव is out of order: the missing place first, then the word to us')

        # Rule 7: every screen that is not home has a way back.
        if name not in HOME and BACK_ICON not in text:
            fail(name, 'no back control')

        # Rule 27: dark screens carry no light surfaces. The mark's own cream is drawn inside its
        # SVG and is the mark, not a surface, so the drawings are set aside before looking.
        if name.endswith('Dark'):
            surfaces = re.sub(r'<svg.*?</svg>', '', text, flags=re.S)
            for hexv in LIGHT_SURFACES:
                if hexv in surfaces:
                    fail(name, 'light surface %s in a dark screen' % hexv)

        # Rule 25: nothing tech-facing reaches the traveller.
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
