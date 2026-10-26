import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:960,height:640},offline:true});
const page=await context.newPage();const errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
page.on('request',r=>{if(/^https?:/.test(r.url())&&r.resourceType()!=='document')requests.push(r.url());});
await page.addInitScript(()=>{try{localStorage.setItem('ndz-settings',JSON.stringify({quality:'low',volume:0,difficulty:'story',reducedMotion:true}));}catch{}});
try{
  try{await page.goto(pathToFileURL(resolve('dist/NIGHTMARE-DEAD-ZONE.html')).href+'?test=1');}
  catch(error){
    if(!String(error).includes('ERR_BLOCKED_BY_ADMINISTRATOR'))throw error;
    console.log('NOTE: system Chromium policy blocks file: URLs; testing the same HTML bytes through an intercepted document with offline networking.');
    const html=await readFile(resolve('dist/NIGHTMARE-DEAD-ZONE.html'),'utf8');
    await page.route('https://nightmare.invalid/**',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
    await page.goto('https://nightmare.invalid/?test=1');
  }
  await page.locator('h1').waitFor();
  await page.click('[data-action="new"]');await page.waitForFunction(()=>window.__game.state.mode==='playing');
  const before=await page.evaluate(()=>window.__game.state.position.z);await page.keyboard.down('w');await page.waitForTimeout(650);await page.keyboard.up('w');assert.ok(await page.evaluate(()=>window.__game.state.position.z)<before-.1);
  console.log('PASS standalone HTML launches and keyboard movement works with networking disabled');
  await page.evaluate(()=>{window.__game.teleport(-11,-10);window.__game.face(-11,-12,1.05);});
  await page.waitForFunction(()=>document.querySelector('#interaction strong').textContent==='Ceramic fuse');await page.keyboard.press('e');await page.waitForFunction(()=>window.__game.state.inventory.includes('fuse'));
  await page.evaluate(()=>{window.__game.teleport(25,-14);window.__game.face(25,-16,1.4);});await page.waitForFunction(()=>document.querySelector('#interaction strong').textContent==='Lab generator');await page.keyboard.press('e');await page.waitForFunction(()=>window.__game.state.power);
  console.log('PASS standalone HTML E-key puzzle interaction and power progression');
  await page.evaluate(()=>{window.__game.interact('radio-exit');});await page.fill('#radio-code','0417');await page.click('[data-action="submit-code"]');await page.waitForFunction(()=>window.__game.state.mode==='won');
  console.log('PASS standalone HTML radio escape reaches victory');
  await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/standalone-victory.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('PASS no JavaScript/console errors and no HTTP(S) subresource requests');
}finally{await browser.close();}
