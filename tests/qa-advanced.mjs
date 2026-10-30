import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = process.env.TIANGONG_URL || 'http://127.0.0.1:4173/';
const FILE_URL = new URL('../index.html', import.meta.url).href;
const browser = await puppeteer.launch({ executablePath:CHROME, headless:'new', args:['--no-sandbox','--hide-scrollbars','--allow-file-access-from-files'] });
const page = await browser.newPage(); await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
const errors=[]; page.on('pageerror',e=>errors.push('PE '+e.message)); page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon')) errors.push('CE '+m.text());});
const results=[]; const check=(n,ok,d='')=>{results.push({n,ok:!!ok,d}); if(!ok) console.log('FAIL',n,d);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await page.goto(BASE_URL,{waitUntil:'domcontentloaded'}); await wait(17000);
await page.evaluate(()=>document.getElementById('welcome-overlay').hidden=true);
// solar mechanics
await page.click('#mode-mechanism'); await wait(800);
const solar0=await page.evaluate(()=>({id:window.__tiangong.solar.selectedId, deploy:window.__tiangong.solar.selected.deploy}));
await page.click('#btn-solar-retract'); await wait(2600);
const solar1=await page.evaluate(()=>({deploy:window.__tiangong.solar.selected.deploy, state:document.getElementById('solar-state').textContent}));
await page.click('#btn-solar-deploy'); await wait(2600);
const solar2=await page.evaluate(()=>({deploy:window.__tiangong.solar.selected.deploy}));
check('solar retract animates', solar1.deploy < solar0.deploy - 0.1, JSON.stringify({solar0,solar1}));
check('solar deploy animates', solar2.deploy > solar1.deploy + 0.1, JSON.stringify({solar1,solar2}));
// progress slider
await page.evaluate(()=>{const s=document.getElementById('solar-progress'); s.value=33; s.dispatchEvent(new Event('input',{bubbles:true}));}); await wait(500);
check('solar progress slider', await page.evaluate(()=>Math.abs(window.__tiangong.solar.selected.deploy-0.33)<0.03));
// arm joints & presets
await page.evaluate(()=>window.__tiangong.switchMechanismTab('arm')); await wait(700);
await page.click('#btn-arm-demo'); await wait(700);
const demo=await page.evaluate(()=>window.__tiangong.arms.getInfo().demo);
await page.click('#btn-arm-pause'); await wait(300);
check('arm demo runs', demo);
const jointInputs=await page.evaluate(()=>document.querySelectorAll('#arm-joints .arm-joint').length);
check('7 joint sliders', jointInputs===7, String(jointInputs));
const ang0=await page.evaluate(()=>window.__tiangong.arms.getInfo().angles[1]);
await page.evaluate(()=>{const s=document.querySelectorAll('#arm-joints input')[1]; s.value=-40; s.dispatchEvent(new Event('input',{bubbles:true}));}); await wait(1200);
const ang1=await page.evaluate(()=>window.__tiangong.arms.getInfo().angles[1]);
check('joint slider changes angle', Math.abs(ang1-ang0)>0.02, JSON.stringify({ang0,ang1}));
await page.evaluate(()=>{const sel=document.getElementById('arm-preset'); sel.value='stowed'; sel.dispatchEvent(new Event('change',{bubbles:true}));}); await wait(900);
check('arm preset select works', await page.evaluate(()=>window.__tiangong.arms.getInfo().preset==='stowed'));
await page.screenshot({path:'/tmp/qa2-arm.png'});
// assembly playback
await page.click('#mode-assembly'); await wait(600);
await page.click('#btn-assembly-play'); await wait(2200);
const ap=await page.evaluate(()=>({playing:window.__tiangong.assembly.playing,value:window.__tiangong.assembly.value}));
await page.click('#btn-assembly-play'); await wait(300);
check('assembly play advances', ap.playing && ap.value>0.1, JSON.stringify(ap));
// explode play + step + solo
await page.click('#mode-explode'); await wait(500);
await page.click('#btn-explode-play'); await wait(1100);
const ep=await page.evaluate(()=>window.__tiangong.explosion.progress);
await page.click('#btn-explode-play'); await wait(300);
check('explode play advances', ep>0.02, String(ep));
await page.click('#btn-explode-next'); await wait(1200);
check('explode step changes', await page.evaluate(e=>window.__tiangong.explosion.progress>e, ep));
await page.evaluate(()=>window.__tiangong.explodeSelectedComponent());
await wait(400);
check('solo explode feedback', await page.evaluate(()=>!!document.querySelector('.toast') || !!window.__tiangong.explosion.solo));
await page.click('#btn-explode-reset'); await wait(1500);
// visibility
const vis0=await page.evaluate(()=>{const e=window.__tiangong.station.components.get('tianhe-solar-a'); return e.group.visible;});
await page.evaluate(()=>window.__tiangong.toggleComponentVisibility('tianhe-solar-a'));
await wait(300);
const vis1=await page.evaluate(()=>window.__tiangong.station.components.get('tianhe-solar-a').group.visible);
await page.evaluate(()=>window.__tiangong.toggleComponentVisibility('tianhe-solar-a'));
check('component visibility toggle', vis0&&!vis1);
// system modes all
for (const key of ['power','comm','thermal','docking','arm','life']) {
  await page.evaluate(k=>window.__tiangong.activateSystem(k), key); await wait(200);
  const ok=await page.evaluate(k=>!document.getElementById('system-hud').hidden && window.__tiangong.state.system===k, key);
  check('system '+key, ok);
}
await page.evaluate(()=>window.__tiangong.clearSystem());
// keyboard shortcuts
await page.keyboard.press('2'); await wait(200); check('key 2 -> explode', await page.evaluate(()=>document.body.dataset.mode==='explode'));
await page.keyboard.press('5'); await wait(200); check('key 5 -> orbit', await page.evaluate(()=>document.body.dataset.mode==='orbit'));
await page.keyboard.press('1'); await wait(200); check('key 1 -> overview', await page.evaluate(()=>document.body.dataset.mode==='overview'));
await page.keyboard.press('x'); await wait(200); check('key X toggles xray', await page.evaluate(()=>window.__tiangong.state.xray));
await page.keyboard.press('x'); await page.keyboard.press('l'); await wait(200); check('key L toggles labels', await page.evaluate(()=>!window.__tiangong.state.labels));
await page.keyboard.press('l');
// detail action focus + explode selected from detail
await page.evaluate(()=>window.__tiangong.selectComponent('wenxian',{source:'test'}));
await page.evaluate(()=>window.__tiangong.selectComponent('wentian-airlock',{source:'test',focus:true})); await wait(900);
await page.click('#btn-explode-part'); await wait(1200);
check('detail explode action', await page.evaluate(()=>document.body.dataset.mode==='explode' && (!!window.__tiangong.explosion.solo || !!document.querySelector('.toast'))));
await page.click('#btn-global-reset'); await wait(1300);
// quality toggle
await page.click('#btn-quality'); await wait(500);
check('performance mode', await page.evaluate(()=>window.__tiangong.state.quality==='low' && !window.__tiangong.sceneManager.sun.castShadow));
await page.click('#btn-quality'); await wait(300);
// file protocol load
const page2=await browser.newPage(); await page2.setViewport({width:1280,height:800,deviceScaleFactor:1});
const ferr=[]; page2.on('pageerror',e=>ferr.push(e.message)); page2.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon')) ferr.push(m.text());});
const fileUrl=FILE_URL;
await page2.goto(fileUrl,{waitUntil:'domcontentloaded',timeout:30000}); await wait(12000);
const fileInfo=await page2.evaluate(()=>({boot:document.getElementById('boot').className,ready:!!window.__tiangong?._bootReady,canvas:!!document.querySelector('#canvas-container canvas'),err:window.__tiangong?null :'app not booted'}));
check('file:// runs standalone', fileInfo.ready && fileInfo.canvas, JSON.stringify(fileInfo));
check('file:// no errors', ferr.length===0, ferr.join(' | '));
// fresh mobile load
const page3=await browser.newPage(); await page3.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
const merr=[]; page3.on('pageerror',e=>merr.push(e.message));
await page3.goto(BASE_URL,{waitUntil:'domcontentloaded'}); await wait(17000);
await page3.screenshot({path:'/tmp/qa2-mobile-fresh-welcome.png'});
await page3.evaluate(()=>document.getElementById('welcome-overlay').hidden=true); await wait(900);
const m1=await page3.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth, stage:document.getElementById('stage').getBoundingClientRect().toJSON(), canvas:document.querySelector('#canvas-container canvas').getBoundingClientRect().toJSON(), consoleH:document.getElementById('console').getBoundingClientRect().height}));
check('fresh mobile fits stage', !m1.overflow && m1.canvas.width<=390.5, JSON.stringify(m1));
await page3.screenshot({path:'/tmp/qa2-mobile-fresh.png'});
const pnt=await page3.evaluate(()=>{const a=window.__tiangong;const e=a.station.components.get('tianhe-node');const p=e.group.getWorldPosition(new a.sceneManager.camera.position.constructor());const q=a.sceneManager.projectToScreen(p);const r=document.querySelector('#canvas-container canvas').getBoundingClientRect();return {x:r.left+q.x,y:r.top+q.y};});
await page3.touchscreen.tap(pnt.x,pnt.y); await wait(900);
const rightOpen=await page3.evaluate(()=>document.body.classList.contains('drawer-right-open'));
check('mobile tap opens dossier drawer', rightOpen);
await page3.screenshot({path:'/tmp/qa2-mobile-detail.png'});
await page3.evaluate(()=>window.__tiangong.ui.closeDrawers());
// mobile console expanded layout
await page3.click('#console-toggle'); await wait(500);
await page3.screenshot({path:'/tmp/qa2-mobile-console.png'});
const m2=await page3.evaluate(()=>({h:document.getElementById('console').getBoundingClientRect().height, actions:getComputedStyle(document.querySelector('.console-actions')).display}));
check('mobile console compact expanded', m2.h<470, JSON.stringify(m2));
check('fresh mobile no errors', merr.length===0, merr.slice(0,2).join(' | '));
console.log(JSON.stringify({passed:results.filter(r=>r.ok).length,total:results.length,failures:results.filter(r=>!r.ok),errors},null,2));
await browser.close();
