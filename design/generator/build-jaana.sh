#!/bin/bash
source "$(dirname "$0")/_chrome.sh"
arow() { # hi en kind
cat <<T
    <div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: $card; border-radius: 16px; border: 1px solid $line; min-height: 48px; box-sizing: border-box;">
      <span style="display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0;"><span class="disp" style="font-size: 19px; font-weight: 600; line-height: 1.2; color: $ink;">$1</span><span style="font-size: 12.5px; color: $muted;">$2 · $3</span></span>
      $(chev 18 "$chev" 2)
    </div>
T
}
# ---- 2.1 · जाना › कहाँ जाना है
j1() {
{
open_screen
strip running set
header metro "$teal" 'जाना'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 54px; border-radius: 16px; background: $card; border: 1.5px solid $teal;">
      $(search 20 "$muted" 2)
      <span style="flex: 1; font-size: 17px; color: $ink;">Burjman</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; background: $tealSoft; color: $tealText;">
      <span style="font-size: 14.5px; line-height: 1.35; flex: 1;">क्या आपका मतलब <strong>बुरजुमान</strong> है? BurJuman</span>
      <span style="padding: 8px 14px; border-radius: 999px; background: $teal; color: $onTeal; font-size: 13.5px; font-weight: 700;">हाँ</span>
    </div>
    $(label 'दुबई की जगहें')
$(arow 'बुर्ज ख़लीफ़ा' 'Burj Khalifa' 'डाउनटाउन')
$(arow 'दुबई मॉल' 'Dubai Mall' 'डाउनटाउन')
$(arow 'ग्लोबल विलेज' 'Global Village' 'मौसमी')
$(arow 'गोल्ड सूक' 'Gold Souk' 'देरा')
$(arow 'दुबई मरीना' 'Dubai Marina' 'मरीना')
  </div>
H
bar jaana
close_screen
} > "$OUT/$1"
}
j1 J1.dc.html
THEME=dark; source "$(dirname "$0")/_chrome.sh"; j1 J1Dark.dc.html; THEME=light; source "$(dirname "$0")/_chrome.sh"

# ---- 2.2 · जाना › विकल्प
opt() { # iconfn title detail time fare highlight
  local bd=$line; [ "$6" = yes ] && bd=$teal
cat <<T
    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: $card; border-radius: 16px; border: 1.5px solid $bd;">
      <span style="width: 44px; height: 44px; border-radius: 12px; background: $tealSoft; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">$($1 24 "$tealText" 1.9)</span>
      <span style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;"><span class="disp" style="font-size: 18px; font-weight: 600; color: $ink;">$2</span><span style="font-size: 12.5px; color: $muted;">$3</span></span>
      <span style="display: flex; flex-direction: column; align-items: flex-end; gap: 1px;"><span class="disp" style="font-size: 18px; font-weight: 700; color: $ink;">$4</span><span style="font-size: 12.5px; font-weight: 600; color: $muted;">$5</span></span>
    </div>
T
}
{
open_screen
strip running set
header metro "$teal" 'जाना' 'बुर्ज ख़लीफ़ा'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 16px; background: $sand;">
      <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 8px; height: 8px; border-radius: 999px; background: $marigold;"></span><span style="font-size: 14px; color: $ink;">Citymax Bur Dubai <span style="color: $muted;">· मेरा होटल</span></span></div>
      <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 8px; height: 8px; border-radius: 999px; background: $teal;"></span><span class="disp" style="font-size: 18px; font-weight: 600; color: $ink;">बुर्ज ख़लीफ़ा</span><span style="font-size: 12.5px; color: $muted;">· 9 किमी</span></div>
    </div>
    $(label 'कैसे जाएँ')
$(opt metro 'मेट्रो' 'लाल लाइन · 1 बार बदलें · 800 मी पैदल' '38 मिनट' 'AED 6' yes)
$(opt bus 'बस' 'C7 फिर 27 · 300 मी पैदल' '55 मिनट' 'AED 5' no)
$(opt taxi 'टैक्सी' 'Careem या सड़क से' '20 मिनट' '≈ AED 35' no)
$(opt walk 'पैदल' 'गर्मी में नहीं' '1 घं 50 मि' 'मुफ़्त' no)
    <span style="font-size: 12.5px; color: $muted; text-align: center; line-height: 1.45; padding-top: 4px;">समय और किराया अंदाज़न। टैक्सी का दाम मीटर तय करता है।</span>
  </div>
H
bar jaana
close_screen
} > "$OUT/J2.dc.html"

