import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox','--hide-scrollbars'] });
const page = await browser.newPage(); await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
const errors=[]; page.on('pageerror',e=>errors.push('PAGEERROR '+e.message)); page.on('console',m=>{if(m.type()==='error' && !m.text().includes('favicon')) errors.push('CONSOLE '+m.text());});
const results=[]; const check=(name,ok,detail='')=>{results.push({name,ok:!!ok,detail}); if(!ok) console.log('FAIL',name,detail);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function click(sel){ try{ await page.click(sel); return true;}catch(e){ check('click '+sel,false,e.message); return false; } }
async function state(){ return page.evaluate(()=>({mode:document.body.dataset.mode, theme:document.documentElement.classList.contains('theme-light')?'light':'dark', selected:window.__tiangong?.state?.selectedId, welcomeHidden:document.getElementById('welcome-overlay')?.hidden, detailEmpty:!document.getElementById('detail-empty')?.hidden, sys:!document.getElementById('system-hud').hidden})); function hudVisible(id){return !document.getElementById(id).hidden;} }
await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
await wait(18000);
let s=await state();
check('boot completed', await page.evaluate(()=>document.getElementById('boot').classList.contains('is-done')));
check('welcome visible at first run', !s.welcomeHidden);
check('no runtime errors on load', errors.length===0, errors.join(' | '));
await click('#btn-welcome-start'); await wait(400);
s=await state(); check('welcome dismissed', s.welcomeHidden);
check('scene ready', await page.evaluate(()=>!!window.__tiangong?.sceneManager && !!document.querySelector('#canvas-container canvas')));
const base=await page.evaluate(()=>{const a=window.__tiangong,sm=a.sceneManager; return {camFinite:sm.camera.position.toArray().every(Number.isFinite), treeRows:document.querySelectorAll('#tree-structure .tree-row').length, labels:[...document.querySelectorAll('.annotation-label')].filter(n=>n.style.display!=='none').length, comps:a.station.components.size, fps:document.getElementById('status-fps').textContent, mode:document.body.dataset.mode};});
check('camera finite', base.camFinite); check('tree populated', base.treeRows>20, String(base.treeRows)); check('labels visible', base.labels>=3, String(base.labels)); check('smooth frame rate on GPU', parseInt(base.fps)>45, base.fps);
// Tree select
await page.evaluate(()=>{const row=document.querySelector('.tree-node[data-select-id="tianhe-node"] > .tree-row'); row?.click();});
await wait(1200);
const treeSel=await page.evaluate(()=>({name:document.getElementById('detail-name')?.textContent, state:window.__tiangong.state.selectedId, hud:!document.getElementById('selection-hud').hidden, detail:!document.getElementById('detail-content').hidden, outline:window.__tiangong.sceneManager.outlinePass.selectedObjects.length}));
check('tree selects component', treeSel.state==='tianhe-node' && treeSel.name==='节点舱', JSON.stringify(treeSel));
check('selection panel visible', treeSel.hud && treeSel.detail);
// views
await click('.view-btn[data-view="top"]'); await wait(1200);
await click('.view-btn[data-view="iso"]'); await wait(1200);
check('view controls work', await page.evaluate(()=>window.__tiangong.sceneManager.camera.position.toArray().every(Number.isFinite)));
// search
await page.click('#tree-search'); await page.type('#tree-search','太阳翼'); await wait(600);
const search=await page.evaluate(()=>({visible:[...document.querySelectorAll('#tree-structure .tree-node')].filter(n=>!n.hidden).length, empty:document.getElementById('tree-empty').hidden}));
check('search filters tree', search.visible>0 && search.empty===true, JSON.stringify(search));
await page.evaluate(()=>{const i=document.getElementById('tree-search'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true}));});
await wait(300);
// systems
await click('.seg-tab[data-tree-tab="systems"]'); await wait(300);
await click('.system-chip[data-system="power"]'); await wait(1100);
let sys=await page.evaluate(()=>({hud:!document.getElementById('system-hud').hidden, name:document.getElementById('system-hud-name').textContent, semantic:window.__tiangong.sceneManager.outlinePass.selectedObjects.length}));
check('system highlight active', sys.hud && /能源/.test(sys.name) && sys.semantic>0, JSON.stringify(sys));
await page.screenshot({path:'/tmp/qa-system.png'});
await click('#btn-clear-system'); await wait(400);
check('system highlight cleared', await page.evaluate(()=>document.getElementById('system-hud').hidden));
// xray + theme + labels + dims
await click('#toggle-xray'); await wait(500);
check('xray active', await page.evaluate(()=>window.__tiangong.state.xray && document.body.classList.contains('xray-active')));
await page.screenshot({path:'/tmp/qa-xray.png'});
await click('#toggle-xray'); await wait(300);
await click('#btn-theme'); await wait(600);
check('light theme', await page.evaluate(()=>document.documentElement.classList.contains('theme-light')));
await page.screenshot({path:'/tmp/qa-light.png'});
await click('#btn-theme'); await wait(500);
await click('#toggle-dimensions'); await wait(500);
const dims=await page.evaluate(()=>({on:window.__tiangong.state.dimensions, visible:[...document.querySelectorAll('.dimension-label')].filter(n=>n.style.display!=='none').length, annotations:[...document.querySelectorAll('.annotation-label')].filter(n=>n.style.display!=='none').length}));
check('dimensions visible and annotations ceded', dims.on && dims.visible>=3 && dims.annotations===0, JSON.stringify(dims));
await page.screenshot({path:'/tmp/qa-dimensions.png'});
await click('#toggle-dimensions'); await wait(300);
// pick 3D
const pickPoint=await page.evaluate(()=>{const a=window.__tiangong; const e=a.station.components.get('tianhe-node'); const p=e.group.getWorldPosition(new a.sceneManager.camera.position.constructor()); const q=a.sceneManager.projectToScreen(p); const r=document.querySelector('#canvas-container canvas').getBoundingClientRect(); return {x:r.left+q.x,y:r.top+q.y};});
await page.mouse.move(pickPoint.x,pickPoint.y); await wait(500);
check('hover tooltip', await page.evaluate(()=>!document.getElementById('hover-tip').hidden));
await page.mouse.click(pickPoint.x,pickPoint.y); await wait(700);
const picked=await page.evaluate(()=>window.__tiangong.state.selectedId);
check('3D raycast selection', !!picked, String(picked));
// explode
await click('#mode-explode'); await wait(600);
await page.evaluate(()=>{const s=document.getElementById('explode-slider'); s.value=60; s.dispatchEvent(new Event('input',{bubbles:true}));}); await wait(400);
const ex1=await page.evaluate(()=>({value:document.getElementById('explode-value').textContent, progress:window.__tiangong.explosion.progress}));
check('explode slider linked', parseFloat(ex1.value)>20 && ex1.progress>0.2, JSON.stringify(ex1));
await click('#btn-explode-all'); await wait(2500);
const ex2=await page.evaluate(()=>({progress:Math.round(window.__tiangong.explosion.progress*100), level:window.__tiangong.explosion.getLevel(), slider:document.getElementById('explode-slider').value}));
check('explode all reaches 100%', ex2.progress>=99 && ex2.level===3, JSON.stringify(ex2));
await page.screenshot({path:'/tmp/qa-explode.png'});
await click('#btn-explode-reset'); await wait(1800);
check('assemble resets', await page.evaluate(()=>window.__tiangong.explosion.progress<0.05));
// mechanism
await click('#mode-mechanism'); await wait(1100);
const mech=await page.evaluate(()=>({mode:document.body.dataset.mode, solarOptions:document.querySelectorAll('#solar-select option').length, tab:document.querySelector('[data-mechanism-tab="solar"]').classList.contains('is-active')}));
check('mechanism mode ready', mech.mode==='mechanism' && mech.solarOptions===6, JSON.stringify(mech));
await click('[data-mechanism-tab="arm"]'); await wait(800);
check('arm tab', await page.evaluate(()=>!document.querySelector('#mech-arm').hidden));
await click('#btn-arm-demo'); await wait(900);
check('arm demo running', await page.evaluate(()=>window.__tiangong.arms.getInfo().demo));
await click('#btn-arm-pause'); await wait(300);
await page.screenshot({path:'/tmp/qa-mechanism.png'});
// assembly
await click('#mode-assembly'); await wait(1000);
check('assembly stage 0', await page.evaluate(()=>document.getElementById('assembly-date').textContent.includes('2021.04.29')));
await page.evaluate(()=>{const s=document.getElementById('assembly-slider'); s.value=5; s.dispatchEvent(new Event('input',{bubbles:true}));}); await wait(1500);
const asm=await page.evaluate(()=>({date:document.getElementById('assembly-date').textContent,title:document.getElementById('assembly-title').textContent,modules:['tianhe','wentian','mengtian'].map(id=>window.__tiangong.station.modules[id].group.visible)}));
check('assembly reaches T config', /2022.11.03/.test(asm.date) && asm.modules.every(Boolean), JSON.stringify(asm));
await page.screenshot({path:'/tmp/qa-assembly.png'});
// orbit
await click('#mode-orbit'); await wait(2800);
const orb=await page.evaluate(()=>({earth:window.__tiangong.sceneManager.environment.earth.group.visible, auto:window.__tiangong.sceneManager.controls.autoRotate, sun:document.getElementById('orbit-sun-value').textContent}));
check('orbit earth + auto camera', orb.earth && orb.auto, JSON.stringify(orb));
await page.screenshot({path:'/tmp/qa-orbit.png'});
await click('#mode-overview'); await wait(1000);
// compare/help
await click('#btn-compare'); await wait(500);
check('compare modal', await page.evaluate(()=>!document.getElementById('compare-modal').hidden && document.querySelectorAll('#compare-table .compare-row').length>5));
await click('#compare-close');
await click('#btn-help'); await wait(300);
check('help modal', await page.evaluate(()=>!document.getElementById('help-modal').hidden));
await click('#help-close');
// reset
await click('#btn-global-reset'); await wait(1400);
const reset=await page.evaluate(()=>({mode:document.body.dataset.mode, progress:window.__tiangong.explosion.progress, xray:window.__tiangong.state.xray, camFinite:window.__tiangong.sceneManager.camera.position.toArray().every(Number.isFinite)}));
check('global reset', reset.mode==='overview' && reset.progress<0.05 && !reset.xray && reset.camFinite, JSON.stringify(reset));
// mobile
await page.setViewport({width:390,height:844,deviceScaleFactor:1}); await wait(1200);
const mob=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>window.innerWidth, leftOpen:document.body.classList.contains('drawer-left-open'), rightOpen:document.body.classList.contains('drawer-right-open'), consoleCollapsed:document.getElementById('console').classList.contains('console-collapsed'), drawerBtn:getComputedStyle(document.getElementById('btn-left-drawer')).display}));
check('mobile no horizontal overflow', !mob.overflow, JSON.stringify(mob));
check('mobile drawers available', mob.drawerBtn!=='none');
check('mobile console collapsed by default', mob.consoleCollapsed, JSON.stringify(mob));
await page.screenshot({path:'/tmp/qa-mobile.png'});
await click('#btn-left-drawer'); await wait(600);
check('left drawer opens', await page.evaluate(()=>document.body.classList.contains('drawer-left-open')));
await page.screenshot({path:'/tmp/qa-mobile-drawer.png'});
await click('#left-close'); await wait(300);
await click('#console-toggle'); await wait(500);
check('console expands', await page.evaluate(()=>!document.getElementById('console').classList.contains('console-collapsed')));
await page.screenshot({path:'/tmp/qa-mobile-console.png'});
console.log(JSON.stringify({passed:results.filter(r=>r.ok).length,total:results.length,failures:results.filter(r=>!r.ok),errors},null,2));
fs.writeFileSync('/tmp/qa-report.json', JSON.stringify({results,errors},null,2));
await browser.close();
