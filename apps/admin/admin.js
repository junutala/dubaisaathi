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

  function draw(m) {
    insights = m.insights || null;
    drawInsights();
    drawAgents(m.reports || []);

    const s = m.success || {};
    const regions = s.last7DaysByRegion || {};
    const opened = s.opened || {};

    $('stamp').textContent = 'as of ' + new Date(m.generatedAt).toLocaleString('en-IN');

    // The sentence for an agent or an investor: only numbers the data can stand behind.
    $('pitch').textContent =
      number(s.downloads) +
      ' downloads · ' +
      number(s.activeLast7Days) +
      ' phones used Saathi this week (' +
      number(regions.dubai) +
      ' in Dubai, ' +
      number(regions.india) +
      ' in India) · ' +
      number(s.phonesThreePlusDays) +
      ' came back on 3 or more days · ' +
      percent(s.offlineShare) +
      ' of use with no signal · ' +
      number(s.searches) +
      ' questions asked.';

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

    table(
      'via',
      [
        ['Came through', false],
        ['Phones', true],
      ],
      Object.entries(s.arrivedVia || {}).sort((a, b) => b[1] - a[1]),
    );

    table(
      'asks',
      [
        ['What they typed', false],
        ['Where', false],
        ['Times', true],
        ['Phones', true],
      ],
      ((m.asks && m.asks.notInPack) || []).map((a) => [
        a.text,
        a.on === 'go' ? 'जाना' : a.on === 'food' ? 'खाना' : a.on,
        a.times,
        a.phones,
      ]),
    );

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
        body: JSON.stringify({ pass }),
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
  $('run-agents').addEventListener('click', () => {
    void runAgents();
  });
  $('copy').addEventListener('click', () => {
    void navigator.clipboard.writeText($('pitch').textContent || '');
  });

  const remembered = stored();
  if (remembered) void open(remembered, true);
})();
