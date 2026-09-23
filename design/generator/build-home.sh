#!/bin/bash
source "$(dirname "$0")/_chrome.sh"
tile() { # name roman blurb bg fg iconfn
cat <<T
    <div style="position: relative; flex: 1; border-radius: 26px; overflow: hidden; background: $4; display: flex; align-items: flex-end; padding: 16px 20px; box-sizing: border-box;">
      <div style="position: absolute; right: -18px; top: -14px; opacity: 0.16;">$($6 170 "$5" 1.1)</div>
      <span style="position: absolute; left: 20px; top: 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: $5; opacity: 0.7;">$2</span>
      <div style="position: relative; display: flex; flex-direction: column; gap: 2px; max-width: 250px; min-width: 0;">
        <span class="disp" style="font-size: 36px; font-weight: 700; line-height: 1; color: $5; letter-spacing: -0.01em;">$1</span>
        <span style="font-size: 13px; line-height: 1.35; color: $5; opacity: 0.85; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">$3</span>
      </div>
    </div>
T
}
# the pass tile at the foot of घर (decision 018): $1 = name line, $2 = why line, $3 = warm yes|no.
# The shape of the strip's hotel row, in marigold; warm from the twentieth hour; never red.
passtile() {
  local bg=$marigoldSoft fg=$marigoldText; [ "$3" = yes ] && bg=$marigold && fg=$onMarigold
cat <<T
  <div style="margin: 0 16px 12px 16px; display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 10px 12px; border-radius: 14px; background: $bg; color: $fg; box-sizing: border-box;">
    $(ticket 22 "$fg" 1.9)
    <span style="display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0;">
      <span style="font-size: 14.5px; font-weight: 700; color: $fg; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.35;">$1</span>
      <span style="font-size: 12px; color: $fg; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.35;">$2</span>
    </span>
    $(chev 18 "$fg" 2)
  </div>
T
}
# ---- घर: $1 out, $2 pass state, $3 hotel, $4 tile trial|warm|paid, $5 signal on|off
# बोलना is the fourth block from 17 September, at the owner's instruction: the same shape and the
# same type as the three, in its own plum. It is on घर only where the strip says ऑनलाइन, because
# the recogniser and the Arabic behind it are both online (decision 020) — so a board that says
# ऑफ़लाइन carries three blocks, and that difference is the rule, drawn.
home() {
local bolna=''
[ "${5:-off}" = on ] && bolna=$(tile 'बोलना' 'Bolna' 'अपनी भाषा में कहिए — अंग्रेज़ी और अरबी में, नेटवर्क पर।' "$b_bg" "$b_fg" mic)
{
open_screen
strip "$2" "$3" "${5:-off}"
cat <<H
  <div style="flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 12px 16px 10px 16px; min-height: 0;">
$(tile 'खाना' 'Khaana' 'भारतीय खाना — छोटी दुकानें और कैफ़ेटेरिया जो आपको यूँ नहीं मिलतीं।' "$k_bg" "$k_fg" thali)
$(tile 'जाना' 'Jaana' 'मेट्रो, बस, ट्राम या टैक्सी — कहीं भी, कितना समय और कितने दिरहम।' "$j_bg" "$j_fg" signpost)
$(tile 'जानना' 'Jaanna' 'दुबई की जगहें — समय, टिकट, पहुँचने का तरीक़ा, हिंदी में।' "$n_bg" "$n_fg" lantern)
$bolna
  </div>
H
case "$4" in
  trial) passtile '18 घंटे बाक़ी · पास लें' '14 दिन का पास — एक बार, कोई सब्सक्रिप्शन नहीं' no ;;
  warm)  passtile '4 घंटे बाक़ी · पास लें' '14 दिन का पास — एक बार, कोई सब्सक्रिप्शन नहीं' yes ;;
  paid)  passtile 'पास · 12 दिन बाक़ी · परिवार के लिए QR' 'इस सफ़र में कुछ बंद नहीं होगा' no ;;
esac
bar none
close_screen
} > "$OUT/$1"
}
home Home.dc.html running set trial on
home HomeTrial.dc.html ending none warm off
home HomePaid.dc.html running set paid on
THEME=dark; source "$(dirname "$0")/_chrome.sh"; home HomeDark.dc.html running set trial on; THEME=light; source "$(dirname "$0")/_chrome.sh"

