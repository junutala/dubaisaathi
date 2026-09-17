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
$(tile 'जाना' 'Jaana' 'मेट्रो, बस, ट्राम या टैक्सी — कहीं भी, कितना समय और कितने दिरहम।' "$j_bg" "$j_fg" metro)
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
    $(wordmark 40 "$ink" "$marigold")
    <span class="disp" style="font-size: 26px; font-weight: 700; line-height: 1.2; color: $tealText;">बिना इंटरनेट चलता है</span>
    <span style="font-size: 16px; line-height: 1.45; color: $muted; max-width: 320px; text-wrap: pretty;">दुबई में सिम नहीं, वाई-फ़ाई नहीं, रोमिंग नहीं — फिर भी सब चलेगा।</span>
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

# ---- घर.1 · मेरा होटल (free-form record)
{
open_screen
strip running set
header pin "$marigold" 'मेरा होटल'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
      $(photo 120 'रिसेप्शन का कार्ड')
      $(photo 120 'होटल का सामने का हिस्सा')
    </div>
    <div style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; border: 1.5px dashed $line; color: $muted; font-size: 14px; font-weight: 600;">$(camera 20 "$muted" 1.9)एक और फ़ोटो जोड़ें</div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 50px; border-radius: 14px; background: $card; border: 1px solid $line;"><span style="font-size: 12.5px; font-weight: 700; color: $muted; width: 92px;">होटल</span><span style="font-size: 16px; color: $ink;">Citymax Bur Dubai</span></div>
      <div style="display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 50px; border-radius: 14px; background: $card; border: 1px solid $line;"><span style="font-size: 12.5px; font-weight: 700; color: $muted; width: 92px;">कमरा</span><span style="font-size: 16px; color: $ink;">412</span></div>
      <div style="display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 50px; border-radius: 14px; background: $card; border: 1px solid $line;"><span style="font-size: 12.5px; font-weight: 700; color: $muted; width: 92px;">रिसेप्शन</span><span style="font-size: 16px; color: $ink; flex: 1;">+971 4 000 0000</span>$(phone 20 "$teal" 1.9)</div>
      <div style="display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 50px; border-radius: 14px; background: $card; border: 1px solid $line;"><span style="font-size: 12.5px; font-weight: 700; color: $muted; width: 92px;">नोट</span><span style="font-size: 16px; color: $muted;">नाश्ता 7 से 10 …</span></div>
    </div>
    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: $tealSoft;">
      $(pin 22 "$teal" 1.9)
      <span style="display: flex; flex-direction: column; gap: 1px; flex: 1;"><span style="font-size: 14.5px; font-weight: 700; color: $tealText;">जगह की पिन लगी है</span><span style="font-size: 12.5px; color: $tealText;">यहीं खड़े होकर लगाई गई · बुर दुबई</span></span>
      <span style="font-size: 12.5px; font-weight: 700; color: $tealText;">फिर से</span>
    </div>
    <span style="font-size: 12.5px; color: $muted; text-align: center; padding-top: 4px;">सब कुछ आपके फ़ोन पर ही रहता है। कहीं भेजा नहीं जाता।</span>
  </div>
H
bar none
close_screen
} > "$OUT/HomeHotel.dc.html"

# ---- घर.2 · दस्तावेज़
drow() { # name added
cat <<T
    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: $card; border-radius: 16px; border: 1px solid $line;">
      <span style="width: 44px; height: 56px; border-radius: 8px; background: repeating-linear-gradient(135deg, $sand 0 6px, $line 6px 7px);"></span>
      <span style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;"><span class="disp" style="font-size: 18px; font-weight: 600; color: $ink;">$1</span><span style="font-size: 12.5px; color: $muted;">$2</span></span>
      $(chev 18 "$chev" 2)
    </div>
T
}
{
open_screen
strip running set
header docs "$marigoldText" 'दस्तावेज़'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 6px 16px 12px 16px;">
$(drow 'पासपोर्ट' 'जोड़ा 12 सितंबर')
$(drow 'बीमा' 'जोड़ा 12 सितंबर')
$(drow 'वापसी की टिकट' 'जोड़ा 14 सितंबर')
$(drow 'होटल बुकिंग' 'जोड़ा 14 सितंबर')
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px; border-radius: 16px; border: 1.5px dashed $marigold; color: $marigoldText; font-size: 15px; font-weight: 700;">$(plus 20 "$marigoldText" 2)दस्तावेज़ जोड़ें — फ़ोटो लें, नाम दें</div>
    <span style="font-size: 12.5px; color: $muted; text-align: center; padding-top: 6px; line-height: 1.45;">कोई भी दस्तावेज़, जितने चाहें। फ़ोन पर ही रहते हैं, बिना इंटरनेट खुलते हैं, आप हटाएँ तभी हटते हैं।</span>
  </div>
H
bar docs
close_screen
} > "$OUT/HomeDocs.dc.html"

# ---- घर.3 · दस्तावेज़ › देखें
{
open_screen
strip running set
header docs "$marigoldText" 'दस्तावेज़' 'पासपोर्ट'
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
