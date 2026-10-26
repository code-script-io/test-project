import {chromium} from 'playwright-core';
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1,offline:true});
const page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.resourceType()!=='document'&&/^https?:/.test(r.url()))requests.push(r.url());});
await context.addInitScript(()=>{
  localStorage.setItem('ndz-settings',JSON.stringify({volume:0,reducedMotion:true}));
  // Reproduce phones/webviews that report a desktop pointer despite touch hardware.
  const original=window.matchMedia.bind(window);window.matchMedia=query=>{const result=original(query);if(query.includes('pointer'))Object.defineProperty(result,'matches',{value:false});return result;};
});
const html=await readFile('dist/NIGHTMARE-DEAD-ZONE.html','utf8');await page.route('https://nightmare.invalid/**',r=>r.fulfill({contentType:'text/html',body:html}));
const rect=async selector=>{const r=await page.locator(selector).boundingBox();assert.ok(r);return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};};
try{
  await page.goto('https://nightmare.invalid/?test=1');await page.tap('[data-action="new"]');await page.waitForFunction(()=>window.__game.state.mode==='playing');
  assert.equal(await page.locator('#touch-ui').isVisible(),true);assert.equal(await page.evaluate(()=>window.__game.state.settings.quality),'low');console.log('PASS touch UI and low graphics auto-detect touch hardware even when pointer media reports desktop');
  await page.tap('[data-touch="fire"]');await page.waitForFunction(()=>window.__game.state.ammo===5);console.log('PASS single quick FIRE tap registers in the standalone edition');
  const old=await page.evaluate(()=>window.__game.state),pad=await rect('#touch-move'),fire=await rect('[data-touch="fire"]'),cdp=await context.newCDPSession(page);
  const left={id:1,...pad},right={id:2,x:430,y:175},trigger={id:3,...fire};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left]});left.y-=38;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[left]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});right.x+=65;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[left,right]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right,trigger]});await page.waitForFunction(n=>window.__game.state.ammo<n,old.ammo);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const now=await page.evaluate(()=>window.__game.state);
  assert.ok(now.position.z<old.position.z-.1);assert.ok(Math.abs(now.yaw-old.yaw)>.15);console.log('PASS standalone multi-touch moves, looks and shoots simultaneously without networking');
  await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/mobile-v1.1.png'});assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log('PASS no page exceptions or external asset requests');
}finally{await browser.close();}