# ---- L · लैंडिंग (first open, the pack comes down)
{
cat "$(dirname "$0")/_head.txt"
cat <<H
<div style="width: 390px; height: 844px; background: $ground; color: $ink; display: flex; flex-direction: column; overflow: hidden; padding: 0 24px; box-sizing: border-box;">
  <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; text-align: center; padding-top: 16px;">
    $(logo 80)
    $(wordmark 40 "$ink" "$marigold" "$marigoldText" yes)
    <span class="disp" style="font-size: 21px; font-weight: 700; line-height: 1.25; color: $tealText; text-wrap: balance;">खाना · जाना · जानना — आपके साथ, बिना इंटरनेट</span>
    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14.5px; text-align: start; margin-top: 4px;">
      <span style="display: flex; align-items: center; gap: 8px;">$(check 18 "$teal" 2.4)खाने की जगहें, बिना नेटवर्क</span>
      <span style="display: flex; align-items: center; gap: 8px;">$(check 18 "$teal" 2.4)मेट्रो-बस-टैक्सी का रास्ता, बिना नेटवर्क</span>
      <span style="display: flex; align-items: center; gap: 8px;">$(check 18 "$teal" 2.4)दुबई की जगहें, हिंदी में, बिना नेटवर्क</span>
      <span style="display: flex; align-items: center; gap: 8px;">$(check 18 "$teal" 2.4)आपका होटल और दस्तावेज़, इसी फ़ोन में</span>
    </div>
    <div style="display: flex; gap: 10px; margin-top: 8px;">
      <span style="padding: 8px 14px; border-radius: 999px; background: $ink; color: $ground; font-size: 14px; font-weight: 700;">हिंदी</span>
      <span style="padding: 8px 14px; border-radius: 999px; border: 1.5px solid $line; color: $ink; font-size: 14px; font-weight: 600;">English</span>
    </div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px; padding-bottom: 32px;">
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-radius: 16px; background: $sand;">
      <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: $ink;"><span>ऑफ़लाइन पैक आ रहा है — एक बार, अभी</span></div>
      <div style="height: 6px; border-radius: 3px; background: $line;"><div style="width: 62%; height: 6px; border-radius: 3px; background: $teal;"></div></div>
      <span style="font-size: 12.5px; color: $muted;">खाने की जगहें, मेट्रो-बस का नक़्शा, दुबई की जगहें — सब फ़ोन पर रहेगा।</span>
    </div>
    <span style="display: flex; align-items: center; justify-content: center; min-height: 52px; border-radius: 14px; background: $line; color: $muted; font-size: 16px; font-weight: 700;">शुरू करें</span>
  </div>
</div>
</x-dc>
</body>
</html>
H
} > "$OUT/Landing.dc.html"

