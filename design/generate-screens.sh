#!/usr/bin/env bash
# Generates every screen of Sprint 1 into design/screens/ from one set of tokens, icons and
# chrome (design/generator/). Edit the generator, never the output.
#
#   bash design/generate-screens.sh
#
# Numbering follows docs/field-ledger.md: L and घर, घर.1–घर.4, then 1 खाना, 2 जाना, 3 जानना.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export OUT="$HERE/screens"
mkdir -p "$OUT"
rm -f "$OUT"/*.dc.html
for part in home khaana jaana jaanna; do
  bash "$HERE/generator/build-$part.sh"
done
cp "$HERE/generator/Names.dc.html.src" "$OUT/Names.dc.html"

python3 - "$OUT" <<'PY'
import json, sys
out = sys.argv[1]
P, R = 470, 1000
rows = [
  [('Landing', 'L · लैंडिंग'), ('Home', 'घर'), ('HomeTrial', 'घर · मुफ़्त दिन ख़त्म हो रहा, होटल नहीं, सिग्नल नहीं'), ('HomePaid', 'घर · पास ख़रीदा')],
  [('HomeHotel', 'घर.1 · मेरा होटल › कार्ड'), ('HomeHotelRead', 'घर.1 · मेरा होटल › कार्ड से पढ़ा'), ('HomeHotelChoice', 'घर.1 · मेरा होटल › दो जगहें'), ('HomeDocs', 'घर.2 · दस्तावेज़'), ('HomeDocView', 'घर.3 · दस्तावेज़ › देखें'), ('HomePass', 'घर.4 · पास'), ('HomePassWelcome', 'घर.4 · पास आ गया')],
  [('K1', '1.1 · खाना › क्या खाएँ'), ('K2', '1.2 · खाना › नतीजे'), ('K3', '1.3 · खाना › जगह'), ('K4', '1.4 · खाना › मेनू')],
  [('J1', '2.1 · जाना › कहाँ'), ('J2', '2.2 · जाना › विकल्प'), ('J3', '2.3 · जाना › क़दम दर क़दम'), ('J4', '2.4 · जाना › टैक्सी')],
  [('J5', '2.5 · जाना › जगह की इजाज़त नहीं'), ('N1', '3.1 · जानना › जगहें'), ('N2', '3.2 · जानना › जगह')],
]
boards = []
for r, row in enumerate(rows):
  for c, (f, t) in enumerate(row):
    boards.append({'file': f + '.dc.html', 'x': c * P, 'y': r * R, 'w': 390, 'h': 844, 'title': t, 'page': 'all'})
boards.append({'file': 'Names.dc.html', 'x': 4 * P, 'y': 0, 'w': 760, 'h': 1170, 'title': 'The three names', 'page': 'all'})
boards += [
  {'file': 'HomeDark.dc.html', 'x': 0, 'y': 0, 'w': 390, 'h': 844, 'title': 'घर · dark', 'page': 'dark'},
  {'file': 'J1Dark.dc.html', 'x': P, 'y': 0, 'w': 390, 'h': 844, 'title': '2.1 · जाना › कहाँ · dark', 'page': 'dark'},
]
canvas = {
  'pages': [{'id': 'all', 'name': 'Sprint 1 · all screens'}, {'id': 'dark', 'name': 'Dark'}],
  'artboards': boards,
  'annotations': [
    {'id': 'brief', 'x': 0, 'y': -190, 'w': 560, 'page': 'all', 'text': 'Sprint 1, frozen 16 September. Numbered by pillar: 1 = खाना, 2 = जाना, 3 = जानना; घर.n are the strip and bar children. Every name, number, price and time is sample text.'},
  ],
  'launch': {'view': 'canvas', 'page': 'all'},
}
json.dump(canvas, open(out + '/canvas.json', 'w'), ensure_ascii=False, indent=1)
print('wrote', len(boards), 'artboards')
PY
