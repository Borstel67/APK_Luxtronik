// End-to-end test of the wp.jar-based UI against mock_8888.py (HTTP bridge on :8098).
const { chromium } = require('playwright');
const shot = async (p, n) => p.screenshot({ path: `/root/wp/mock/v2_${n}.png`, fullPage: true });
const rows = p => p.$$eval('#sheet .li', a => a.map(x => x.innerText.replace(/\s+/g, ' ')));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { window.__javaHttp = 'http://127.0.0.1:8098'; localStorage.setItem('lux.host', '127.0.0.1'); });
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(1500);
  const out = { mode: await p.evaluate(() => app.mode), tabs: await p.$$eval('#tabs button', a => a.map(x => x.innerText)) };
  out.hero = await p.innerText('.hero'); out.tiles = await p.$$eval('.tile', a => a.map(x => x.innerText.replace(/\n/g, ' ')));
  out.dashRows = await p.$$eval('.card .li', a => a.map(x => x.innerText.replace(/\s+/g, ' ')));
  await shot(p, '1_dash');
  // 1) Betriebsart Heizung -> Party
  await p.click('[data-jf="hzmode"]'); await p.click('label.opt:has-text("Party")'); await p.click('#bo'); await p.waitForTimeout(500);
  out.confirm1 = await rows(p); await shot(p, '2_confirm'); await p.click('#bo'); await p.waitForTimeout(800);
  // 2) WW-Soll +2,0 K
  await p.click('[data-jf="wwsoll"]'); for (let i = 0; i < 4; i++) await p.click('#sp'); await p.click('#bo'); await p.waitForTimeout(400);
  out.confirm2 = await rows(p); await p.click('#bo'); await p.waitForTimeout(800);
  // 3) Heizkurve Endpunkt +1,0
  await p.click('#tabs button[data-tab=ww]'); await p.waitForTimeout(300); await shot(p, '3b_ww'); await p.click('#tabs button[data-tab=heiz]'); await p.waitForTimeout(300); await shot(p, '3_heiz');
  await p.click('[data-jl="curve:0"]'); await p.waitForTimeout(300);
  await p.click('[data-jf="e0"]'); await p.click('#sp'); await p.click('#sp'); await p.click('#bo'); await p.waitForTimeout(200);
  await shot(p, '4_curve'); out.curveBar = await p.innerText('.sendbar');
  await p.click('[data-jsend]'); await p.waitForTimeout(400);
  out.confirm3 = await rows(p); await p.click('#bo'); await p.waitForTimeout(800);
  // 4) Systemeinstellung: Konflikt ZWE1 Art = Nein (Funktion bleibt "Hz u. Ww")
  await p.click('#tabs button[data-tab=service]'); await p.waitForTimeout(300); await shot(p, '5_service');
  await p.click('[data-jl="set:system"]'); await p.waitForTimeout(300); await shot(p, '6_system');
  out.systemRows = await p.$$eval('.li', a => a.length); out.systemRO = await p.$$eval('.li:not(.edit):not(.nav)', a => a.map(x => x.innerText.replace(/\s+/g, ' ')));
  await p.click('[data-jf="s36"]'); await p.click('label.opt >> nth=0'); await p.click('#bo'); await p.waitForTimeout(200);
  await p.click('[data-jsend]'); await p.waitForTimeout(400); out.conflictToast = await p.textContent('#toast');
  await p.click('[data-jreset]'); await p.waitForTimeout(200);
  // 5) Pumpenoptimierung -> Nein
  await p.click('[data-jf="s49"]'); await p.click('label.opt:has-text("Nein")'); await p.click('#bo'); await p.click('[data-jsend]'); await p.waitForTimeout(400);
  out.confirm5 = await rows(p); await p.click('#bo'); await p.waitForTimeout(800);
  // 6) Schaltuhr Heizkreis 1) Ein 06:00 -> 05:30
  await p.click('[data-jback]'); await p.click('[data-jl="clocks"]'); await p.waitForTimeout(200); await p.click('[data-jl="clock:hk"]'); await p.waitForTimeout(300);
  await p.click('.tlink >> nth=0'); await p.selectOption('#th', '05'); await p.selectOption('#tm', '30'); await p.click('#bo'); await shot(p, '7_clock');
  await p.click('[data-jsend]'); await p.waitForTimeout(400);
  out.confirm6 = await rows(p); await p.click('#bo'); await p.waitForTimeout(800);
  // 7) Informationen
  await p.click('[data-jback]'); await p.click('[data-jback]'); await p.click('[data-jl="info"]'); await p.waitForTimeout(300); await shot(p, '8_info');
  out.infoGroups = await p.$$eval('h2', a => a.map(x => x.innerText));
  out.log = await (await p.request.get('http://127.0.0.1:8098/log')).json();
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
