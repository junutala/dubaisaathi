#!/bin/bash
source "$(dirname "$0")/_chrome.sh"
tile() { # name roman blurb bg fg iconfn
# The caption, the name and the blurb are one stack at the foot of the block, the caption first:
# pinned to the block's top it printed over the name whenever the blocks gave up height.
cat <<T
    <div style="position: relative; flex: 1; border-radius: 26px; overflow: hidden; background: $4; display: flex; align-items: flex-end; padding: 14px 20px; box-sizing: border-box;">
      <div style="position: absolute; right: -18px; top: -14px; opacity: 0.16;">$($6 170 "$5" 1.1)</div>
      <div data-pillar-stack style="position: relative; display: flex; flex-direction: column; max-width: 250px; min-width: 0;">
        <span style="font-size: 12px; font-weight: 700; line-height: 1.35; letter-spacing: 0.16em; text-transform: uppercase; color: $5; opacity: 0.7; margin-bottom: 6px;">$2</span>
        <span class="disp" style="font-size: 34px; font-weight: 700; line-height: 1; color: $5; letter-spacing: -0.01em;">$1</span>
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
# घर's one question after a stretch with no signal (decision 043, rule 31): one row, once a Dubai
# day, between the blocks and the pass tile. Only ever on a board whose strip says ऑफ़लाइन.
offlineask() {
cat <<A
  <div style="margin: 0 16px 10px 16px; display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 14px; background: $sand; color: $ink;">
    <span style="font-size: 14px; font-weight: 700; line-height: 1.3;">अभी कुछ देर इंटरनेट नहीं था — क्यों?</span>
    <span style="display: flex; gap: 8px; align-items: center;">
      <span style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 40px; border-radius: 10px; border: 1.5px solid $line; background: $card; font-size: 14px; font-weight: 700;">सिग्नल नहीं था</span>
      <span style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 40px; border-radius: 10px; border: 1.5px solid $line; background: $card; font-size: 14px; font-weight: 700;">डेटा बंद रखा था</span>
      <span style="padding: 0 8px; font-size: 13px; font-weight: 600; color: $muted;">छोड़ें</span>
    </span>
  </div>
A
}
# The small print at the very foot of घर (decision 048; the owner, 30 September: "keep it as a small
# print, just to cover us legally"). The smallest type on the screen, under the pass tile and above
# the bar; the website's address in the words, and a tap opens घर.10, the same terms, offline.
smallprint() {
  echo "  <span data-small-print style=\"display: block; margin: -4px 16px 8px 16px; font-size: 10px; letter-spacing: 0.02em; line-height: 1.35; color: $muted; text-align: center;\">नियम, निजता और रिफ़ंड — saafarsaathi.in/terms</span>"
}
# ---- घर: $1 out, $2 pass state, $3 hotel, $4 tile trial|warm|paid, $5 signal on|off, $6 ask|''
# बोलना is the fourth block from 17 September, at the owner's instruction: the same shape and the
# same type as the three, in its own plum. It is on घर only where the strip says ऑनलाइन, because
# the recogniser and the Arabic behind it are both online (decision 020) — so a board that says
# ऑफ़लाइन carries three blocks, and that difference is the rule, drawn.
homescreen() {
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
[ "${6:-}" = ask ] && offlineask
case "$4" in
  trial) passtile '18 घंटे बाक़ी · पास लें' '14 दिन का पास — एक बार, कोई सब्सक्रिप्शन नहीं' no ;;
  warm)  passtile '4 घंटे बाक़ी · पास लें' '14 दिन का पास — एक बार, कोई सब्सक्रिप्शन नहीं' yes ;;
  paid)  passtile 'पास · 12 दिन बाक़ी · परिवार के लिए QR' 'इस सफ़र में कुछ बंद नहीं होगा' no ;;
