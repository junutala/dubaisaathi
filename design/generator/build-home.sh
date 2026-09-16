#!/bin/bash
source "$(dirname "$0")/_chrome.sh"
tile() { # name roman blurb bg fg iconfn
cat <<T
    <div style="position: relative; flex: 1; border-radius: 26px; overflow: hidden; background: $4; display: flex; align-items: flex-end; padding: 20px 22px;">
      <div style="position: absolute; right: -18px; top: -14px; opacity: 0.16;">$($6 170 "$5" 1.1)</div>
      <span style="position: absolute; left: 22px; top: 18px; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: $5; opacity: 0.7;">$2</span>
      <div style="position: relative; display: flex; flex-direction: column; gap: 2px; max-width: 250px;">
        <span class="disp" style="font-size: 56px; font-weight: 700; line-height: 1; color: $5; letter-spacing: -0.01em;">$1</span>
        <span style="font-size: 13.5px; line-height: 1.35; color: $5; opacity: 0.85; margin-top: 8px; text-wrap: pretty;">$3</span>
      </div>
    </div>
T
}
# ---- घर: $1 out, $2 pass state, $3 hotel, $4 subscribe, $5 nudge yes|no
home() {
{
open_screen
strip "$2" "$3"
[ "$5" = yes ] && cat <<N
  <div style="margin: 10px 16px 0 16px; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: $marigoldSoft;">
    <span style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;">
      <span style="font-size: 15px; font-weight: 700; color: $marigoldText;">आपका मुफ़्त दिन 4 घंटे में ख़त्म</span>
      <span style="font-size: 13px; color: $ink;">14 दिन का पास ₹199 से — एक बार, कोई सब्सक्रिप्शन नहीं</span>
    </span>
    <span style="padding: 10px 14px; border-radius: 12px; background: $marigold; color: $onMarigold; font-size: 13.5px; font-weight: 700; white-space: nowrap;">पास लें</span>
  </div>
N
cat <<H
  <div style="flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 12px 16px;">
$(tile 'खाना' 'Khaana' 'भारतीय खाना — छोटी दुकानें और कैफ़ेटेरिया जो आपको यूँ नहीं मिलतीं।' "$k_bg" "$k_fg" thali)
$(tile 'जाना' 'Jaana' 'मेट्रो, बस, ट्राम या टैक्सी — कहीं भी, कितना समय और कितने दिरहम।' "$j_bg" "$j_fg" metro)
$(tile 'जानना' 'Jaanna' 'दुबई की जगहें — समय, टिकट, पहुँचने का तरीक़ा, हिंदी में।' "$n_bg" "$n_fg" lantern)
  </div>
H
bar none "$4"
close_screen
} > "$OUT/$1"
}
home Home.dc.html running set yes no
home HomeTrial.dc.html ending none yes yes
home HomePaid.dc.html running set no no
THEME=dark; source "$(dirname "$0")/_chrome.sh"; home HomeDark.dc.html running set yes no; THEME=light; source "$(dirname "$0")/_chrome.sh"

# ---- L · लैंडिंग (first open, the pack comes down)
{
cat "$(dirname "$0")/_head.txt"
cat <<H
<div style="width: 390px; height: 844px; background: $ground; color: $ink; display: flex; flex-direction: column; overflow: hidden; padding: 0 24px; box-sizing: border-box;">
  <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 18px; text-align: center;">
    $(logo 96)
    <span class="disp" style="font-size: 40px; font-weight: 700; line-height: 1.1; color: $ink;">दुबई साथी</span>
    <span style="font-size: 17px; line-height: 1.45; color: $muted; max-width: 300px; text-wrap: pretty;">दुबई की जानकारी, आपकी जेब में — बिना इंटरनेट के भी।</span>
    <div style="display: flex; gap: 10px; margin-top: 8px;">
      <span style="padding: 8px 14px; border-radius: 999px; background: $ink; color: $ground; font-size: 14px; font-weight: 700;">हिंदी</span>
      <span style="padding: 8px 14px; border-radius: 999px; border: 1.5px solid $line; color: $ink; font-size: 14px; font-weight: 600;">English</span>
    </div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px; padding-bottom: 32px;">
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-radius: 16px; background: $sand;">
      <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: $ink;"><span>ऑफ़लाइन पैक आ रहा है</span><span style="color: $muted;">18 MB · 40 सेकंड</span></div>
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
bar none yes
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
bar docs yes
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
bar docs yes
close_screen
} > "$OUT/HomeDocView.dc.html"

# ---- घर.4 · पास
tier() { # devices price
cat <<T
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 14px; border: 1.5px solid $3; background: $4;"><span style="font-size: 15px; font-weight: 600; color: $ink;">$1</span><span class="disp" style="font-size: 20px; font-weight: 700; color: $ink;">$2</span></div>
T
}
{
open_screen
strip ending set
header ticket "$marigold" 'पास'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border-radius: 16px; background: $marigoldSoft;">
      <span style="font-size: 12.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: $marigoldText;">अभी</span>
      <span class="disp" style="font-size: 22px; font-weight: 700; color: $ink;">दुबई का मुफ़्त दिन — 4 घंटे बाक़ी</span>
      <div style="height: 6px; border-radius: 3px; background: $ground;"><div style="width: 17%; height: 6px; border-radius: 3px; background: $marigold;"></div></div>
      <span style="font-size: 13px; color: $ink; line-height: 1.4;">पास 14 दिन चलता है, दुबई पहुँचने से गिनकर। एक बार का दाम, कोई सब्सक्रिप्शन नहीं।</span>
    </div>
    $(label '14 दिन · कितने फ़ोन?')
    <div style="display: flex; flex-direction: column; gap: 8px;">
$(tier '1 फ़ोन' '₹199' "$marigold" "$ground")
$(tier '2 फ़ोन' '₹299' "$line" "$card")
$(tier '3 फ़ोन' '₹399' "$line" "$card")
$(tier '4 फ़ोन' '₹499' "$line" "$card")
    </div>
    <span style="font-size: 12.5px; color: $muted;">चार से ज़्यादा? WhatsApp पर बात करें ›</span>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 4px;">
      $(btn 'UPI से — इसी फ़ोन पर' "$marigold" "$onMarigold")
      $(obtn "$(qr 20 "$ink" 1.9)QR — कोई और भरे")
    </div>
  </div>
H
bar none no
close_screen
} > "$OUT/HomePass.dc.html"
