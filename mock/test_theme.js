const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const th of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, timezoneId: 'Europe/Berlin', colorScheme: th });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { window.__javaHttp = 'http://127.0.0.1:8098'; localStorage.setItem('lux.host', '127.0.0.1'); localStorage.setItem('lux.interval', '5'); });
    await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(12000);
    await p.screenshot({ path: `/root/wp/mock/t_${th}_dash.png` });
    await p.click('[data-jf="hzmode"]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `/root/wp/mock/t_${th}_sheet.png` }); await p.click('#bc');
    await p.click('#tabs button[data-tab=settings]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `/root/wp/mock/t_${th}_app.png` });
    if (th === 'light') { await p.selectOption('#sTheme', 'dark'); await p.click('#sSave'); await p.waitForTimeout(500); errs.push('switch->' + await p.evaluate(() => document.documentElement.dataset.theme)); }
    await ctx.close();
  }
  console.log(JSON.stringify(errs)); await b.close();
})();