esac
smallprint
bar home
close_screen
} > "$OUT/$1"
}
homescreen Home.dc.html running set trial on
homescreen HomeTrial.dc.html ending none warm off ask
homescreen HomePaid.dc.html running set paid on
THEME=dark; source "$(dirname "$0")/_chrome.sh"; homescreen HomeDark.dc.html running set trial on; THEME=light; source "$(dirname "$0")/_chrome.sh"

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
    <span style="font-size: 12.5px; line-height: 1.5; color: $muted; text-align: center;">खाना, जाना, जानना और बोलना में आप जो लिखते, बोलते या पढ़वाते हैं, उसे हम Saathi को बेहतर बनाने के लिए रख सकते हैं — सिर्फ़ लिखा हुआ, आपकी आवाज़ या फ़ोटो नहीं. यह आपके नाम या नंबर से नहीं जुड़ता.</span>
    <span style="font-size: 12.5px; line-height: 1.5; color: $muted; text-align: center;">जारी रखकर आप नियम और शर्तें मानते हैं। <span style="font-weight: 700; color: $marigoldText;">नियम और शर्तें पढ़ें</span></span>
    <span style="display: flex; align-items: center; justify-content: center; min-height: 52px; border-radius: 14px; background: $line; color: $muted; font-size: 16px; font-weight: 700;">मंज़ूर है, शुरू करें</span>
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
    <span style="font-size: 12.5px; color: $muted; text-align: center;">सब कुछ आपके फ़ोन पर ही रहता है। बस कार्ड पर छपा मैप-लिंक ऑनलाइन खोला जाता है।</span>
  </div>
H
bar none
close_screen
} > "$OUT/HomeHotel.dc.html"

# ---- घर.1 · मेरा होटल, step two: what the card said (decision 032). Read on the phone, in boxes the
# traveller corrects, under a line saying so beside the card; the room is typed, because no card
# carries it. होटल हटाएँ is the bin in the header. All of it on one screen at 360 × 672.
choice() { # head area
  echo "<span style=\"display: flex; flex-direction: column; justify-content: center; min-height: 48px; padding: 3px 12px; border-radius: 12px; border: 1.5px solid $teal; background: $card; box-sizing: border-box;\"><span style=\"font-size: 13.5px; font-weight: 700; color: $ink; line-height: 1.3;\">$1</span><span style=\"font-size: 12px; color: $muted; line-height: 1.3;\">$2</span></span>"
}
below() { # near | choice — the nearby row, or, while the card and the pin disagree, the question
  if [ "$1" = choice ]; then
cat <<C
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <span style="font-size: 12.5px; line-height: 1.35; font-weight: 600; color: $tealText;">कार्ड होटल को कहीं और बताता है। कौन-सी जगह सही है?</span>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
        $(choice 'जहाँ आप खड़े थे' 'देरा')
        $(choice 'कार्ड वाली जगह' 'अल रिग्गा')
      </div>
    </div>
C
  else
cat <<N
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; padding: 2px 10px; border-radius: 12px; background: $sand;">$(metro 18 "$j_bg" 1.9)<span style="display: flex; flex-direction: column;"><span style="font-size: 13.5px; font-weight: 700; color: $ink; line-height: 1.35;">अल रिग्गा</span><span style="font-size: 12px; color: $muted; line-height: 1.35;">मेट्रो · 450 मी</span></span></div>
      <div style="display: flex; align-items: center; gap: 8px; padding: 2px 10px; border-radius: 12px; background: $sand;">$(bus 18 "$j_bg" 1.9)<span style="display: flex; flex-direction: column;"><span style="font-size: 13.5px; font-weight: 700; color: $ink; line-height: 1.35;">Ghurair City 1</span><span style="font-size: 12px; color: $muted; line-height: 1.35;">बस स्टॉप · 250 मी</span></span></div>
    </div>
N
  fi
}
hotel_read() { # near | choice
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
        $(stacked 'कमरा' '<span style="color: '"$muted"';">लिखें</span>' '')
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
$(below "$1")
  </div>
H
bar none
close_screen
}
hotel_read near > "$OUT/HomeHotelRead.dc.html"

