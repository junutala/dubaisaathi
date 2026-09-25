/*
 * The owner's view (decision 040). Everything shown comes from one call to the `admin` edge
 * function with the passphrase; nothing else is fetched and nothing is kept but the passphrase,
 * and that only if "remember" is ticked. Every value from the server is written as text, never
 * as markup: searches and website messages are what strangers typed.
 */
(function () {
  const ENDPOINT = 'https://pixlnjmpksmfqheotinp.supabase.co/functions/v1/admin';
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

  function draw(m) {
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
  $('copy').addEventListener('click', () => {
    void navigator.clipboard.writeText($('pitch').textContent || '');
  });

  const remembered = stored();
  if (remembered) void open(remembered, true);
})();
