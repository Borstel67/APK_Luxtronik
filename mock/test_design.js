// Screenshots des AquaControl-Designs (Java-Modus mit echten Daten + WebSocket-Fallback)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const mk = async (java) => {
    const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, timezoneId: 'Europe/Berlin' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript((java) => { if (java) window.__javaHttp = 'http://127.0.0.1:8098'; localStorage.setItem('lux.host', '127.0.0.1'); localStorage.setItem('lux.interval', '5'); }, java);
    await p.goto('http://127.0.0.1:8099/index.html');
    return p;
  };
  const p = await mk(true);
  await p.waitForTimeout(21000);                       // 5 Abfragen für die Verlaufslinie
  await p.screenshot({ path: '/root/wp/mock/d_1_dash.png', fullPage: true });
  await p.click('#tabs button[data-tab=heiz]'); await p.waitForTimeout(300);
  await p.click('[data-jl="curve:0"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: '/root/wp/mock/d_2_curve.png' });
  await p.click('[data-jf="e0"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: '/root/wp/mock/d_3_sheet.png' });
  await p.click('#bc');
  await p.click('#tabs button[data-tab=service]'); await p.waitForTimeout(300);
  await p.screenshot({ path: '/root/wp/mock/d_4_service.png' });
  await p.click('#tabs button[data-tab=settings]'); await p.waitForTimeout(300);
  await p.screenshot({ path: '/root/wp/mock/d_5_app.png', fullPage: true });
  const w = await mk(false); await w.waitForTimeout(3000);
  await w.screenshot({ path: '/root/wp/mock/d_6_ws.png' });
  console.log(JSON.stringify({ errs, sub: await p.textContent('#subtxt'), mode: await w.evaluate(() => app.mode) }));
  await b.close();
})();