# ---- घर.1 · मेरा होटल, step two, when the card's QR code puts the hotel more than 200 m from where
# the traveller pinned it (decision 032, addendum): both places, each with its area, one tap to
# pick — in the nearby row's place, so step two stays one screen.
hotel_read choice > "$OUT/HomeHotelChoice.dc.html"

# ---- घर.2 · दस्तावेज़ — the bar's second place (decision 046): the documents list and जोड़ें, as
# घर.2 was before the capsules (decision 003). ज़रूरी जानकारी is retired: its numbers are जानना's
# emergency line, its feedback form is part of सुझाव (घर.9).
drow() { # name when
cat <<T
    <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: $card; border-radius: 16px; border: 1px solid $line; min-height: 64px; box-sizing: border-box;">
      <span style="width: 44px; height: 44px; border-radius: 12px; background: $marigoldSoft; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">$(docs 22 "$marigoldText" 1.8)</span>
      <span style="display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0;"><span class="disp" style="font-size: 18px; font-weight: 600; color: $ink; line-height: 1.35;">$1</span><span style="font-size: 12.5px; color: $muted;">$2</span></span>
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
    <span style="font-size: 13px; color: $muted; line-height: 1.45;">सब इसी फ़ोन पर रहते हैं और बिना नेटवर्क खुलते हैं। जितने चाहें, रखें।</span>
$(drow 'पासपोर्ट' 'फ़ोटो · 12 सितंबर')
$(drow 'वीज़ा' 'PDF · 12 सितंबर')
$(drow 'वापसी का टिकट' 'PDF · 14 सितंबर')
$(drow 'होटल बुकिंग' 'फ़ोटो · 14 सितंबर')
$(drow 'ट्रैवल इंश्योरेंस' 'PDF · 15 सितंबर')
    <div style="flex: 1;"></div>
    $(btn "$(plus 20 "$onMarigold" 2.2)&nbsp; दस्तावेज़ जोड़ें" "$marigold" "$onMarigold")
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
    $(photo 468 'पासपोर्ट · 12 सितंबर')
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
      $(obtn "$(share 20 "$ink" 1.9)साझा करें")
      $(obtn "$(trash 20 "$ink" 1.9)हटाएँ")
    </div>
  </div>
H
bar docs
close_screen
} > "$OUT/HomeDocView.dc.html"

