# Generates the Dubai Saathi screen artboards as .dc.html working files.
import json, pathlib
from string import Template

OUT = pathlib.Path('/home/user/dubaisaathi/design/screens')
OUT.mkdir(parents=True, exist_ok=True)

C = dict(
    ink='#141826', indigo='#1A2456', indigoDeep='#0F1530',
    marigold='#E8871E', marigoldSoft='#FDF0DC', marigoldLine='#F2C795',
    teal='#0B7A6B', tealSoft='#E1F2EF',
    red='#C62B2B', redSoft='#FBE7E4',
    sand='#F7F3EC', card='#FFFDF9', line='#E6DED2', muted='#5B6070',
)

FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Anek+Devanagari:wght@500;600;700&family=Mukta:wght@400;500;600;700'
         '&family=Noto+Naskh+Arabic:wght@400;700&display=swap">')

CSS = '''
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: 'Mukta', 'Segoe UI', system-ui, sans-serif;
         -webkit-font-smoothing: antialiased; }
  a { color: #B96A12; text-decoration: none; }
  a:hover { color: #8F5009; }
  .screen { width: 390px; height: 844px; background: #F7F3EC; color: #141826;
            display: flex; flex-direction: column; overflow: hidden; }
  .flow { flex: 1; display: flex; flex-direction: column; gap: 14px;
          padding: 0 20px; overflow: hidden; }
  .hdr { display: flex; align-items: center; gap: 12px; padding: 20px 20px 10px; }
  .t1 { font-family: 'Anek Devanagari', 'Mukta', sans-serif; font-weight: 600;
        font-size: 26px; line-height: 1.15; margin: 0; letter-spacing: -0.01em; }
  .t2 { font-family: 'Anek Devanagari', 'Mukta', sans-serif; font-weight: 600;
        font-size: 19px; line-height: 1.2; margin: 0; }
  .lbl { font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
         text-transform: uppercase; color: #5B6070; margin: 0; }
  .muted { color: #5B6070; }
  .card { background: #FFFDF9; border: 1px solid #E6DED2; border-radius: 16px; }
  .row { display: flex; align-items: center; gap: 12px; }
  .col { display: flex; flex-direction: column; }
  .btn { min-height: 54px; border-radius: 14px; display: flex; align-items: center;
         justify-content: center; gap: 10px; font-weight: 600; font-size: 17px;
         font-family: 'Mukta', sans-serif; }
  .chip { height: 38px; padding: 0 14px; border-radius: 19px; display: flex;
          align-items: center; gap: 6px; font-size: 15px; font-weight: 500;
          white-space: nowrap; }
  .ar { font-family: 'Noto Naskh Arabic', 'Mukta', serif; direction: rtl;
        line-height: 1.6; }
  .tabbar { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
            border-top: 1px solid #E6DED2; background: #FFFDF9; padding: 9px 4px 14px; }
  .tab { display: flex; flex-direction: column; align-items: center; gap: 4px;
         font-size: 12px; font-weight: 600; color: #5B6070; min-height: 48px;
         justify-content: center; }
'''

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
)


def tabbar(active):
    items = [('घर', 'home'), ('जाना', 'route'), ('खाना', 'food'),
             ('बोलना', 'talk'), ('मदद', 'help')]
    out = []
    for label, key in items:
        on = key == active
        col = C['marigold'] if on and key != 'help' else (
            C['red'] if on else C['muted'])
        txt = C['ink'] if on else C['muted']
        out.append('<div class="tab" style="color: %s">%s<span style="color: %s">%s</span></div>'
                   % (col, svg(I[key], 23, '1.7'), txt, label))
    return '<div class="tabbar">' + ''.join(out) + '</div>'


def hdr(title, back=True, right=''):
    left = ('<div style="width: 40px; height: 40px; display: flex; align-items: center">%s</div>'
            % svg(I['left'], 24)) if back else ''
    return ('<div class="hdr">%s<h1 class="t1" style="flex: 1">%s</h1>%s</div>'
            % (left, title, right))


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
        style = 'background: %s; color: %s;' % (C['marigold'], '#231403')
    elif kind == 'ghost':
        style = 'background: transparent; color: %s; border: 1.5px solid %s;' % (
            C['indigo'], C['line'])
    elif kind == 'danger':
        style = 'background: %s; color: #FFFFFF;' % C['red']
    else:
        style = 'background: %s; color: %s;' % (C['card'], C['indigo'])
    ic = svg(I[icon], 21, '1.9') if icon else ''
    return '<div class="btn" style="%s">%s<span>%s</span></div>' % (style, ic, text)


print('helpers ready')

