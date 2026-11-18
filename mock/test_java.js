const { chromium } = require('playwright'); const fs = require('fs');
const mock = fs.readFileSync('/root/wp/mock/real_java.json', 'utf8');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(`window.__javaMock = ${mock};`);
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.evaluate(() => localStorage.setItem('lux.host','127.0.0.1'));
  await p.reload(); await p.waitForTimeout(3000);
  const tiles = await p.$$eval('.tile .k', a => a.map(x => x.textContent));
  const status = await p.$$eval('.card .li', a => a.map(x => x.innerText.replace(/\n/g,' = ')).filter(t => /J =|J$/.test(t) || / J /.test(t)));
  await p.screenshot({ path: '/root/wp/mock/j1.png', fullPage: true });
  const out = { tiles, javaRows: await p.$$eval('.li', a => a.filter(x => x.querySelector('.pill')).map(x => x.innerText.replace(/\s+/g,' '))) };
  await p.click('#tabs button[data-tab=menu]'); await p.waitForTimeout(300);
  for (const g of ['Temperaturen','Eingänge','Ausgänge','Ablaufzeiten','Betriebsstunden','Anlagenstatus']) {
    await p.click('.li.nav:has-text("Informationen")');
    await p.click(`.li.nav >> text="${g}"`); await p.waitForTimeout(700);
    out[g] = await p.$$eval('h2', h => { const x = h.find(e => /wp\.jar/.test(e.textContent)); if (!x) return []; return [...x.nextElementSibling.querySelectorAll('.li')].map(l => l.innerText.replace(/\s+/g,' ')); });
    if (g === 'Betriebsstunden') await p.screenshot({ path: '/root/wp/mock/j2.png', fullPage: true });
    await p.click('.crumbs a[data-crumb="0"]'); await p.waitForTimeout(200);
  }
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