# ---- घर.1 · मेरा होटल, step one: the card (decision 032). Both sides of the reception's card, the
# pin, and Submit — on the first screen, because a pin below the fold is a pin nobody presses.
field() { # label value muted?
  local col=$ink; [ "${3:-}" = muted ] && col=$muted
  echo "<div style=\"display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 48px; border-radius: 14px; background: $card; border: 1px solid $line; box-sizing: border-box;\"><span style=\"font-size: 12.5px; font-weight: 700; color: $muted; width: 84px; flex-shrink: 0;\">$1</span><span style=\"font-size: 16px; color: $col; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">$2</span></div>"
}
stacked() { # label value extra
  echo "<div style=\"display: flex; flex-direction: column; justify-content: center; padding: 3px 12px 0 12px; min-height: 48px; border-radius: 14px; background: $card; border: 1px solid $line; box-sizing: border-box;\"><span style=\"font-size: 11.5px; font-weight: 700; color: $muted;\">$1</span><span style=\"display: flex; align-items: center; justify-content: space-between; font-size: 16px; color: $ink; min-height: 28px;\">$2$3</span></div>"
}
pinned() { # now | done
  local head='जगह की पिन लगी है' sub='यहीं खड़े होकर लगाई गई · देरा' again='फिर से'
  [ "$1" = now ] && head='यहीं पिन लगाएँ' && sub='होटल में खड़े होकर दबाएँ — GPS से जगह याद रहेगी' && again=''
cat <<P
    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: $tealSoft;">
      $(pin 22 "$teal" 1.9)
      <span style="display: flex; flex-direction: column; gap: 1px; flex: 1;"><span style="font-size: 14.5px; font-weight: 700; color: $tealText;">$head</span><span style="font-size: 12.5px; color: $tealText;">$sub</span></span>
      <span style="font-size: 12.5px; font-weight: 700; color: $tealText;">$again</span>
    </div>
P
}
{
open_screen
strip running none
header pin "$marigold" 'मेरा होटल'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 6px 16px 12px 16px;">
    <span style="font-size: 14.5px; line-height: 1.4; color: $ink;">कार्ड के दोनों तरफ़ की फ़ोटो लें और होटल पर पिन लगाएँ। बाक़ी कार्ड से भर जाएगा।</span>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
      $(photo 106 'कार्ड · आगे')
      $(photo 106 'कार्ड · पीछे')
    </div>
$(pinned now)
    <div style="flex: 1;"></div>
    <span style="display: flex; align-items: center; justify-content: center; min-height: 50px; border-radius: 14px; background: $marigold; color: $onMarigold; font-size: 15.5px; font-weight: 700;">सबमिट करें</span>
    <span style="font-size: 12.5px; color: $muted; text-align: center;">सब कुछ आपके फ़ोन पर ही रहता है। कहीं भेजा नहीं जाता।</span>
  </div>
H
bar none
close_screen
} > "$OUT/HomeHotel.dc.html"

# ---- घर.1 · मेरा होटल, step two: what the card said (decision 032). Read on the phone, in boxes the
# traveller corrects, under a line saying so beside the card; the room is typed, because no card
# carries it. होटल हटाएँ is the bin in the header. All of it on one screen at 360 × 672.
{
open_screen
strip running set
header pin "$marigold" 'मेरा होटल' '' trash
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 8px; padding: 6px 16px 10px 16px;">
    <div style="display: flex; align-items: center; gap: 10px; padding-top: 2px;">
      <div style="width: 76px; flex: none;">$(photo 48 'कार्ड · आगे')</div>
      <div style="width: 76px; flex: none;">$(photo 48 'कार्ड · पीछे')</div>
      <span style="flex: 1; font-size: 12.5px; line-height: 1.35; font-weight: 600; color: $tealText;">आपके कार्ड से पढ़ा गया। देख लें, ग़लत हो तो ठीक करें।</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      $(field 'होटल' 'Sabtbir Hotel Apartments')
      <div style="display: grid; grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr); gap: 8px;">
        $(stacked 'कमरा' '<span style="color: '"$muted"';">412</span>' '')
        $(stacked 'रिसेप्शन' '+971 4 258 6682' "$(phone 20 "$teal" 1.9)")
      </div>
      $(field 'पता' '23D St, Al Rigga, Dubai')
      $(field 'नोट' 'नाश्ता 7 से 10 …' muted)
    </div>
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 14px; min-height: 48px; border-radius: 14px; background: $tealSoft;">
      $(pin 22 "$teal" 1.9)
      <span style="flex: 1; font-size: 14.5px; font-weight: 700; color: $tealText;">पिन लगी है · देरा</span>
      <span style="font-size: 12.5px; font-weight: 700; color: $tealText;">फिर से</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; padding: 2px 10px; border-radius: 12px; background: $sand;">$(metro 18 "$j_bg" 1.9)<span style="display: flex; flex-direction: column;"><span style="font-size: 13.5px; font-weight: 700; color: $ink; line-height: 1.35;">अल रिग्गा</span><span style="font-size: 12px; color: $muted; line-height: 1.35;">मेट्रो · 450 मी</span></span></div>
      <div style="display: flex; align-items: center; gap: 8px; padding: 2px 10px; border-radius: 12px; background: $sand;">$(bus 18 "$j_bg" 1.9)<span style="display: flex; flex-direction: column;"><span style="font-size: 13.5px; font-weight: 700; color: $ink; line-height: 1.35;">Ghurair City 1</span><span style="font-size: 12px; color: $muted; line-height: 1.35;">बस स्टॉप · 250 मी</span></span></div>
    </div>
  </div>
H
bar none
close_screen
} > "$OUT/HomeHotelRead.dc.html"

