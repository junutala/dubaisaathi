/*
 * The owner's view (decision 040). Everything shown comes from one call to the `admin` edge
 * function with the passphrase; nothing else is fetched and nothing is kept but the passphrase,
 * and that only if "remember" is ticked. Every value from the server is written as text, never
 * as markup: searches and website messages are what strangers typed.
 */
(function () {
  const ENDPOINT = 'https://pixlnjmpksmfqheotinp.supabase.co/functions/v1/admin';
  const AGENTS = 'https://pixlnjmpksmfqheotinp.supabase.co/functions/v1/insights';
  const KEY = 'sb_publishable_kPj5Kv8cbgwrkyp9tRfLRg_Wy4olS5H';
  const REMEMBER = 'saathi.admin.pass';

  const $ = (id) => document.getElementById(id);
  const gate = $('gate');
  const board = $('board');

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }

  function stored() {
    try {
      return localStorage.getItem(REMEMBER) || '';
    } catch {
      return '';
    }
  }

  function store(pass) {
    try {
      if (pass) localStorage.setItem(REMEMBER, pass);
      else localStorage.removeItem(REMEMBER);
    } catch {
      /* the page still works; it just asks again next time */
    }
  }

  const number = (n) => Number(n || 0).toLocaleString('en-IN');
  const percent = (share) =>
    share === null || share === undefined ? '—' : Math.round(Number(share) * 100) + '%';

  function tiles(id, items) {
    const box = $(id);
    box.replaceChildren();
    for (const [value, label] of items) {
      const tile = el('div', undefined, 'tile');
      tile.append(el('b', value), el('span', label));
      box.append(tile);
    }
  }

  function table(id, head, rows, rowClass) {
    const box = $(id);
    box.replaceChildren();
    if (rows.length === 0) {
      const tr = el('tr');
      const td = el('td', 'Nothing yet.', 'empty');
      td.colSpan = head.length;
      tr.append(td);
      box.append(tr);
      return;
    }
    const tr = el('tr');
    for (const [label, numeric] of head) tr.append(el('th', label, numeric ? 'n' : ''));
    box.append(tr);
    for (const row of rows) {
      const line = el('tr', undefined, rowClass ? rowClass(row) : '');
      row.forEach((cell, i) => line.append(el('td', cell, head[i][1] ? 'n' : '')));
      box.append(line);
    }
  }

  const KIND_NAMES = {
    food_discovery: 'Finding food',
    food_dietary_search: 'Food with a constraint',
    restaurant_menu: 'Reading a menu',
    transport_route: 'Getting somewhere',
    attraction_information: 'An attraction',
    travel_topic: 'A travel topic',
    language_assistance: 'बोलना',
    document_access: 'A document',
    hotel_reference: 'The hotel',
    pass_purchase: 'Buying a pass',
  };
  const PILLAR_NAMES = {
    food: 'खाना',
    go: 'जाना',
    know: 'जानना',
    bolna: 'बोलना',
    docs: 'ज़रूरी जानकारी',
    home: 'घर',
  };
  const VERDICT_NAMES = {
    green: 'Green',
    amber: 'Amber',
    red: 'Red',
    insufficient: 'Not enough data yet',
    valuable: 'Offline is valuable',
    used_not_important: 'Used offline, not yet useful there',
    negligible: 'Offline barely used',
  };
  const ANSWER_NAMES = {
    no_signal: 'No signal',
    data_off: 'Kept data off',
    skipped: 'Skipped the question',
  };
  let insights = null;
  let windowName = 'week';

  const minutes = (seconds) => number(Math.round(Number(seconds || 0) / 60)) + ' min';

  function rate(r) {
    if (!r || !r.n) return ['—', '0 / 0', '—'];
    return [
      percent(r.rate),
      number(r.k) + ' / ' + number(r.n),
      percent(r.low) + ' – ' + percent(r.high),
    ];
  }

  function verdict(id, title, v) {
    const box = $(id);
    const name = (v && v.verdict) || 'insufficient';
    box.className = 'verdict ' + name;
    box.replaceChildren(
      el('span', title, 'muted'),
      el('b', VERDICT_NAMES[name] || name),
      el('p', (v && v.reason) || ''),
    );
  }

  function drawInsights() {
    const error = $('pi-error');
    error.hidden = true;
    for (const button of document.querySelectorAll('[data-window]')) {
      button.classList.toggle('on', button.dataset.window === windowName);
    }
    if (!insights || insights.error) {
      error.textContent =
        'Product intelligence did not load: ' + ((insights && insights.error) || 'no data');
      error.hidden = false;
      return;
    }
    const p = insights[windowName] || {};
    const active = p.activeSeconds || {};
    const tasks = p.tasks || {};
    const moves = p.transitions || {};

    verdict('signal', 'Product signal', p.productSignal);
    verdict('offline-value', 'Offline value', p.offlineValue);

    tiles('tiles-pi', [
      [number(p.sessions), 'sessions'],
      [number(p.devices), 'phones'],
      [number(p.meaningfulSessions), 'sessions that tried something'],
      [number(p.usefulSessions), 'sessions that got an answer'],
      [number(p.offlineUsefulSessions), '…of them with no signal'],
      [number(p.repeatDevices), 'phones back on another day'],
      [number(tasks.total), 'tasks'],
      [minutes(active.online), 'active with a signal'],
      [minutes(active.offline), 'active with no signal'],
      [minutes(active.unknown), 'active, signal not known'],
      [number(moves.onlineToOffline), 'times the signal went'],
      [number(moves.offlineToOnline), 'times it came back'],
    ]);

    table(
      'rates',
      [
        ['Measure', false],
        ['Rate', true],
        ['Out of', true],
        ['Range', true],
      ],
      [
        ['Saathi answer rate (all tasks)', ...rate(p.answerRate)],
        ['…with no signal', ...rate(p.answerRateOffline)],
        ['…with a signal', ...rate(p.answerRateOnline)],
        ['Sessions that tried something offline', ...rate(p.offlinePrevalence)],
        ['Phones that came back', ...rate(p.repeatShare)],
        ['Asks we did not have', ...rate(p.unmetRate)],
      ],
    );

    table(
      'kinds',
      [
        ['Task', false],
        ['All', true],
        ['Answered', true],
        ['Failed', true],
        ['Left', true],
        ['No signal', true],
      ],
      Object.entries(p.tasksByKind || {})
        .sort((a, b) => b[1].total - a[1].total)
        .map(([kind, k]) => [
          KIND_NAMES[kind] || kind,
          k.total,
          k.satisfied,
          k.failed,
          k.abandoned,
          k.offline,
        ]),
    );

    table(
      'pillars',
      [
        ['Pillar', false],
        ['Active', true],
        ['Tasks', true],
      ],
      Object.entries(p.activeSecondsByPillar || {})
        .sort((a, b) => b[1] - a[1])
        .map(([pillar, seconds]) => [
          PILLAR_NAMES[pillar] || pillar,
          minutes(seconds),
          number((p.tasksByPillar || {})[pillar]),
        ]),
    );

    table(
      'offline-answers',
      [
        ['Answer', false],
        ['Times', true],
      ],
      Object.entries(p.offlineAnswers || {})
        .sort((a, b) => b[1] - a[1])
        .map(([answer, n]) => [ANSWER_NAMES[answer] || answer, n]),
    );
  }

  function agentItems(items) {
    const list = el('ul', undefined, 'agent-items');
    for (const item of items || []) {
      const li = el('li', undefined, item.checked ? '' : 'unchecked');
      li.append(el('span', item.kind, 'kind ' + item.kind), document.createTextNode(item.text));
      const cites = (item.cites || []).join(', ');
      li.append(
        el('span', item.checked ? cites : 'unchecked · ' + (cites || 'no figures cited'), 'cites'),
      );
      list.append(li);
    }
    return list;
  }

  function agentBlock(title, report, open) {
    const block = el('details', undefined, 'agent');
    block.open = open;
    block.append(el('summary', title));
    if (!report) return block;
    block.append(el('p', report.headline, 'agent-head'));
    if (report.signal) block.append(el('p', report.signal));
    if (report.recommendations && report.recommendations.length > 0) {
      block.append(el('h3', 'What to do this week'));
      const list = el('ol', undefined, 'agent-items');
      for (const r of report.recommendations) {
        const li = el('li', undefined, r.checked ? '' : 'unchecked');
        li.append(
          el('b', r.action),
          el('span', r.why, 'cites'),
          el('span', 'How we will know: ' + r.measure, 'cites'),
        );
        list.append(li);
      }
      block.append(list);
    }
    block.append(agentItems(report.items));
    if (report.dataGaps && report.dataGaps.length > 0) {
      block.append(el('h3', 'What the figures cannot tell us yet'));
      const gaps = el('ul', undefined, 'agent-items');
      for (const gap of report.dataGaps) gaps.append(el('li', gap));
      block.append(gaps);
    }
    return block;
  }

  let polling = null;

  function drawAgents(reports) {
    const box = $('agents');
    const status = $('agents-status');
    box.replaceChildren();
    const latest = reports[0];
    const done = reports.find((r) => r.status === 'done');
    if (!latest) {
      status.textContent = 'No run yet.';
    } else if (latest.status === 'running') {
      status.textContent =
        'Running since ' +
        new Date(latest.created_at).toLocaleString('en-IN') +
        ' — this takes a minute or two.';
    } else if (latest.status === 'failed') {
      status.textContent = 'The last run failed: ' + (latest.error || 'no reason given');
    } else {
      status.textContent =
        'Last run ' +
        new Date(latest.finished_at || latest.created_at).toLocaleString('en-IN') +
        ' (' +
        latest.trigger +
        ', ' +
        (latest.model || 'model unknown') +
        ').';
    }
    if (done) {
      box.append(
        agentBlock('Product Strategist', done.strategy, true),
        agentBlock('Needs agent', done.needs, false),
        agentBlock('Usage agent', done.usage, false),
      );
    }
    const running = latest && latest.status === 'running';
    $('run-agents').disabled = running;
    if (running && polling === null) {
      polling = window.setTimeout(() => {
        polling = null;
        void open(stored() || $('pass').value.trim().toLowerCase(), false);
      }, 15000);
    }
  }

  async function runAgents() {
    const status = $('agents-status');
    $('run-agents').disabled = true;
    status.textContent = 'Starting…';
    try {
      const response = await fetch(AGENTS, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + KEY,
          apikey: KEY,
        },
        body: JSON.stringify({ pass: stored() || $('pass').value.trim().toLowerCase() }),
      });
      const answer = await response.json().catch(() => ({}));
      if (!response.ok) {
        status.textContent =
          'Not started: ' + (answer.error || 'the server said ' + response.status);
        $('run-agents').disabled = false;
        return;
      }
    } catch {
      status.textContent = 'No connection — try again when there is a signal.';
      $('run-agents').disabled = false;
      return;
    }
    void open(stored() || $('pass').value.trim().toLowerCase(), false);
  }

  /*
   * The period (decision 055): Indian days, "since the campaign" unless chosen otherwise. Every
   * section down to "Asked for" is drawn from the span the server was asked for.
   */
  const CAMPAIGN_START = '2026-10-01';
  const ALL_TIME_START = '2026-09-01';
  const indianDay = (offsetDays) =>
    new Date(Date.now() + 330 * 60_000 - offsetDays * 86_400_000).toISOString().slice(0, 10);
  const SPANS = {
    today: () => [indianDay(0), indianDay(0)],
    yesterday: () => [indianDay(1), indianDay(1)],
    week: () => [indianDay(6), indianDay(0)],
    campaign: () => [CAMPAIGN_START, indianDay(0)],
    all: () => [ALL_TIME_START, indianDay(0)],
  };
  const SPAN_NAMES = {
    today: 'today',
    yesterday: 'yesterday',
    week: 'the last 7 days',
    campaign: 'since the campaign',
    all: 'all time',
  };
  let span = { name: 'campaign', from: CAMPAIGN_START, to: indianDay(0) };

  const shortDay = (day) =>
    new Date(day + 'T00:00:00Z').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });

  function spanLabel() {
    const days =
      span.from === span.to ? shortDay(span.from) : shortDay(span.from) + ' – ' + shortDay(span.to);
    return span.name in SPAN_NAMES ? SPAN_NAMES[span.name] + ' · ' + days : days;
  }

  function choose(name) {
    const [from, to] = SPANS[name]();
    span = { name, from, to };
    void open(stored() || $('pass').value.trim().toLowerCase(), false);
  }

  /* The running totals: two lines on one count axis, a point per Indian day, each point's own
     value on hover. Colours are the validated pair in admin.css (--s1, --s2). */
  function drawCumulative(daily) {
    const box = $('cumulative');
    box.replaceChildren();
    if (daily.length === 0) {
      box.append(el('p', 'No days in this period.', 'empty'));
      return;
    }
    let ads = 0;
    let site = 0;
    const points = daily.map((d) => {
      ads += Number(d.fromAds || 0);
      site += Number(d.siteVisits || 0);
      return { day: d.day, ads, site };
    });
    // Drawn at the card's own width, so the type stays readable on a phone.
    const W = Math.max(300, Math.round(box.clientWidth || 600));
    const H = W < 480 ? 180 : 200;
    const L = 36;
    const R = 84;
    const T = 12;
    const B = 28;
    const top = Math.max(1, ...points.map((p) => Math.max(p.ads, p.site)));
    const step = top <= 5 ? 1 : top <= 20 ? 5 : top <= 100 ? 20 : top <= 500 ? 100 : 500;
    const ceiling = Math.ceil(top / step) * step;
    const x = (i) =>
      points.length === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (points.length - 1);
    const y = (v) => T + (H - T - B) * (1 - v / ceiling);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
    svg.setAttribute(
      'aria-label',
      'Running totals: ' +
        points[points.length - 1].ads +
        ' first opens from ads, ' +
        points[points.length - 1].site +
        ' website visits',
    );
    const add = (tag, attrs, text) => {
      const node = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
      if (text !== undefined) node.textContent = text;
      svg.append(node);
      return node;
    };
    for (let v = 0; v <= ceiling; v += step) {
      add('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' });
      add('text', { x: L - 6, y: y(v) + 4, class: 'axis', 'text-anchor': 'end' }, String(v));
    }
    // As many day labels as fit, about 52px apart, so they never run into each other.
    const room = Math.max(2, Math.floor((W - L - R) / 52));
    const every = Math.max(1, Math.ceil(points.length / room));
    points.forEach((p, i) => {
      if (i % every === 0 || i === points.length - 1) {
        add('text', { x: x(i), y: H - 8, class: 'axis', 'text-anchor': 'middle' }, shortDay(p.day));
      }
    });
    // The two end labels, pushed apart when the totals are close so neither covers the other.
    const last = points[points.length - 1];
    let adsY = y(last.ads) + 4;
    let siteY = y(last.site) + 4;
    if (Math.abs(adsY - siteY) < 14) {
      const middle = (adsY + siteY) / 2;
      const upper = last.ads >= last.site ? 'ads' : 'site';
      adsY = upper === 'ads' ? middle - 7 : middle + 7;
      siteY = upper === 'ads' ? middle + 7 : middle - 7;
    }
    const endY = { ads: adsY, site: siteY };
    for (const [key, cls, name] of [
      ['ads', 's1', 'first opens from ads'],
      ['site', 's2', 'website visits'],
    ]) {
      add('polyline', {
        points: points.map((p, i) => x(i) + ',' + y(p[key])).join(' '),
        class: 'series ' + cls,
      });
      points.forEach((p, i) => {
        add('circle', { cx: x(i), cy: y(p[key]), r: 4, class: 'dot ' + cls });
        const hit = add('circle', { cx: x(i), cy: y(p[key]), r: 11, class: 'hit' });
        const tip = document.createElementNS(NS, 'title');
        tip.textContent = shortDay(p.day) + ': ' + p[key] + ' ' + name + ' so far';
        hit.append(tip);
      });
      add(
        'text',
        { x: x(points.length - 1) + 10, y: endY[key], class: 'end' },
        last[key] + (key === 'ads' ? ' from ads' : ' visits'),
      );
    }
    box.append(svg);
  }

  function drawRange(r) {
    $('period-label').textContent = '(' + spanLabel() + ')';
    for (const button of document.querySelectorAll('[data-span]')) {
      button.classList.toggle('on', button.dataset.span === span.name);
    }
    $('span-from').value = span.from;
    $('span-to').value = span.to;
    const error = $('range-error');
    error.hidden = true;
    if (!r || r.error) {
      error.textContent = 'This period could not be read: ' + ((r && r.error) || 'no answer');
      error.hidden = false;
      return;
    }

    // The sentence for an agent or an investor: only numbers the data can stand behind.
    $('pitch').textContent =
      number(r.firstOpens) +
      ' first opens (' +
      number(r.fromAds) +
      ' from ads) · ' +
      number(r.activePhones) +
      ' phones used Saathi · ' +
      number(r.siteVisits) +
      ' website visits, ' +
      number(r.siteToApp) +
      ' went on to the app · ' +
      percent(r.offlineShare) +
      ' of use with no signal · ' +
      number(r.questions) +
      ' questions asked — ' +
      spanLabel() +
      '.';

    tiles('tiles-range', [
      [number(r.firstOpens), 'first opens'],
      [number(r.fromAds), 'of them from ads'],
      [number(r.activePhones), 'phones used Saathi'],
      [number(r.questions), 'questions asked'],
      [percent(r.offlineShare), 'of use with no signal'],
      [number(r.siteVisits), 'website visits'],
      [number(r.siteStayed), 'stayed 10 seconds or more'],
      [number(r.siteToApp), 'went on to the app'],
    ]);

    const daily = r.daily || [];
    drawCumulative(daily);
    let ads = 0;
    let site = 0;
    table(
      'daily',
      [
        ['Day', false],
        ['First opens', true],
        ['From ads', true],
        ['From ads, so far', true],
        ['Website visits', true],
        ['Visits, so far', true],
      ],
      daily.map((d) => {
        ads += Number(d.fromAds || 0);
        site += Number(d.siteVisits || 0);
        return [shortDay(d.day), d.firstOpens, d.fromAds, ads, d.siteVisits, site];
      }),
    );

    // Each way in followed to what its phones did (migration 0025, now by period: 0028).
    table(
      'via',
      [
        ['Came through', false],
        ['Phones', true],
        ['Searched खाना', true],
        ['Used offline', true],
        ['Came back', true],
        ['Began paying', true],
        ['Paid', true],
      ],
      (r.via || []).map((a) => [a.via, a.phones, a.food, a.offline, a.returned, a.began, a.paid]),
    );

    // The website's own visits (decision 053), by the way each reader came.
    table(
      'site',
      [
        ['Came through', false],
        ['Visits', true],
        ['On a phone', true],
        ['Median seconds', true],
        ['Stayed', true],
        ['Scrolled', true],
        ['Reached बोलना', true],
        ['Heard a board', true],
        ['Opened the app', true],
        ['WhatsApp', true],
      ],
      (r.site || []).map((v) => [
        v.tag,
        v.visits,
        v.phones,
        v.median_seconds,
        v.stayed_10s,
        v.scrolled,
        v.reached_bolna,
        v.heard_board,
        v.opened_app,
        v.whatsapp,
      ]),
    );

    table(
      'asks',
      [
        ['What they typed', false],
        ['Where', false],
        ['Times', true],
        ['Phones', true],
      ],
      (r.asks || []).map((a) => [
        a.text,
        a.on === 'go' ? 'जाना' : a.on === 'food' ? 'खाना' : a.on,
        a.times,
        a.phones,
      ]),
    );
  }

  function draw(m) {
    insights = m.insights || null;
    drawInsights();
    drawAgents(m.reports || []);

    const s = m.success || {};
    const regions = s.last7DaysByRegion || {};
    const opened = s.opened || {};

    $('stamp').textContent = 'as of ' + new Date(m.generatedAt).toLocaleString('en-IN');

    tiles('tiles-reach', [
      [number(s.downloads), 'downloads'],
      [number(s.downloadsLast7Days), 'downloads, last 7 days'],
      [number(s.activeLast7Days), 'phones active, last 7 days'],
      [number(regions.dubai), 'in Dubai, last 7 days'],
      [number(regions.india), 'in India, last 7 days'],
      [number(regions.elsewhere), 'elsewhere, last 7 days'],
      [number(s.installedPhones), 'installed on the home screen'],
    ]);

    tiles('tiles-use', [
      [number(s.phonesThreePlusDays), 'came back on 3+ days'],
      [number(s.phoneDays), 'phone-days of use'],
      [percent(s.offlineShare), 'of use with no signal'],
      [number(s.searches), 'questions asked'],
      [number(opened.menu), 'menus opened'],
      [number(opened.steps), 'routes followed'],
      [number(opened.map), 'maps opened'],
      [number(opened.topic), 'topics read'],
      [number(opened.place), 'attractions opened'],
    ]);

    const days = $('days');
    days.replaceChildren();
    const byDay = s.byDay || [];
    if (byDay.length === 0) days.append(el('p', 'No days yet.', 'empty'));
    const most = Math.max(1, ...byDay.map((d) => d.phones));
    for (const d of byDay) {
      const bar = el('div', undefined, 'bar');
      const fill = el('i');
      fill.style.height = Math.max(2, (d.phones / most) * 90) + 'px';
      bar.append(el('span', d.phones), fill, el('span', String(d.day).slice(8)));
      days.append(bar);
    }

    drawRange(m.range);

    const c = m.collection || {};
    const forms = c.forms || [];
    tiles('tiles-collection', [
      [number(forms.length), 'forms pinned'],
      [number(forms.filter((f) => f.pages > 0).length), 'with menu pages'],
      [number(forms.filter((f) => f.pages === 0).length), 'still waiting for a menu'],
      [
        c.pinsByDay && c.pinsByDay[0] ? number(c.pinsByDay[0].pins) : '0',
        'pinned on the latest day',
      ],
    ]);
    table(
      'forms',
      [
        ['Form', false],
        ['Pinned', false],
        ['Pages', true],
        ['Note', false],
      ],
      forms.map((f) => [f.form, f.at, f.pages, f.notes || '']),
      (row) => (row[2] === 0 ? 'waiting' : ''),
    );

    const money = m.money || {};
    const orders = money.ordersByStatus || {};
    tiles('tiles-money', [
      ['₹' + number(money.paidInr), 'paid'],
      [number(money.passes), 'passes issued'],
      [number(Object.values(orders).reduce((a, b) => a + b, 0)), 'orders started'],
      [number(money.couponRedemptions), 'codes redeemed'],
    ]);

    const box = $('messages');
    box.replaceChildren();
    const messages = m.messages || [];
    if (messages.length === 0) box.append(el('p', 'No messages.', 'empty'));
    for (const msg of messages) {
      const item = el('div', undefined, 'message');
      item.append(
        el('div', (msg.at || '') + ' · ' + (msg.name || '—') + ' · ' + (msg.ring || ''), 'muted'),
        el('div', msg.message || ''),
      );
      box.append(item);
    }
  }

  async function open(pass, remember) {
    const error = $('gate-error');
    error.hidden = true;
    let response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + KEY,
          apikey: KEY,
        },
        body: JSON.stringify({ pass, from: span.from, to: span.to }),
      });
    } catch {
      error.textContent = 'No connection — try again when there is a signal.';
      error.hidden = false;
      return;
    }
    if (response.status === 401) {
      store('');
      error.textContent = 'That passphrase is not right.';
      error.hidden = false;
      gate.hidden = false;
      board.hidden = true;
      return;
    }
    if (!response.ok) {
      error.textContent = 'The server said ' + response.status + '. Try again in a minute.';
      error.hidden = false;
      return;
    }
    const data = await response.json();
    if (remember) store(pass);
    gate.hidden = true;
    board.hidden = false;
    $('refresh').hidden = false;
    $('lock').hidden = false;
    draw(data);
  }

  gate.addEventListener('submit', (event) => {
    event.preventDefault();
    void open($('pass').value.trim().toLowerCase(), $('remember').checked);
  });
  $('refresh').addEventListener('click', () => {
    void open(stored() || $('pass').value.trim().toLowerCase(), true);
  });
  $('lock').addEventListener('click', () => {
    store('');
    window.location.reload();
  });
  for (const button of document.querySelectorAll('[data-window]')) {
    button.addEventListener('click', () => {
      windowName = button.dataset.window;
      drawInsights();
    });
  }
  for (const button of document.querySelectorAll('[data-span]')) {
    button.addEventListener('click', () => {
      choose(button.dataset.span);
    });
  }
  $('span-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const from = $('span-from').value;
    const to = $('span-to').value;
    if (!from || !to) return;
    span = from <= to ? { name: '', from, to } : { name: '', from: to, to: from };
    void open(stored() || $('pass').value.trim().toLowerCase(), false);
  });
  $('run-agents').addEventListener('click', () => {
    void runAgents();
  });
  $('copy').addEventListener('click', () => {
    void navigator.clipboard.writeText($('pitch').textContent || '');
  });

  const remembered = stored();
  if (remembered) void open(remembered, true);
})();
