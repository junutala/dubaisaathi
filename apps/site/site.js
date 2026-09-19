/*
 * One page, two languages. Every sentence is written twice in the HTML, as a `.hi` and an `.en`
 * span; the page's `lang` attribute decides which one shows, the toggle flips it, and the choice
 * is remembered on the device. Hindi first: the reader is an Indian traveller planning Dubai.
 */
(function () {
  const KEY = 'saafarsaathi.lang';
  const root = document.documentElement;
  const toggles = document.querySelectorAll('[data-lang-toggle]');

  /* What the contact form last had to say, as a state rather than a sentence — `apply()` renders
     it, so the words follow the reader flipping the language while they read them. Declared up
     here because `apply()` runs before anything below it exists: a `let` read ahead of its own
     line throws, and that one throw took every listener on the page down with it. */
  let saidState = '';

  function current() {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored === 'en' || stored === 'hi') return stored;
    } catch {
      /* private mode: Hindi it is */
    }
    return 'hi';
  }

  function apply(lang) {
    root.setAttribute('lang', lang);
    for (const button of toggles) button.textContent = lang === 'hi' ? 'English' : 'हिंदी';
    // The name is one word and the same in both catalogues (decision 021). The tab used to
    // translate it — दुबई साथी in Hindi, Dubai Saathi in English — so a bookmark and a search
    // result carried a name the brand rule says does not exist. Only the line after it changes.
    document.title =
      lang === 'hi'
        ? 'Dubaisaathi — बिना इंटरनेट के दुबई'
        : 'Dubaisaathi — Dubai, with no internet';
    // The form's placeholders and labels are attributes, not text, so the two-span trick the
    // rest of the page uses cannot reach them. They carry both languages and get swapped here.
    for (const field of document.querySelectorAll('[data-hi-ph]')) {
      field.placeholder = lang === 'hi' ? field.dataset.hiPh : field.dataset.enPh;
    }
    for (const field of document.querySelectorAll('[data-hi-label]')) {
      field.setAttribute(
        'aria-label',
        lang === 'hi' ? field.dataset.hiLabel : field.dataset.enLabel,
      );
    }
    /*
     * The phones on this page are photographs of the app, and the app has two catalogues. An
     * English reader was looking at seven Hindi screens, three lines under a claim that the app
     * speaks both — so each shot exists twice and the pair swaps here with everything else.
     */
    for (const shot of document.querySelectorAll('[data-en-src]')) {
      const wanted = lang === 'hi' ? shot.dataset.hiSrc : shot.dataset.enSrc;
      if (shot.tagName === 'VIDEO') shot.setAttribute('poster', wanted);
      else if (shot.getAttribute('src') !== wanted) shot.setAttribute('src', wanted);
    }

    said(saidState);
    const share = document.getElementById('share-wa');
    if (share) {
      const line =
        lang === 'hi'
          ? 'दुबई जा रहे हैं? यह ऐप रख लीजिए — बिना इंटरनेट के भी चलता है। https://dubai.saafarsaathi.in'
          : 'Going to Dubai? Keep this one — it works with no internet. https://dubai.saafarsaathi.in';
      share.setAttribute('href', 'https://wa.me/?text=' + encodeURIComponent(line));
    }
  }

  function toggle() {
    const next = root.getAttribute('lang') === 'hi' ? 'en' : 'hi';
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* still flips for this visit */
    }
    apply(next);
  }

  apply(current());
  for (const button of toggles) button.addEventListener('click', toggle);

  /*
   * An advertisement's code rides along: opened as ?code=SSW9VASX, every "open the app" link
   * on this page points at the app with the same code, and the app's pass screen takes it
   * from there (decision 018). Nothing else about the page changes.
   */
  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    for (const link of document.querySelectorAll('a[href^="https://dubai.saafarsaathi.in/"]')) {
      const target = new URL(link.getAttribute('href'));
      target.searchParams.set('code', code.toUpperCase());
      link.setAttribute('href', target.toString());
    }
  }

  /*
   * The contact form (decision 023). This page is static — nginx and a folder of files — so the
   * form posts to the `contact` edge function, which writes the message into our own database.
   * There is no mail server in the path and nothing to bounce.
   *
   * Everything it can say, it says in both languages, because the sentence has to survive the
   * reader flipping the toggle while they read it: `saidState` is what happened, not the words,
   * and `apply()` re-renders it.
   */
  const FUNCTION = 'https://pixlnjmpksmfqheotinp.supabase.co/functions/v1/contact';
  // Publishable by design: it names the project and grants nothing. Same key the app ships.
  const PUBLISHABLE_KEY = 'sb_publishable_kPj5Kv8cbgwrkyp9tRfLRg_Wy4olS5H';

  const SAID = {
    sending: ['भेज रहे हैं…', 'Sending…'],
    sent: ['भेज दिया। हम आपके नंबर पर जवाब देंगे।', 'Sent. We will reply on your number.'],
    name: ['अपना नाम लिख दीजिए।', 'Please write your name.'],
    phone: ['फ़ोन नंबर पूरा लिखिए।', 'Please write the full phone number.'],
    message: ['अपनी बात लिख दीजिए।', 'Please write your message.'],
    many: [
      'आज इस नंबर से कई संदेश आ चुके हैं। बाक़ी बात व्हाट्सएप पर कर लीजिए।',
      'Several messages have come from this number today. Send the rest on WhatsApp.',
    ],
    failed: [
      'यह भेजा नहीं जा सका। व्हाट्सएप पर लिख दीजिए — वह हमेशा चलता है।',
      'That did not go through. Send it on WhatsApp — that always works.',
    ],
  };

  function said(state) {
    saidState = state;
    const box = document.getElementById('contact-said');
    if (!box) return;
    box.textContent = state === '' ? '' : SAID[state][root.getAttribute('lang') === 'hi' ? 0 : 1];
    box.className = state === 'sent' ? 'form-said form-said-good' : 'form-said';
  }

  /*
   * The number as it can be rung, out of whatever was typed. Somebody who writes their own code
   * in — +91, 0091, a leading zero — has not made a mistake, and telling them so over a number
   * we can read perfectly well would be our defect, not theirs.
   */
  function nationalNumber(raw, country) {
    let n = String(raw).replace(/\D/g, '');
    const cc = country === 'IN' ? '91' : '971';
    if (n.length > cc.length && n.startsWith('00' + cc)) n = n.slice(2 + cc.length);
    else if (n.length > cc.length && n.startsWith(cc)) n = n.slice(cc.length);
    return n.replace(/^0+/, '');
  }

  /*
   * The tour film. The native controls are off in the markup so the poster reads as a film
   * rather than as one more screenshot of the app; this hands them over the moment the reader
   * asks for it.
   *
   * The controls go on BEFORE play is attempted, never after it succeeds: if the browser refuses
   * — a data saver, a policy, a codec — the reader is left holding a real control bar they can
   * press themselves, rather than a dimmed poster that did nothing when they tapped it.
   */
  /*
   * बोलना arrives rather than being there. The heading two sections up says there are four and
   * shows three, so the fourth should land when the reader reaches it — the owner's word for it
   * was "like a movie".
   *
   * The section is visible by default and JavaScript is what hides it, never the other way
   * round: a page whose script fails shows every word, and a reader who has asked their phone
   * to stop moving things gets it standing still.
   */
  /*
   * "Send on WhatsApp" is written by `apply()` above, with the rest of the language swap, and
   * nowhere else. It used to be written here a second time as well: the same sentence in two
   * places, which is a pair that drifts apart the first time somebody edits one of them.
   */

  const curtain = document.getElementById('bolna');
  const stillPlease = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (curtain && 'IntersectionObserver' in window && !stillPlease.matches) {
    curtain.classList.add('curtain');
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('curtain-up');
          watcher.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
    );
    watcher.observe(curtain);
  }

  const play = document.getElementById('tour-play');
  const film = play?.previousElementSibling;
  if (play && film) {
    play.addEventListener('click', () => {
      film.controls = true;
      play.classList.add('play-gone');
      const started = film.play();
      if (started) {
        started.catch(() => {
          // The browser refused. The control bar is already on, so the reader presses it and
          // the phone answers for itself — which is the only way to know (CLAUDE.md).
        });
      }
    });
  }

  const form = document.getElementById('contact-form');
  if (form) {
    // The two buttons in the partners band: they pick who is writing and put the cursor in the
    // form, so an outlet owner never has to find the right radio for themselves.
    for (const button of document.querySelectorAll('[data-who]')) {
      button.addEventListener('click', () => {
        const pick = form.querySelector('input[name="who"][value="' + button.dataset.who + '"]');
        if (pick) pick.checked = true;
        // Scrolled, not focused. Focusing an input cancels a smooth scroll in Chromium, so the
        // reader was left halfway down the page — and on a phone the keyboard would then cover
        // the form they had just been sent to. The picked chip is what tells them they arrived.
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const country = String(data.get('country'));
      const name = String(data.get('name') || '').trim();
      const phone = nationalNumber(data.get('phone') || '', country);
      const message = String(data.get('message') || '').trim();

      if (name === '') return said('name');
      if (phone.length < 8 || phone.length > 12) return said('phone');
      if (message === '') return said('message');

      const button = document.getElementById('contact-send');
      button.disabled = true;
      said('sending');
      try {
        const response = await fetch(FUNCTION, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: 'Bearer ' + PUBLISHABLE_KEY,
            apikey: PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            who: String(data.get('who')),
            name,
            country,
            phone,
            message,
            company: String(data.get('company') || ''),
            locale: root.getAttribute('lang'),
          }),
        });
        if (response.ok) {
          form.reset();
          apply(root.getAttribute('lang'));
          said('sent');
        } else {
          said(response.status === 429 ? 'many' : 'failed');
        }
      } catch {
        // No signal, or the function is down. WhatsApp is on the same screen and needs neither.
        said('failed');
      }
      button.disabled = false;
    });
  }
})();