# ---- घर.2 · ज़रूरी जानकारी — three capsules, and no hotel row (decision 028)
cap() { # label on
  local col=$muted bg=$card border=$line
  [ "$2" = on ] && col=$marigoldText && bg=$marigoldSoft && border=$marigoldLine
  echo "<span style=\"display: flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 10px; border-radius: 999px; border: 1.5px solid $border; background: $bg; color: $col; font-size: 14.5px; font-weight: 700;\">$1</span>"
}
crow() { # name where number
cat <<T
    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: $card; border-radius: 16px; border: 1px solid $line;">
      <span style="width: 44px; height: 44px; border-radius: 12px; background: $marigoldSoft; display: flex; align-items: center; justify-content: center;">$4</span>
      <span style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;"><span class="disp" style="font-size: 18px; font-weight: 600; color: $ink;">$1</span><span style="font-size: 12.5px; color: $muted;">$2</span></span>
      <span style="font-size: 15px; font-weight: 800; color: $marigoldText; white-space: nowrap;">$3</span>
    </div>
T
}
{
open_screen
strip running hidden
header info "$marigoldText" 'ज़रूरी जानकारी'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 6px 16px 12px 16px;">
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;">
      $(cap 'संपर्क' on)
      $(cap 'दस्तावेज़')
      $(cap 'फ़ीडबैक')
    </div>
    <span style="font-size: 13px; color: $muted; line-height: 1.45;">मुश्किल में यही चार नंबर काम आते हैं। दबाइए, फ़ोन लग जाएगा।</span>
$(crow 'भारतीय कॉन्सुलेट' 'बर दुबई · सोम–शुक्र 9–5' '+971 4 397 1222' "$(pin 20 "$marigoldText" 1.8)")
$(crow 'पुलिस' 'पूरे यूएई में · 24 घंटे' '999' "$(phone 20 "$marigoldText" 1.8)")
$(crow 'एम्बुलेंस' 'पूरे यूएई में · 24 घंटे' '998' "$(phone 20 "$marigoldText" 1.8)")
$(crow 'फ़ायर ब्रिगेड' 'सिविल डिफ़ेंस · 24 घंटे' '997' "$(phone 20 "$marigoldText" 1.8)")
    <span style="font-size: 12.5px; color: $muted; text-align: center; padding-top: 6px; line-height: 1.45;">भारत का 100 यहाँ नहीं लगता — दुबई में पुलिस 999 है।</span>
  </div>
H
bar docs
close_screen
} > "$OUT/HomeDocs.dc.html"

# ---- घर.3 · दस्तावेज़ › देखें
{
open_screen
strip running hidden
header info "$marigoldText" 'ज़रूरी जानकारी' 'पासपोर्ट'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    $(photo 520 'पासपोर्ट · 12 सितंबर')
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
      $(obtn "$(share 20 "$ink" 1.9)साझा करें")
      $(obtn "$(trash 20 "$ink" 1.9)हटाएँ")
    </div>
  </div>
H
bar docs
close_screen
} > "$OUT/HomeDocView.dc.html"