# ---------------------------------------------------------------- 1. Onboarding
def pack_row(label, sub, state, pct=None):
    if state == 'done':
        mark = ('<div style="width: 26px; height: 26px; border-radius: 13px; background: %s; '
                'display: flex; align-items: center; justify-content: center">%s</div>'
                % (C['tealSoft'], svg(I['check'], 15, '2.4', C['teal'])))
    elif state == 'now':
        mark = ('<div style="width: 26px; height: 26px; border-radius: 13px; background: %s; '
                'display: flex; align-items: center; justify-content: center">%s</div>'
                % (C['marigoldSoft'], svg(I['download'], 15, '2.2', C['marigold'])))
    else:
        mark = ('<div style="width: 26px; height: 26px; border-radius: 13px; '
                'border: 1.5px dashed %s"></div>' % C['line'])
    bar = ''
    if pct is not None:
        bar = ('<div style="height: 5px; border-radius: 3px; background: %s; margin-top: 7px">'
               '<div style="width: %d%%; height: 5px; border-radius: 3px; background: %s"></div>'
               '</div>' % (C['line'], pct, C['marigold']))
    return ('<div class="row" style="align-items: flex-start; gap: 12px">%s'
            '<div class="col" style="flex: 1; gap: 1px">'
            '<div class="row" style="justify-content: space-between">'
            '<span style="font-size: 16px; font-weight: 500">%s</span>'
            '<span class="muted" style="font-size: 14px">%s</span></div>%s</div></div>'
            % (mark, label, sub, bar))


body = '''<div class="screen">
  <div class="flow" style="gap: 18px; padding-top: 44px">
    <div class="col" style="gap: 8px">
      <div class="row" style="gap: 10px">
        <div style="width: 42px; height: 42px; border-radius: 12px; background: %(indigo)s;
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'Anek Devanagari', sans-serif; color: %(marigold)s;
                    font-size: 24px; font-weight: 700">सा</div>
        <span style="font-family: 'Anek Devanagari', sans-serif; font-size: 30px;
                     font-weight: 700; letter-spacing: -0.01em">दुबई साथी</span>
      </div>
      <p style="margin: 0; font-family: 'Anek Devanagari', sans-serif; font-size: 21px;
                font-weight: 500; color: %(indigo)s; line-height: 1.35">
        दुबई. आपकी भाषा में. ऑफ़लाइन.</p>
    </div>

    <div class="card" style="padding: 18px 16px">
      <div class="row" style="justify-content: space-between; margin-bottom: 14px">
        <span class="t2">दुबई पैक</span>
        <span class="muted" style="font-size: 14px">84 MB</span>
      </div>
      <div class="col" style="gap: 14px">
        %(r1)s %(r2)s %(r3)s %(r4)s
      </div>
    </div>

    <div class="col" style="gap: 12px; background: %(indigo)s; border-radius: 18px;
                            padding: 20px 18px; color: #F7F3EC">
      <div class="row" style="gap: 8px; color: %(marigold)s">%(wifi)s
        <span style="font-size: 14px; font-weight: 600; letter-spacing: 0.03em">अभी आज़माएँ</span>
      </div>
      <p style="margin: 0; font-family: 'Anek Devanagari', sans-serif; font-size: 22px;
                font-weight: 600; line-height: 1.3">इंटरनेट बंद करके देखिए —<br>साथी फिर भी चलेगा.</p>
      <div class="btn" style="background: %(marigold)s; color: #231403; margin-top: 2px">
        बिना इंटरनेट आज़माएँ</div>
    </div>

    <p class="muted" style="margin: 0; font-size: 14px; text-align: center">
      शुरू करने के लिए अकाउंट ज़रूरी नहीं</p>
  </div>
</div>''' % dict(C,
                 r1=pack_row('नक्शा', '31 MB', 'done'),
                 r2=pack_row('मेट्रो, ट्राम, बस', '4 MB', 'done'),
                 r3=pack_row('खाना और ज़रूरी वाक्य', '9 MB', 'done'),
                 r4=pack_row('हिंदी आवाज़', '62%', 'now', 62),
                 wifi=svg(I['wifioff'], 18, '2'))
write('Onboarding', body)

# ---------------------------------------------------------------------- 2. Home
def quick(icon, title, sub):
    return ('<div class="card row" style="padding: 14px; gap: 13px">'
            '<div style="width: 42px; height: 42px; border-radius: 12px; background: %s; '
            'display: flex; align-items: center; justify-content: center">%s</div>'
            '<div class="col" style="flex: 1; gap: 1px">'
            '<span style="font-size: 16.5px; font-weight: 600">%s</span>'
            '<span class="muted" style="font-size: 14px">%s</span></div>%s</div>'
            % (C['marigoldSoft'], svg(I[icon], 21, '1.8', C['marigold']), title, sub,
               svg(I['right'], 20, '1.8', C['line'])))


