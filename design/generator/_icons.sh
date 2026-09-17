# stroke icons on a 24 grid; $1 = size, $2 = colour, $3 = stroke width
ic() { echo "<svg width=\"$1\" height=\"$1\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"$2\" stroke-width=\"$3\" stroke-linecap=\"round\" stroke-linejoin=\"round\">"; }
thali()   { ic "$1" "$2" "$3"; echo '<circle cx="12" cy="12" r="9.5"></circle><circle cx="8.6" cy="9.2" r="2.1"></circle><circle cx="15.4" cy="9.2" r="2.1"></circle><circle cx="12" cy="15.3" r="2.1"></circle><path d="M12 2.5v1.6"></path></svg>'; }
metro()   { ic "$1" "$2" "$3"; echo '<rect x="5" y="3" width="14" height="15.5" rx="3.2"></rect><path d="M7.6 6.6h8.8v4.6H7.6z"></path><circle cx="8.6" cy="14.6" r="0.9" fill="'"$2"'" stroke="none"></circle><circle cx="15.4" cy="14.6" r="0.9" fill="'"$2"'" stroke="none"></circle><path d="M8.2 18.5 6.8 21.5"></path><path d="M15.8 18.5l1.4 3"></path><path d="M4.5 21.5h15"></path></svg>'; }
lantern() { ic "$1" "$2" "$3"; echo '<path d="M12 2v1.8"></path><path d="M8.6 3.8h6.8"></path><path d="M8.8 6.2h6.4l1.6 10.6a1.4 1.4 0 0 1-1.4 1.6H8.6a1.4 1.4 0 0 1-1.4-1.6z"></path><path d="M12 6.2v12.2"></path><path d="M9.7 6.2l-1 12.2"></path><path d="M14.3 6.2l1 12.2"></path><path d="M10.4 21.5h3.2"></path><path d="M12 18.4v3.1"></path></svg>'; }
docs()    { ic "$1" "$2" "$3"; echo '<path d="M6 3.5h7.5L18.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z"></path><path d="M13.5 3.5v5h5"></path><path d="M8 12.5h8"></path><path d="M8 16h5"></path></svg>'; }
pin()     { ic "$1" "$2" "$3"; echo '<path d="M12 21.5s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"></path><circle cx="12" cy="10.5" r="2.4"></circle></svg>'; }
wifioff() { ic "$1" "$2" "$3"; echo '<path d="M3 3l18 18"></path><path d="M5 10.5a11.5 11.5 0 0 1 4.6-2.7"></path><path d="M12.8 5.2A11.5 11.5 0 0 1 19 10.5"></path><path d="M8.5 14a6.5 6.5 0 0 1 2.4-1.5"></path><path d="M13.6 12.6a6.5 6.5 0 0 1 1.9 1.4"></path><circle cx="12" cy="18" r="1" fill="'"$2"'" stroke="none"></circle></svg>'; }
wifi()    { ic "$1" "$2" "$3"; echo '<path d="M5 10.5a11.5 11.5 0 0 1 14 0"></path><path d="M8.5 14a6.5 6.5 0 0 1 7 0"></path><circle cx="12" cy="18" r="1" fill="'"$2"'" stroke="none"></circle></svg>'; }
chev()    { ic "$1" "$2" "$3"; echo '<path d="M9 5l7 7-7 7"></path></svg>'; }
search()  { ic "$1" "$2" "$3"; echo '<circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path></svg>'; }
back()    { ic "$1" "$2" "$3"; echo '<path d="M15 5l-7 7 7 7"></path></svg>'; }
plus()    { ic "$1" "$2" "$3"; echo '<path d="M12 5v14"></path><path d="M5 12h14"></path></svg>'; }
logo() { cat <<L
<svg width="$(( $1 * 320 / 388 ))" height="$1" viewBox="96 60 320 388"><defs><linearGradient id="pin$1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF9100"></stop><stop offset="60%" stop-color="#E65100"></stop><stop offset="100%" stop-color="#BF360C"></stop></linearGradient></defs><path d="M 256 60 C 160 60, 96 132, 96 226 C 96 324, 230 424, 256 448 C 282 424, 416 324, 416 226 C 416 132, 352 60, 256 60 Z" fill="url(#pin$1)"></path><path d="M 315 150 C 230 140, 180 180, 180 225 C 180 260, 215 275, 256 280 C 210 270, 210 215, 265 200 C 305 190, 325 170, 315 150 Z" fill="#FFFDF9"></path><path d="M 197 342 C 282 352, 332 312, 332 267 C 332 232, 297 217, 256 212 C 302 222, 302 277, 247 292 C 207 302, 187 322, 197 342 Z" fill="#FFFDF9"></path><circle cx="285" cy="175" r="9" fill="#FFFDF9"></circle></svg>
L
}
# the wordmark: $1 = font size in px, $2 = ink, $3 = the trail's colour. One word, one capital,
# never translated (decision 021); the flight trail's box is pinned to the word's right edge and
# measured in ems, so one shape serves the 22px strip and the 40px landing page.
wordmark() { cat <<W
<span class="wm" style="font-size: ${1}px; color: $2;">Dubaisaathi<svg viewBox="0 -4 340 76"><path d="M4 66C92 63 172 55 268 28" fill="none" stroke="$3" stroke-width="6" stroke-linecap="round"></path><path transform="translate(300 18) rotate(72) scale(1.5) translate(-12 -12)" fill="$3" d="M12 1.4c1.06 0 1.92.94 1.92 2.1v5.62l8.08 4.98v2.1l-8.08-2.48v4.56l2.16 1.6v1.52L12 20.6l-4.08.8v-1.52l2.16-1.6v-4.56L2 16.2v-2.1l8.08-4.98V3.5c0-1.16.86-2.1 1.92-2.1z"></path></svg></span>
W
}
# pointed arch, used as a faint motif on cards
arch() { echo "<svg width=\"$1\" height=\"$1\" viewBox=\"0 0 40 40\" fill=\"none\" stroke=\"$2\" stroke-width=\"0.9\"><path d=\"M4 40V17C4 7 11 2 20 2s16 5 16 15v23\"></path><path d=\"M9 40V18c0-7 5-10 11-10s11 3 11 10v22\"></path></svg>"; }
sun()     { ic "$1" "$2" "$3"; echo '<circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"></path></svg>'; }
moon()    { ic "$1" "$2" "$3"; echo '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"></path></svg>'; }
phone()   { ic "$1" "$2" "$3"; echo '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"></path></svg>'; }
camera()  { ic "$1" "$2" "$3"; echo '<path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4z"></path><circle cx="12" cy="13.5" r="3.2"></circle></svg>'; }
copy()    { ic "$1" "$2" "$3"; echo '<rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"></path></svg>'; }
external(){ ic "$1" "$2" "$3"; echo '<path d="M14 4h6v6"></path><path d="M20 4l-9 9"></path><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"></path></svg>'; }
walk()    { ic "$1" "$2" "$3"; echo '<circle cx="13" cy="4" r="1.8"></circle><path d="M10 21l2.2-6.2 2.8 2.7V21"></path><path d="M8 13.5l2.5-4.5 3 1 2.5 3.5 2.5 1"></path><path d="M10.5 9l-3 4L5 12"></path></svg>'; }
bus()     { ic "$1" "$2" "$3"; echo '<rect x="4" y="4" width="16" height="14" rx="3"></rect><path d="M4 11h16"></path><circle cx="8" cy="14.5" r="1" fill="'"$2"'" stroke="none"></circle><circle cx="16" cy="14.5" r="1" fill="'"$2"'" stroke="none"></circle><path d="M7 18v2.5M17 18v2.5"></path></svg>'; }
taxi()    { ic "$1" "$2" "$3"; echo '<path d="M5 12l1.6-4.2A2 2 0 0 1 8.5 6.5h7a2 2 0 0 1 1.9 1.3L19 12"></path><path d="M3.5 12h17v5.5h-2.5a1.5 1.5 0 0 1-3 0h-6a1.5 1.5 0 0 1-3 0H3.5z"></path><path d="M10 6.5V4.5h4v2"></path></svg>'; }
tram()    { ic "$1" "$2" "$3"; echo '<rect x="5" y="6" width="14" height="12" rx="3"></rect><path d="M5 12h14"></path><path d="M9 3l3 3 3-3"></path><path d="M8 18l-1.5 3M16 18l1.5 3"></path></svg>'; }
clock()   { ic "$1" "$2" "$3"; echo '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path></svg>'; }
ticket()  { ic "$1" "$2" "$3"; echo '<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"></path><path d="M14 6v12"></path></svg>'; }
trash()   { ic "$1" "$2" "$3"; echo '<path d="M4.5 7h15"></path><path d="M9 7V4.5h6V7"></path><path d="M6.5 7l1 13h9l1-13"></path></svg>'; }
share()   { ic "$1" "$2" "$3"; echo '<path d="M12 3v12"></path><path d="M8 7l4-4 4 4"></path><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"></path></svg>'; }
qr()      { ic "$1" "$2" "$3"; echo '<rect x="4" y="4" width="6" height="6"></rect><rect x="14" y="4" width="6" height="6"></rect><rect x="4" y="14" width="6" height="6"></rect><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2"></path></svg>'; }
check()   { ic "$1" "$2" "$3"; echo '<path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>'; }
