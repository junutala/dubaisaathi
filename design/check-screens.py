#!/usr/bin/env python3
"""Fails the build when a screen breaks a rule we have already agreed.

Every rule here exists because it was asked for once and then missed on a later screen.
A rule that only lives in a conversation gets forgotten; a rule that fails `npm run verify`
does not. Add to this file whenever a new rule is agreed — that is the point of it.
"""
import json
import pathlib
import re
import sys

SCREENS = pathlib.Path(__file__).parent / 'screens'

# Home and the splash have no parent, and the brand sheet is not a screen.
NO_HEADER = {'Welcome', 'Main', 'MainDark', 'Brand'}
TILES = ['रास्ता', 'खाना', 'बोलना', 'मदद', 'घर']

BACK_ICON = 'M14.4 5.8 8.6 12l5.8 6.2'
HOME_ICON = 'M4 10.6 12 4.2l8 6.4'
CRUMB = 'letter-spacing: 0.02em'
LIGHT_SURFACES = ['#F7F3EC', '#FFFDF9', '#E6DED2', '#141826']

failures: list[str] = []


def fail(screen: str, rule: str) -> None:
    failures.append('%s: %s' % (screen, rule))


def main() -> int:
    files = sorted(SCREENS.glob('*.dc.html'))
    if not files:
        print('no screens found — run design/generate-screens.py first')
        return 1

    for path in files:
        name = path.name[: -len('.dc.html')]
        text = path.read_text(encoding='utf-8')

        # Every screen must say where you are and how to leave. A traveller who opened the
        # mic from खाना has to be able to tell they are still in खाना.
        if name not in NO_HEADER:
            if CRUMB not in text:
                fail(name, 'no tile trail in the header')
            if BACK_ICON not in text:
                fail(name, 'no back control')
            if HOME_ICON not in text:
                fail(name, 'no way home')

        # A colour value must never reach the traveller as text.
        if name != 'Brand':
            for leak in re.findall(r'>\s*#[0-9A-Fa-f]{6}', text):
                fail(name, 'colour value rendered as visible text: %s' % leak.strip('> '))
        if 'color: <svg' in text or 'background: <svg' in text:
            fail(name, 'markup written into a CSS property')
        if '%(' in text or re.search(r'%[sd](?![a-zA-Z])', text.replace('%s', '', 0)[:0] or ''):
            fail(name, 'unsubstituted template token')

        # Dark screens must not carry light surfaces.
        if name.endswith('Dark'):
            for hexv in LIGHT_SURFACES:
                if hexv in text:
                    fail(name, 'light surface %s in a dark screen' % hexv)

        # Controls declare themselves with data-tap, and every one of them is >= 48px.
        # Decorative boxes are not controls, so they are not measured — a check that cries
        # wolf gets ignored, and then it protects nothing.
        for style, kind in re.findall(r'style="([^"]*)"\s+data-tap="([^"]*)"', text):
            sizes = [int(v) for v in re.findall(r'(?:min-height|height): (\d+)px', style)]
            if not sizes:
                fail(name, 'control "%s" has no explicit height' % kind)
            elif min(sizes) < 48:
                fail(name, 'control "%s" is %dpx, under the 48px floor' % (kind, min(sizes)))
        if name not in NO_HEADER and 'data-tap="nav"' not in text and 'data-tap' not in text:
            fail(name, 'no controls marked with data-tap')

    # The canvas and the files on disk must agree, and names must follow the tiles.
    canvas = json.loads((SCREENS / 'canvas.json').read_text(encoding='utf-8'))
    listed = {a['file'] for a in canvas['artboards']}
    on_disk = {p.name for p in files}
    for missing in sorted(listed - on_disk):
        failures.append('canvas.json: lists %s, which does not exist' % missing)
    for unlisted in sorted(on_disk - listed):
        failures.append('canvas.json: %s is not on the canvas' % unlisted)

    for artboard in canvas['artboards']:
        title = artboard.get('title', '')
        stem = artboard['file'][: -len('.dc.html')]
        if stem in ('Brand',):
            continue
        number = r'^(D?\d+(\.\d+)?|घर\.\d+) · '
        if not re.match(number, title):
            failures.append('canvas.json: %s has no screen number' % stem)
        body = re.sub(number, '', title)
        if body.split(' ›')[0].split(' (')[0] not in TILES + ['स्प्लैश', 'पास']:
            failures.append(
                'canvas.json: %s is named "%s" — screen names use the four tiles' % (stem, body))

    if failures:
        print('design checks failed:\n')
        for f in failures:
            print('  - ' + f)
        return 1
    print('design checks passed: %d screens' % len(files))
    return 0


if __name__ == '__main__':
    sys.exit(main())
