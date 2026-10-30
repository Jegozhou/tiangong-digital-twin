import puppeteer from 'puppeteer-core';
const dir='/Volumes/ZHITAI/中国航天站/screenshots';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox','--hide-scrollbars']});
const page=await browser.newPage(); await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,17000));
await page.screenshot({path:`${dir}/00-welcome.png`});
await page.evaluate(()=>document.getElementById('welcome-overlay').hidden=true); await new Promise(r=>setTimeout(r,900));
await page.screenshot({path:`${dir}/01-overview.png`});
// mechanism arm
await page.evaluate(()=>{const a=window.__tiangong;a.setMode('mechanism');a.switchMechanismTab('arm');}); await new Promise(r=>setTimeout(r,2200));
await page.screenshot({path:`${dir}/02-mechanism-arm.png`});
// explode all
await page.evaluate(()=>{const a=window.__tiangong;a.clearSelection();a.setMode('explode');}); await new Promise(r=>setTimeout(r,700));
await page.click('#btn-explode-all'); await new Promise(r=>setTimeout(r,3800));
await page.screenshot({path:`${dir}/03-explode.png`});
// assembly
await page.evaluate(()=>window.__tiangong.setMode('assembly')); await new Promise(r=>setTimeout(r,600));
await page.evaluate(()=>window.__tiangong.setAssemblyValue(5)); await new Promise(r=>setTimeout(r,2200));
await page.screenshot({path:`${dir}/04-assembly.png`});
// orbit
await page.evaluate(()=>window.__tiangong.setMode('orbit')); await new Promise(r=>setTimeout(r,3500));
await page.screenshot({path:`${dir}/05-orbit.png`});
// light model
await page.evaluate(()=>{const a=window.__tiangong;a.setMode('overview');a.clearSelection();a.sceneManager.fitHome(true);a.toggleTheme();}); await new Promise(r=>setTimeout(r,1800));
await page.screenshot({path:`${dir}/06-light-model.png`});
// power highlight on light? switch back dark first, reset, system
await page.evaluate(()=>{const a=window.__tiangong;a.toggleTheme();a.sceneManager.fitHome(true);a.activateSystem('power');}); await new Promise(r=>setTimeout(r,1600));
await page.screenshot({path:`${dir}/07-system-power.png`});
// mobile fresh
const mobile=await browser.newPage(); await mobile.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
const merr=[]; mobile.on('pageerror',e=>merr.push(e.message));
await mobile.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,17000));
await mobile.evaluate(()=>document.getElementById('welcome-overlay').hidden=true); await new Promise(r=>setTimeout(r,800));
await mobile.screenshot({path:`${dir}/08-mobile.png`});
const pt=await mobile.evaluate(()=>{const a=window.__tiangong;const e=a.station.components.get('tianhe-living');const p=e.group.getWorldPosition(new a.sceneManager.camera.position.constructor());const q=a.sceneManager.projectToScreen(p);const r=document.querySelector('#canvas-container canvas').getBoundingClientRect();return{x:r.left+q.x,y:r.top+q.y};});
await mobile.touchscreen.tap(pt.x,pt.y); await new Promise(r=>setTimeout(r,1100));
await mobile.screenshot({path:`${dir}/09-mobile-dossier.png`});
console.log('errors',errs,merr);
console.log('shots done');
await browser.close();