body = '''<div class="screen">
  <div class="row" style="justify-content: space-between; padding: 20px 20px 4px">
    %(pill)s
    %(trial)s
  </div>

  <div class="flow" style="justify-content: center; gap: 0">
    <div class="col" style="align-items: center; gap: 18px; margin-top: -40px">
      <div style="width: 168px; height: 168px; border-radius: 84px; background: %(marigold)s;
                  display: flex; align-items: center; justify-content: center;
                  box-shadow: 0 14px 34px rgba(232, 135, 30, 0.32)">
        %(mic)s
      </div>
      <div class="col" style="align-items: center; gap: 6px">
        <span style="font-family: 'Anek Devanagari', sans-serif; font-size: 32px;
                     font-weight: 600">बोलिए</span>
        <span class="muted" style="font-size: 15.5px">जैसे — “मुझे करामा जाना है”</span>
      </div>
    </div>
  </div>

  <div class="col" style="gap: 10px; padding: 0 20px 18px">
    %(q1)s
    %(q2)s
  </div>
  %(tabs)s
</div>''' % dict(C,
                 pill=pill('ऑफ़लाइन · तैयार', 'wifioff'),
                 trial=pill('ट्रायल · 18 घं बाकी', 'clock', C['marigoldSoft'],
                            '#9A5B10', C['marigoldLine']),
                 mic=svg(I['mic'], 72, '1.5', '#FFFDF9'),
                 q1=quick('pin', 'होटल वापस जाएँ', 'Hotel Rimal, Deira · 6.2 km'),
                 q2=quick('food', 'आस-पास वेज खाना', '14 जगह · 1 km के अंदर'),
                 tabs=tabbar('home'))
write('Main', body)

# ----------------------------------------------------------------- 3. Listening
bars = ''.join(
    '<div style="width: 7px; height: %dpx; border-radius: 4px; background: %s"></div>'
    % (h, C['marigold'] if i % 3 else '#F7C88E')
    for i, h in enumerate([18, 38, 64, 96, 52, 78, 120, 66, 40, 86, 58, 30, 70, 44, 22]))

body = '''<div class="screen" style="background: %(indigoDeep)s; color: #F7F3EC">
  <div class="hdr" style="justify-content: flex-end; padding-top: 22px">
    <div style="width: 44px; height: 44px; border-radius: 22px;
                background: rgba(247, 243, 236, 0.1); display: flex;
                align-items: center; justify-content: center">%(close)s</div>
  </div>

  <div class="flow" style="justify-content: center; gap: 34px">
    <div class="row" style="gap: 5px; height: 130px; justify-content: center;
                            align-items: center">%(bars)s</div>

    <div class="col" style="gap: 14px; align-items: center">
      <span style="font-size: 15px; font-weight: 600; letter-spacing: 0.06em;
                   color: %(marigold)s; text-transform: uppercase">सुन रहा हूँ</span>
      <p style="margin: 0; font-family: 'Anek Devanagari', sans-serif; font-size: 30px;
                font-weight: 500; line-height: 1.35; text-align: center">
        मुझे बुर दुबई से करामा<span style="color: rgba(247, 243, 236, 0.45)"> जाना…</span></p>
    </div>
  </div>

  <div class="col" style="gap: 16px; padding: 0 20px 34px; align-items: center">
    <span style="font-size: 14.5px; color: rgba(247, 243, 236, 0.6)">
      हिंदी और हिंग्लिश — दोनों चलेंगे</span>
    <div class="btn" style="background: rgba(247, 243, 236, 0.12); color: #F7F3EC;
                            width: 100%%">रद्द करें</div>
  </div>
</div>''' % dict(C, close=svg(I['close'], 22, '1.9'), bars=bars)
write('Listening', body)
print('1-3 done')

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
        bd = ('<span style="background: %s; color: #9A5B10; border-radius: 11px; '
              'padding: 3px 9px; font-size: 12.5px; font-weight: 600">%s</span>' % (
                  C['marigoldSoft'], badge))
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
    <div class="card row" style="padding: 13px 15px; gap: 10px">
      <div class="col" style="flex: 1; gap: 2px">
        <span class="muted" style="font-size: 13px">कहाँ से</span>
        <span style="font-size: 16px; font-weight: 600">बुर दुबई</span>
      </div>
      %(arrow)s
      <div class="col" style="flex: 1; gap: 2px">
        <span class="muted" style="font-size: 13px">कहाँ तक</span>
        <span style="font-size: 16px; font-weight: 600">करामा</span>
      </div>
      %(pencil)s
    </div>

    <div class="col" style="gap: 11px">
      %(o1)s
      %(o2)s
      %(o3)s
    </div>

    <p class="muted" style="margin: 4px 0 0; font-size: 13.5px">
      किराया और समय अनुमानित · ऑफ़लाइन डेटा, 12 सित॰</p>
  </div>
  %(tabs)s