# ---- घर.4 · पास — one flow: the counter, the phones, the code, the total, the button
tier() { # devices price border bg
cat <<T
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 14px; border: 1.5px solid $3; background: $4;"><span style="font-size: 15px; font-weight: 600; color: $ink;">$1</span><span class="disp" style="font-size: 20px; font-weight: 700; color: $ink;">$2</span></div>
T
}
{
open_screen
strip ending set
header ticket "$marigold" 'पास'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border-radius: 16px; background: $marigoldSoft;">
      <span style="font-size: 12.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: $marigoldText;">अभी</span>
      <span class="disp" style="font-size: 22px; font-weight: 700; color: $ink;">दुबई का मुफ़्त दिन — 4 घंटे बाक़ी</span>
      <div style="height: 6px; border-radius: 3px; background: $ground;"><div style="width: 17%; height: 6px; border-radius: 3px; background: $marigold;"></div></div>
      <span style="font-size: 13px; color: $ink; line-height: 1.4;">पास 14 दिन चलता है, दुबई पहुँचने से गिनकर। एक बार का दाम, कोई सब्सक्रिप्शन नहीं।</span>
    </div>
    $(label '14 दिन · कितने फ़ोन?')
    <div style="display: flex; flex-direction: column; gap: 6px;">
$(tier '1 फ़ोन' '₹199' "$line" "$card")
$(tier '2 फ़ोन' '₹299' "$marigold" "$ground")
$(tier '3 फ़ोन' '₹399' "$line" "$card")
$(tier '4 फ़ोन' '₹499' "$line" "$card")
    </div>
    <div style="display: flex; align-items: center; gap: 10px; padding: 0 6px 0 14px; min-height: 50px; border-radius: 14px; background: $card; border: 1px solid $line;"><span style="font-size: 12.5px; font-weight: 700; color: $muted; width: 84px;">कोड</span><span style="flex: 1; font-size: 16px; font-weight: 600; letter-spacing: 0.08em; color: $ink;">SS-7K3M2X</span><span style="padding: 10px 14px; border-radius: 10px; background: $marigold; color: $onMarigold; font-size: 14px; font-weight: 700;">लगाएँ</span></div>
    <div style="display: flex; align-items: baseline; gap: 10px; padding: 12px 14px; border-radius: 14px; background: $card; border: 1px solid $line;"><span style="flex: 1; font-size: 15px; font-weight: 600; color: $ink;">कुल</span><span class="disp" style="font-size: 24px; font-weight: 700; color: $ink;">₹149</span><span style="font-size: 14px; color: $muted; text-decoration: line-through;">₹299</span></div>
    <span style="font-size: 12.5px; color: $muted;">SS-7K3M2X · 50% छूट</span>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
      $(btn 'UPI से — इसी फ़ोन पर' "$marigold" "$onMarigold")
      $(obtn "$(qr 20 "$ink" 1.9)QR — कोई और भरे")
    </div>
    <span style="font-size: 12.5px; color: $muted; text-align: center;">बाक़ी ₹149 ख़रीद खुलने पर देना होगा — कोड याद रहेगा</span>
  </div>
H
bar none
close_screen
} > "$OUT/HomePass.dc.html"

# ---- घर.4 · पास आ गया — the welcome, the moment a pass lands on this phone (decision 022)
# One read, then it is gone for that pass: what they have, that it runs with the radio off, that
# the fourteen days wait for the plane, and a good wish. The strip says ऑफ़लाइन on purpose — a
# scanned pass installs with no connection at all (decision 005), and so does this screen.
{
open_screen
strip running set
header ticket "$marigold" 'पास'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 14px; padding: 10px 16px 12px 16px;">
    <div style="position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding: 22px 20px 24px 20px; border-radius: 22px; background: $marigoldSoft; border: 1px solid $marigoldLine; box-sizing: border-box;">
      <span style="position: relative; display: inline-flex;">
        $(logo 62)
        <span style="position: absolute; right: -12px; bottom: -2px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: $marigold; border: 2px solid $marigoldSoft; box-sizing: border-box;">$(ticket 22 "$onMarigold" 1.9)</span>
      </span>
      <span style="font-size: 12.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: $marigoldText;">पास आ गया</span>
      <span class="disp" style="font-size: 27px; font-weight: 700; line-height: 1.3; color: $ink;">14 दिन का दुबई साथी — अब आपका।</span>
      <span style="font-size: 14.5px; line-height: 1.55; color: $ink;">सिम नहीं, वाई-फ़ाई नहीं, रोमिंग नहीं — खाना, जाना और जानना, तीनों बिना नेटवर्क चलते हैं।</span>
      <span style="font-size: 14.5px; line-height: 1.55; color: $ink;">गिनती दुबई पहुँचने पर शुरू होगी — घर बैठे एक दिन भी ख़र्च नहीं होता।</span>
      <span style="font-size: 15.5px; font-weight: 700; line-height: 1.45; color: $tealText;">सफ़र अच्छा बीते। दुबई में साथी आपके साथ है।</span>
    </div>
    <div style="flex: 1;"></div>
    $(btn 'साथी खोलिए' "$marigold" "$onMarigold")
  </div>
H
bar none
close_screen
} > "$OUT/HomePassWelcome.dc.html"