# ---- घर.4 · पास — one flow: the counter, the phones, the code, the bill, the one pay button
# (30 September: one Razorpay Checkout with every method the account takes; the QR button went)
tier() { # devices price border bg
cat <<T
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px 14px; border-radius: 14px; border: 1.5px solid $3; background: $4;"><span style="font-size: 15px; font-weight: 600; color: $ink;">$1</span><span class="disp" style="font-size: 20px; font-weight: 700; color: $ink;">$2</span></div>
T
}
{
open_screen
strip ending set
header ticket "$marigold" 'पास'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 6px; padding: 0 16px 4px 16px;">
    <div style="display: flex; flex-direction: column; gap: 4px; padding: 10px 16px; border-radius: 16px; background: $marigoldSoft;">
      <span style="font-size: 12.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: $marigoldText;">अभी</span>
      <span class="disp" style="font-size: 22px; font-weight: 700; color: $ink;">दुबई का मुफ़्त दिन — 4 घंटे बाक़ी</span>
      <div style="height: 6px; border-radius: 3px; background: $ground;"><div style="width: 17%; height: 6px; border-radius: 3px; background: $marigold;"></div></div>
      <span style="font-size: 13px; color: $ink; line-height: 1.4;">पास 14 दिन चलता है, दुबई पहुँचने से गिनकर। एक बार का दाम, कोई सब्सक्रिप्शन नहीं।</span>
    </div>
    $(label '14 दिन · कितने फ़ोन?')
    <div style="display: flex; flex-direction: column; gap: 5px;">
$(tier '1 फ़ोन' '₹199' "$line" "$card")
$(tier '2 फ़ोन' '₹299' "$marigold" "$ground")
$(tier '3 फ़ोन' '₹399' "$line" "$card")
$(tier '4 फ़ोन' '₹499' "$line" "$card")
    </div>
    <div style="display: flex; align-items: center; gap: 10px; padding: 0 6px 0 14px; min-height: 42px; border-radius: 14px; background: $card; border: 1px solid $line;"><span style="font-size: 12.5px; font-weight: 700; color: $muted; width: 84px;">कोड</span><span style="flex: 1; font-size: 16px; font-weight: 600; letter-spacing: 0.08em; color: $ink;">SS-7K3M2X</span><span style="padding: 6px 14px; border-radius: 10px; background: $marigold; color: $onMarigold; font-size: 14px; font-weight: 700;">लगाएँ</span></div>
    <div style="display: flex; flex-direction: column; gap: 4px; padding: 8px 16px; border-radius: 16px; background: $card; border: 1px solid $line;">
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 14px; color: $ink;"><span>दुबई साथी पास · 14 दिन · 2 फ़ोन</span><span style="font-weight: 600;">₹299</span></div>
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 14px; color: $tealText;"><span>SS-7K3M2X · 50% छूट</span><span style="font-weight: 600;">−₹150</span></div>
      <div style="border-top: 1px dashed $line; margin: 2px 0;"></div>
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px;"><span style="font-size: 16px; font-weight: 700; color: $ink;">कुल</span><span class="disp" style="font-size: 26px; font-weight: 700; color: $ink; line-height: 1.1;">₹149</span></div>
    </div>
    <span style="display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border-radius: 14px; background: $marigold; color: $onMarigold; font-size: 17px; font-weight: 700;">$(lock 20 "$onMarigold" 1.9)₹149 भुगतान करें</span>
    <span style="font-size: 13px; font-weight: 600; color: $ink; text-align: center;">UPI · कार्ड · नेट बैंकिंग</span>
    <span style="font-size: 12px; color: $muted; text-align: center; line-height: 1.4;">Razorpay से सुरक्षित भुगतान — कार्ड की जानकारी हम तक नहीं आती</span>
    <span style="font-size: 12px; color: $muted; text-align: center; line-height: 1.4;">भुगतान होते ही पास इसी फ़ोन पर लग जाता है</span>
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

# ---- घर.8 · ऐप शेयर — the bar's fourth place (decision 046). A big QR for the app's address, drawn
# on the phone so it works with the radio off; under it who we are, what it does, the free day,
# the address in letters, and WhatsApp. The owner's reason: the moment a stranger sees the board
# reader and asks "what is that?", the traveller is one tap from a code that scans.
# The QR here is a real one, drawn from the same address by the `qr` package the app uses, so the
# board itself scans.
qrsvg() { # size url
  node --input-type=module -e "
import encodeQR from 'qr';
const m = encodeQR(process.argv[1], 'raw', { ecc: 'medium', border: 2 });
const n = m.length; let d = '';
m.forEach((row, y) => row.forEach((on, x) => { if (on) d += 'M' + x + ' ' + y + 'h1v1h-1z'; }));
process.stdout.write('<svg width=\"' + process.argv[2] + '\" height=\"' + process.argv[2] + '\" viewBox=\"0 0 ' + n + ' ' + n + '\" shape-rendering=\"crispEdges\"><rect width=\"' + n + '\" height=\"' + n + '\" fill=\"#FFFFFF\"></rect><path d=\"' + d + '\" fill=\"#141826\"></path></svg>');
" "$2" "$1"
}
{
open_screen
strip running set
header qr "$teal" 'ऐप शेयर'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 4px 16px 12px 16px; text-align: center;">
    <div style="padding: 10px; border-radius: 20px; background: #FFFFFF; border: 1px solid $line;">$(qrsvg 236 'https://dubai.saafarsaathi.in')</div>
    <span class="disp" style="font-size: 24px; font-weight: 700; color: $ink; margin-top: 6px; line-height: 1.35;">Dubai Saathi</span>
    <span style="font-size: 15px; line-height: 1.4; color: $ink; text-wrap: balance;">दुबई में आपका हिंदी साथी — खाना, रास्ता, बोर्ड पढ़ना</span>
    <span style="padding: 4px 12px; border-radius: 999px; background: $marigoldSoft; color: $marigoldText; font-size: 14px; font-weight: 700;">24 घंटे मुफ़्त</span>
    <span style="font-size: 16px; font-weight: 700; letter-spacing: 0.02em; color: $tealText;">dubai.saafarsaathi.in</span>
    <div style="flex: 1;"></div>
    <div style="align-self: stretch;">$(btn "$(share 20 "$onShare" 2)&nbsp; WhatsApp पर भेजें" "$teal" "$onShare")</div>
  </div>
H
bar share
close_screen
} > "$OUT/HomeShare.dc.html"

# ---- घर.9 · सुझाव — the bar's third place (decision 046). Two things, one under the other: a place,
# a kitchen or anything we missed, which goes to the question log with the words as typed; and a
# word to us — ज़रूरी जानकारी's feedback form, moved here whole. Drawn as a nothing-found button
# opens it: the traveller's own words already in the first box, saying where they came from.
tbox() { # label value muted? height
  local col=$ink; [ "${3:-}" = muted ] && col=$muted
  echo "<div style=\"display: flex; flex-direction: column; justify-content: center; gap: 1px; padding: 4px 12px; min-height: ${4:-48}px; border-radius: 12px; background: $card; border: 1px solid $line; box-sizing: border-box;\"><span style=\"font-size: 11.5px; font-weight: 700; color: $muted; line-height: 1.35;\">$1</span><span style=\"font-size: 15px; color: $col; line-height: 1.35;\">$2</span></div>"
}
{
open_screen
strip running set
header bulb "$marigoldText" 'सुझाव'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 8px; padding: 4px 16px 12px 16px;">
    <span class="disp" style="font-size: 19px; font-weight: 700; color: $ink; line-height: 1.35;">कोई जगह छूट गई?</span>
    <span style="font-size: 12.5px; color: $muted; line-height: 1.35;">खाने की जगह, घूमने की जगह, कुछ भी — लिख दीजिए, हम जोड़ेंगे।</span>
    $(tbox 'क्या नहीं मिला' 'kulfi falooda Karama')
    <span style="font-size: 12px; font-weight: 600; color: $tealText; line-height: 1.35;">खाना में आपने यही खोजा था — बदलना हो तो बदल दें।</span>
    $(btn 'भेजें' "$marigold" "$onMarigold")
    <div style="height: 1px; background: $line; margin: 4px 0;"></div>
    <span class="disp" style="font-size: 19px; font-weight: 700; color: $ink; line-height: 1.35;">सुझाव या राय</span>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
      $(tbox 'नाम' 'लिखें' muted)
      $(tbox 'नंबर' '+91 …' muted)
    </div>
    $(tbox 'आपकी बात' 'जो कहना हो…' muted 76)
    $(obtn 'भेज दीजिए')
    <span style="font-size: 12px; color: $muted; text-align: center; line-height: 1.35;">बिना नेटवर्क भी — फ़ोन पर रखा जाता है और सिग्नल आते ही पहुँच जाता है।</span>
  </div>
H
bar contribute
close_screen
} > "$OUT/HomeContribute.dc.html"

# ---- L · लैंडिंग › एक बात, एक बार — the one-time notice (decisions 045 and 048), for a phone that was
# already past the landing page: the data-use line and the terms, one button. It comes back only
# when the terms change, and then once.
{
cat "$(dirname "$0")/_head.txt"
cat <<H
<div style="width: 390px; height: 844px; background: $ground; color: $ink; display: flex; flex-direction: column; overflow: hidden; padding: 0 24px; box-sizing: border-box;">
  <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; text-align: center; padding-top: 16px;">
    $(logo 64)
    $(wordmark 40 "$ink" "$marigold" "$marigoldText" yes)
    <span class="disp" style="font-size: 21px; font-weight: 700; line-height: 1.25; color: $tealText;">एक बात, एक बार</span>
    <span style="font-size: 15px; line-height: 1.55; color: $ink;">खाना, जाना, जानना और बोलना में आप जो लिखते, बोलते या पढ़वाते हैं, उसे हम Saathi को बेहतर बनाने के लिए रख सकते हैं — सिर्फ़ लिखा हुआ, आपकी आवाज़ या फ़ोटो नहीं. यह आपके नाम या नंबर से नहीं जुड़ता.</span>
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px; padding-bottom: 32px;">
    <span style="font-size: 12.5px; line-height: 1.5; color: $muted; text-align: center;">जारी रखकर आप नियम और शर्तें मानते हैं। <span style="font-weight: 700; color: $marigoldText;">नियम और शर्तें पढ़ें</span></span>
    $(btn 'मंज़ूर है, आगे बढ़ें' "$marigold" "$onMarigold")
  </div>
</div>
</x-dc>
</body>
</html>
H
} > "$OUT/Consent.dc.html"

# ---- घर.10 · नियम और शर्तें (decision 048) — the terms, privacy and refunds, bundled so they read
# with the radio off; the same words as saafarsaathi.in/terms. Reached from the landing page, the
# one-time notice and घर's small print. जाना's line is set apart, in its own hue: it is not a map
# of every address (the owner, 30 September). Drawn at its top; the rest scrolls.
tpara() { echo "<span style=\"font-size: 14.5px; line-height: 1.55; color: ${2:-$ink};\">$1</span>"; }
thead() { echo "<span style=\"font-size: 16px; font-weight: 800; line-height: 1.35; color: ${2:-$ink};\">$1</span>"; }
{
open_screen
strip running set
header docs "$marigold" 'नियम और शर्तें'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 14px; padding: 6px 16px 12px 16px;">
    <span style="font-size: 13px; color: $muted;">आख़िरी बदलाव: 30 सितंबर 2026</span>
    <div style="display: flex; flex-direction: column; gap: 6px;">
      $(thead 'Dubaisaathi क्या है')
      $(tpara 'Dubaisaathi दुबई में भारतीय यात्रियों के लिए एक जानकारी-डेस्क है: खाना, जाना, जानना और बोलना। इसे Coupontouch Loyalty Solutions चलाती है।')
      $(tpara 'यह होटल या फ़्लाइट बुक नहीं करता, खाना नहीं पहुँचाता, रेस्टोरेंट का बाज़ार नहीं है, और हर बात का जवाब देने वाला चैटबॉट नहीं है।')
    </div>
    <div data-terms-go style="display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 14px; background: $j_soft;">
      $(thead 'जाना — सिर्फ़ हमारी सूची की जगहें' "$j_text")
      $(tpara 'जाना हर पते वाला ऑफ़लाइन नक्शा नहीं है। रास्ता सिर्फ़ उन जगहों का मिलता है जो हमारी सूची में हैं।' "$j_text")
      $(tpara 'सूची से बाहर की जगह लिखने पर रास्ता नहीं मिलता। ऐप बताता है कि यह जगह अभी साथी के पास नहीं है, और “टैक्सी से जाएँ” दबाने पर आपके लिखे शब्द बड़े अक्षरों में दिखाता है, टैक्सी ड्राइवर को दिखाने के लिए — बिना अरबी पते और बिना किराए के अंदाज़े के।' "$j_text")
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px;">
      $(thead 'खाना')
      $(tpara 'खाना में सिर्फ़ वे रसोइयाँ हैं जिनका मेनू हमारे अपने लोगों ने पढ़ा है — दुकान पर जाकर, या रसोई के अपने ऑनलाइन मेनू से।')
    </div>
  </div>
H
bar none
close_screen
} > "$OUT/HomeTerms.dc.html"
