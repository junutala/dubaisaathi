# Generates the Dubai Saathi screen artboards as .dc.html working files.
import json, os, pathlib, re
from string import Template

OUT = pathlib.Path('/home/user/dubaisaathi/design/screens')
OUT.mkdir(parents=True, exist_ok=True)

C = dict(
    ink='#141826', indigo='#1A2456', indigoDeep='#0F1530',
    marigold='#E8871E', marigoldSoft='#FDF0DC', marigoldLine='#F2C795',
    teal='#0B7A6B', tealSoft='#E1F2EF',
    red='#C62B2B', redSoft='#FBE7E4',
    sand='#F7F3EC', card='#FFFDF9', line='#E6DED2', muted='#5B6070',
    # Marigold as a fill takes ink text; marigold as text or an icon ON a light ground
    # needs the darker tone to clear 4.5:1. Same brand hue, two jobs.
    marigoldText='#9A5B10',
    chev='#8A8F9E',   # disclosure arrows are a UI graphic, so 3:1 not 1.3:1
    onMarigold='#231403',  # the only text colour that goes on a marigold fill
    warmText='#7A4A0C', warmTextDim='#9A5B10',   # text on marigoldSoft
    tealText='#0A5F54', tealLine='#BFE3DD',      # text and border on tealSoft
    mapLand='#F4EFE4', mapBlock='#EFE8DB', mapRoad='#E9E1D4', mapWater='#CFE4E0',
)

# Night palette. Same roles, same rules — marigold still means "press here", red still means
# emergency only. Travellers use this in taxis after dark and on OLED phones where a dark UI
# is genuinely cheaper on battery, so it is a first-class theme, not a filter over the light one.
DARK = dict(
    ink='#F1EDE6', indigo='#8E9BD9', indigoDeep='#0B0D14',
    marigold='#F0913A', marigoldSoft='#3A2A14', marigoldLine='#6E4A1C',
    marigoldText='#F2AC5C', onMarigold='#1C1206', warmText='#F0C48C',
    warmTextDim='#D9A468',
    teal='#3FC0A9', tealSoft='#0E2A27', tealText='#8FE0CF', tealLine='#1E4A44',
    red='#E24B3C', redSoft='#371713',
    sand='#14161F', card='#1D202C', line='#2D3242', muted='#9AA1B3', chev='#7B8397',
    mapLand='#1A1D28', mapBlock='#232736', mapRoad='#2C3143', mapWater='#16302F',
)
if os.environ.get('SAATHI_THEME') == 'dark':
    C.update(DARK)
    THEME_SUFFIX, THEME_ONLY = 'Dark', {'Main', 'Emergency', 'FoodList'}
else:
    THEME_SUFFIX, THEME_ONLY = '', None

FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Anek+Devanagari:wght@500;600;700&family=Mukta:wght@400;500;600;700'
         '&family=Noto+Naskh+Arabic:wght@400;700&display=swap">')

CSS_TMPL = '''
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: 'Mukta', 'Segoe UI', system-ui, sans-serif;
         -webkit-font-smoothing: antialiased; }
  a { color: #B96A12; text-decoration: none; }
  a:hover { color: #8F5009; }
  .screen { width: 390px; height: 844px; background: $sand; color: $ink;
            display: flex; flex-direction: column; overflow: hidden; }
  .flow { flex: 1; display: flex; flex-direction: column; gap: 14px;
          padding: 0 20px; overflow: hidden; }
  .hdr { display: flex; align-items: center; gap: 12px; padding: 20px 20px 10px; }
  .t1 { font-family: 'Anek Devanagari', 'Mukta', sans-serif; font-weight: 600;
        font-size: 26px; line-height: 1.15; margin: 0; letter-spacing: -0.01em; }
  .t2 { font-family: 'Anek Devanagari', 'Mukta', sans-serif; font-weight: 600;
        font-size: 19px; line-height: 1.2; margin: 0; }
  .lbl { font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
         text-transform: uppercase; color: $muted; margin: 0; }
  .muted { color: $muted; }
  .card { background: $card; border: 1px solid $line; border-radius: 16px; }
  .row { display: flex; align-items: center; gap: 12px; }
  .col { display: flex; flex-direction: column; }
  .btn { min-height: 54px; border-radius: 14px; display: flex; align-items: center;
         justify-content: center; gap: 10px; font-weight: 600; font-size: 17px;
         font-family: 'Mukta', sans-serif; }
  .chip { height: 48px; padding: 0 16px; border-radius: 24px; display: flex;
          align-items: center; gap: 6px; font-size: 15px; font-weight: 500;
          white-space: nowrap; }
  .ar { font-family: 'Noto Naskh Arabic', 'Mukta', serif; direction: rtl;
        line-height: 1.6; }
  .tab { display: flex; flex-direction: column; align-items: center; gap: 4px;
         font-size: 12px; font-weight: 600; color: $muted; min-height: 48px;
         justify-content: center; }

  /* Motion is transform/opacity only: GPU-composited, a few hundred bytes of CSS, and no
     asset to download. Anything heavier than this does not belong in an offline app. */
  @keyframes rise { from { opacity: 0; transform: translate3d(0, 18px, 0); }
                    to   { opacity: 1; transform: none; } }
  @keyframes glow { 0%, 100% { opacity: 0.5; transform: scale(1); }
                    50%      { opacity: 0.9; transform: scale(1.06); } }
  @keyframes skyline { from { opacity: 0; transform: translate3d(0, 40px, 0); }
                       to   { opacity: 1; transform: none; } }
  .rise { animation: rise 900ms cubic-bezier(0.16, 0.84, 0.28, 1) both; }
  .d1 { animation-delay: 80ms; }  .d2 { animation-delay: 220ms; }
  .d3 { animation-delay: 360ms; } .d4 { animation-delay: 500ms; }
  .d5 { animation-delay: 660ms; }
  .glow { animation: glow 5.5s ease-in-out 1.2s infinite; }
  .skyline { animation: skyline 1400ms cubic-bezier(0.16, 0.84, 0.28, 1) 160ms both; }
  @keyframes drift { 0%, 100% { translate: 0 0; } 50% { translate: 0 -11px; } }
  .drift { animation-name: drift; animation-timing-function: ease-in-out;
           animation-iteration-count: infinite; }
  @media (prefers-reduced-motion: reduce) {
    .rise, .glow, .skyline, .drift { animation: none; opacity: 1; transform: none; }
  }
'''

CSS = Template(CSS_TMPL).safe_substitute(C)

DOC = Template('''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  $fonts
  <style>$css</style>
</helmet>
$body
</x-dc>
</body>
</html>
''')


def write(name, body):
    if THEME_ONLY is not None and name not in THEME_ONLY:
        return
    name += THEME_SUFFIX
    if name.replace('Dark', '') not in ('Welcome', 'Brand'):
        body = re.sub(r'(<div class="screen"[^>]*>)', lambda m: m.group(1) + strip(), body, 1)
    (OUT / (name + '.dc.html')).write_text(
        DOC.substitute(fonts=FONTS, css=CSS, body=body), encoding='utf-8')


def svg(paths, size=24, sw='1.7', color='currentColor'):
    return ('<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" '
            'stroke="%s" stroke-width="%s" stroke-linecap="round" '
            'stroke-linejoin="round">%s</svg>' % (size, size, color, sw, paths))


I = dict(
    mic='<path d="M12 4.5a2.8 2.8 0 0 1 2.8 2.8v4a2.8 2.8 0 0 1-5.6 0v-4A2.8 2.8 0 0 1 12 4.5Z"/><path d="M5.8 11.4a6.2 6.2 0 0 0 12.4 0"/><path d="M12 17.8v2.7"/>',
    home='<path d="M4 10.6 12 4.2l8 6.4"/><path d="M6.2 9.8v9.9h11.6V9.8"/>',
    route='<path d="M7 20v-7.8A4.2 4.2 0 0 1 11.2 8H17"/><path d="M14 4.8 17.4 8 14 11.2"/>',
    food='<path d="M4 11.2h16"/><path d="M5.2 11.2a6.8 6.8 0 0 0 13.6 0"/><path d="M12 4.2c1.5 1 1.5 2.5 0 3.5"/>',
    talk='<path d="M20 12.2c0 3.4-3.6 6.2-8 6.2a9.9 9.9 0 0 1-2.5-.3L5.2 19.8l1-3A6 6 0 0 1 4 12.2C4 8.8 7.6 6 12 6s8 2.8 8 6.2Z"/>',
    help='<path d="M12 4.2 5.2 6.7v5.4c0 3.5 2.8 6.2 6.8 7.7 4-1.5 6.8-4.2 6.8-7.7V6.7L12 4.2Z"/><path d="M12 9.4v5"/><path d="M9.5 11.9h5"/>',
    speak='<path d="M5 10v4h3l4 3.4V6.6L8 10H5Z"/><path d="M15.4 9.6a3.4 3.4 0 0 1 0 4.8"/><path d="M17.9 7.2a6.8 6.8 0 0 1 0 9.6"/>',
    metro='<rect x="6.2" y="4.2" width="11.6" height="11.6" rx="3"/><path d="M6.2 11h11.6"/><path d="M9.2 19.8 10.6 17"/><path d="M14.8 19.8 13.4 17"/>',
    bus='<rect x="5.2" y="5" width="13.6" height="10.8" rx="2.6"/><path d="M5.2 11h13.6"/><path d="M8.2 19.4v-2.4"/><path d="M15.8 19.4v-2.4"/>',
    taxi='<path d="M4 15.4h16"/><path d="M5.8 15.4v-3.6l1.7-3.9h9l1.7 3.9v3.6"/><path d="M7.8 18.6v-3.2"/><path d="M16.2 18.6v-3.2"/><path d="M9.8 7.9V6.2h4.4v1.7"/>',
    walk='<circle cx="12.8" cy="5.2" r="1.7"/><path d="M12.8 8.4 10.4 12.6l2.1 1.5.9 5.5"/><path d="M10.4 12.6 7.8 16.2"/><path d="M12.8 8.4l3 3 2.4.6"/>',
    clock='<circle cx="12" cy="12" r="7.8"/><path d="M12 7.8v4.5l3 1.8"/>',
    phone='<path d="M6.6 4.6h3.2l1.5 3.9-2.1 1.5a9.2 9.2 0 0 0 4.8 4.8l1.5-2.1 3.9 1.5v3.2c0 1-.9 1.8-1.9 1.7C11.2 18.9 5.1 12.8 4.9 6.5 4.8 5.5 5.6 4.6 6.6 4.6Z"/>',
    pin='<path d="M12 20.2s6.2-5.4 6.2-9.7a6.2 6.2 0 0 0-12.4 0c0 4.3 6.2 9.7 6.2 9.7Z"/><circle cx="12" cy="10.5" r="2.2"/>',
    download='<path d="M12 4.2v10"/><path d="M8 10.4 12 14.4l4-4"/><path d="M5 19.2h14"/>',
    check='<path d="M5.2 12.6 9.6 17 18.8 7.2"/>',
    wifioff='<path d="M4 8.4a12.6 12.6 0 0 1 5.6-2.3"/><path d="M14.8 6.3A12.6 12.6 0 0 1 20 8.4"/><path d="M7.2 11.9a8.8 8.8 0 0 1 2.6-1.5"/><path d="M16.8 11.9a8.8 8.8 0 0 0-1.8-1.1"/><path d="M11.9 17.6h.1"/><path d="M4.2 4.2l15.6 15.6"/>',
    left='<path d="M14.4 5.8 8.6 12l5.8 6.2"/>',
    right='<path d="M9.6 5.8 15.4 12l-5.8 6.2"/>',
    plus='<path d="M12 6.2v11.6"/><path d="M6.2 12h11.6"/>',
    close='<path d="M6.4 6.4 17.6 17.6"/><path d="M17.6 6.4 6.4 17.6"/>',
    pencil='<path d="M5 19.2h3.2l9-9-3.2-3.2-9 9v3.2Z"/><path d="M13.8 6.2 17 9.4"/>',
    user='<circle cx="12" cy="8.6" r="2.9"/><path d="M5.8 19.4a6.2 6.2 0 0 1 12.4 0"/>',
    rupee='<path d="M7.2 5h9.6"/><path d="M7.2 9.2h9.6"/><path d="M14.6 5c0 3-2 4.2-5 4.2h-1l6.6 9.8"/>',
    info='<rect x="3.5" y="5.5" width="17" height="13" rx="2.6"/><circle cx="8.6" cy="10.6" r="1.9"/><path d="M5.8 15.6c.6-1.4 1.6-2.1 2.8-2.1s2.2.7 2.8 2.1"/><path d="M13.6 9.6h4.2"/><path d="M13.6 13.2h4.2"/>',
    moon='<path d="M19.2 14.6A7.6 7.6 0 0 1 9.4 4.8a7.6 7.6 0 1 0 9.8 9.8Z"/>',
    camera='<path d="M4.2 8.6a1.8 1.8 0 0 1 1.8-1.8h2.2l1.3-2h5l1.3 2H18a1.8 1.8 0 0 1 1.8 1.8v8.2a1.8 1.8 0 0 1-1.8 1.8H6a1.8 1.8 0 0 1-1.8-1.8V8.6Z"/><circle cx="12" cy="12.6" r="3.2"/>',
    doc='<path d="M7 3.8h6.6L18 8.2v10.4a1.6 1.6 0 0 1-1.6 1.6H7a1.6 1.6 0 0 1-1.6-1.6V5.4A1.6 1.6 0 0 1 7 3.8Z"/><path d="M13.4 3.8v4.6H18"/><path d="M8.6 12.4h6.8"/><path d="M8.6 15.6h6.8"/>',
    wifi='<path d="M4 8.8a12.6 12.6 0 0 1 16 0"/><path d="M7.2 12.2a8.8 8.8 0 0 1 9.6 0"/><path d="M10.2 15.4a4.4 4.4 0 0 1 3.6 0"/><path d="M11.9 18h.2"/>',
)


