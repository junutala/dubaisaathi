#!/bin/bash
source "$(dirname "$0")/_chrome.sh"
chip() { # label on|off
  if [ "$2" = on ]; then echo "<span style=\"padding: 7px 12px; border-radius: 999px; background: $k_text; color: $k_fg; font-size: 13px; font-weight: 700; white-space: nowrap;\">$1</span>";
  else echo "<span style=\"padding: 7px 12px; border-radius: 999px; border: 1.5px solid $line; color: $ink; font-size: 13px; font-weight: 600; white-space: nowrap;\">$1</span>"; fi
}
orow() { # name area kitchen dish-line distance
cat <<T
    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: $card; border-radius: 16px; border: 1px solid $line;">
      <span style="width: 56px; height: 56px; border-radius: 12px; background: $sand; flex-shrink: 0;"></span>
      <span style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;">
        <span class="disp" style="font-size: 18px; font-weight: 600; color: $ink; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">$1</span>
        <span style="font-size: 12.5px; color: $muted;">$2 · $5</span>
        <span style="display: flex; gap: 6px; margin-top: 3px;"><span style="padding: 2px 8px; border-radius: 999px; background: $tealSoft; color: $tealText; font-size: 11.5px; font-weight: 700;">$3</span><span style="font-size: 12px; color: $k_text; font-weight: 600;">$4</span></span>
      </span>
      $(chev 18 "$chev" 2)
    </div>
T
}
# ---- 1.1 · खाना › क्या खाएँ
{
open_screen
strip running set
header thali "$k_text" 'खाना'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 54px; border-radius: 16px; background: $card; border: 1.5px solid $line;">
      $(search 20 "$muted" 2)
      <span style="flex: 1; font-size: 17px; color: $muted;">क्या खाना है? — डोसा, थाली, वड़ा पाव…</span>
    </div>
    <div style="display: flex; gap: 8px; overflow: hidden; flex-shrink: 0;">$(chip 'शुद्ध शाकाहारी' off)$(chip 'जैन' off)$(chip 'बिना प्याज़-लहसुन' off)$(chip 'व्रत' off)</div>
    $(label 'अभी लोग क्या खोज रहे हैं')
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">$(chip 'साबूदाना खिचड़ी' off)$(chip 'गुजराती थाली' off)$(chip 'मसाला डोसा' off)$(chip 'पाव भाजी' off)$(chip 'छोले भटूरे' off)$(chip 'जैन थाली' off)</div>
    $(label 'होटल के पास')
$(orow 'Karama Cafe' 'करामा' 'शुद्ध शाकाहारी' 'साबूदाना खिचड़ी · जैन पूछकर' '650 मी')
$(orow 'Saravana Bhavan' 'करामा' 'शुद्ध शाकाहारी' 'डोसा, इडली · जैन हाँ' '900 मी')
$(orow 'Chappan Bhog' 'बुर दुबई' 'शुद्ध शाकाहारी' 'थाली · व्रत पूछकर' '1.2 किमी')
  </div>
H
bar khaana
close_screen
} > "$OUT/K1.dc.html"

# ---- 1.2 · खाना › नतीजे (a dish, searched)
{
open_screen
strip running set
header thali "$k_text" 'खाना' 'साबूदाना खिचड़ी'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 54px; border-radius: 16px; background: $card; border: 1.5px solid $k_text;">
      $(search 20 "$muted" 2)
      <span style="flex: 1; font-size: 17px; color: $ink;">sabudana khichdi</span>
    </div>
    <div style="display: flex; gap: 8px; overflow: hidden; flex-shrink: 0;">$(chip 'शुद्ध शाकाहारी' on)$(chip 'जैन' off)$(chip 'व्रत' on)$(chip 'खुला है' off)</div>
    <span style="font-size: 13px; color: $muted;">4 जगहों पर मिलती है · नज़दीक पहले</span>
$(orow 'Karama Cafe' 'करामा' 'शुद्ध शाकाहारी' 'AED 12 · व्रत हाँ' '650 मी')
$(orow 'Puranmal' 'बुर दुबई' 'शुद्ध शाकाहारी' 'AED 15 · व्रत पूछकर' '1.4 किमी')
$(orow 'Shree Krishna Bhavan' 'देरा' 'शुद्ध शाकाहारी' 'AED 14 · जैन पूछकर' '2.1 किमी')
$(orow 'Aangan Dhaba' 'डिस्कवरी गार्डन्स' 'मिश्रित' 'AED 18' '9 किमी')
    <span style="font-size: 12.5px; color: $muted; text-align: center; line-height: 1.45; padding-top: 4px;">हर जवाब किसी व्यक्ति से पूछा गया है। जहाँ नहीं पूछा गया, वहाँ "पूछकर" लिखा है।</span>
  </div>
H
bar khaana
close_screen
} > "$OUT/K2.dc.html"

# ---- 1.3 · खाना › मेनू — the kitchen is its menu (owner, 24 September: the separate outlet
# screen "is a liability"). Map, जाना and फ़ोन stay at the top while the menu scrolls; the answers
# are one row; the menu is grouped under the headings the restaurant printed, in the card's order.
mitem() { # name price tag
  echo "<div style=\"display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 14px; background: $card; border: 1px solid $line;\"><span class=\"disp\" style=\"font-size: 15px; font-weight: 600; color: $ink; line-height: 1.35;\">$1</span><span style=\"font-size: 13px; font-weight: 700; color: $k_text;\">$2</span><span style=\"font-size: 11px; color: $muted;\">$3</span></div>"
}
apill() { # question answer colour
  echo "<span style=\"display: inline-flex; gap: 6px; padding: 5px 10px; border-radius: 999px; background: $card; border: 1px solid $line; font-size: 12.5px; color: $ink;\">$1<b style=\"color: $3;\">$2</b></span>"
}
{
open_screen
strip running set
header thali "$k_text" 'खाना' 'Woodlands Restaurant'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; flex-direction: column; gap: 6px; padding-bottom: 10px; border-bottom: 1px solid $line;">
      <span class="disp" style="font-size: 24px; font-weight: 700; color: $ink;">Woodlands Restaurant</span>
      <span style="font-size: 13px; color: $muted;">मीना बाज़ार · होटल से 2.5 किमी · शुद्ध शाकाहारी</span>
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;">
        $(obtn "$(pin 20 "$ink" 1.9)नक्शा")
        $(btn "$(metro 20 "$j_fg" 1.9) जाना" "$j_bg" "$j_fg")
        $(obtn "$(phone 20 "$ink" 1.9)फ़ोन")
      </div>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px;">$(apill 'जैन' 'पूछकर' "$marigoldText")$(apill 'व्रत' 'पूछकर' "$marigoldText")$(apill 'बिना प्याज़-लहसुन' 'पूछकर' "$marigoldText")</div>
    $(label 'Dosas')
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
      $(mitem 'Masala Dosa' 'AED 9' 'शाकाहारी')$(mitem 'Ghee Roast' 'AED 11' 'शाकाहारी')
      $(mitem 'Onion Rava Dosa' 'AED 11' 'शाकाहारी')$(mitem 'Paper Roast' 'AED 12' 'शाकाहारी')
    </div>
    $(label 'Special Dosas')
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
      $(mitem 'Butter Masala Dosa' 'AED 13' 'शाकाहारी')$(mitem 'Paneer Burji Dosa' 'AED 21' 'शाकाहारी')
    </div>
  </div>
H
bar khaana
close_screen
} > "$OUT/K3.dc.html"