</div>''' % dict(C,
                 hdr=hdr('करामा जाना है'),
                 arrow=svg(I['right'], 18, '1.9', C['muted']),
                 pencil=svg(I['pencil'], 20, '1.7', C['muted']),
                 o1=option('metro', 'मेट्रो', '32 मिनट', 'AED 5',
                           [('walk', '6 मिनट'), ('metro', 'रेड लाइन · 4 स्टेशन'),
                            ('walk', '8 मिनट')], 'सबसे आसान', lead=True),
                 o2=option('taxi', 'टैक्सी', '16 मिनट', 'AED 26–32',
                           [('taxi', 'सीधे · 6.2 km')], 'सबसे तेज़'),
                 o3=option('bus', 'बस', '44 मिनट', 'AED 3',
                           [('walk', '4 मिनट'), ('bus', 'C7 · 11 स्टॉप'),
                            ('walk', '8 मिनट')], 'सबसे सस्ता'),
                 tabs=tabbar('route'))
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

    <div class="card row" style="padding: 13px 15px; gap: 11px; background: %(tealSoft)s;
                                 border-color: #BFE3DD">
      %(info)s
      <span style="font-size: 14.5px; color: #0A5F54; flex: 1; line-height: 1.4">
        रेड लाइन पर कोई बदलाव नहीं — BurJuman से ADCB सीधा.</span>
    </div>

    <div style="flex: 1"></div>
    <div class="col" style="gap: 10px; padding-bottom: 16px">
      %(b1)s
    </div>
  </div>
  %(tabs)s
</div>''' % dict(C,
                 hdr=hdr('मेट्रो से करामा'),
                 l1=leg('walk', 'पैदल चलिए', 'BurJuman मेट्रो स्टेशन तक', '6 मिनट'),
                 l2=leg('metro', 'रेड लाइन', 'BurJuman → ADCB · 4 स्टेशन', '18 मिनट'),
                 l3=leg('walk', 'पैदल चलिए', 'करामा सेंटर तक', '8 मिनट', last=True),
                 info=svg(I['check'], 19, '2.1', C['teal']),
                 b1=btn('नक्शे पर देखें', 'primary', 'pin'),
                 tabs=tabbar('route'))
write('RouteDetail', body)
print('4-5 done')

# ----------------------------------------------------------------------- 6. Map
roads = ''.join(
    '<path d="%s" stroke="#E9E1D4" stroke-width="%d" stroke-linecap="round"/>' % (d, w)
    for d, w in [('M-20 150 L410 120', 13), ('M-20 330 L410 368', 11),
                 ('M-20 520 L410 486', 13), ('M70 -20 L110 700', 11),
                 ('M250 -20 L214 700', 13), ('M340 -20 L368 700', 9),
                 ('M-20 240 L410 258', 7), ('M160 -20 L150 700', 7)])
creek = ('<path d="M-20 620 C 90 570, 150 640, 250 596 C 330 560, 380 590, 410 570 '
         'L410 700 L-20 700 Z" fill="#CFE4E0"/>')
blocks = ''.join(
    '<rect x="%d" y="%d" width="%d" height="%d" rx="4" fill="#EFE8DB"/>' % b
    for b in [(20, 170, 42, 60), (120, 160, 82, 66), (262, 135, 66, 84),
              (20, 380, 40, 92), (168, 385, 34, 88), (262, 392, 92, 74),
              (30, 274, 30, 44), (272, 276, 58, 40)])
routeline = ('<path d="M96 470 L150 452 L206 300 L292 214" stroke="#E8871E" '
             'stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')

body = '''<div class="screen">
  <div style="position: relative; flex: 1; overflow: hidden">
    <svg width="390" height="760" viewBox="0 0 390 760" style="position: absolute;
         top: -30px; left: 0"><rect width="390" height="760" fill="#F4EFE4"/>
      %(creek)s %(blocks)s %(roads)s %(routeline)s
      <circle cx="96" cy="470" r="11" fill="#1A2456" stroke="#FFFDF9" stroke-width="3.5"/>
      <circle cx="96" cy="470" r="26" fill="#1A2456" opacity="0.12"/>
    </svg>
    <div style="position: absolute; left: 274px; top: 152px">%(pin)s</div>

    <div style="position: absolute; top: 20px; left: 20px; right: 20px">%(chip)s</div>
  </div>

  <div class="col" style="gap: 14px; background: %(card)s; border-top: 1px solid %(line)s;
                          border-radius: 20px 20px 0 0; padding: 18px 20px 16px;
                          margin-top: -20px; position: relative">
    <div class="row" style="gap: 12px">
      <div class="col" style="flex: 1; gap: 2px">
        <span class="t2">करामा सेंटर</span>
        <span class="muted" style="font-size: 14.5px">6.2 km · मेट्रो से 32 मिनट</span>
      </div>
      <div style="width: 46px; height: 46px; border-radius: 14px; background: %(marigoldSoft)s;
                  display: flex; align-items: center; justify-content: center">%(spk)s</div>
    </div>
    %(b)s
  </div>
  %(tabs)s
</div>''' % dict(C, creek=creek, blocks=blocks, roads=roads, routeline=routeline,
                 pin=svg(I['pin'], 34, '1.6', C['marigold']),
                 chip=pill('ऑफ़लाइन नक्शा · पैक v12', 'wifioff', C['card'], C['teal'], C['line']),
                 spk=svg(I['speak'], 22, '1.8', C['marigold']),
                 b=btn('रास्ता देखें', 'primary', 'route'),
                 tabs=tabbar('route'))
write('Map', body)

# ------------------------------------------------------------------ 7. FoodList
def fchip(text, on=False):
    if on:
        return ('<div class="chip" style="background: %s; color: #231403; font-weight: 600">'
                '%s<span>%s</span></div>'
                % (C['marigold'], svg(I['check'], 15, '2.4', '#231403'), text))
    return ('<div class="chip" style="background: %s; color: %s; border: 1px solid %s">'
            '<span>%s</span></div>' % (C['card'], C['ink'], C['line'], text))


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
            '<div class="row" style="gap: 6px">%s</div></div>'
            % (name, sub, dist, cost, ''.join(tag(t) for t in tags)))