# The four things the app does. Home shows them as tiles; once the traveller picks one, the
# other three drop to the bottom bar so switching is one tap. No mic in the bar: on a map or
# the help screen a spoken word has no single meaning, and a guess is worse than no mic.
# Speech is offered exactly where it means one thing — 1.1, the search on 2.1, and 3.1.
FUNCS = [
    ('transport', 'रास्ता', 'route'),
    ('food', 'खाना', 'food'),
    ('talk', 'बोलना', 'talk'),
    ('info', 'ज़रूरी जानकारी', 'info'),
]
FUNC_BLURB = {
    'transport': 'कहाँ जाना है?',
    'food': 'वेज · जैन · आस-पास',
    'talk': 'हिंदी बोलिए, अरबी दिखाइए',
    'info': 'होटल · दस्तावेज़ · कॉन्सुलेट',
}


# A glowing gradient border, Framer-style: an outer div carries the gradient and the bloom,
# an inner div carries the surface. No pseudo-elements, so it survives being edited on the
# canvas, and no asset — a box-shadow costs nothing to download. Used ONLY on the live or
# selected thing: a large blur on many elements at once is real GPU work on a cheap phone.
GLOW = dict(
    action=('linear-gradient(140deg, #FBD9A4, #E8871E 42%, #B4610F)',
            '0 0 0 1px rgba(232, 135, 30, 0.20), 0 10px 30px rgba(232, 135, 30, 0.30), '
            '0 0 46px rgba(232, 135, 30, 0.22)'),
    live=('linear-gradient(140deg, #9FB4FF, #5B78F0 45%, #2B3A96)',
          '0 0 0 1px rgba(124, 155, 255, 0.35), 0 0 34px rgba(91, 120, 240, 0.45), '
          '0 0 76px rgba(91, 120, 240, 0.28)'),
    calm=('linear-gradient(140deg, #A8DED4, #0B7A6B 50%, #075E52)',
          '0 0 0 1px rgba(11, 122, 107, 0.18), 0 8px 24px rgba(11, 122, 107, 0.22)'),
)


def glow(inner, tone='action', radius=20, surface=None, pad='1.5px'):
    grad, bloom = GLOW[tone]
    return ('<div style="border-radius: %dpx; padding: %s; background: %s; '
            'box-shadow: %s">'
            '<div style="border-radius: %.1fpx; background: %s; overflow: hidden">%s</div>'
            '</div>' % (radius, pad, grad, bloom, radius - 1.5,
                        surface or C['card'], inner))


def quickbar(current):
    slots = [('घर', 'home', False)]
    slots += [(label, icon, False) for key, label, icon in FUNCS if key != current]
    cells = []
    for label, icon, danger in slots:
        col = C['red'] if danger else C['muted']
        cells.append(
            '<div class="tab" style="min-height: 48px; color: %s" data-tap="nav">%s'
            '<span style="color: %s">%s</span></div>'
            % (col, svg(I[icon], 23, '1.7'), C['muted'], label))
    return ('<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); '
            'border-top: 1px solid %s; background: %s; padding: 9px 6px 14px">'
            '%s</div>' % (C['line'], C['card'], ''.join(cells)))


# One header for every screen that is not home. It answers the three questions a traveller
# has on arriving anywhere: which of the four tiles am I in, what is this screen, and how do
# I get out. Nothing here is decoration — the trail is the only thing telling someone who
# opened the mic from खाना that they are still in खाना.
TILE_LABEL = {'transport': 'रास्ता', 'food': 'खाना', 'talk': 'बोलना', 'info': 'ज़रूरी जानकारी',
              'home': 'घर'}
TILE_ICON = {'transport': 'route', 'food': 'food', 'talk': 'talk', 'info': 'info',
             'home': 'home'}


# The status strip. One component, the very top of every screen after the landing page:
# online/offline on the left, the plan validity in the middle (tap opens घर.1), and the
# theme switch on the right. Four states for the middle — before Dubai, trial, pass, expired.
STRIP_STATES = {
    'before': ('दुबई पहुँचने पर 24 घंटे मुफ़्त', 0, 'muted'),
    'trial': ('18 घंटे बाकी', 76, 'marigold'),
    'pass': ('5 दिन बाकी', 71, 'teal'),
    'expired': ('पास ख़त्म · फिर से लें', 0, 'muted'),
}


def strip(state='trial', online=False):
    label, pct, tone = STRIP_STATES[state]
    fill = C[tone] if tone != 'muted' else C['line']
    if online:
        net = ('<div class="row" style="gap: 5px; color: %s">%s'
               '<span style="font-size: 13px; font-weight: 700">ऑनलाइन</span></div>'
               % (C['muted'], svg(I['wifi'], 16, '2.1', C['muted'])))
    else:
        net = ('<div class="row" style="gap: 5px; color: %s">%s'
               '<span style="font-size: 13px; font-weight: 700">ऑफ़लाइन</span></div>'
               % (C['teal'], svg(I['wifioff'], 16, '2.1', C['teal'])))
    return ('<div class="row" style="gap: 12px; min-height: 48px; padding: 0 6px 0 16px; '
            'background: %s; border-bottom: 1px solid %s">%s'
            '<div class="col" style="flex: 1; gap: 4px; min-height: 48px; '
            'justify-content: center" data-tap="validity">'
            '<span style="font-size: 13px; font-weight: 600; white-space: nowrap; '
            'overflow: hidden; text-overflow: ellipsis">%s</span>'
            '<div style="height: 4px; border-radius: 2px; background: %s">'
            '<div style="width: %d%%; height: 4px; border-radius: 2px; background: %s"></div>'
            '</div></div>'
            '<div style="width: 48px; height: 48px; display: flex; align-items: center; '
            'justify-content: center" data-tap="theme">%s</div></div>'
            % (C['card'], C['line'], net, label, C['line'], pct, fill,
               svg(I['moon'], 22, '1.8', C['muted'])))


def hdr(title, tile='home', trail=None, offline=False):
    accent = C['indigo'] if tile == 'home' else C['marigoldText']
    crumb = ('<div class="row" style="gap: 5px; color: %s">%s'
             '<span style="font-size: 13px; font-weight: 700; letter-spacing: 0.02em">%s</span>'
             % (accent, svg(I[TILE_ICON[tile]], 15, '2', accent), TILE_LABEL[tile]))
    if trail:
        crumb += ('<span style="font-size: 13px; color: %s">›</span>'
                  '<span style="font-size: 13px; font-weight: 600; color: %s">%s</span>'
                  % (C['chev'], C['muted'], trail))
    if offline:
        crumb += ('<span style="font-size: 13px; color: %s">·</span>%s'
                  % (C['chev'], svg(I['wifioff'], 14, '2.2', C['teal'])))
    crumb += '</div>'
    return ('<div class="row" style="gap: 6px; padding: 14px 16px 10px; align-items: center">'
            '<div style="width: 48px; height: 48px; margin-left: -12px; display: flex; '
            'align-items: center; justify-content: center" data-tap="back">%s</div>'
            '<div class="col" style="flex: 1; gap: 2px; min-width: 0">%s'
            '<span style="font-family: \'Anek Devanagari\', sans-serif; font-size: 23px; '
            'font-weight: 600; line-height: 1.15; white-space: nowrap; overflow: hidden; '
            'text-overflow: ellipsis">%s</span></div>'
            '<div style="width: 48px; height: 48px; margin-right: -10px; display: flex; '
            'align-items: center; justify-content: center" data-tap="home">%s</div></div>'
            % (svg(I['left'], 24), crumb, title, svg(I['home'], 23, '1.8', C['indigo'])))


def pill(text, icon=None, bg=None, fg=None, border=None):
    bg = bg or C['tealSoft']
    fg = fg or C['teal']
    ic = svg(I[icon], 16, '1.9') if icon else ''
    return ('<div class="row" style="gap: 6px; background: %s; color: %s; '
            'border: 1px solid %s; border-radius: 16px; height: 32px; padding: 0 12px; '
            'font-size: 13.5px; font-weight: 600; width: fit-content">%s<span>%s</span></div>'
            % (bg, fg, border or 'transparent', ic, text))


def btn(text, kind='primary', icon=None):
    if kind == 'primary':
        style = 'background: %s; color: %s;' % (C['marigold'], C['onMarigold'])
    elif kind == 'ghost':
        style = 'background: transparent; color: %s; border: 1.25px solid %s;' % (
            C['indigo'], C['muted'])
    elif kind == 'danger':
        style = 'background: %s; color: #FFFFFF;' % C['red']
    else:
        style = 'background: %s; color: %s;' % (C['card'], C['indigo'])
    ic = svg(I[icon], 21, '1.9') if icon else ''
    return ('<div class="btn" style="min-height: 54px; %s" data-tap="button">%s'
            '<span>%s</span></div>' % (style, ic, text))


print('helpers ready')

# ------------------------------------------------------------------- 1. Welcome
# Straight off a Meta ad. It has to shout the USP in two seconds: no network, your language,
# real Dubai help. The drifting thumbnails say "food, map, metro, Arabic" faster than any
# sentence can. They are vector illustrations standing in for photographs — swap in real
# PNGs when we have licensed ones; keep each under ~25 KB so the pack stays small.
ART = dict(
    chai='<path d="M13 14h22l-3 24H16L13 14Z" fill="#C97A2B"/>'
         '<path d="M13 14h22l-1 8H14l-1-8Z" fill="#8A4A1E"/>'
         '<path d="M10 42h28" stroke="#5B6070" stroke-width="2.6" stroke-linecap="round"/>'
         '<path d="M20 9c2-3 0-5 0-5M28 9c2-3 0-5 0-5" stroke="#8A8F9E" stroke-width="2"'
         ' stroke-linecap="round" fill="none"/>',
    panipuri='<ellipse cx="24" cy="40" rx="21" ry="4.5" fill="#E6DED2"/>'
             '<circle cx="13" cy="30" r="9" fill="#D9A25C"/><circle cx="24" cy="26" r="9.5"'
             ' fill="#E0AE६8"/><circle cx="35" cy="30" r="9" fill="#D9A25C"/>'
             '<circle cx="24" cy="22" r="2.4" fill="#0B7A6B"/>'
             '<circle cx="12" cy="27" r="2" fill="#0B7A6B"/>'
             '<circle cx="36" cy="27" r="2" fill="#0B7A6B"/>',
    pavbhaji='<rect x="4" y="12" width="16" height="12" rx="3" fill="#E8C28A"/>'
             '<rect x="4" y="26" width="16" height="12" rx="3" fill="#E8C28A"/>'
             '<path d="M22 24a13 13 0 0 0 24 0Z" fill="#C0392B"/>'
             '<ellipse cx="34" cy="24" rx="13" ry="3.4" fill="#E05A3C"/>'
             '<circle cx="31" cy="23" r="1.8" fill="#0B7A6B"/>'
             '<circle cx="38" cy="24" r="1.6" fill="#F2C795"/>',
    dosa='<path d="M6 34 32 10l10 6-22 20-14-2Z" fill="#E3B36A"/>'
         '<path d="M6 34 32 10l4 2.4L12 35l-6-1Z" fill="#F0CE97"/>'
         '<circle cx="38" cy="34" r="7" fill="#0B7A6B" opacity="0.85"/>',
    landmark='<path d="M24 4 28 40H20L24 4Z" fill="#1A2456"/>'
             '<path d="M24 4v-2" stroke="#1A2456" stroke-width="2"/>'
             '<rect x="6" y="20" width="9" height="20" rx="2" fill="#3B4680"/>'
             '<rect x="33" y="16" width="10" height="24" rx="2" fill="#3B4680"/>'
             '<rect x="2" y="40" width="44" height="4" rx="2" fill="#1A2456"/>',
    mapcard='<rect x="3" y="6" width="42" height="34" rx="4" fill="#EFE8DB"/>'
            '<path d="M3 20h42M18 6v34" stroke="#D6CCBA" stroke-width="3"/>'
            '<path d="M8 36 20 24l8 6 12-14" stroke="#E8871E" stroke-width="3"'
            ' fill="none" stroke-linecap="round"/>'
            '<circle cx="8" cy="36" r="3.4" fill="#1A2456"/>',
    metro='<rect x="10" y="6" width="28" height="26" rx="7" fill="#1A2456"/>'
          '<rect x="14" y="11" width="20" height="8" rx="2" fill="#9FB0E0"/>'
          '<circle cx="17" cy="26" r="2.2" fill="#E8871E"/>'
          '<circle cx="31" cy="26" r="2.2" fill="#E8871E"/>'
          '<path d="M15 40l4-6M33 40l-4-6" stroke="#1A2456" stroke-width="2.6"'
          ' stroke-linecap="round"/>',
)
ART['panipuri'] = ART['panipuri'].replace('#E0AE६8', '#E0AE68')


