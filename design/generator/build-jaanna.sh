#!/bin/bash
source "$(dirname "$0")/_chrome.sh"
chip() { if [ "$2" = on ]; then echo "<span style=\"padding: 7px 12px; border-radius: 999px; background: $n_text; color: $n_fg; font-size: 13px; font-weight: 700; white-space: nowrap;\">$1</span>"; else echo "<span style=\"padding: 7px 12px; border-radius: 999px; border: 1.5px solid $line; color: $ink; font-size: 13px; font-weight: 600; white-space: nowrap;\">$1</span>"; fi; }
card() { # hi en kind hours ticket
cat <<T
    <div style="display: flex; gap: 12px; padding: 12px; background: $card; border-radius: 16px; border: 1px solid $line;">
      <span style="width: 84px; height: 84px; border-radius: 12px; background: $sand; flex-shrink: 0;"></span>
      <span style="display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0;">
        <span class="disp" style="font-size: 19px; font-weight: 600; color: $ink; line-height: 1.2;">$1</span>
        <span style="font-size: 12.5px; color: $muted;">$2 · $3</span>
        <span style="display: flex; gap: 10px; margin-top: 4px; font-size: 12.5px; color: $ink;"><span style="display: flex; align-items: center; gap: 4px;">$(clock 14 "$muted" 2)$4</span><span style="display: flex; align-items: center; gap: 4px;">$(ticket 14 "$muted" 2)$5</span></span>
      </span>
    </div>
T
}
tabs() { # which is on: places | travel
  local a b
  if [ "$1" = places ]; then a="background: $n_text; color: $n_fg; font-weight: 700;"; b="color: $ink; font-weight: 600;"; else a="color: $ink; font-weight: 600;"; b="background: $n_text; color: $n_fg; font-weight: 700;"; fi
  echo "<div style=\"display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: $sand; flex-shrink: 0;\"><span style=\"flex: 1; text-align: center; padding: 11px 0; border-radius: 10px; font-size: 14.5px; $a\">जगहें</span><span style=\"flex: 1; text-align: center; padding: 11px 0; border-radius: 10px; font-size: 14.5px; $b\">सफ़र</span></div>"
}
# ---- 3.1 · जानना › जगहें
{
open_screen
strip running set
header lantern "$n_text" 'जानना'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    $(tabs places)
    <div style="display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 54px; border-radius: 16px; background: $card; border: 1.5px solid $line;">
      $(search 20 "$muted" 2)
      <span style="flex: 1; font-size: 17px; color: $muted;">जगह खोजें</span>
    </div>
    <div style="display: flex; gap: 8px; overflow: hidden; flex-shrink: 0;">$(chip 'सब' on)$(chip 'लैंडमार्क' off)$(chip 'मॉल' off)$(chip 'सूक' off)$(chip 'बीच' off)$(chip 'पार्क' off)</div>
$(card 'बुर्ज ख़लीफ़ा' 'Burj Khalifa' 'डाउनटाउन' '9:00 – 23:00' 'AED 169 से')
$(card 'दुबई मॉल' 'Dubai Mall' 'डाउनटाउन' '10:00 – 24:00' 'मुफ़्त')
$(card 'ग्लोबल विलेज' 'Global Village' 'अक्टूबर – अप्रैल' '16:00 – 24:00' 'AED 25')
$(card 'गोल्ड सूक' 'Gold Souk' 'देरा' '10:00 – 22:00' 'मुफ़्त')
  </div>
H
bar jaanna
close_screen
} > "$OUT/N1.dc.html"

# ---- 3.2 · जानना › जगह
fact() { echo "<div style=\"display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 12px; background: $card; border: 1px solid $line;\"><span style=\"font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: $muted;\">$1</span><span style=\"font-size: 14.5px; font-weight: 600; color: $ink; line-height: 1.3;\">$2</span></div>"; }
{
open_screen
strip running set
header lantern "$n_text" 'जानना' 'बुर्ज ख़लीफ़ा'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <span class="disp" style="font-size: 28px; font-weight: 700; color: $ink; line-height: 1.1;">बुर्ज ख़लीफ़ा</span>
      <span style="font-size: 13.5px; color: $muted; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;"><span style="padding: 2px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 700; background: $n_soft; color: $n_text;">लैंडमार्क</span>Burj Khalifa · होटल से 9 किमी</span>
    </div>
    <span style="font-size: 15px; line-height: 1.5; color: $ink; text-wrap: pretty;">दुनिया की सबसे ऊँची इमारत, 828 मीटर। 124वीं और 148वीं मंज़िल से शहर दिखता है। सूर्यास्त का समय सबसे भरा रहता है — टिकट पहले लें, वहाँ लाइन लंबी होती है।</span>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">
      $(fact 'समय' '9:00 – 23:00, रोज़')
      $(fact 'टिकट' 'AED 169 से · बच्चे AED 134')
      $(fact 'फ़ोन' '+971 4 888 8888')
      $(fact 'कितना समय लगेगा' '1.5 – 2 घंटे')
      $(fact 'वेबसाइट' 'burjkhalifa.ae ↗')
    </div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 2px;">
      $(obtn "$(phone 20 "$ink" 1.9)फ़ोन करें")
      $(btn "$(metro 20 "$j_fg" 1.9)&nbsp; जाना" "$j_bg" "$j_fg")
    </div>
  </div>
H
bar jaanna
close_screen
} > "$OUT/N2.dc.html"