body = '''<div class="screen">
  <div class="row" style="justify-content: space-between; padding: 20px 20px 8px">
    <h1 class="t1">खाना</h1>
    %(pill)s
  </div>
  <div class="flow" style="gap: 12px">
    <div class="row" style="gap: 8px; flex-wrap: wrap">
      %(c1)s %(c2)s %(c3)s %(c4)s %(c5)s
    </div>
    <span class="muted" style="font-size: 14px">करामा के 1 km में · 14 जगह</span>
    <div class="col" style="gap: 10px">
      %(f1)s %(f2)s %(f3)s %(f4)s
    </div>
  </div>
  %(tabs)s
</div>''' % dict(C,
                 pill=pill('ऑफ़लाइन', 'wifioff'),
                 c1=fchip('वेज', True), c2=fchip('जैन'), c3=fchip('सात्विक'),
                 c4=fchip('बिना प्याज़-लहसुन'), c5=fchip('झटपट'),
                 f1=fcard('चप्पन भोग', 'गुजराती थाली · करामा', '700 मी', 'AED 30–45',
                          ['वेज', 'जैन']),
                 f2=fcard('सारावना भवन', 'दक्षिण भारतीय · करामा', '1.1 km', 'AED 25–40',
                          ['वेज']),
                 f3=fcard('पूरी बंगाली स्वीट्स', 'नाश्ता, मिठाई · मीना बाज़ार', '1.4 km',
                          'AED 10–20', ['वेज', 'झटपट']),
                 f4=fcard('गोविंदा’ज़', 'सात्विक थाली · अल रफ़ा', '1.8 km', 'AED 35–50',
                          ['वेज', 'सात्विक', 'बिना प्याज़-लहसुन']),
                 tabs=tabbar('food'))
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
      <span style="font-size: 14.5px; color: #7A4A0C; flex: 1; line-height: 1.45">
        जैन थाली अलग बनती है — ऑर्डर करते समय बता दें. वाक्य तैयार है.</span>
    </div>

    <div style="flex: 1"></div>
    <div class="row" style="gap: 10px; padding-bottom: 16px">
      <div style="flex: 1">%(b1)s</div>
      <div style="width: 96px">%(b2)s</div>
    </div>
  </div>
  %(tabs)s
</div>''' % dict(C,
                 hdr=hdr('चप्पन भोग'),
                 t1=tag('वेज'), t2=tag('जैन'), t3=tag('बिना प्याज़-लहसुन'),
                 p=photo, ic=svg(I['talk'], 19, '1.9', C['marigold']),
                 b1=btn('कैसे पहुँचें', 'primary', 'route'),
                 b2=btn('फ़ोन', 'ghost', 'phone'),
                 tabs=tabbar('food'))
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
          इस होटल ले चलो, कितना लगेगा?</span>
        %(mic)s
      </div>
    </div>

    <div class="col" style="gap: 7px">
      <p class="lbl">ड्राइवर को यह दिखाएँ</p>
      <div class="col" style="gap: 14px; background: %(indigo)s; border-radius: 18px;
                              padding: 22px 20px; color: #F7F3EC">
        <p class="ar" style="margin: 0; font-size: 34px; font-weight: 400; line-height: 1.55">
          خذني إلى هذا الفندق، كم الأجرة؟</p>
        <div style="height: 1px; background: rgba(247, 243, 236, 0.18)"></div>
        <span style="font-size: 14.5px; color: rgba(247, 243, 236, 0.66); line-height: 1.4">
          khudhni ila hadha al-funduq, kam al-ujra?</span>
      </div>
    </div>

    <div class="row" style="gap: 10px">
      <div style="flex: 1">%(b1)s</div>
    </div>

    <div style="flex: 1"></div>
    <div class="col" style="gap: 10px; padding-bottom: 16px">
      %(b2)s
      %(b3)s
    </div>
  </div>
  %(tabs)s
</div>''' % dict(C,
                 hdr=hdr('बोलना है'),
                 mic=svg(I['mic'], 21, '1.8', C['muted']),
                 b1=btn('अरबी में सुनाएँ', 'ghost', 'speak'),
                 b2=btn('ड्राइवर को दिखाएँ', 'primary'),
                 b3=btn('दूसरा वाक्य बोलें', 'ghost', 'mic'),
                 tabs=tabbar('talk'))
write('SayIt', body)

# ---------------------------------------------------------------- 10. ShowDriver
body = '''<div class="screen" style="background: %(card)s">
  <div class="row" style="justify-content: space-between; padding: 20px 20px 0">
    <span class="muted" style="font-size: 14px; font-weight: 600; letter-spacing: 0.04em">
      ड्राइवर को दिखाएँ</span>
    <div style="width: 40px; height: 40px; display: flex; align-items: center;
                justify-content: flex-end">%(close)s</div>
  </div>

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
      आपने कहा — “इस होटल ले चलो, कितना लगेगा?”</span>
    <div class="btn" style="background: %(indigo)s; color: #F7F3EC; min-height: 62px;
                            font-size: 19px">%(spk)s
      <span class="ar" style="font-size: 22px">اسمع</span></div>
  </div>
</div>''' % dict(C, close=svg(I['close'], 22, '1.9', C['muted']),
                 spk=svg(I['speak'], 24, '1.8', C['marigold']))
