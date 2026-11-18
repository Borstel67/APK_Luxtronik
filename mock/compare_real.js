// Gleicht die Java-Seiten der App (echte 3003/3004/3005-Daten via mock_8888) mit den
// Original-WebSocket-Seiten der Steuerung (real_capture2.txt) ab.
const { chromium } = require('playwright'); const fs = require('fs');
const cap = fs.readFileSync('/root/wp/mock/real_capture2.txt', 'utf8').split(/\r?\n/);
const ws = {};
cap.forEach((l, i) => { const m = l.match(/^--- GET \S+ \((.+)\) ---$/); if (m) { const key = (ws[m[1]] ? m[1] + '#2' : m[1]); ws[key] = cap[i + 1]; } });
const items = xml => [...xml.matchAll(/<item id='[^']+'><name>([^<]*)<\/name>(.*?)<value>([^<]*)<\/value><\/item>/g)].map(m => ({ n: m[1], v: m[3], ro: !/<min>|<option/.test(m[2]) }));
const norm = s => s.toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9äöü]/g, '');
const numOf = s => { const m = String(s).replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ timezoneId: 'Europe/Berlin' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__javaHttp = 'http://127.0.0.1:8098'; localStorage.setItem('lux.host', '127.0.0.1'); });
  await p.goto('http://127.0.0.1:8099/index.html'); await p.waitForTimeout(1500);
  const app = await p.evaluate(() => {
    const rows = page => page.fields.map(f => ({ n: f.label, v: jui.show(f), ro: !!f.ro, pid: f.pid }));
    const info = {}; LUX_INFO.forEach(g => info[g.g] = g.items.filter(e => jui.infoVisible(e)).map(e => ({ n: e.n, v: jui.infoValue(e) })));
    return { mode: app.mode, level: jui.level(), temp: rows(jui.pageSet('temp')), system: rows(jui.pageSet('system')),
      hz: jui.show(jui.fHzMode()), ww: jui.show(jui.fWWMode()), wwsoll: jui.show(jui.fWWSoll()), tpm: jui.show(jui.fTempPM()),
      curve: rows(jui.pageCurve(0)), info, state: jui.betrZust(), hg: jui.V(181), mk: [jui.V(5), jui.V(6), jui.V(209)], tdi: jui.V(7), zirk: jui.V(8),
      clocks: CLOCKS.filter(c => jui.V(c.v)).map(c => c.id) };
  });
  const report = { mode: app.mode, level: app.level, state: app.state, quick: { hz: app.hz, ww: app.ww, wwsoll: app.wwsoll, tpm: app.tpm }, curve: app.curve,
    vis: { heizgrenze: app.hg, mk1_3: app.mk, tdi: app.tdi, zirk: app.zirk, clocks: app.clocks }, pages: {} };
  const cmp = (title, wsItems, appRows) => {
    const res = { match: 0, diff: [], onlyWS: [], onlyApp: [] };
    const used = new Set();
    wsItems.forEach(w => {
      const a = appRows.find((r, i) => !used.has(i) && norm(r.n) === norm(w.n) && (used.add(i) || true));
      if (!a) { res.onlyWS.push(w.n + ' = ' + w.v); return; }
      const nw = numOf(w.v), na = numOf(a.v);
      const same = (nw !== null && na !== null) ? Math.abs(nw - na) < 0.051 : norm(w.v) === norm(a.v);
      if (same) res.match++; else res.diff.push(`${w.n}: WS "${w.v}" / App "${a.v}"`);
    });
    appRows.forEach((r, i) => { if (!used.has(i)) res.onlyApp.push(r.n + ' = ' + r.v); });
    report.pages[title] = res;
  };
  cmp('Einstellungen/Temperaturen', items(ws['Temperaturen#2']), app.temp);
  cmp('System Einstellung', items(ws['System Einstellung']), app.system);
  ['Temperaturen', 'Eingänge', 'Ausgänge', 'Ablaufzeiten', 'Betriebsstunden', 'Anlagenstatus'].forEach(g => cmp('Info/' + g, items(ws[g]), app.info[g] || []));
  report.betriebsartWS = items(ws['Betriebsart']).map(x => x.n + ' = ' + x.v);
  report.errs = errs;
  console.log(JSON.stringify(report, null, 1));
  await b.close();
})();
