import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.GAME_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[];const page=await browser.newPage({viewport:{width:960,height:640}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
await page.addInitScript(()=>localStorage.setItem('ndz-settings',JSON.stringify({quality:'low',difficulty:'story',volume:0,reducedMotion:true})));
await mkdir('artifacts',{recursive:true});
const state=()=>page.evaluate(()=>window.__game.state);
try{
  await page.goto(`${base}/?test=1`);await page.click('[data-action="new"]');await page.waitForFunction(()=>window.__game.state.mode==='playing');
  await page.keyboard.press('p');await page.waitForFunction(()=>window.__game.state.mode==='paused');await page.keyboard.press('p');await page.waitForFunction(()=>window.__game.state.mode==='playing');console.log('PASS keyboard pause toggles back to gameplay');
  await page.keyboard.press('Tab');await page.waitForFunction(()=>window.__game.state.mode==='journal');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__game.state.mode==='playing');console.log('PASS Escape closes journal without leaving controls stuck');
  await page.evaluate(()=>{window.__game.standOn(-11,-12,.925);window.__game.key('Space',true);window.__game.advance(.15);window.__game.key('Space',false);});assert.ok((await state()).feet>1.3);await page.evaluate(()=>window.__game.advance(1));assert.ok(Math.abs((await state()).feet-.925)<.02);console.log('PASS jump from furniture lands back on its supporting surface');
  await page.evaluate(()=>{window.__game.teleport(0,8);window.__game.enemy(0,3,8);window.__game.look(-Math.PI/2,-.1);window.__game.shoot();});assert.ok((await state()).enemies[0].health<140);console.log('PASS hitscan uses new look direction before the next rendered frame');
  await page.evaluate(()=>{window.__game.teleport(0,8);window.__game.setHealth(37);window.__game.look(1.2);});await page.keyboard.press('f');await page.keyboard.press('p');await page.waitForFunction(()=>window.__game.state.mode==='paused');await page.click('[data-action="menu"]');await page.click('[data-action="continue"]');await page.waitForFunction(()=>window.__game.state.mode==='playing');assert.equal((await state()).health,37);assert.ok(Math.abs((await state()).yaw-1.2)<.001);assert.equal((await state()).flashlight,false);console.log('PASS Continue preserves health, look direction and flashlight state');
  // Capture the world itself, not the HUD, with the flashlight off.
  for(const [name,x,z,yaw] of [['hall',0,8,0],['lab',25,-6,0],['tunnel',0,-21,0],['forest',0,17,Math.PI]]){
    await page.evaluate(p=>window.__game.teleport(...p),[x,z,yaw]);await page.waitForTimeout(350);await page.locator('#game-canvas').screenshot({path:`artifacts/visibility-${name}.png`});
  }
  await page.keyboard.press('p');await page.waitForFunction(()=>window.__game.state.mode==='paused');await page.click('[data-action="settings"]');assert.equal(await page.locator('#brightness').inputValue(),'1');await page.locator('#brightness').fill('1.6');await page.selectOption('#touchControls','on');assert.equal(await page.evaluate(()=>window.__game.state.settings.brightness),1.6);await page.click('[data-action="back-settings"]');await page.click('[data-action="resume"]');assert.equal(await page.locator('#touch-ui').isVisible(),true);console.log('PASS brightness setting and forced touch controls persist and apply');
  const mobile=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});const m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));
  await m.addInitScript(()=>localStorage.setItem('ndz-settings',JSON.stringify({quality:'low',difficulty:'story',volume:0})));
  await m.goto(`${base}/?test=1`);await m.tap('[data-action="new"]');await m.waitForFunction(()=>window.__game.state.mode==='playing');
  const ammo=await m.evaluate(()=>window.__game.state.ammo);await m.tap('[data-touch="fire"]');await m.waitForFunction(n=>window.__game.state.ammo<n,ammo);console.log('PASS quick native touch tap fires a bullet');
  const rect=async selector=>{const r=await m.locator(selector).boundingBox();assert.ok(r);return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};};
  const pad=await rect('#touch-move'),look={x:430,y:175},fire=await rect('[data-touch="fire"]');
  const old=await m.evaluate(()=>window.__game.state);const cdp=await mobile.newCDPSession(m);
  const left={id:1,...pad},right={id:2,...look},trigger={id:3,...fire};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left]});left.y-=38;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[left]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});right.x+=65;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[left,right]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right,trigger]});await m.waitForTimeout(800);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[left,right]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const moved=await m.evaluate(()=>window.__game.state);assert.ok(moved.position.z<old.position.z-.15);assert.ok(Math.abs(moved.yaw-old.yaw)>.15);assert.ok(moved.ammo<old.ammo);console.log('PASS simultaneous three-finger movement, camera look and shooting');
  await m.tap('[data-action="pause"]');await m.waitForFunction(()=>window.__game.state.mode==='paused');await m.tap('[data-action="resume"]');await m.waitForFunction(()=>window.__game.state.mode==='playing');const stop=await m.evaluate(()=>window.__game.state.position);await m.waitForTimeout(600);const after=await m.evaluate(()=>window.__game.state.position);assert.ok(Math.hypot(after.x-stop.x,after.z-stop.z)<.01);await m.screenshot({path:'artifacts/mobile-fixed.png'});console.log('PASS mobile release and pause/resume do not leave movement stuck');
  assert.deepEqual(errors,[]);await mobile.close();console.log('PASS regression checks without runtime errors');
}finally{await browser.close();}