write('ShowDriver', body)

# ---------------------------------------------------------------- 11. Phrasebook
def ptab(text, on=False):
    if on:
        return ('<div class="chip" style="background: %s; color: #231403; font-weight: 600">'
                '<span>%s</span></div>' % (C['marigold'], text))
    return ('<div class="chip" style="background: transparent; color: %s; '
            'border: 1px solid %s"><span>%s</span></div>' % (C['muted'], C['line'], text))


def prow(hi, ar):
    return ('<div class="card row" style="padding: 13px 15px; gap: 12px">'
            '<div class="col" style="flex: 1; gap: 4px">'
            '<span style="font-size: 16.5px; font-weight: 500">%s</span>'
            '<span class="ar" style="font-size: 17px; color: %s; text-align: left">%s</span>'
            '</div>%s</div>' % (hi, C['muted'], ar, svg(I['speak'], 21, '1.8', C['marigold'])))


body = '''<div class="screen">
  <div class="row" style="justify-content: space-between; padding: 20px 20px 8px">
    <h1 class="t1">तैयार वाक्य</h1>
    %(pill)s
  </div>
  <div class="flow" style="gap: 12px">
    <div class="row" style="gap: 8px; flex-wrap: wrap">
      %(t1)s %(t2)s %(t3)s %(t4)s %(t5)s
    </div>
    <div class="col" style="gap: 9px">
      %(r1)s %(r2)s %(r3)s %(r4)s %(r5)s
    </div>
  </div>
  %(tabs)s
</div>''' % dict(C,
                 pill=pill('ऑफ़लाइन', 'wifioff'),
                 t1=ptab('टैक्सी', True), t2=ptab('होटल'), t3=ptab('दुकान'),
                 t4=ptab('खाना'), t5=ptab('मदद'),
                 r1=prow('इस पते पर ले चलो', 'خذني إلى هذا العنوان'),
                 r2=prow('मीटर चालू कीजिए', 'شغّل العدّاد من فضلك'),
                 r3=prow('कितना लगेगा?', 'كم الأجرة؟'),
                 r4=prow('यहीं रोक दीजिए', 'توقف هنا من فضلك'),
                 r5=prow('कार्ड से दे सकता हूँ?', 'هل أستطيع الدفع بالبطاقة؟'),
                 tabs=tabbar('talk'))
write('Phrasebook', body)

# ----------------------------------------------------------------- 12. Emergency
def callbtn(name, num):
    return ('<div class="row" style="background: %s; border-radius: 15px; padding: 0 18px; '
            'min-height: 66px; gap: 13px; color: #FFFFFF">%s'
            '<span style="flex: 1; font-family: \'Anek Devanagari\', sans-serif; '
            'font-size: 21px; font-weight: 600">%s</span>'
            '<span style="font-size: 22px; font-weight: 700; letter-spacing: 0.02em">%s</span>'
            '</div>' % (C['red'], svg(I['phone'], 23, '1.9', '#FFFFFF'), name, num))


def erow(label, name, sub, action):
    return ('<div class="card row" style="padding: 13px 15px; gap: 12px">'
            '<div class="col" style="flex: 1; gap: 2px">'
            '<span class="muted" style="font-size: 13px; font-weight: 600; '
            'letter-spacing: 0.03em">%s</span>'
            '<span style="font-size: 16px; font-weight: 600">%s</span>'
            '<span class="muted" style="font-size: 14px">%s</span></div>%s</div>'
            % (label, name, sub, svg(I[action], 21, '1.8', C['marigold'])))


body = '''<div class="screen">
  <div class="row" style="justify-content: space-between; padding: 20px 20px 8px">
    <h1 class="t1">मदद</h1>
    %(pill)s
  </div>
  <div class="flow" style="gap: 11px">
    %(c1)s %(c2)s %(c3)s
    <div style="height: 2px"></div>
    %(e1)s %(e2)s %(e3)s
    <div class="card row" style="padding: 13px 15px; gap: 12px; border-color: %(marigoldLine)s;
                                 background: %(marigoldSoft)s">
      %(talk)s
      <span style="flex: 1; font-size: 16px; font-weight: 600; color: #7A4A0C">
        आपातकालीन वाक्य — अरबी में</span>
      %(right)s
    </div>
  </div>
  %(tabs)s
</div>''' % dict(C,
                 pill=pill('पास ख़त्म होने पर भी चालू', None, C['tealSoft'], C['teal']),
                 c1=callbtn('पुलिस', '999'),
                 c2=callbtn('एम्बुलेंस', '998'),
                 c3=callbtn('फ़ायर', '997'),
                 e1=erow('नज़दीकी अस्पताल', 'Aster Hospital, Mankhool', '1.8 km · 24 घंटे',
                         'phone'),
                 e2=erow('24-घंटे दवाख़ाना', 'Life Pharmacy, Karama', '600 मी', 'phone'),
                 e3=erow('भारतीय कॉन्सुलेट', 'Consulate of India, Bur Dubai',
                         '3.4 km · सोम–शुक्र', 'phone'),
                 talk=svg(I['talk'], 21, '1.8', C['marigold']),
                 right=svg(I['right'], 20, '1.8', C['marigoldLine']),
                 tabs=tabbar('help'))
