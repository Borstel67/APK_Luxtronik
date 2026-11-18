const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.evaluate(() => { localStorage.setItem('lux.host','127.0.0.1'); });
  await p.reload(); await p.waitForTimeout(2000);
  await p.screenshot({ path: '/root/wp/mock/s1.png', fullPage: true });
  // edit Heizung mode
  await p.click('text=Heizung'); await p.waitForTimeout(300);
  await p.click('label.opt:has-text("Party")'); await p.click('#bo'); await p.waitForTimeout(1500);
  const heiz = await p.textContent('.li.edit .v');
  // menu -> Einstellungen -> Temperaturen
  await p.click('#tabs button[data-tab=menu]'); await p.waitForTimeout(300);
  await p.click('.li.nav:has-text("Einstellungen")'); await p.click('.li.nav:has-text("Temperaturen")'); await p.waitForTimeout(800);
  await p.click('text=Temperatur +-'); await p.click('#sp'); await p.click('#sp'); await p.click('#bo'); await p.waitForTimeout(1200);
  await p.screenshot({ path: '/root/wp/mock/s2.png', fullPage: true });
  const off = await p.textContent('.li.edit .v');
  await p.emulateMedia({ colorScheme: 'dark' }); await p.evaluate(() => app.applyTheme());
  await p.click('#tabs button[data-tab=dash]'); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/root/wp/mock/s3.png', fullPage: true });
  console.log(JSON.stringify({ heiz, off, errs }));
  await b.close();
})();
