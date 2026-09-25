#!/bin/sh
# नक्शा's street map (decision 035): Dubai cut out of Protomaps' daily OpenStreetMap build, plus
# the glyphs and sprite its style names — every file the map screen reads, on our own origin.
#
# The development container cannot reach any of these hosts; a Railway build machine and a GitHub
# runner can, the same way deploy/Dockerfile.field fetches the OCR data. Usage:
#   build-map.sh <out-dir> [maxzoom]
# writes <out-dir>/dubai.pmtiles, <out-dir>/fonts/…, <out-dir>/sprites/…, and
# <out-dir>/files.json — the list the phone downloads and keeps, with the total size.
set -eu
OUT="$1"
MAXZOOM="${2:-14}"
PMTILES_VERSION=1.28.0
# Dubai's built-up area: Jebel Ali to Mirdif and Al Awir, the coast to Al Qudra. Sharjah's edge
# comes with it, which a traveller staying in Al Nahda would want anyway.
BBOX=54.89,24.79,55.66,25.36

mkdir -p "$OUT" /tmp/pmtiles
cd /tmp/pmtiles
curl -fsSL --retry 5 --retry-all-errors -o pmtiles.tgz \
  "https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/go-pmtiles_${PMTILES_VERSION}_Linux_x86_64.tar.gz"
tar xzf pmtiles.tgz pmtiles

# Protomaps keeps about a week of daily builds; take the newest one that answers.
SOURCE=""
for back in 0 1 2 3 4 5 6 7 8 9 10 11 12 13; do
  day=$(date -u -d "@$(( $(date -u +%s) - back * 86400 ))" +%Y%m%d)
  if curl -fsI --retry 2 "https://build.protomaps.com/${day}.pmtiles" >/dev/null 2>&1; then
    SOURCE="https://build.protomaps.com/${day}.pmtiles"
    break
  fi
done
[ -n "$SOURCE" ] || { echo "No Protomaps daily build answered in the last two weeks." >&2; exit 1; }
echo "Extracting Dubai from $SOURCE at z0-$MAXZOOM"
./pmtiles extract "$SOURCE" "$OUT/dubai.pmtiles" --bbox="$BBOX" --maxzoom="$MAXZOOM" --download-threads=4
./pmtiles show "$OUT/dubai.pmtiles" | head -20

# The glyphs the style's labels use, in the Unicode ranges Dubai's names are written in: Latin,
# punctuation, Arabic and its presentation forms. Nothing else is ever asked for.
ASSETS=https://raw.githubusercontent.com/protomaps/basemaps-assets/main
for font in "Noto Sans Regular" "Noto Sans Medium" "Noto Sans Italic"; do
  mkdir -p "$OUT/fonts/$font"
  for range in 0-255 256-511 512-767 768-1023 1536-1791 1792-2047 2048-2303 8192-8447 8448-8703 \
               64256-64511 64512-64767 64768-65023 65024-65279 65280-65535; do
    enc=$(printf '%s' "$font" | sed 's/ /%20/g')
    curl -fsSL --retry 5 --retry-all-errors -o "$OUT/fonts/$font/$range.pbf" "$ASSETS/fonts/$enc/$range.pbf"
  done
done
mkdir -p "$OUT/sprites"
for f in light.json light.png light@2x.json light@2x.png dark.json dark.png dark@2x.json dark@2x.png; do
  curl -fsSL --retry 5 --retry-all-errors -o "$OUT/sprites/$f" "$ASSETS/sprites/v4/$f"
done

# The list the phone downloads, and how much that is — the number the screen says before asking.
cd "$OUT"
find . -type f ! -name files.json | sed 's|^\./||' | sort | awk -v q='"' '
  { files = files (NR > 1 ? "," : "") q $0 q }
  END { printf "{\"files\":[%s]", files }' > files.json
BYTES=$(find . -type f ! -name files.json -exec cat {} + | wc -c)
printf ',"bytes":%s,"source":"%s","maxzoom":%s}\n' "$BYTES" "$SOURCE" "$MAXZOOM" >> files.json
echo "Map total: $BYTES bytes"
ls -la "$OUT" "$OUT/sprites"
