import { chromium } from 'playwright';
const OUT = '/tmp/claude-0/-home-user-dubaisaathi/08ea65bf-7d6a-566a-8cfe-30d706d06940/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [name, vp, dsf] of [['d', { width: 1440, height: 900 }, 2], ['m', { width: 390, height: 844 }, 2]]) {
  for (const lang of ['hi', 'en']) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: dsf });
    await page.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
    if (lang === 'en') { await page.click('[data-lang-toggle]'); }
    // reveal the bolna curtain
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}-${lang}-full.png`, fullPage: true });
    // above the fold
    await page.screenshot({ path: `${OUT}/${name}-${lang}-fold.png` });
    // per-section
    const secs = ['.hero', '#try', '#watch', '#pillars', '#bolna', '#pass', '#more', '#partners', '#go', '#contact'];
    for (const s of secs) {
      const el = await page.$(s);
      if (el) { try { await el.screenshot({ path: `${OUT}/${name}-${lang}-${s.replace(/[#.]/g,'')}.png` }); } catch(e){} }
    }
    const h = await page.evaluate(() => document.body.scrollHeight);
    console.log(name, lang, 'height', h);
    await page.close();
  }
}
await browser.close();