# ---- 3.3 · जानना › सफ़र — a tab of topics (decision 037)
{
open_screen
strip running set
header lantern "$n_text" 'जानना'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 12px 16px;">
    $(tabs travel)
    <div style="display: flex; align-items: center; gap: 12px; padding: 14px; background: $card; border-radius: 16px; border: 1px solid $line;">
      <span style="width: 48px; height: 48px; border-radius: 12px; background: $sand; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">$(metro 26 "$n_text" 1.7)</span>
      <span style="display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0;">
        <span class="disp" style="font-size: 19px; font-weight: 600; color: $ink;">Nol कार्ड</span>
        <span style="font-size: 12.5px; color: $muted; line-height: 1.35;">सिल्वर, गोल्ड, लाल टिकट और पास — कौन-सा लें, कितने का</span>
      </span>
      $(chev 18 "$muted" 2)
    </div>
  </div>
H
bar jaanna
close_screen
} > "$OUT/N3.dc.html"

# ---- 3.4 · जानना › सफ़र › Nol कार्ड
row() { echo "<tr><th style=\"text-align: left; padding: 7px 4px; border-bottom: 1px solid $line; font-weight: 600;\">$1</th><td style=\"text-align: right; padding: 7px 4px; border-bottom: 1px solid $line;\">$2</td><td style=\"text-align: right; padding: 7px 4px; border-bottom: 1px solid $line;\">$3</td><td style=\"text-align: right; padding: 7px 4px; border-bottom: 1px solid $line;\">$4</td></tr>"; }
{
open_screen
strip running set
header lantern "$n_text" 'जानना' 'Nol कार्ड'
cat <<H
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 6px 16px 12px 16px;">
    <span style="font-size: 14px; line-height: 1.45; color: $ink;">मेट्रो, ट्राम और बस का किराया Nol कार्ड या लाल टिकट से कटता है। किराया ज़ोन से तय होता है, दूरी से नहीं।</span>
    <span style="font-size: 16px; font-weight: 700; color: $ink;">कौन-सा लें</span>
    <div style="display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; background: $card; border-radius: 12px; border: 1px solid $line; font-size: 13px; line-height: 1.4; color: $ink;"><b>सिल्वर कार्ड</b>सबके लिए — किसी भी मेट्रो स्टेशन पर, रिचार्ज करते रहें।</div>
    <div style="display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; background: $card; border-radius: 12px; border: 1px solid $line; font-size: 13px; line-height: 1.4; color: $ink;"><b>लाल टिकट</b>दो-चार सफ़र के लिए काग़ज़ का टिकट। बनवाने के AED 2, फिर हर सफ़र का किराया।</div>
    <span style="font-size: 16px; font-weight: 700; color: $ink;">एक सफ़र</span>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: $ink;">
      <tr><th></th><th style="text-align: right; font-size: 11.5px; color: $muted; padding: 4px;">1 ज़ोन</th><th style="text-align: right; font-size: 11.5px; color: $muted; padding: 4px;">2 ज़ोन</th><th style="text-align: right; font-size: 11.5px; color: $muted; padding: 4px;">3 या ज़्यादा</th></tr>
      $(row 'सिल्वर कार्ड' 'AED 3' 'AED 5' 'AED 7.5')
      $(row 'गोल्ड कार्ड' 'AED 6' 'AED 10' 'AED 15')
      $(row 'लाल टिकट' 'AED 4' 'AED 6' 'AED 8.5')
    </table>
    <span style="font-size: 12px; color: $muted;">दो ज़ोन का सफ़र अगर 3 किमी से छोटा हो, तो एक ज़ोन गिना जाता है।</span>
    <span style="font-size: 16px; font-weight: 700; color: $ink;">एक दिन का टिकट</span>
    <span style="font-size: 13.5px; color: $ink;">पूरे दिन हर ज़ोन में जितना चाहें: AED 20, गोल्ड क्लास में AED 40।</span>
  </div>
H
bar jaanna
close_screen
} > "$OUT/N4.dc.html"
