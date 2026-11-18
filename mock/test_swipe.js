const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__javaHttp = 'http://127.0.0.1:8098'; localStorage.setItem('lux.host','127.0.0.1'); });
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.waitForFunction(() => app.mode === 'java' && jui.d, null, {timeout: 15000});
  const swipe = async (x1, x2, y=400, steps=8) => {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:x1,y}]});
    for (let i=1;i<=steps;i++) await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:x1+(x2-x1)*i/steps,y}]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    await p.waitForTimeout(600);
    return p.evaluate(() => app.tab);
  };
  const r = [];
  r.push(await swipe(150, 300));   // rechts am Anfang → bleibt dash
  for (let i=0;i<5;i++) r.push(await swipe(330, 60));
  await p.screenshot({path:'/tmp/app.png'});
  for (let i=0;i<2;i++) r.push(await swipe(60, 330));
  r.push(await swipe(200, 180)); // zu kurz
  const cdp = await ctx.newCDPSession(p); // vertikal
  await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:200,y:600}]});
  for (let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:200+i*5,y:600-i*40}]});
  await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
  await p.waitForTimeout(400); r.push(await p.evaluate(()=>app.tab));
  // mid-animation screenshot
  await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:330,y:400}]});
  for (let i=1;i<=4;i++) await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:330-i*30,y:400}]});
  await p.screenshot({path:'/tmp/mid.png'});
  await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
  await p.waitForTimeout(600);
  r.push(await p.evaluate(()=>[app.tab, $('#main').style.transform, document.querySelector('#tabs .on').dataset.tab]));
  console.log(JSON.stringify({r, errs}));
  await b.close();
})();
