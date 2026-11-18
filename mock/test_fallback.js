const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { window.__javaHttp = 'http://127.0.0.1:8097'; localStorage.setItem('lux.host', '127.0.0.1'); });
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(3000);
  console.log(JSON.stringify({ mode: await p.evaluate(() => app.mode), tabs: await p.$$eval('#tabs button', a => a.map(x => x.innerText)), tile: await p.innerText('.tile') }));
  await b.close();
})();