def thumb(key, label, x, y, rot, delay, dur, size=98):
    return ('<div class="drift" style="position: absolute; left: %dpx; top: %dpx; '
            'width: %dpx; height: %dpx; border-radius: 20px; background: %s; '
            'border: 1px solid %s; box-shadow: 0 10px 26px rgba(20, 24, 38, 0.10); '
            'transform: rotate(%sdeg); display: flex; flex-direction: column; '
            'align-items: center; justify-content: center; gap: 5px; '
            'animation-delay: %sms; animation-duration: %sms">'
            '<svg width="48" height="48" viewBox="0 0 48 48">%s</svg>'
            '<span style="font-size: 11.5px; font-weight: 600; color: %s">%s</span></div>'
            % (x, y, size, size, C['card'], C['line'], rot, delay, dur, ART[key],
               C['muted'], label))


def wordchip(text, x, y, rot, delay, dur, fam=None):
    fam = fam or "'Mukta', sans-serif"
    return ('<div class="drift" style="position: absolute; left: %dpx; top: %dpx; '
            'background: %s; border: 1px solid %s; border-radius: 16px; padding: 7px 13px; '
            'box-shadow: 0 8px 20px rgba(20, 24, 38, 0.08); transform: rotate(%sdeg); '
            'font-family: %s; font-size: 16px; font-weight: 600; color: %s; '
            'animation-delay: %sms; animation-duration: %sms">%s</div>'
            % (x, y, C['card'], C['line'], rot, fam, C['indigo'], delay, dur, text))


scatter = ''.join([
    thumb('mapcard', 'नक्शा', -16, 62, '-9', 0, 7200),
    thumb('panipuri', 'पानी पूरी', 104, 24, '5', 900, 8100, 92),
    thumb('landmark', 'घूमने की जगह', 232, 58, '-6', 400, 7600),
    thumb('chai', 'कड़क चाय', 320, 168, '8', 1400, 8600, 92),
    thumb('pavbhaji', 'पाव भाजी', -22, 214, '7', 1900, 7900, 92),
    thumb('dosa', 'डोसा', 268, 300, '-7', 700, 8300, 92),
    thumb('metro', 'मेट्रो', 118, 178, '-4', 2300, 7400, 88),
    wordchip('नमस्ते', 34, 168, '-12', 1200, 6800),
    wordchip('مرحبا', 214, 218, '9', 300, 7100, "'Noto Naskh Arabic', serif"),
    wordchip('Hello', 150, 330, '-5', 1700, 7700),
])

body = '''<div class="screen" style="position: relative; overflow: hidden">
  <svg width="390" height="470" viewBox="0 0 390 470" style="position: absolute; top: 0;
       left: 0; pointer-events: none" aria-hidden="true">
    <defs><radialGradient id="warm" cx="50%%" cy="18%%" r="82%%">
      <stop offset="0%%" stop-color="#FDF0DC" stop-opacity="0.95"/>
      <stop offset="100%%" stop-color="#F7F3EC" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="390" height="470" fill="url(#warm)"/>
  </svg>

  <div style="position: absolute; top: 0; left: 0; width: 390px; height: 440px;
              pointer-events: none">%(scatter)s</div>

  <div style="position: relative; flex: 1; display: flex; flex-direction: column;
              justify-content: flex-end; padding: 0 24px 30px">
    <div class="col rise d2" style="gap: 13px">
      <span style="font-family: 'Anek Devanagari', sans-serif; font-size: 23px;
                   font-weight: 700; letter-spacing: -0.01em">दुबई साथी</span>

      <h1 style="margin: 0; font-family: 'Anek Devanagari', sans-serif; font-size: 40px;
                 font-weight: 700; line-height: 1.08; letter-spacing: -0.025em">
        दुबई में नेटवर्क<br>नहीं चलेगा?</h1>
      <p style="margin: 0; font-family: 'Anek Devanagari', sans-serif; font-size: 25px;
                font-weight: 600; line-height: 1.25; color: %(marigoldText)s">
        साथी बिना इंटरनेट चलता है.</p>
    </div>

    <div class="row rise d3" style="gap: 7px; flex-wrap: wrap; margin-top: 18px">
      %(p1)s %(p2)s %(p3)s
    </div>

    <div class="col rise d3" style="gap: 10px; margin-top: 18px; background: %(card)s;
                border: 1px solid %(line)s; border-radius: 16px; padding: 14px 15px">
      <div class="row" style="justify-content: space-between">
        <span style="font-size: 16px; font-weight: 600">साथी तैयार हो रहा है</span>
        <span class="muted" style="font-size: 14px">2 मिनट बाकी</span>
      </div>
      <div style="height: 6px; border-radius: 3px; background: %(line)s">
        <div style="width: 62%%; height: 6px; border-radius: 3px; background: %(indigo)s"></div>
      </div>
      <span class="muted" style="font-size: 13.5px; line-height: 1.4">
        नक्शा, मेट्रो, खाना, वाक्य — सब आपके फ़ोन में उतर रहा है. पूरा होने पर ही शुरू होगा.</span>
    </div>

    <div class="col rise d4" style="gap: 11px; margin-top: 16px">
      %(cta)s
      <span style="font-size: 13.5px; text-align: center; color: %(muted)s">
        कोई लॉगिन नहीं. कोई अकाउंट नहीं.</span>
    </div>
  </div>
</div>''' % dict(C, scatter=scatter,
                 p1=pill('नक्शा फ़ोन में', 'wifioff', C['card'], C['teal'], C['line']),
                 p2=pill('हिंदी बोलिए', 'mic', C['card'], C['teal'], C['line']),
                 p3=pill('अरबी दिखाइए', 'talk', C['card'], C['teal'], C['line']),
                 cta=('<div class="btn" style="min-height: 54px; background: %s; color: %s; '
                      'border: 1px solid %s" data-tap="button">तैयार होने पर शुरू होगा</div>'
                      % (C['line'], C['muted'], C['line'])))
write('Welcome', body)

# ---------------------------------------------------------------------- 4. Home
# Utility app, so it opens straight into the four things it does — no login, no splash gate.
# The counter at the top is the only chrome: trial countdown before purchase, pass remaining
# after. No mic here: on home a spoken "करामा" could mean a route or a restaurant, and the
# guess is a bad first impression of voice. The mic lives where it has context — 1.1, 3.1 and
# the bar on every child screen — one tap away, no guessing.
def tile(key, label):
    icon = dict(FUNCS_BY_KEY)[key]
    bg, fg = C['marigoldSoft'], C['marigoldText']
    return ('<div class="card col" style="min-height: 48px; padding: 18px 16px; gap: 12px; '
            'justify-content: space-between" data-tap="tile">'
            '<div style="width: 46px; height: 46px; border-radius: 14px; background: %s; '
            'display: flex; align-items: center; justify-content: center">%s</div>'
            '<div class="col" style="gap: 4px">'
            '<span style="font-family: \'Anek Devanagari\', sans-serif; font-size: 25px; '
            'font-weight: 600; line-height: 1.1">%s</span>'
            '<span class="muted" style="font-size: 13.5px; line-height: 1.35">%s</span>'
            '</div></div>'
            % (bg, svg(I[icon], 24, '1.8', fg), label, FUNC_BLURB[key]))


FUNCS_BY_KEY = [(k, i) for k, _, i in FUNCS]

HOME = '''<div class="screen">
  <div class="flow" style="gap: 13px; padding-top: 14px">
    <div style="flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px; padding-bottom: 22px">
      %(t1)s %(t2)s %(t3)s %(t4)s
    </div>
  </div>
</div>'''

for name, kind in [('Main', 'trial')]:
    write(name, HOME % dict(
        C, t1=tile('transport', 'रास्ता'), t2=tile('food', 'खाना'),
        t3=tile('talk', 'बोलना'), t4=tile('info', 'ज़रूरी जानकारी')))

# --------------------------------------------------- 1.1 रास्ता › कहाँ जाना है?
# What the रास्ता tile opens onto. One question, three ways to answer it: say it, type it,
# or tap the two places a tourist goes back to most. Origin is never asked — the phone knows
# where it is, and a tourist often does not know the name of where they are standing.
def pick(icon, label, sub):
    return ('<div class="card row" style="min-height: 60px; padding: 12px 15px; gap: 12px" '
            'data-tap="pick">'
            '<div style="width: 40px; height: 40px; border-radius: 12px; background: %s; '
            'display: flex; align-items: center; justify-content: center">%s</div>'
            '<div class="col" style="flex: 1; gap: 1px">'
            '<span style="font-size: 16px; font-weight: 600">%s</span>'
            '<span class="muted" style="font-size: 13.5px">%s</span></div>%s</div>'
            % (C['marigoldSoft'], svg(I[icon], 21, '1.8', C['marigoldText']), label, sub,
               svg(I['right'], 20, '1.8', C['chev'])))


big_mic = glow(
    '<div style="width: 96px; height: 96px; border-radius: 48px; background: %s; '
    'display: flex; align-items: center; justify-content: center" data-tap="mic">%s</div>'
    % (C['marigold'], svg(I['mic'], 44, '1.5', C['onMarigold'])),
    radius=50, surface=C['marigold'], pad='3px')

body = '''<div class="screen">
  %(hdr)s
  <div class="flow" style="gap: 16px">
    <div class="col" style="align-items: center; gap: 12px; padding: 10px 0 4px">
      %(mic)s
      <span style="font-size: 16px; font-weight: 600">बोलिए</span>
      <span class="muted" style="font-size: 14.5px; margin-top: -6px">
        जैसे — “मुझे करामा जाना है”</span>
    </div>

    <div class="row" style="gap: 10px; min-height: 52px; background: %(card)s;
                border: 1px solid %(line)s; border-radius: 14px; padding: 0 14px"
         data-tap="type">%(search)s
      <span class="muted" style="font-size: 16px">या जगह का नाम लिखिए</span>
    </div>

    <div class="col" style="gap: 9px">
      %(p1)s %(p2)s
    </div>

    <div class="col" style="gap: 9px">
      <p class="lbl">हाल में</p>
      %(p3)s %(p4)s
    </div>
  </div>
  %(bar)s
</div>''' % dict(C, hdr=hdr('कहाँ जाना है?', 'transport'), mic=big_mic,
                 search=svg(I['pencil'], 20, '1.8', C['muted']),
                 p1=pick('pin', 'मेरा होटल', 'Hotel Rimal, Deira'),
                 p2=pick('route', 'एयरपोर्ट', 'Dubai International · टर्मिनल 1'),
                 p3=pick('clock', 'दुबई मॉल', 'कल गए थे'),
                 p4=pick('clock', 'करामा', 'आज सुबह'),
                 bar=quickbar('transport'))
write('Destination', body)


