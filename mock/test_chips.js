const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const th of ['dark', 'light']) { const p = await b.newPage({ viewport: { width: 400, height: 420 }, deviceScaleFactor: 2, colorScheme: th });
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { window.__javaHttp = 'http://127.0.0.1:8098'; localStorage.setItem('lux.host','127.0.0.1'); });
    await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(1500);
    if (th === 'light') await p.evaluate(() => { jui.d.calc[44] = 1; app.render(); });   // Verdichter läuft (Darstellung „Ein“)
    await p.screenshot({ path: `/root/wp/mock/chips_${th}.png` });
    errs.push(th + ': ' + await p.innerText('.ochips')); }
  console.log(JSON.stringify(errs)); await b.close(); })();