write('Emergency', body)
print('9-12 done')

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
      %(b)s
      <span class="muted" style="font-size: 13.5px; text-align: center; line-height: 1.45">
        UPI या कार्ड · भारत से भी ख़रीद सकते हैं<br>
        पास ख़त्म होने पर मदद और ज़रूरी वाक्य चालू रहेंगे</span>
    </div>
  </div>
  %(tabs)s
</div>''' % dict(C,
                 hdr=hdr('पास', back=False),
                 p1=plan('अकेले', '₹199', '7 दिन · 1 डिवाइस'),
                 p2=plan('परिवार', '₹399', '7 दिन · 4 डिवाइस तक',
                         '₹796 की जगह ₹399', on=True),
                 b=btn('परिवार पास लें · ₹399', 'primary'),
                 tabs=tabbar('home'))
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
                 'font-size: 12.5px; font-weight: 600">मालिक</span>' % (C['marigoldSoft'], '#9A5B10'))
        action = ''
    elif state == 'joined':
        badge = ''
        action = ('<span style="font-size: 14.5px; font-weight: 600; color: %s">हटाएँ</span>'
                  % C['red'])
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
        <span style="font-size: 14px; color: %(red)s; font-weight: 600">
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
  %(tabs)s
</div>''' % dict(C, hdr=hdr('परिवार पास'), qr=qr,
                 d1=device('यह फ़ोन', 'आपका डिवाइस', 'owner'),
                 d2=device('अंजलि', '12 सित॰ को जुड़ी', 'joined'),
                 d3=device('', '', 'empty'),
                 tabs=tabbar('home'))
write('FamilyQR', body)

# -------------------------------------------------------------------- 15. MyTrip
def srow(label, value, action='right', accent=False):
    return ('<div class="card row" style="padding: 14px 15px; gap: 12px">'
            '<div class="col" style="flex: 1; gap: 2px">'
            '<span class="muted" style="font-size: 13.5px">%s</span>'
            '<span style="font-size: 16px; font-weight: 600; color: %s">%s</span></div>%s</div>'
            % (label, C['marigold'] if accent else C['ink'], value,
               svg(I[action], 20, '1.8', C['muted'])))


body = '''<div class="screen">
  %(hdr)s
  <div class="flow" style="gap: 10px">
    %(r1)s %(r2)s %(r3)s %(r4)s %(r5)s %(r6)s
    <div style="flex: 1"></div>
    <div class="row" style="gap: 8px; justify-content: center; padding-bottom: 18px">
      %(wifi)s
      <span class="muted" style="font-size: 14px">साथी पूरी तरह ऑफ़लाइन चलता है</span>
    </div>
  </div>
  %(tabs)s
</div>''' % dict(C,
                 hdr=hdr('मेरी ट्रिप', back=False),
                 r1=srow('मेरा होटल', 'Hotel Rimal, Deira', 'pencil'),
                 r2=srow('पास', 'परिवार पास · 19 सित॰ तक'),
                 r3=srow('परिवार', '2 / 4 डिवाइस'),
                 r4=srow('दुबई पैक', 'v12 · 12 सित॰ · 84 MB'),
                 r5=srow('आवाज़', 'माइक जाँचें', 'mic'),
                 r6=srow('भाषा', 'हिन्दी'),
                 wifi=svg(I['wifioff'], 17, '1.9', C['muted']),
                 tabs=tabbar('home'))
write('MyTrip', body)
print('13-15 done')

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


