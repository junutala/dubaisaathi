import { chromium } from 'playwright';
const OUT='/tmp/claude-0/-home-user-dubaisaathi/08ea65bf-7d6a-566a-8cfe-30d706d06940/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const lang of ['hi','en']) {
  const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});
  if(lang==='en') await p.click('[data-lang-toggle]');
  await p.waitForTimeout(300);
  const r = await p.evaluate(()=>{
    const out={};
    out.docW = document.documentElement.scrollWidth;
    out.winW = window.innerWidth;
    out.headerPos = getComputedStyle(document.querySelector('header.top')).position;
    // elements wider than viewport
    out.overflow=[];
    for (const el of document.querySelectorAll('body *')) {
      const b = el.getBoundingClientRect();
      if (b.right > window.innerWidth + 1 || b.left < -1) {
        if (b.width>0&&b.height>0) out.overflow.push({tag:el.tagName, cls:el.className && String(el.className).slice(0,60), left:Math.round(b.left), right:Math.round(b.right), text:(el.textContent||'').trim().slice(0,40)});
      }
    }
    out.overflow = out.overflow.slice(0,25);
    const k = document.querySelector('.kicker');
    const ks = getComputedStyle(k);
    out.kicker = {lineHeight:ks.lineHeight, fontSize:ks.fontSize, padding:ks.padding, overflow:ks.overflow, h:k.getBoundingClientRect().height};
    // tap targets
    out.small=[];
    for (const el of document.querySelectorAll('a,button,input,select,textarea,label')) {
      const b=el.getBoundingClientRect();
      if(b.width>0&&b.height>0&&(b.height<44||b.width<44)) out.small.push({tag:el.tagName,cls:String(el.className).slice(0,40),w:Math.round(b.width),h:Math.round(b.height),text:(el.textContent||'').trim().slice(0,30)});
    }
    out.small=out.small.slice(0,25);
    return out;
  });
  console.log('==',lang,JSON.stringify(r,null,1));
  await p.close();
}
await b.close();