# ---- 2.3 · जाना › मेट्रो, क़दम दर क़दम
step() { # iconfn title detail
cat <<T
    <div style="display: flex; gap: 12px;">
      <span style="display: flex; flex-direction: column; align-items: center; gap: 4px;"><span style="width: 36px; height: 36px; border-radius: 999px; background: $tealSoft; display: flex; align-items: center; justify-content: center;">$($1 20 "$tealText" 1.9)</span><span style="width: 2px; flex: 1; background: $line;"></span></span>
      <span style="display: flex; flex-direction: column; gap: 2px; padding-bottom: 14px; flex: 1;"><span style="font-size: 15.5px; font-weight: 600; color: $ink; line-height: 1.3;">$2</span><span style="font-size: 12.5px; color: $muted; line-height: 1.4;">$3</span></span>
    </div>
T
}
{
open_screen
strip running set
header metro "$teal" 'जाना' 'बुर्ज ख़लीफ़ा › मेट्रो'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 6px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 14px; background: $tealSoft;"><span style="font-size: 14px; font-weight: 700; color: $tealText;">38 मिनट · AED 6 · Nol कार्ड चाहिए</span>$(clock 18 "$tealText" 2)</div>
    <div style="display: flex; flex-direction: column; padding-top: 8px;">
$(step walk 'पैदल 500 मी — BurJuman स्टेशन तक' 'होटल से बाएँ, Khalid Bin Al Waleed रोड पर। 7 मिनट।')
$(step metro 'BurJuman से लाल लाइन, Expo की ओर' 'पहली ट्रेन 5:00 · आख़िरी 12:00 · हर 4 मिनट में')
$(step metro 'Burj Khalifa / Dubai Mall स्टेशन पर उतरें' '6 स्टेशन · 14 मिनट')
$(step walk 'पैदल 800 मी — मॉल के अंदर से' 'स्टेशन से ढका हुआ रास्ता, 12 मिनट। बुर्ज ख़लीफ़ा का प्रवेश मॉल के निचले तल पर।')
    </div>
    <span style="font-size: 12.5px; color: $muted; line-height: 1.45;">समय RTA की समय-सारणी से, आम दिनों के। वीकेंड पर अलग हो सकते हैं।</span>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
      $(obtn "$(bus 20 "$ink" 1.9)बस देखें")
      $(obtn "$(taxi 20 "$ink" 1.9)टैक्सी")
    </div>
    <span style="font-size: 11.5px; color: $muted; text-align: center; line-height: 1.4;">Transport data: Roads and Transport Authority (RTA), Dubai — open data.</span>
  </div>
H
bar jaana
close_screen
} > "$OUT/J3.dc.html"

# ---- 2.4 · जाना › टैक्सी (Careem hand-off)
{
open_screen
strip running set
header taxi "$teal" 'जाना' 'बुर्ज ख़लीफ़ा › टैक्सी'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: 18px; background: $card; border: 1px solid $line;">
      <span style="font-size: 12.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: $muted;">यहाँ जाना है</span>
      <span class="disp" style="font-size: 28px; font-weight: 700; color: $ink; line-height: 1.1;">Burj Khalifa</span>
      <span style="font-size: 22px; color: $ink; direction: rtl; text-align: right; font-family: 'Noto Naskh Arabic', serif;">برج خليفة، وسط مدينة دبي</span>
      <span style="font-size: 13px; color: $muted;">1 Sheikh Mohammed bin Rashid Blvd, Downtown Dubai</span>
      <div style="display: flex; align-items: center; gap: 8px; color: $tealText; font-size: 13.5px; font-weight: 700; padding-top: 4px;">$(copy 18 "$tealText" 2)पता कॉपी करें</div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: 14px; background: $sand;"><span style="font-size: 14px; color: $ink;">अंदाज़न किराया</span><span class="disp" style="font-size: 18px; font-weight: 700; color: $ink;">AED 30 – 40</span></div>
    $(btn "$(external 20 "$onMarigold" 2)&nbsp; Careem में खोलें" "$marigold" "$onMarigold")
    <span style="font-size: 12.5px; color: $muted; text-align: center; line-height: 1.45;">Careem नहीं है? <span style="color: $marigoldText; font-weight: 700;">Play Store से लें</span> — होटल के वाई-फ़ाई पर एक बार।</span>
    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 14px; border: 1px dashed $line;">
      <span style="font-size: 13.5px; font-weight: 700; color: $ink;">सड़क से टैक्सी ले रहे हैं?</span>
      <span style="font-size: 12.5px; color: $muted; line-height: 1.45;">ड्राइवर को ऊपर वाला अरबी पता दिखा दें। मीटर चालू करवाएँ — शुरू AED 5 से (दिन में)।</span>
    </div>
  </div>
H
bar jaana
close_screen
} > "$OUT/J4.dc.html"