# ------------------------------------------ 1.2 रास्ता › कहाँ जाना है? › सुन रहा हूँ
# Same theme as everywhere else. Listening is a state, not a different app, and a traveller
# who chose the light theme should not be thrown into a black screen to say one sentence.
bars = ''.join(
    '<div style="width: 7px; height: %dpx; border-radius: 4px; background: %s"></div>'
    % (h, C['marigold'] if i % 3 else C['marigoldLine'])
    for i, h in enumerate([18, 38, 64, 96, 52, 78, 120, 66, 40, 86, 58, 30, 70, 44, 22]))

body = '''<div class="screen">
  %(hdr)s

  <div class="flow" style="justify-content: center; gap: 30px">
    <div class="row" style="gap: 5px; height: 130px; justify-content: center;
                            align-items: center">%(bars)s</div>

    <div class="col" style="gap: 12px; align-items: center">
      <span style="font-size: 14px; font-weight: 600; letter-spacing: 0.06em;
                   color: %(marigoldText)s">सुन रहा हूँ…</span>
      <p style="margin: 0; font-family: 'Anek Devanagari', sans-serif; font-size: 30px;
                font-weight: 500; line-height: 1.35; text-align: center">
        मुझे करामा<span style="color: %(muted)s"> जाना…</span></p>
    </div>
  </div>

  <div class="col" style="gap: 14px; padding: 0 20px 34px; align-items: center">
    <span class="muted" style="font-size: 14.5px">हिंदी और हिंग्लिश — दोनों चलेंगे</span>
    %(cancel)s
  </div>
</div>''' % dict(C, hdr=hdr('सुन रहा हूँ…', 'transport', 'कहाँ जाना है?'), bars=bars,
                 cancel=btn('रद्द करें', 'ghost'))
write('Listening', body)

# -------------------------------------------------------------- 4. RouteOptions
def leg_strip(legs):
    out = []
    for i, (icon, txt) in enumerate(legs):
        if i:
            out.append('<span class="muted" style="font-size: 13px">›</span>')
        out.append('<div class="row" style="gap: 5px">%s<span style="font-size: 14px; '
                   'font-weight: 500">%s</span></div>'
                   % (svg(I[icon], 17, '1.9', C['muted']), txt))
    return '<div class="row" style="gap: 7px; flex-wrap: wrap">%s</div>' % ''.join(out)


def option(icon, name, time, cost, legs, badge=None, lead=False):
    edge = C['marigold'] if lead else C['line']
    bw = '1.5px' if lead else '1px'
    bd = ''
    if badge:
        bd = ('<span style="background: %s; color: %s; border-radius: 11px; '
              'padding: 3px 9px; font-size: 12.5px; font-weight: 600">%s</span>' % (
                  C['marigoldSoft'], C['warmTextDim'], badge))
    return ('<div class="card col" style="padding: 15px 16px; gap: 11px; border-color: %s; '
            'border-width: %s">'
            '<div class="row" style="gap: 11px">'
            '<div style="width: 40px; height: 40px; border-radius: 11px; background: %s; '
            'display: flex; align-items: center; justify-content: center">%s</div>'
            '<div class="col" style="flex: 1; gap: 0">'
            '<div class="row" style="gap: 8px"><span class="t2">%s</span>%s</div>'
            '<span class="muted" style="font-size: 14px">%s</span></div>'
            '<span style="font-family: \'Anek Devanagari\', sans-serif; font-size: 23px; '
            'font-weight: 600">%s</span></div>%s</div>'
            % (edge, bw, C['indigo'] + '12', svg(I[icon], 22, '1.8', C['indigo']),
               name, bd, cost, time, leg_strip(legs)))


body = '''<div class="screen">
  %(hdr)s
  <div class="flow">
    <div class="row" style="gap: 8px; padding: 2px 2px 0">
      <span class="muted" style="font-size: 15px">यहाँ से</span>%(arrow)s
      <span style="font-size: 16px; font-weight: 600; flex: 1">करामा</span>
    </div>

    <div class="col" style="gap: 11px">
      %(o1)s
      %(o2)s
      %(o3)s
    </div>

    <p class="muted" style="margin: 4px 0 0; font-size: 13.5px">किराया और समय अनुमानित</p>
  </div>
  %(bar)s
</div>''' % dict(C,
                 hdr=hdr('करामा — कैसे जाएँ?', 'transport', 'कहाँ जाना है? › विकल्प'),
                 arrow=svg(I['right'], 18, '1.9', C['muted']),
                 o1=option('metro', 'मेट्रो', '32 मिनट', 'AED 5',
                           [('walk', '6 मिनट'), ('metro', 'रेड लाइन · 4 स्टेशन'),
                            ('walk', '8 मिनट')], 'सबसे आसान', lead=True),
                 o2=option('taxi', 'टैक्सी', '16 मिनट', 'AED 26–32',
                           [('taxi', 'सीधे · 6.2 km')], 'सबसे तेज़'),
                 o3=option('bus', 'बस', '44 मिनट', 'AED 3',
                           [('walk', '4 मिनट'), ('bus', 'C7 · 11 स्टॉप'),
                            ('walk', '8 मिनट')], 'सबसे सस्ता'),
                 bar=quickbar('transport'))
write('RouteOptions', body)

# --------------------------------------------------------------- 5. RouteDetail
def leg(icon, title, sub, time, last=False):
    line = ('' if last else
            '<div style="position: absolute; left: 19px; top: 44px; bottom: -18px; '
            'width: 2px; background: %s"></div>' % C['line'])
    return ('<div style="position: relative; display: flex; gap: 14px; '
            'padding-bottom: %s">%s'
            '<div style="width: 40px; height: 40px; border-radius: 12px; background: %s; '
            'display: flex; align-items: center; justify-content: center; flex-shrink: 0; '
            'z-index: 1">%s</div>'
            '<div class="col" style="flex: 1; gap: 2px; padding-top: 2px">'
            '<div class="row" style="justify-content: space-between; gap: 8px">'
            '<span style="font-size: 16.5px; font-weight: 600">%s</span>'
            '<span style="font-size: 15px; font-weight: 600; color: %s">%s</span></div>'
            '<span class="muted" style="font-size: 14.5px">%s</span></div></div>'
            % ('0' if last else '18px', line, C['card'],
               svg(I[icon], 21, '1.8', C['indigo']), title, C['muted'], time, sub))


body = '''<div class="screen">
  %(hdr)s
  <div class="flow">
    <div class="row" style="gap: 0; background: %(indigo)s; border-radius: 16px;
                            padding: 15px 6px; color: #F7F3EC">
      <div class="col" style="flex: 1; align-items: center; gap: 1px">
        <span style="font-family: 'Anek Devanagari', sans-serif; font-size: 22px;
                     font-weight: 600">32 मिनट</span>
        <span style="font-size: 12.5px; opacity: 0.7">कुल समय</span></div>
      <div style="width: 1px; align-self: stretch; background: rgba(247,243,236,0.2)"></div>
      <div class="col" style="flex: 1; align-items: center; gap: 1px">
        <span style="font-family: 'Anek Devanagari', sans-serif; font-size: 22px;
                     font-weight: 600">AED 5</span>
        <span style="font-size: 12.5px; opacity: 0.7">किराया</span></div>
      <div style="width: 1px; align-self: stretch; background: rgba(247,243,236,0.2)"></div>
      <div class="col" style="flex: 1; align-items: center; gap: 1px">
        <span style="font-family: 'Anek Devanagari', sans-serif; font-size: 22px;
                     font-weight: 600">14 मिनट</span>
        <span style="font-size: 12.5px; opacity: 0.7">पैदल</span></div>
    </div>

    <div class="col" style="gap: 0; padding-top: 4px">
      %(l1)s %(l2)s %(l3)s
    </div>

    <div style="flex: 1"></div>
    <div class="col" style="gap: 10px; padding-bottom: 16px">
      %(b1)s
    </div>
  </div>
  %(bar)s
</div>''' % dict(C,
                 hdr=hdr('मेट्रो से करामा', 'transport', 'विकल्प › क़दम दर क़दम'),
                 l1=leg('walk', 'पैदल चलिए', 'BurJuman मेट्रो स्टेशन तक', '6 मिनट'),
                 l2=leg('metro', 'रेड लाइन', 'BurJuman → ADCB · 4 स्टेशन', '18 मिनट'),
                 l3=leg('walk', 'पैदल चलिए', 'करामा सेंटर तक', '8 मिनट', last=True),
                 b1=btn('नक्शे पर देखें', 'primary', 'pin'),
                 bar=quickbar('transport'))
write('RouteDetail', body)
print('4-5 done')

# ----------------------------------------------------------------------- 8. Map
# Category chips choose what appears on the map; the pins and the cards below are the same
# set, so tapping either side highlights the other. This is also where paid placement will
# live one day, which is exactly why a sponsored card carries a visible प्रायोजित label and
# still sorts by distance — a traveller who stops trusting the pins stops using the app.
POI_CATS = [('चाय', 'कड़क चाय'), ('झटपट', 'झटपट खाना'), ('वेज', 'वेज खाना'),
            ('मिठाई', 'मिठाई'), ('घूमना', 'घूमने की जगह')]


def poi_chip(text, on=False):
    inner = ('<div class="chip" style="height: 48px; background: %s; color: %s; '
             'font-weight: 600; border: none" data-tap="chip">%s</div>'
             % (C['marigold'], C['onMarigold'], text))
    if on:
        return glow(inner, radius=24, surface=C['marigold'], pad='2px')
    return ('<div class="chip" style="height: 48px; background: %s; color: %s; '
            'border: 1px solid %s" data-tap="chip">%s</div>'
            % (C['card'], C['ink'], C['line'], text))


def pin(x, y, label, on=False):
    bg, fg = (C['indigo'], '#F7F3EC') if on else (C['card'], C['ink'])
    shadow = ('0 6px 18px rgba(26, 36, 86, 0.34)' if on
              else '0 4px 12px rgba(20, 24, 38, 0.16)')
    return ('<div style="position: absolute; left: %dpx; top: %dpx; background: %s; '
            'color: %s; border: 1px solid %s; border-radius: 15px; height: 30px; '
            'padding: 0 11px; display: flex; align-items: center; font-size: 13.5px; '
            'font-weight: 600; box-shadow: %s; white-space: nowrap">%s</div>'
            % (x, y, bg, fg, C['line'], shadow, label))


def poi_card(art, name, sub, dist, on=False, sponsored=False):
    tagline = ('<span style="background: %s; color: %s; border-radius: 7px; padding: 1px 7px; '
               'font-size: 11.5px; font-weight: 600">प्रायोजित</span>' % (
                   C['marigoldSoft'], C['marigoldText'])) if sponsored else ''
    inner = ('<div class="col" style="width: 214px; padding: 12px; gap: 9px; background: %s">'
             '<div class="row" style="gap: 10px">'
             '<div style="width: 46px; height: 46px; border-radius: 12px; background: %s; '
             'display: flex; align-items: center; justify-content: center; flex-shrink: 0">'
             '<svg width="34" height="34" viewBox="0 0 48 48">%s</svg></div>'
             '<div class="col" style="flex: 1; gap: 1px; min-width: 0">'
             '<span style="font-size: 15.5px; font-weight: 600; white-space: nowrap; '
             'overflow: hidden; text-overflow: ellipsis">%s</span>'
             '<span class="muted" style="font-size: 13px">%s</span></div></div>'
             '<div class="row" style="gap: 7px">'
             '<span style="background: %s; color: %s; border-radius: 7px; padding: 1px 8px; '
             'font-size: 12.5px; font-weight: 600">%s</span>%s</div></div>'
             % (C['card'], C['sand'], ART[art], name, sub, C['tealSoft'], C['teal'],
                dist, tagline))
    if on:
        return glow(inner, radius=16)
    return ('<div class="card" style="border-radius: 16px; overflow: hidden">%s</div>' % inner)


roads = ''.join(
    '<path d="%s" stroke="#E9E1D4" stroke-width="%d" stroke-linecap="round"/>' % (d, w)
    for d, w in [('M-20 74 L410 52', 12), ('M-20 208 L410 236', 10),
                 ('M-20 334 L410 306', 12), ('M74 -20 L104 420', 10),
                 ('M244 -20 L216 420', 12), ('M340 -20 L360 420', 8)])
creek = ('<path d="M-20 372 C 90 340, 150 396, 250 360 C 330 332, 380 356, 410 342 '
         'L410 420 L-20 420 Z" fill="#CFE4E0"/>')
blocks = ''.join(
    '<rect x="%d" y="%d" width="%d" height="%d" rx="4" fill="#EFE8DB"/>' % b
    for b in [(16, 92, 44, 52), (124, 84, 74, 58), (266, 70, 60, 62),
              (24, 250, 40, 52), (140, 252, 60, 48), (270, 254, 76, 46)])