brand = '''<div style="width: 900px; min-height: 1210px; background: %(sand)s; color: %(ink)s;
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
      <div class="col" style="gap: 12px">%(b1)s %(b2)s %(b3)s</div>
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
        <div style="border: 1px solid %(line)s; border-radius: 14px; overflow: hidden">%(tabs)s</div>
      </div>
    </div>
  </div>

  <div class="col" style="gap: 14px">
    <p class="lbl">नियम</p>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 32px">
      %(r1)s %(r2)s %(r3)s %(r4)s %(r5)s %(r6)s
    </div>
  </div>
</div>''' % dict(
    C,
    s1=swatch(C['indigo'], 'Indigo', 'हेडर, नक्शा, ड्राइवर कार्ड'),
    s2=swatch(C['ink'], 'Ink', 'सारा टेक्स्ट'),
    s3=swatch(C['marigold'], 'Marigold', 'हर action — और कुछ नहीं'),
    s4=swatch(C['teal'], 'Teal', 'ऑफ़लाइन तैयार, हो गया'),
    s5=swatch(C['red'], 'Emergency', 'सिर्फ़ आपातकाल'),
    s6=swatch(C['sand'], 'Sand', 'पेज background'),
    s7=swatch(C['card'], 'Card', 'कार्ड और शीट'),
    s8=swatch(C['marigoldSoft'], 'Marigold soft', 'action का हल्का background'),
    s9=swatch(C['tealSoft'], 'Teal soft', 'ऑफ़लाइन बैज'),
    s10=swatch(C['muted'], 'Muted', 'सहायक टेक्स्ट'),
    b1=btn('मुख्य action', 'primary'),
    b2=btn('दूसरा action', 'ghost', 'speak'),
    b3=btn('पुलिस  999', 'danger', 'phone'),
    ch1=fchip('वेज', True), ch2=fchip('जैन'),
    pl1=pill('ऑफ़लाइन · तैयार', 'wifioff'),
    pl2=pill('ट्रायल · 18 घं', 'clock', C['marigoldSoft'], '#9A5B10', C['marigoldLine']),
    tg1=tag('जैन'), tg2=tag('सात्विक'),
    icp=svg(I['pin'], 21, '1.8', C['marigold']),
    icr=svg(I['right'], 20, '1.8', C['line']),
    tabs=tabbar('home'),
    r1=rule('Marigold का मतलब है “यहाँ दबाना है”. सजावट के लिए कभी नहीं.'),
    r2=rule('लाल रंग सिर्फ़ आपातकाल के लिए. बाकी कहीं नहीं — वरना असली ज़रूरत पर नज़र नहीं पड़ेगी.'),
    r3=rule('हर दबाने वाली चीज़ कम से कम 48px ऊँची — टैक्सी में हिलते हाथ के लिए.'),
    r4=rule('ऑफ़लाइन बैज हर स्क्रीन पर दिखे. यही भरोसा बनाता है.'),
    r5=rule('अरबी टेक्स्ट सिर्फ़ पढ़ाने के लिए बड़ा — ड्राइवर हाथ की दूरी से पढ़ता है.'),
    r6=rule('मदद टैब हमेशा दिखे — पास ख़त्म होने के बाद भी.'),
)
write('Brand', brand)

# ---------------------------------------------------------------------- canvas
SCREENS = [
    ['Onboarding', 'Main', 'Listening', 'RouteOptions'],
    ['RouteDetail', 'Map', 'FoodList', 'Restaurant'],
    ['SayIt', 'ShowDriver', 'Phrasebook', 'Emergency'],
    ['Pass', 'FamilyQR', 'MyTrip'],
]
TITLES = {
    'Onboarding': '1 · पहली बार', 'Main': '2 · घर (Ask)', 'Listening': '3 · सुन रहा है',
    'RouteOptions': '4 · रास्ते के विकल्प', 'RouteDetail': '5 · रास्ता — क़दम दर क़दम',
    'Map': '6 · ऑफ़लाइन नक्शा', 'FoodList': '7 · खाना', 'Restaurant': '8 · रेस्टोरेंट',
    'SayIt': '9 · बोलना है', 'ShowDriver': '10 · ड्राइवर को दिखाएँ',
    'Phrasebook': '11 · तैयार वाक्य', 'Emergency': '12 · मदद', 'Pass': '13 · पास',
    'FamilyQR': '14 · परिवार QR', 'MyTrip': '15 · मेरी ट्रिप',
}
ROW_NOTES = [
    ('note-row-1', 'पहुँचने से पहले + घर\nडाउनलोड, “इंटरनेट बंद करके देखिए”, और बड़ा माइक.\nघर पर सिर्फ़ माइक और दो काम जो सबसे ज़्यादा होते हैं.'),
    ('note-row-2', 'जाना है\nविकल्प → क़दम दर क़दम → नक्शा.\nकोई itinerary नहीं. सिर्फ़ “कैसे पहुँचूँ”.'),
    ('note-row-3', 'बोलना और मदद\nहिंदी अंदर, अरबी बाहर. दिखाने वाली स्क्रीन\nअलग है — वह ड्राइवर पढ़ता है, आप नहीं.'),
    ('note-row-4', 'पैसा और सेटिंग\nट्रायल → पास → परिवार. सेटिंग एक ही स्क्रीन में.'),
]
artboards, annotations = [], []
for ri, row in enumerate(SCREENS):
    y = ri * 1040
    annotations.append(dict(id=ROW_NOTES[ri][0], x=-400, y=y + 40, w=320,
                            text=ROW_NOTES[ri][1], page='page-1'))
    for ci, name in enumerate(row):
        artboards.append(dict(file=name + '.dc.html', x=ci * 480, y=y, w=390, h=844,
                              title=TITLES[name], page='page-1'))
artboards.append(dict(file='Brand.dc.html', x=0, y=0, w=900, h=1210,
                      title='ब्रांड — रंग, टाइप, कंपोनेंट', page='page-2'))
canvas = dict(
    artboards=artboards,
    annotations=annotations,
    pages=[dict(id='page-1', name='स्क्रीन'), dict(id='page-2', name='ब्रांड')],
    launch=dict(view='canvas', page='page-1'),
)
(OUT / 'canvas.json').write_text(json.dumps(canvas, ensure_ascii=False, indent=2),
                                 encoding='utf-8')
print('brand + canvas done:', len(artboards), 'artboards')