# ---- 2.5 · जाना › जगह की इजाज़त नहीं
{
open_screen
strip running set
header metro "$teal" 'जाना'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 14px; padding: 24px 16px 12px 16px;">
    <span style="width: 64px; height: 64px; border-radius: 999px; background: $marigoldSoft; display: flex; align-items: center; justify-content: center;">$(pin 32 "$marigold" 1.7)</span>
    <span class="disp" style="font-size: 26px; font-weight: 700; color: $ink; line-height: 1.15;">जगह की इजाज़त नहीं मिली</span>
    <span style="font-size: 15px; line-height: 1.5; color: $ink; text-wrap: pretty;">बिना आपकी जगह के साथी यह नहीं बता सकता कि यहाँ से कैसे जाएँ, या पास में क्या है।</span>
    <div style="display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 14px; background: $sand;">
      <span style="font-size: 13.5px; font-weight: 700; color: $ink;">फिर भी चलेगा</span>
      <span style="font-size: 13.5px; color: $muted; line-height: 1.45;">होटल से रास्ता · जगहों की जानकारी · खाने की सूची · दस्तावेज़</span>
    </div>
    $(btn 'फ़ोन की सेटिंग खोलें' "$marigold" "$onMarigold")
    $(obtn 'होटल से रास्ता देखें')
  </div>
H
bar jaana
close_screen
} > "$OUT/J5.dc.html"

# ---- 2.6 · नक्शा — the way to a place on our own map, offline (decision 035). Reached from a
# kitchen's नक्शा button, so it is drawn inside खाना; the same screen serves any place जाना knows.
mchip() { # iconfn label on|off
  if [ "$3" = on ]; then
    echo "<span style=\"display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border-radius: 999px; background: $tealSoft; border: 1.5px solid $teal; color: $tealText; font-weight: 600; font-size: 15px;\">$($1 18 "$tealText" 1.9)$2</span>"
  else
    echo "<span style=\"display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border-radius: 999px; border: 1.5px solid $line; color: $ink; font-weight: 600; font-size: 15px;\">$($1 18 "$ink" 1.9)$2</span>"
  fi
}
{
open_screen
strip running set
header thali "$k_text" 'खाना' 'Woodlands Restaurant › नक्शा'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; gap: 8px;">$(mchip metro 'मेट्रो' on)$(mchip bus 'बस' off)$(mchip taxi 'टैक्सी' off)</div>
    <div style="display: flex; gap: 14px; font-size: 16px; color: $ink;"><b>4.1 किमी</b><span>21 मिनट</span><span>AED 5</span></div>
    <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: $muted;"><span style="width: 12px; height: 12px; border-radius: 50%; background: #1A2456;"></span>मेरा होटल<span style="width: 12px; height: 12px; border-radius: 50%; background: #B4610F; margin-left: 8px;"></span>Woodlands Restaurant</div>
    <div style="flex: 1; margin: 0 -16px; position: relative; background: #EFEAE0; overflow: hidden;">
      <svg viewBox="0 0 390 360" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display: block;">
        <path d="M-10 250 C 80 200, 140 190, 200 230 S 330 330, 400 300 L 400 380 L -10 380 Z" fill="#9FDCEB"/>
        <g stroke="#FFFFFF" stroke-width="7" fill="none"><path d="M0 120 H390"/><path d="M0 60 L390 140"/><path d="M120 0 V360"/><path d="M260 0 L220 360"/><path d="M40 0 L90 360"/><path d="M330 0 V360"/></g>
        <path d="M300 118 L205 112 L110 220" stroke="#FFFFFF" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M300 118 L205 112 L140 188" stroke="#D7263D" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M140 188 L110 220" stroke="#1E9E5A" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M335 128 L300 118 M110 220 L70 250" stroke="#5B6474" stroke-width="4" stroke-dasharray="4 6" fill="none" stroke-linecap="round"/>
        <circle cx="335" cy="128" r="9" fill="#1A2456" stroke="#FFFFFF" stroke-width="3"/>
        <circle cx="70" cy="250" r="9" fill="#B4610F" stroke="#FFFFFF" stroke-width="3"/>
        <circle cx="300" cy="118" r="5" fill="#FFFFFF" stroke="#1A2456" stroke-width="3"/>
        <circle cx="140" cy="188" r="5" fill="#FFFFFF" stroke="#1A2456" stroke-width="3"/>
        <circle cx="110" cy="220" r="5" fill="#FFFFFF" stroke="#1A2456" stroke-width="3"/>
        <text x="150" y="98" font-size="12" fill="#6B7280" font-family="sans-serif">AL RIGGA</text>
        <text x="30" y="300" font-size="12" fill="#6B7280" font-family="sans-serif">AL HAMRIYA</text>
      </svg>
      <span style="position: absolute; right: 8px; bottom: 8px; font-size: 11px; background: rgba(255,255,255,0.85); padding: 2px 8px; border-radius: 8px; color: $ink;">RTA | © OpenStreetMap</span>
    </div>
    $(btn "$(signpost 20 "$j_fg" 1.9)&nbsp; क़दम दर क़दम" "$j_bg" "$j_fg")
  </div>
H
bar khaana
close_screen
} > "$OUT/J6.dc.html"