routeline = ('<path d="M92 302 L142 286 L196 168 L268 108" stroke="#E8871E" '
             'stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
dots = ''.join('<circle cx="%d" cy="%d" r="5.5" fill="#FFFDF9" stroke="#E8871E" '
               'stroke-width="2.6"/>' % d for d in [(142, 286), (196, 168), (236, 136)])

body = '''<div class="screen">
  %(hdr)s
  <div class="row" style="gap: 8px; padding: 0 16px 10px; flex-wrap: wrap">
    %(c1)s %(c2)s %(c3)s %(c4)s %(c5)s
  </div>

  <div style="position: relative; height: 372px; overflow: hidden">
    <svg width="390" height="420" viewBox="0 0 390 420" style="position: absolute; top: -18px">
      <rect width="390" height="420" fill="%(mapLand)s"/>
      %(creek)s %(blocks)s %(roads)s %(routeline)s %(dots)s
      <circle cx="92" cy="284" r="10" fill="#1A2456" stroke="#FFFDF9" stroke-width="3.4"/>
      <circle cx="92" cy="284" r="24" fill="#1A2456" opacity="0.12"/>
    </svg>
    %(p1)s %(p2)s %(p3)s %(p4)s
  </div>

  <div class="col" style="gap: 9px; padding: 12px 0 14px; background: %(sand)s">
    <div class="row" style="justify-content: space-between; padding: 0 16px">
      <span class="lbl">रास्ते में — कड़क चाय</span>
      <span class="muted" style="font-size: 13.5px">4 जगह</span>
    </div>
    <div class="row" style="gap: 10px; padding: 0 16px; align-items: stretch">
      %(k1)s %(k2)s
    </div>
  </div>
  %(bar)s
</div>''' % dict(C, creek=creek, blocks=blocks, roads=roads, routeline=routeline, dots=dots,
                 hdr=hdr('रास्ते में क्या है', 'transport', 'नक्शा › रास्ते में'),
                 c1=poi_chip('कड़क चाय', True), c2=poi_chip('झटपट खाना'),
                 c3=poi_chip('वेज खाना'), c4=poi_chip('मिठाई'), c5=poi_chip('घूमने की जगह'),
                 p1=pin(96, 250, 'चाय · 400 मी', True), p2=pin(190, 128, 'चाय · 1.2 km'),
                 p3=pin(250, 196, 'चाय · 1.6 km'), p4=pin(46, 116, 'चाय · 2.1 km'),
                 k1=poi_card('chai', 'Al Karama Cafeteria', 'कड़क चाय · AED 2', '400 मी आगे',
                             on=True),
                 k2=poi_card('panipuri', 'Bombay Chowpatty', 'चाट, चाय · AED 12',
                             '1.2 km आगे', sponsored=True),
                 bar=quickbar('transport'))
write('MapDiscover', body)

# ------------------------------------------------------- 8. Map (route, the default)
# What a traveller sees by default: their route and nothing competing with it. The one row
# at the bottom is the whole entry point to discovery — it states what is there and gets out
# of the way. Browsing is a mode you choose, never the thing between you and your directions.
body = '''<div class="screen">
  %(hdr)s

  <div style="position: relative; flex: 1; overflow: hidden">
    <svg width="390" height="470" viewBox="0 0 390 420" style="position: absolute; top: -10px">
      <rect width="390" height="420" fill="%(mapLand)s"/>
      %(creek)s %(blocks)s %(roads)s %(routeline)s
      <circle cx="92" cy="284" r="10" fill="#1A2456" stroke="#FFFDF9" stroke-width="3.4"/>
      <circle cx="92" cy="284" r="24" fill="#1A2456" opacity="0.12"/>
    </svg>
    <div style="position: absolute; left: 244px; top: 66px">%(dest)s</div>
  </div>

  <div class="col" style="gap: 10px; background: %(card)s; border-top: 1px solid %(line)s;
                          border-radius: 20px 20px 0 0; padding: 16px 16px 14px;
                          margin-top: -20px; position: relative">
    <div class="row" style="gap: 12px">
      <div class="col" style="flex: 1; gap: 2px">
        <span class="t2">करामा सेंटर</span>
        <span class="muted" style="font-size: 14px">6.2 km · BurJuman से रेड लाइन</span>
      </div>
    </div>
    <div class="row" style="gap: 11px; min-height: 48px; border-top: 1px solid %(line)s;
                            padding-top: 12px" data-tap="row">%(cup)s
      <span style="flex: 1; font-size: 15px; font-weight: 600">
        रास्ते में खाने-पीने की 6 जगह</span>%(chev)s
    </div>
  </div>
  %(bar)s
</div>''' % dict(C, creek=creek, blocks=blocks, roads=roads, routeline=routeline,
                 hdr=hdr('करामा तक', 'transport', 'क़दम दर क़दम › नक्शा'),
                 dest=pin(0, 0, 'करामा सेंटर', True),
                 cup=svg(I['food'], 21, '1.8', C['marigoldText']),
                 chev=svg(I['right'], 20, '1.8', C['chev']),
                 bar=quickbar('transport'))
write('Map', body)

# ------------------------------------------------------------------ 7. FoodList
def fchip(text, on=False):
    if on:
        return ('<div class="chip" style="height: 48px; background: %s; color: %s; '
                'font-weight: 600" data-tap="chip">%s<span>%s</span></div>'
                % (C['marigold'], C['onMarigold'],
                   svg(I['check'], 15, '2.4', C['onMarigold']), text))
    return ('<div class="chip" style="height: 48px; background: %s; color: %s; '
            'border: 1px solid %s" data-tap="chip"><span>%s</span></div>'
            % (C['card'], C['ink'], C['line'], text))


def tag(text):
    return ('<span style="background: %s; color: %s; border-radius: 8px; padding: 2px 8px; '
            'font-size: 12.5px; font-weight: 600">%s</span>' % (C['tealSoft'], C['teal'], text))


def fcard(name, sub, dist, cost, tags):
    return ('<div class="card col" style="padding: 14px 15px; gap: 8px">'
            '<div class="row" style="gap: 10px; align-items: flex-start">'
            '<div class="col" style="flex: 1; gap: 2px">'
            '<span style="font-size: 17px; font-weight: 600">%s</span>'
            '<span class="muted" style="font-size: 14px">%s</span></div>'
            '<div class="col" style="align-items: flex-end; gap: 2px">'
            '<span style="font-size: 15px; font-weight: 600">%s</span>'
            '<span class="muted" style="font-size: 13.5px">%s</span></div></div>'
            '%s</div>'
            % (name, sub, dist, cost,
               ('<div class="row" style="gap: 6px">%s</div>' % ''.join(tag(t) for t in tags))
               if tags else ''))


body = '''<div class="screen">
  %(hdr)s
  <div class="flow" style="gap: 12px">
    <div class="row" style="gap: 10px; min-height: 52px; background: %(card)s;
                border: 1px solid %(line)s; border-radius: 14px; padding: 0 6px 0 14px"
         data-tap="type">
      <span class="muted" style="font-size: 16px; flex: 1">डोसा, थाली, चाय… बोलिए या लिखिए</span>
      <div style="width: 48px; height: 48px; border-radius: 14px; display: flex;
                  align-items: center; justify-content: center" data-tap="mic">%(mic)s</div>
    </div>
    <div class="row" style="gap: 8px; flex-wrap: wrap">
      %(c1)s %(c2)s %(c3)s %(c4)s %(c5)s
    </div>
    <span class="muted" style="font-size: 14px">करामा के 1 km में · 14 जगह</span>
    <div class="col" style="gap: 10px">
      %(f1)s %(f2)s %(f3)s %(f4)s
    </div>
  </div>
  %(bar)s
</div>''' % dict(C,
                 hdr=hdr('आस-पास वेज खाना', 'food', 'सूची'),
                 mic=svg(I['mic'], 24, '1.7', C['marigoldText']),
                 c1=fchip('वेज', True), c2=fchip('जैन'), c3=fchip('सात्विक'),
                 c4=fchip('बिना प्याज़/लहसुन'), c5=fchip('झटपट'),
                 f1=fcard('चप्पन भोग', 'गुजराती थाली · करामा', '700 मी', 'AED 30–45',
                          ['जैन']),
                 f2=fcard('सारावना भवन', 'दक्षिण भारतीय · करामा', '1.1 km', 'AED 25–40', []),
                 f3=fcard('पूरी बंगाली स्वीट्स', 'नाश्ता, मिठाई · मीना बाज़ार', '1.4 km',
                          'AED 10–20', ['झटपट']),
                 f4=fcard('गोविंदा’ज़', 'सात्विक थाली · अल रफ़ा', '1.8 km', 'AED 35–50',
                          ['सात्विक', 'बिना प्याज़/लहसुन']),
                 bar=quickbar('food'))
write('FoodList', body)

# ---------------------------------------------------------------- 8. Restaurant
photo = ('<div style="flex: 1; height: 92px; border-radius: 12px; background: %s; '
         'border: 1px solid %s; display: flex; align-items: center; justify-content: center; '
         'color: %s; font-size: 12.5px; font-weight: 600">मेन्यू फ़ोटो</div>'
         % ('#EFE8DB', C['line'], C['muted']))

body = '''<div class="screen">
  %(hdr)s
  <div class="flow">
    <div class="col" style="gap: 9px">
      <span class="muted" style="font-size: 15px">गुजराती थाली · करामा</span>
      <div class="row" style="gap: 6px">%(t1)s %(t2)s %(t3)s</div>
    </div>

    <div class="card row" style="padding: 0">
      <div class="col" style="flex: 1; align-items: center; gap: 2px; padding: 13px 6px">
        <span style="font-size: 16px; font-weight: 600">700 मी</span>
        <span class="muted" style="font-size: 13px">करामा से</span></div>
      <div style="width: 1px; align-self: stretch; background: %(line)s"></div>
      <div class="col" style="flex: 1; align-items: center; gap: 2px; padding: 13px 6px">
        <span style="font-size: 16px; font-weight: 600">AED 30–45</span>
        <span class="muted" style="font-size: 13px">एक के लिए</span></div>
      <div style="width: 1px; align-self: stretch; background: %(line)s"></div>
      <div class="col" style="flex: 1; align-items: center; gap: 2px; padding: 13px 6px">
        <span style="font-size: 16px; font-weight: 600">11:30–23:00</span>
        <span class="muted" style="font-size: 13px">खुला</span></div>
    </div>

    <div class="col" style="gap: 9px">
      <p class="lbl">मेन्यू</p>
      <div class="row" style="gap: 9px">%(p)s%(p)s%(p)s</div>
    </div>

    <div class="card row" style="padding: 13px 15px; gap: 11px; align-items: flex-start;
                                 background: %(marigoldSoft)s; border-color: %(marigoldLine)s">
      %(ic)s
      <span style="font-size: 14.5px; color: %(warmText)s; flex: 1; line-height: 1.45">
        जैन थाली अलग बनती है — ऑर्डर करते समय बता दें. ज़रूरी वाक्य तैयार है.</span>
    </div>

    <div style="flex: 1"></div>
    <div class="row" style="gap: 10px; padding-bottom: 16px">
      <div style="flex: 1">%(b1)s</div>
      <div style="width: 96px">%(b2)s</div>
    </div>
  </div>
  %(bar)s
</div>''' % dict(C,
                 hdr=hdr('चप्पन भोग', 'food', 'जगह'),
                 t1=tag('वेज'), t2=tag('जैन'), t3=tag('बिना प्याज़/लहसुन'),
                 p=photo, ic=svg(I['talk'], 19, '1.9', C['marigoldText']),
                 b1=btn('कैसे पहुँचें', 'primary', 'route'),
                 b2=btn('फ़ोन', 'ghost', 'phone'),
                 bar=quickbar('food'))
write('Restaurant', body)
print('6-8 done')

# -------------------------------------------------------------------- 9. SayIt
body = '''<div class="screen">
  %(hdr)s
  <div class="flow">
    <div class="col" style="gap: 7px">
      <p class="lbl">आपने कहा</p>
      <div class="card row" style="padding: 14px 15px; gap: 10px">
        <span style="flex: 1; font-size: 17px; line-height: 1.4">
          इस होटल तक ले चलो, कितना लगेगा?</span>
      </div>
    </div>

    <div class="col" style="gap: 7px">
      <p class="lbl">ड्राइवर को यह दिखाएँ</p>
      <div class="col" style="gap: 14px; background: %(indigo)s; border-radius: 18px;
                              padding: 22px 20px; color: #F7F3EC">
        <p class="ar" style="margin: 0; font-size: 34px; font-weight: 400; line-height: 1.55">
          خذني إلى هذا الفندق، كم الأجرة؟</p>
      </div>
    </div>

    <div class="row" style="gap: 10px">
      <div style="flex: 1">%(b1)s</div>
    </div>

    <div style="flex: 1"></div>
    <div class="col" style="gap: 10px; padding-bottom: 16px">
      %(b2)s
    </div>
  </div>
  %(bar)s
</div>''' % dict(C,
                 hdr=hdr('अरबी में', 'talk', 'क्या कहना है? › अरबी में'),
                 b1=btn('अरबी में सुनाएँ', 'ghost', 'speak'),
                 b2=btn('ड्राइवर को दिखाएँ', 'primary'),
                 bar=quickbar('talk'))
write('SayIt', body)

# ---------------------------------------------------------------- 10. ShowDriver
body = '''<div class="screen" style="background: %(card)s">
  %(hdr)s

  <div class="flow" style="justify-content: center; gap: 30px">
    <p class="ar" style="margin: 0; font-size: 46px; font-weight: 700; line-height: 1.5;
                         text-align: right; letter-spacing: 0">
      خذني إلى هذا الفندق، كم الأجرة؟</p>

    <div class="col" style="gap: 10px; border-top: 1px solid %(line)s; padding-top: 22px">
      <p class="ar" style="margin: 0; font-size: 26px; line-height: 1.5; text-align: right;
                           color: %(indigo)s">فندق ريمال، ديرة</p>
      <span class="muted" style="font-size: 15.5px">Hotel Rimal, Deira</span>
    </div>
  </div>

  <div class="col" style="gap: 14px; padding: 0 20px 30px">
    <span class="muted" style="font-size: 14.5px; text-align: center">
      आपने कहा — “इस होटल तक ले चलो, कितना लगेगा?”</span>
    <div class="btn" style="background: %(indigo)s; color: #F7F3EC; min-height: 62px;
                            font-size: 19px">%(spk)s
      <span class="ar" style="font-size: 22px">اسمع</span></div>
  </div>
</div>''' % dict(C, hdr=hdr('ड्राइवर को दिखाएँ', 'talk', 'अरबी में › दिखाएँ'),
                 spk=svg(I['speak'], 24, '1.8', C['marigold']))
write('ShowDriver', body)

# ---------------------------------------------------------------- 11. Phrasebook
def ptab(text, on=False):
    if on:
        return ('<div class="chip" style="height: 48px; background: %s; color: %s; '
                'font-weight: 600" data-tap="chip"><span>%s</span></div>'
                % (C['marigold'], C['onMarigold'], text))
    return ('<div class="chip" style="height: 48px; background: transparent; color: %s; '
            'border: 1px solid %s" data-tap="chip"><span>%s</span></div>'
            % (C['muted'], C['line'], text))


def prow(hi, ar):
    return ('<div class="card row" style="padding: 13px 9px 13px 15px; gap: 8px">'
            '<div class="col" style="flex: 1; gap: 4px">'
            '<span style="font-size: 16.5px; font-weight: 500">%s</span>'
            '<span class="ar" style="font-size: 17px; color: %s">%s</span></div>'
            '<div style="width: 48px; height: 48px; display: flex; align-items: center; '
            'justify-content: center; flex-shrink: 0">%s</div></div>'
            % (hi, C['muted'], ar, svg(I['speak'], 22, '1.8', C['marigoldText'])))


# ------------------------------------------------- 3.1 बोलना › क्या कहना है?
# What the बोलना tile opens onto: say it, or pick a ready sentence when the taxi is too loud
# to be heard. One screen, because they are the same job — get Arabic out of your mouth or
# your phone. Tapping either goes to 3.2.
body = '''<div class="screen">
  %(hdr)s
  <div class="flow" style="gap: 14px">
    <div class="col" style="align-items: center; gap: 12px; padding: 6px 0 2px">
      %(mic)s
      <span style="font-size: 16px; font-weight: 600">हिंदी में बोलिए</span>
      <span class="muted" style="font-size: 14.5px; margin-top: -6px">
        जैसे — “इस होटल तक ले चलो”</span>
    </div>

    <p class="lbl" style="margin-top: 4px">या तैयार वाक्य चुनिए</p>
    <div class="row" style="gap: 8px; flex-wrap: wrap">
      %(t1)s %(t2)s %(t3)s %(t4)s
    </div>
    <div class="col" style="gap: 8px">
      %(r1)s %(r2)s %(r3)s
    </div>
  </div>
  %(bar)s
</div>''' % dict(C, hdr=hdr('क्या कहना है?', 'talk'), mic=big_mic,
                 t1=ptab('टैक्सी', True), t2=ptab('होटल'), t3=ptab('दुकान'), t4=ptab('खाना'),
                 r1=prow('इस पते पर ले चलो', 'خذني إلى هذا العنوان'),
                 r2=prow('मीटर चालू कीजिए', 'شغّل العدّاد من فضلك'),
                 r3=prow('यहीं रोक दीजिए', 'توقف هنا من فضلك'),
                 bar=quickbar('talk'))
write('SayEntry', body)

# ------------------------------------------------- 4.1 ज़रूरी जानकारी
# The fourth tile. Not an emergency screen — a tourist in distress reaches for the dialler
# and the reception desk, not a seven-day app. This is the calm shelf: the hotel (their
# first SOS), the documents they will otherwise not find, the consulate, and the numbers an
# Indian would otherwise dial wrong. It stays usable after the pass ends — it is all local.
def docrow(name, sub, icon='doc'):
    return ('<div class="card row" style="min-height: 56px; padding: 10px 15px; gap: 12px" '
            'data-tap="doc">'
            '<div style="width: 40px; height: 40px; border-radius: 10px; background: %s; '
            'display: flex; align-items: center; justify-content: center">%s</div>'
            '<div class="col" style="flex: 1; gap: 1px">'
            '<span style="font-size: 16px; font-weight: 600">%s</span>'
            '<span class="muted" style="font-size: 13px">%s</span></div>%s</div>'
            % (C['sand'], svg(I[icon], 21, '1.8', C['indigo']), name, sub,
               svg(I['right'], 20, '1.8', C['chev'])))


def addrow(text):
    return ('<div class="row" style="min-height: 52px; padding: 0 15px; gap: 12px; '
            'border: 1.5px dashed %s; border-radius: 14px" data-tap="add">%s'
            '<span style="font-size: 15.5px; font-weight: 600; color: %s">%s</span></div>'
            % (C['line'], svg(I['plus'], 20, '2', C['marigoldText']), C['marigoldText'], text))


body = '''<div class="screen">
  %(hdr)s
  <div class="flow" style="gap: 12px">
    <div class="card col" style="padding: 14px 15px; gap: 12px">
      <div class="row" style="gap: 12px">
        <div style="width: 58px; height: 58px; border-radius: 12px; background: #EFE8DB;
                    border: 1px solid %(line)s; display: flex; align-items: center;
                    justify-content: center">%(cam)s</div>
        <div class="col" style="flex: 1; gap: 1px">
          <span class="muted" style="font-size: 13px">मेरा होटल</span>
          <span style="font-size: 17px; font-weight: 600">Hotel Rimal, Deira</span>
          <span class="muted" style="font-size: 13px">कार्ड की फ़ोटो · पिन लगा है</span>
        </div>
      </div>
      <div class="row" style="gap: 9px">
        <div style="flex: 1">%(b1)s</div>
        <div style="flex: 1">%(b2)s</div>
      </div>
    </div>

    <div class="col" style="gap: 8px">
      <p class="lbl">दस्तावेज़</p>
      %(d1)s %(d2)s %(d3)s
      %(add)s
    </div>

    <div class="card row" style="padding: 12px 15px; gap: 12px" data-tap="row">
      <div class="col" style="flex: 1; gap: 1px; min-height: 48px; justify-content: center">
        <span class="muted" style="font-size: 13px">भारतीय कॉन्सुलेट</span>
        <span style="font-size: 15.5px; font-weight: 600">Bur Dubai · सोम–शुक्र 9–5</span>
      </div>%(ph)s
    </div>

    <span class="muted" style="font-size: 13.5px; text-align: center; padding-bottom: 6px">
      पुलिस 999 · एम्बुलेंस 998 · दमकल 997</span>
  </div>
  %(bar)s
</div>''' % dict(C, hdr=hdr('ज़रूरी जानकारी', 'info'),
                 cam=svg(I['camera'], 26, '1.6', C['muted']),
                 b1=btn('होटल वापस जाएँ', 'ghost', 'route'),
                 b2=btn('ड्राइवर को दिखाएँ', 'primary'),
                 d1=docrow('यात्रा बीमा', 'जोड़ा 10 सित॰'),
                 d2=docrow('पासपोर्ट', 'जोड़ा 10 सित॰'),
                 d3=docrow('वापसी की फ़्लाइट', 'AI 906 · 19 सित॰'),
                 add=addrow('दस्तावेज़ जोड़ें'),
                 ph=svg(I['phone'], 22, '1.8', C['marigoldText']),
                 bar=quickbar('info'))
write('InfoHome', body)

# ---------------------------------------------- 4.2 ज़रूरी जानकारी › होटल जोड़ें
# Three ways to capture the hotel, any one is enough: pin where you stand, photograph the
# business card, photograph the entrance. No typing — a tourist will not spell "Al Rigga".
def bigpick(icon, title, sub):
    return ('<div class="card row" style="min-height: 72px; padding: 14px 15px; gap: 14px" '
            'data-tap="pick">'
            '<div style="width: 46px; height: 46px; border-radius: 13px; background: %s; '
            'display: flex; align-items: center; justify-content: center">%s</div>'
            '<div class="col" style="flex: 1; gap: 2px">'
            '<span style="font-size: 17px; font-weight: 600">%s</span>'
            '<span class="muted" style="font-size: 13.5px; line-height: 1.35">%s</span></div>'
            '%s</div>'
            % (C['marigoldSoft'], svg(I[icon], 24, '1.8', C['marigoldText']), title, sub,
               svg(I['right'], 20, '1.8', C['chev'])))


body = '''<div class="screen">
  %(hdr)s
  <div class="flow" style="gap: 12px">
    <span class="muted" style="font-size: 15px; line-height: 1.45">
      कोई एक काफ़ी है. टाइप कुछ नहीं करना.</span>
    %(o1)s %(o2)s %(o3)s
  </div>
  %(bar)s
</div>''' % dict(C, hdr=hdr('होटल जोड़ें', 'info', 'होटल'),
                 o1=bigpick('pin', 'यहीं पिन करें', 'होटल में खड़े होकर दबाएँ — GPS से जगह याद रहेगी'),
                 o2=bigpick('camera', 'कार्ड की फ़ोटो', 'रिसेप्शन का बिज़नेस कार्ड — यही ड्राइवर को दिखेगा'),
                 o3=bigpick('camera', 'गेट की फ़ोटो', 'सामने से — वापस आते समय पहचान के लिए'),
                 bar=quickbar('info'))
write('InfoHotelAdd', body)

# -------------------------------------------- 4.3 ज़रूरी जानकारी › दस्तावेज़ जोड़ें
# Any document, one photo, one name. Stays on this phone only, until the tourist deletes it
# — said here, once, when it matters.
body = '''<div class="screen">
  %(hdr)s
  <div class="flow" style="gap: 14px">
    <div style="height: 236px; border-radius: 16px; background: #EFE8DB; border: 1px solid
                %(line)s; display: flex; flex-direction: column; align-items: center;
                justify-content: center; gap: 10px" data-tap="camera">
      %(cam)s
      <span style="font-size: 15.5px; font-weight: 600; color: %(muted)s">फ़ोटो लें</span>
    </div>

    <div class="col" style="gap: 6px">
      <span class="muted" style="font-size: 13.5px">नाम</span>
      <div class="row" style="min-height: 52px; background: %(card)s; border: 1px solid
                  %(line)s; border-radius: 14px; padding: 0 14px" data-tap="type">
        <span style="font-size: 16px">यात्रा बीमा</span>
      </div>
    </div>

    <div class="row" style="gap: 11px; background: %(tealSoft)s; border: 1px solid
                %(tealLine)s; border-radius: 14px; padding: 12px 14px; align-items: flex-start">
      %(lock)s
      <span style="font-size: 14px; color: %(tealText)s; line-height: 1.45; flex: 1">
        सिर्फ़ इसी फ़ोन में रहेगा — कहीं नहीं भेजा जाएगा, और जब तक आप न हटाएँ, रहेगा.</span>
    </div>

    <div style="flex: 1"></div>
    <div style="padding-bottom: 16px">%(save)s</div>
  </div>
  %(bar)s
</div>''' % dict(C, hdr=hdr('दस्तावेज़ जोड़ें', 'info', 'दस्तावेज़'),
                 cam=svg(I['camera'], 40, '1.4', C['muted']),
                 lock=svg(I['check'], 19, '2.1', C['teal']),
                 save=btn('रख लें', 'primary'),
                 bar=quickbar('info'))
write('InfoDocAdd', body)

# ------------------------------------------- 4.4 ज़रूरी जानकारी › दस्तावेज़
# The payoff: the document, full width, the moment it is needed at a desk. Nothing on the
# screen but the document and its name.
body = '''<div class="screen" style="background: %(card)s">
  %(hdr)s
  <div class="flow" style="gap: 12px; padding-bottom: 16px">
    <div style="flex: 1; border-radius: 14px; background: #EFE8DB; border: 1px solid %(line)s;
                display: flex; align-items: center; justify-content: center">
      <span class="muted" style="font-size: 14px; font-weight: 600">दस्तावेज़ की फ़ोटो</span>
    </div>
    <div class="row" style="gap: 12px">
      <span class="muted" style="font-size: 14px; flex: 1">जोड़ा 10 सित॰ · सिर्फ़ इस फ़ोन में</span>
      <div style="min-height: 48px; display: flex; align-items: center" data-tap="delete">
        <span style="font-size: 14.5px; font-weight: 600; color: %(indigo)s;
                     text-decoration: underline">हटाएँ</span></div>
    </div>
  </div>
</div>''' % dict(C, hdr=hdr('यात्रा बीमा', 'info', 'दस्तावेज़'))
write('InfoDocView', body)

# ---------------------------------------------------------------------- 13. Pass
def plan(name, price, sub, note='', on=False):
    ring = ('<div style="width: 24px; height: 24px; border-radius: 12px; border: 7px solid %s; '
            'background: %s"></div>' % (C['marigold'], C['card'])) if on else (
        '<div style="width: 24px; height: 24px; border-radius: 12px; '
        'border: 2px solid %s"></div>' % C['line'])
    nt = ('<span style="background: %s; color: %s; border-radius: 8px; padding: 2px 8px; '
          'font-size: 12.5px; font-weight: 600; width: fit-content">%s</span>'
          % (C['tealSoft'], C['teal'], note)) if note else ''
    return ('<div class="card row" style="padding: 16px 15px; gap: 13px; border-color: %s; '
            'border-width: %s">%s<div class="col" style="flex: 1; gap: 4px">'
            '<span class="t2">%s</span>'
            '<span class="muted" style="font-size: 14.5px">%s</span>%s</div>'
            '<span style="font-family: \'Anek Devanagari\', sans-serif; font-size: 26px; '
            'font-weight: 700">%s</span></div>'
            % (C['marigold'] if on else C['line'], '1.5px' if on else '1px',
               ring, name, sub, nt, price))


body = '''<div class="screen">
  %(hdr)s
  <div class="flow">
    <div class="col" style="gap: 10px; background: %(indigo)s; border-radius: 18px;
                            padding: 20px; color: #F7F3EC; align-items: center">
      <span style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em;
                   color: %(marigold)s; text-transform: uppercase">मुफ़्त ट्रायल चालू</span>
      <span style="font-family: 'Anek Devanagari', sans-serif; font-size: 34px;
                   font-weight: 600; line-height: 1.1">18 घंटे 24 मिनट</span>
      <span style="font-size: 14.5px; opacity: 0.72; text-align: center; line-height: 1.4">
        दुबई पहुँचने के बाद पहले 24 घंटे मुफ़्त</span>
    </div>

    <div class="col" style="gap: 10px">
      <p class="lbl">पास लें</p>
      %(p1)s
      %(p2)s
    </div>

    <div style="flex: 1"></div>
    <div class="col" style="gap: 11px; padding-bottom: 16px">
      <div class="row" style="justify-content: center">%(net)s</div>
      %(b)s
      <span class="muted" style="font-size: 13.5px; text-align: center; line-height: 1.45">
        UPI या कार्ड · भारत से भी ख़रीद सकते हैं<br>
        पास ख़त्म होने पर भी ज़रूरी जानकारी चालू रहेगी</span>
    </div>
  </div>
</div>''' % dict(C,
                 hdr=hdr('पास', 'home'),
                 p1=plan('अकेले', '₹199', '7 दिन · 1 डिवाइस'),
                 p2=plan('परिवार', '₹399', '7 दिन · 4 डिवाइस तक',
                         '₹796 की जगह ₹399', on=True),
                 b=btn('परिवार पास लें · ₹399', 'primary'),
                 net=pill('ख़रीदने के लिए इंटरनेट ज़रूरी', 'download',
                          C['marigoldSoft'], C['warmText'], C['marigoldLine']))
write('Pass', body)

# ------------------------------------------------------------------ 14. FamilyQR
import random
random.seed(7)
cells = []
for r in range(21):
    for c in range(21):
        corner = ((r < 7 and c < 7) or (r < 7 and c > 13) or (r > 13 and c < 7))
        if corner:
            continue
        if random.random() < 0.47:
            cells.append('<rect x="%d" y="%d" width="6" height="6" fill="#141826"/>'
                         % (c * 6, r * 6))
finder = ''.join(
    '<rect x="%d" y="%d" width="42" height="42" fill="#141826"/>'
    '<rect x="%d" y="%d" width="30" height="30" fill="#FFFDF9"/>'
    '<rect x="%d" y="%d" width="18" height="18" fill="#141826"/>'
    % (x, y, x + 6, y + 6, x + 12, y + 12)
    for x, y in [(0, 0), (84, 0), (0, 84)])
qr = ('<svg width="126" height="126" viewBox="0 0 126 126">%s%s</svg>'
      % (''.join(cells), finder))


def device(name, sub, state):
    if state == 'owner':
        badge = ('<span style="background: %s; color: %s; border-radius: 8px; padding: 2px 8px; '
                 'font-size: 12.5px; font-weight: 600">मालिक</span>'
                 % (C['marigoldSoft'], C['warmTextDim']))
        action = ''
    elif state == 'joined':
        badge = ''
        action = ('<div style="min-height: 48px; min-width: 64px; display: flex; '
                  'align-items: center; justify-content: flex-end">'
                  '<span style="font-size: 14.5px; font-weight: 600; color: %s; '
                  'text-decoration: underline">हटाएँ</span></div>' % C['indigo'])
    else:
        return ('<div class="row" style="padding: 14px 15px; gap: 12px; border: 1.5px dashed %s; '
                'border-radius: 16px">%s<span class="muted" style="font-size: 15.5px; flex: 1">'
                'खाली जगह</span></div>'
                % (C['line'], svg(I['plus'], 20, '1.9', C['muted'])))
    return ('<div class="card row" style="padding: 13px 15px; gap: 12px">'
            '<div style="width: 38px; height: 38px; border-radius: 19px; background: %s; '
            'display: flex; align-items: center; justify-content: center">%s</div>'
            '<div class="col" style="flex: 1; gap: 1px">'
            '<div class="row" style="gap: 7px"><span style="font-size: 16px; '
            'font-weight: 600">%s</span>%s</div>'
            '<span class="muted" style="font-size: 13.5px">%s</span></div>%s</div>'
            % (C['sand'], svg(I['user'], 20, '1.8', C['indigo']), name, badge, sub, action))


body = '''<div class="screen">
  %(hdr)s
  <div class="flow">
    <div class="col" style="gap: 14px; align-items: center; background: %(card)s;
                            border: 1px solid %(line)s; border-radius: 18px; padding: 20px">
      <div style="padding: 12px; background: #FFFDF9; border-radius: 12px">%(qr)s</div>
      <div class="col" style="gap: 5px; align-items: center">
        <span style="font-size: 16.5px; font-weight: 600; text-align: center">
          दूसरे फ़ोन पर साथी खोलकर स्कैन करें</span>
        <span style="font-size: 14px; color: %(muted)s; font-weight: 600">
          यह QR 2 मिनट में ख़त्म हो जाएगा</span>
      </div>
    </div>

    <div class="col" style="gap: 9px">
      <div class="row" style="justify-content: space-between">
        <p class="lbl">डिवाइस</p>
        <span class="muted" style="font-size: 14px">2 / 4</span>
      </div>
      %(d1)s %(d2)s %(d3)s
    </div>

    <div style="flex: 1"></div>
    <span class="muted" style="font-size: 14px; text-align: center; padding-bottom: 18px">
      सभी डिवाइस का पास 19 सितंबर तक चलेगा</span>
  </div>
</div>''' % dict(C, hdr=hdr('परिवार पास', 'home', 'पास › परिवार'), qr=qr,
                 d1=device('यह फ़ोन', 'आपका डिवाइस', 'owner'),
                 d2=device('अंजलि', '12 सित॰ को जुड़ी', 'joined'),
                 d3=device('', '', 'empty'))
write('FamilyQR', body)

# --------------------------------------------------------------------- 16. Brand
def swatch(hexv, name, role, dark=False):
    return ('<div class="col" style="gap: 8px">'
            '<div style="height: 76px; border-radius: 12px; background: %s; '
            'border: 1px solid %s"></div>'
            '<div class="col" style="gap: 1px">'
            '<span style="font-size: 15px; font-weight: 600">%s</span>'
            '<span style="font-size: 13px; font-family: ui-monospace, monospace; color: %s">%s</span>'
            '<span style="font-size: 13.5px; color: %s; line-height: 1.35">%s</span></div></div>'
            % (hexv, C['line'], name, C['muted'], hexv, C['muted'], role))


def rule(text):
    return ('<div class="row" style="gap: 10px; align-items: flex-start">'
            '<div style="width: 6px; height: 6px; border-radius: 3px; background: %s; '
            'margin-top: 8px; flex-shrink: 0"></div>'
            '<span style="font-size: 15.5px; line-height: 1.5; flex: 1">%s</span></div>'
            % (C['marigold'], text))


dark_swatches = ''.join(
    '<div class="col" style="flex: 1; gap: 6px; background: %s; padding: 16px 12px">'
    '<div style="height: 40px; border-radius: 9px; background: %s"></div>'
    '<span style="font-size: 12.5px; font-weight: 600; color: %s">%s</span>'
    '<span style="font-size: 11.5px; font-family: ui-monospace, monospace; color: %s">%s</span>'
    '</div>' % (DARK['sand'], hexv, DARK['ink'], name, DARK['muted'], hexv)
    for name, hexv in [('Night', DARK['sand']), ('Card', DARK['card']),
                       ('Ink', DARK['ink']), ('Marigold', DARK['marigold']),
                       ('Teal', DARK['teal']), ('Emergency', DARK['red']),
                       ('Line', DARK['line'])])

brand = '''<div style="width: 900px; min-height: 1620px; background: %(sand)s; color: %(ink)s;
            padding: 46px 48px; display: flex; flex-direction: column; gap: 40px;
            font-family: 'Mukta', system-ui, sans-serif">

  <div class="col" style="gap: 8px">
    <span style="font-family: 'Anek Devanagari', sans-serif; font-size: 40px;
                 font-weight: 700; letter-spacing: -0.015em">दुबई साथी — ब्रांड</span>
    <span style="font-size: 17px; color: %(muted)s">
      धूप में पढ़ा जा सके, टैक्सी में एक हाथ से चले, और भरोसेमंद लगे —
      रंग और टाइप इसी हिसाब से चुने गए हैं.</span>
  </div>

  <div class="col" style="gap: 16px">
    <p class="lbl">रंग</p>
    <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 18px">
      %(s1)s %(s2)s %(s3)s %(s4)s %(s5)s
    </div>
    <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 18px">
      %(s6)s %(s7)s %(s8)s %(s9)s %(s10)s
    </div>
  </div>

  <div class="col" style="gap: 12px">
    <p class="lbl">स्टेटस पट्टी — हर स्क्रीन के ऊपर, चार हाल</p>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px">
      <div style="border: 1px solid %(line)s; border-radius: 12px; overflow: hidden">%(st1)s</div>
      <div style="border: 1px solid %(line)s; border-radius: 12px; overflow: hidden">%(st2)s</div>
      <div style="border: 1px solid %(line)s; border-radius: 12px; overflow: hidden">%(st3)s</div>
      <div style="border: 1px solid %(line)s; border-radius: 12px; overflow: hidden">%(st4)s</div>
    </div>
    <span style="font-size: 14px; color: %(muted)s; line-height: 1.5">
      बाएँ ऑनलाइन/ऑफ़लाइन, बीच में प्लान की मियाद (दबाने पर पास), दाएँ थीम का स्विच.
      हर स्क्रीन पर, एक ही जगह — ढूँढना नहीं पड़ता.</span>
  </div>

  <div class="col" style="gap: 14px">
    <p class="lbl">गहरी थीम</p>
    <div class="row" style="gap: 0; border-radius: 14px; overflow: hidden;
                            border: 1px solid %(line)s">%(dark)s</div>
    <span style="font-size: 14px; color: %(muted)s; line-height: 1.5">
      वही भूमिकाएँ, वही नियम — marigold अब भी “यहाँ दबाना है”, लाल अब भी सिर्फ़ आपातकाल.
      डिफ़ॉल्ट “अपने आप” है: फ़ोन की सेटिंग जो कहे.</span>
  </div>

  <div class="col" style="gap: 16px">
    <p class="lbl">टाइप</p>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px">
      <div class="card col" style="padding: 20px; gap: 10px">
        <span style="font-size: 13px; color: %(muted)s; font-weight: 600">
          Anek Devanagari — हेडिंग</span>
        <span style="font-family: 'Anek Devanagari', sans-serif; font-size: 34px;
                     font-weight: 600; line-height: 1.2">मुझे करामा जाना है</span>
        <span style="font-size: 13.5px; color: %(muted)s">500 · 600 · 700</span>
      </div>
      <div class="card col" style="padding: 20px; gap: 10px">
        <span style="font-size: 13px; color: %(muted)s; font-weight: 600">
          Mukta — UI और बॉडी</span>
        <span style="font-size: 22px; line-height: 1.45">
          Jain khana kahaan milega? · जैन खाना कहाँ मिलेगा?</span>
        <span style="font-size: 13.5px; color: %(muted)s">400 · 500 · 600 · 700</span>
      </div>
      <div class="card col" style="padding: 20px; gap: 10px">
        <span style="font-size: 13px; color: %(muted)s; font-weight: 600">
          Noto Naskh Arabic — अरबी</span>
        <span class="ar" style="font-size: 30px; font-weight: 700">كم الأجرة؟</span>
        <span style="font-size: 13.5px; color: %(muted)s">
          ड्राइवर को दिखाते समय 34px से छोटा नहीं</span>
      </div>
    </div>
  </div>

  <div class="col" style="gap: 16px">
    <p class="lbl">कंपोनेंट</p>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px">
      <div class="col" style="gap: 12px">%(b1)s %(b2)s</div>
      <div class="col" style="gap: 12px">
        <div class="row" style="gap: 8px">%(ch1)s %(ch2)s</div>
        <div class="row" style="gap: 8px">%(pl1)s %(pl2)s</div>
        <div class="row" style="gap: 6px">%(tg1)s %(tg2)s</div>
      </div>
      <div class="col" style="gap: 12px">
        <div class="card row" style="padding: 14px 15px; gap: 12px">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: %(marigoldSoft)s;
                      display: flex; align-items: center; justify-content: center">%(icp)s</div>
          <div class="col" style="flex: 1; gap: 1px">
            <span style="font-size: 16.5px; font-weight: 600">कार्ड</span>
            <span style="font-size: 14px; color: %(muted)s">लिस्ट और नतीजे</span></div>
          %(icr)s
        </div>
        <div style="border: 1px solid %(line)s; border-radius: 14px; overflow: hidden">%(bar)s</div>
      </div>
    </div>
  </div>

  <div class="col" style="gap: 14px">
    <p class="lbl">नियम</p>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 32px">
      %(r1)s %(r2)s %(r3)s %(r4)s %(r5)s %(r6)s %(r7)s %(r8)s
    </div>
  </div>
</div>''' % dict(
    C,
    s1=swatch(C['indigo'], 'Indigo', 'हेडर, नक्शा, ड्राइवर कार्ड'),
    s2=swatch(C['ink'], 'Ink', 'सारा टेक्स्ट'),
    s3=swatch(C['marigold'], 'Marigold', 'हर action — भरा हुआ बटन'),
    s4=swatch(C['teal'], 'Teal', 'ऑफ़लाइन तैयार, हो गया'),
    s5=swatch(C['red'], 'Red', 'रिज़र्व — अभी किसी स्क्रीन पर नहीं'),
    s6=swatch(C['sand'], 'Sand', 'पेज background'),
    s7=swatch(C['card'], 'Card', 'कार्ड और शीट'),
    s8=swatch(C['marigoldSoft'], 'Marigold soft', 'action का हल्का background'),
    s9=swatch(C['tealSoft'], 'Teal soft', 'ऑफ़लाइन बैज'),
    s10=swatch(C['marigoldText'], 'Marigold text', 'हल्के background पर marigold टेक्स्ट/आइकॉन'),
    dark=dark_swatches, st1=strip('before'), st2=strip('trial'),
    st3=strip('pass', online=True), st4=strip('expired'),
    b1=btn('मुख्य action', 'primary'),
    b2=btn('दूसरा action', 'ghost', 'speak'),
    # muted is deliberately used for the swatch grid caption, not as a palette entry
    s11=None,
    ch1=fchip('वेज', True), ch2=fchip('जैन'),
    pl1=pill('ऑफ़लाइन · तैयार', 'wifioff'),
    pl2=pill('ख़रीदने के लिए इंटरनेट ज़रूरी', 'download', C['marigoldSoft'], C['warmText'],
             C['marigoldLine']),
    tg1=tag('जैन'), tg2=tag('सात्विक'),
    icp=svg(I['pin'], 21, '1.8', C['marigold']),
    icr=svg(I['right'], 20, '1.8', C['line']),
    bar=quickbar('transport'),
    r1=rule('Marigold का मतलब है “यहाँ दबाना है”. सजावट के लिए कभी नहीं.'),
    r2=rule('लाल रंग किसी भी स्क्रीन पर नहीं. आपातकाल हमारा काम नहीं — फ़ोन का डायलर और रिसेप्शन बेहतर हैं.'),
    r3=rule('हर दबाने वाली चीज़ कम से कम 48px ऊँची — टैक्सी में हिलते हाथ के लिए.'),
    r4=rule('ऑफ़लाइन बैज वहाँ दिखे जहाँ डेटा पर शक हो सकता है — घर, नक्शा, '
            'रास्ते, खाना, वाक्य. पास और पेमेंट पर उल्टा बैज: “इंटरनेट ज़रूरी”.'),
    r5=rule('अरबी टेक्स्ट सिर्फ़ पढ़ाने के लिए बड़ा — ड्राइवर हाथ की दूरी से पढ़ता है.'),
    r6=rule('ज़रूरी जानकारी पास ख़त्म होने के बाद भी चलती रहे — सब कुछ फ़ोन में है, कुछ भेजा नहीं जाता.'),
    r7=rule('Marigold भरे बटन पर ink टेक्स्ट. हल्के background पर marigold टेक्स्ट या '
            'आइकॉन हो तो गहरा टोन — वरना धूप में पढ़ा नहीं जाएगा.'),
    r8=rule('तीर और borders 3:1 से हल्के नहीं. न दिखने वाला affordance नहीं होता.'),
)
write('Brand', brand)

# ---------------------------------------------------------------------- canvas
# The canvas is grouped the way the app is: everything common at the top, then one row per
# tile. Reading a row tells you the whole of that function.
GROUPS = [
    ('note-common', 'शुरुआत',
     'स्प्लैश, फिर घर. घर पर चार टाइल = चार काम.\nबाकी हर स्क्रीन इन्हीं चार में से किसी की\nबच्ची है, और उसी के नंबर से पहचानी जाती है.',
     ['Welcome', 'Main']),
    ('note-transport', 'टाइल 1 — रास्ता',
     '1.1 कहाँ जाना है? → 1.2 सुन रहा हूँ → 1.3 विकल्प\n→ 1.4 क़दम दर क़दम → 1.5 नक्शा → 1.6 रास्ते में.\n“कहाँ से” कभी नहीं पूछते — फ़ोन जानता है.',
     ['Destination', 'Listening', 'RouteOptions', 'RouteDetail', 'Map', 'MapDiscover']),
    ('note-food', 'टाइल 2 — खाना',
     '2.1 सूची → 2.2 जगह → “कैसे पहुँचें” सीधे 1.3 पर.\nजैन और सात्विक पहली कतार में.',
     ['FoodList', 'Restaurant']),
    ('note-talk', 'टाइल 3 — बोलना',
     '3.1 बोलिए या तैयार वाक्य चुनिए → 3.2 अरबी में\n→ 3.3 ड्राइवर को दिखाएँ. एक ही रास्ता, चाहे\nआवाज़ से आएँ या वाक्य चुनकर.',
     ['SayEntry', 'SayIt', 'ShowDriver']),
    ('note-help', 'टाइल 4 — मदद',
     '4.1 एक ही स्क्रीन. होटल सबसे ऊपर, फिर तीन\nनंबर. पास ख़त्म होने के बाद भी चलती रहती है.',
     ['Emergency']),
    ('note-account', 'घर की पट्टी से',
     'टाइल नहीं. घर के ऊपर वाली पट्टी से खुलते हैं.\nघर.1 पास → घर.2 परिवार → घर.3 सेटिंग.',
     ['Pass', 'FamilyQR', 'Settings']),
]
DARK_SCREENS = ['MainDark', 'FoodListDark', 'EmergencyDark']
# Numbering: 1 and 2 are the splash and home. From there, tile.child — 1.x is रास्ता, 2.x खाना,
# 3.x बोलना, 4.x मदद — and घर.x for the three screens the home strip opens.
TITLES = {
    'Welcome': '1 · स्प्लैश',
    'Main': '2 · घर',
    'Destination': '1.1 · रास्ता › कहाँ जाना है?',
    'Listening': '1.2 · रास्ता › सुन रहा हूँ',
    'RouteOptions': '1.3 · रास्ता › विकल्प',
    'RouteDetail': '1.4 · रास्ता › क़दम दर क़दम',
    'Map': '1.5 · रास्ता › नक्शा',
    'MapDiscover': '1.6 · रास्ता › रास्ते में क्या है',
    'FoodList': '2.1 · खाना › सूची',
    'Restaurant': '2.2 · खाना › जगह',
    'SayEntry': '3.1 · बोलना › क्या कहना है?',
    'SayIt': '3.2 · बोलना › अरबी में',
    'ShowDriver': '3.3 · बोलना › ड्राइवर को दिखाएँ',
    'Emergency': '4.1 · मदद',
    'Pass': 'घर.1 · पास',
    'FamilyQR': 'घर.2 · पास › परिवार',
    'Settings': 'घर.3 · पास › सेटिंग',
    'MainDark': 'D2 · घर (गहरा)',
    'FoodListDark': 'D2.1 · खाना › सूची (गहरा)',
    'EmergencyDark': 'D4.1 · मदद (गहरा)',
}
artboards, annotations = [], []
y = 0
for note_id, heading, note, row in GROUPS:
    annotations.append(dict(id=note_id, x=-400, y=y + 40, w=320, page='page-1',
                            text=heading + '\n' + note))
    for ci, name in enumerate(row):
        artboards.append(dict(file=name + '.dc.html', x=ci * 480, y=y, w=390, h=844,
                              title=TITLES[name], page='page-1'))
    y += 1040
for ci, name in enumerate(DARK_SCREENS):
    artboards.append(dict(file=name + '.dc.html', x=ci * 480, y=0, w=390, h=844,
                          title=TITLES[name], page='page-2'))
annotations.append(dict(
    id='note-dark', x=-400, y=40, w=320, page='page-2',
    text='गहरी थीम\nवही टोकन, वही नियम. टैक्सी में रात को और OLED\nफ़ोन पर बैटरी के लिए — इसलिए यह अलग स्किन\nनहीं, बराबर की थीम है.'))
artboards.append(dict(file='Brand.dc.html', x=0, y=0, w=900, h=1640,
                      title='ब्रांड — रंग, टाइप, कंपोनेंट', page='page-3'))
canvas = dict(
    artboards=artboards,
    annotations=annotations,
    pages=[dict(id='page-1', name='स्क्रीन'), dict(id='page-2', name='गहरी थीम'),
           dict(id='page-3', name='ब्रांड')],
    launch=dict(view='canvas', page='page-1'),
)
(OUT / 'canvas.json').write_text(json.dumps(canvas, ensure_ascii=False, indent=2),
                                 encoding='utf-8')
print('%d artboards in %d groups' % (len(artboards), len(GROUPS)))
