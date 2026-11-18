const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 760 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.evaluate(() => { localStorage.setItem('lux.host','127.0.0.1'); });
  await p.reload(); await p.waitForTimeout(2500);
  await p.click('#tabs button[data-tab=menu]'); await p.waitForTimeout(300);
  const pill = await p.textContent('.pill');
  await p.click('.li.nav:has-text("Einstellungen")'); await p.waitForTimeout(300);
  const items = await p.$$eval('.li.nav .k', a => a.map(x => x.textContent));
  await p.click('.li.nav:has-text("Systemeinstellung")'); await p.waitForTimeout(800);
  await p.screenshot({ path: '/root/wp/mock/s4.png' });
  // wrong code via manual dialog
  await p.click('.crumbs a'); await p.waitForTimeout(200);
  await p.click('.li.nav:has-text("Zugang")'); await p.fill('#acCode','1234'); await p.click('#bo'); await p.waitForTimeout(1500);
  const toast = await p.textContent('#toast');
  console.log(JSON.stringify({ pill, items, toast, errs }));
  await b.close();
})();
