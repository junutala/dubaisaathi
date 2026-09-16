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
bar khaana yes
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
bar khaana yes
close_screen
} > "$OUT/K2.dc.html"

# ---- 1.3 · खाना › जगह (the outlet)
ans() { # question answer colour
  echo "<div style=\"display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 12px; background: $card; border: 1px solid $line;\"><span style=\"font-size: 14px; color: $ink;\">$1</span><span style=\"font-size: 13px; font-weight: 700; color: $3;\">$2</span></div>"
}
{
open_screen
strip running set
header thali "$k_text" 'खाना' 'Karama Cafe'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    $(photo 150 'दुकान का सामने का हिस्सा · 15 सितंबर')
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <span class="disp" style="font-size: 26px; font-weight: 700; color: $ink;">Karama Cafe</span>
      <span style="font-size: 13.5px; color: $muted;">करामा · होटल से 650 मी · <span style="color: $tealText; font-weight: 700;">अभी खुला</span> · 6:00 – 2:00</span>
      <span style="display: flex; gap: 6px; margin-top: 4px;"><span style="padding: 3px 9px; border-radius: 999px; background: $tealSoft; color: $tealText; font-size: 12px; font-weight: 700;">शुद्ध शाकाहारी</span><span style="padding: 3px 9px; border-radius: 999px; background: $sand; color: $ink; font-size: 12px; font-weight: 600;">एक व्यक्ति ≈ AED 15</span></span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
      $(ans 'जैन' 'पूछकर' "$marigoldText")$(ans 'व्रत' 'हाँ' "$tealText")$(ans 'बिना प्याज़-लहसुन' 'हाँ' "$tealText")$(ans 'अंडा-रहित' 'हाँ' "$tealText")
    </div>
    <span style="font-size: 12px; color: $muted;">सुरेश, मैनेजर से पूछा गया · 15 सितंबर</span>
    $(label 'यहाँ क्या मिलता है')
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">$(chip 'साबूदाना खिचड़ी · AED 12' off)$(chip 'गुजराती थाली · AED 22' off)$(chip 'मसाला डोसा · AED 10' off)</div>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 2px;">
      $(obtn "$(phone 20 "$ink" 1.9)फ़ोन")
      $(obtn "$(camera 20 "$ink" 1.9)मेनू")
      $(btn "$(metro 20 "$j_fg" 1.9) जाना" "$j_bg" "$j_fg")
    </div>
  </div>
H
bar khaana yes
close_screen
} > "$OUT/K3.dc.html"

# ---- 1.4 · खाना › मेनू
{
open_screen
strip running set
header thali "$k_text" 'खाना' 'Karama Cafe › मेनू'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 6px 16px 12px 16px;">
    $(photo 470 'मेनू, पहला पन्ना · 15 सितंबर')
    <div style="display: flex; gap: 8px; justify-content: center;"><span style="width: 8px; height: 8px; border-radius: 999px; background: $ink;"></span><span style="width: 8px; height: 8px; border-radius: 999px; background: $line;"></span><span style="width: 8px; height: 8px; border-radius: 999px; background: $line;"></span></div>
    <span style="font-size: 12.5px; color: $muted; text-align: center;">असली मेनू की फ़ोटो — दाम बदल सकते हैं</span>
  </div>
H
bar khaana yes
close_screen
} > "$OUT/K4.dc.html"
