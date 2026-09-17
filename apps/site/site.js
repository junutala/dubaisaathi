/*
 * One page, two languages. Every sentence is written twice in the HTML, as a `.hi` and an `.en`
 * span; the page's `lang` attribute decides which one shows, the toggle flips it, and the choice
 * is remembered on the device. Hindi first: the reader is an Indian traveller planning Dubai.
 */
(function () {
  const KEY = 'saafarsaathi.lang';
  const root = document.documentElement;
  const toggles = document.querySelectorAll('[data-lang-toggle]');

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
    document.title =
      lang === 'hi' ? 'दुबई साथी — बिना इंटरनेट के दुबई' : 'Dubai Saathi — Dubai, with no internet';
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
   * An advertisement's code rides along: opened as ?code=SS-7K3M2X, every "open the app" link
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
})();
