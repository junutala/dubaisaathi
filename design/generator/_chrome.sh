# shared chrome for every numbered screen. Light unless THEME=dark.
source "$(dirname "${BASH_SOURCE[0]}")/_icons.sh"
if [ "${THEME:-light}" = light ]; then
  ground='#FFFDF9'; card='#FFFFFF'; sand='#F7F3EC'; ink='#141826'; muted='#5B6070'; chev='#8A8F9E'; line='#E6DED2'
  tealText='#0A5F54'; teal='#0B7A6B'; tealSoft='#E1F2EF'; marigold='#E8871E'; marigoldText='#9A5B10'; marigoldSoft='#FDF0DC'; onMarigold='#231403'
  k_bg='#B4610F'; j_bg='#0B7A6B'; n_bg='#1A2456'; k_fg='#FFF6E8'; j_fg='#EAFBF7'; n_fg='#EEF0FF'; green='#2E9E5B'; onTeal='#FFFFFF'
  k_soft='#FDF0DC'; j_soft='#E1F2EF'; n_soft='#E8EAF6'; k_text='#9A5B10'; j_text='#0A5F54'; n_text='#1A2456'
else
  ground='#14161F'; card='#1D202C'; sand='#1D202C'; ink='#F1EDE6'; muted='#9AA1B3'; chev='#7B8397'; line='#2D3242'
  tealText='#8FE0CF'; teal='#3FC0A9'; tealSoft='#0E2A27'; marigold='#F0913A'; marigoldText='#F2AC5C'; marigoldSoft='#3A2A14'; onMarigold='#1C1206'
  k_bg='#9A5310'; j_bg='#0E6E61'; n_bg='#242F6E'; k_fg='#FFF3E0'; j_fg='#E6FAF5'; n_fg='#EDEFFF'; green='#3FC27A'; onTeal='#0B1F1B'
  k_soft='#3A2A14'; j_soft='#0E2A27'; n_soft='#1C2140'; k_text='#F2AC5C'; j_text='#8FE0CF'; n_text='#B4BEEE'
fi
# strip: $1 = pass state running|ending, $2 = hotel set|none
strip() {
  local dot=$green; [ "$1" = ending ] && dot=$marigold
  local themeIcon; if [ "${THEME:-light}" = light ]; then themeIcon=$(moon 20 "$muted" 1.9); else themeIcon=$(sun 20 "$muted" 1.9); fi
cat <<S
  <div style="padding: 12px 10px 6px 16px; display: flex; align-items: center; gap: 8px; min-height: 52px;">
    $(logo 28)
    <span class="disp" style="font-size: 22px; font-weight: 700; line-height: 1; flex: 1; color: $ink;">दुबई साथी</span>
    <span style="display: flex; align-items: center; gap: 5px; color: $tealText; font-size: 12.5px; font-weight: 700;">$(wifioff 15 "$tealText" 2.1)ऑफ़लाइन</span>
    <span style="display: flex; align-items: center; gap: 6px; padding: 5px 10px 5px 8px; border-radius: 999px; border: 1px solid $line; color: $ink; font-size: 12.5px; font-weight: 700;"><span style="width: 9px; height: 9px; border-radius: 999px; background: $dot;"></span>पास</span>
    <span style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid $line;">$themeIcon</span>
  </div>
S
if [ "$2" = set ]; then
cat <<S
  <div style="margin: 0 16px; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; border: 1.5px solid $line; min-height: 48px; box-sizing: border-box;">
    $(pin 20 "$marigold" 1.9)
    <span style="flex: 1; font-size: 14.5px; font-weight: 600; color: $ink; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Citymax Bur Dubai · कमरा 412</span>
    <span style="font-size: 12.5px; font-weight: 700; color: $marigoldText;">बदलें</span>
  </div>
S
else
cat <<S
  <div style="margin: 0 16px; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; border: 1.5px dashed $marigold; min-height: 48px; box-sizing: border-box;">
    $(plus 20 "$marigold" 2)
    <span style="display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0;">
      <span style="font-size: 14.5px; font-weight: 600; color: $ink;">मेरा होटल जोड़ें</span>
      <span style="font-size: 12px; color: $muted;">कार्ड की फ़ोटो, कमरा नंबर, पिन — जो चाहें</span>
    </span>
  </div>
S
fi
}
# header: $1 = icon fn, $2 = colour, $3 = title, $4 = crumb (may be empty)
header() {
cat <<S
  <div style="display: flex; align-items: center; gap: 8px; padding: 10px 8px 4px 8px;">
    <span style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">$(back 22 "$ink" 2)</span>
    <span style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">$($1 22 "$2" 1.9)<span class="disp" style="font-size: 24px; font-weight: 700; color: $ink; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">$3</span>$( [ -n "$4" ] && echo "<span style=\"font-size: 13px; color: $muted; white-space: nowrap;\">› $4</span>")</span>
  </div>
S
}
# bar: $1 = active (khaana|jaana|jaanna|docs|none). The four tasks, evenly spaced, and nothing
# else: the pass lives on the strip's dot and on घर's tile (decision 018, 17 September).
bar() {
  local a=$1
  item() { local col=$muted w=600; [ "$a" = "$1" ] && col=$2 && w=700; echo "<div style=\"display: flex; flex-direction: column; align-items: center; gap: 3px; min-height: 48px; justify-content: center;\">$($3 24 "$col" 1.8)<span style=\"font-size: 11.5px; font-weight: $w; color: $col;\">$4</span></div>"; }
cat <<S
  <div style="border-top: 1px solid $line; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 6px 8px 18px 8px; background: $ground;">
    $(item khaana "$k_text" thali खाना)
    $(item jaana "$teal" metro जाना)
    $(item jaanna "$n_text" lantern जानना)
    $(item docs "$marigoldText" docs दस्तावेज़)
  </div>
S
}
open_screen() { cat "$(dirname "${BASH_SOURCE[0]}")/_head.txt"; echo "<div style=\"width: 390px; height: 844px; background: $ground; color: $ink; display: flex; flex-direction: column; overflow: hidden;\">"; }
close_screen() { echo '</div>'; echo '</x-dc>'; echo '</body>'; echo '</html>'; }
# a primary button: $1 = label, $2 = bg, $3 = fg
btn() { echo "<span style=\"display: flex; align-items: center; justify-content: center; min-height: 50px; border-radius: 14px; background: $2; color: $3; font-size: 15.5px; font-weight: 700;\">$1</span>"; }
# a secondary (outlined) button
obtn() { echo "<span style=\"display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border-radius: 14px; border: 1.5px solid $line; color: $ink; font-size: 15px; font-weight: 600;\">$1</span>"; }
# a section label
label() { echo "<span style=\"font-size: 12.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: $muted; padding: 6px 2px 0 2px;\">$1</span>"; }
# a photo placeholder: $1 = height, $2 = caption
photo() { echo "<div style=\"height: $1px; border-radius: 14px; background: repeating-linear-gradient(135deg, $sand 0 10px, $line 10px 11px); display: flex; align-items: flex-end; padding: 10px 12px; box-sizing: border-box;\"><span style=\"font-size: 12px; font-weight: 600; color: $muted; background: $ground; padding: 3px 8px; border-radius: 8px;\">$2</span></div>"; }
