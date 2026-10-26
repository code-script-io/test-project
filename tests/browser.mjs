import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base=process.env.GAME_URL || 'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errors=[];
await mkdir('artifacts',{recursive:true});
const page=await browser.newPage({viewport:{width:960,height:640}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
await page.addInitScript(()=>localStorage.setItem('ndz-settings',JSON.stringify({quality:'low',difficulty:'story',reducedMotion:true,volume:0})));
const state=()=>page.evaluate(()=>window.__game.state);
const api=(fn,arg)=>page.evaluate(fn,arg);
async function waitFor(fn,message,timeout=15000){await page.waitForFunction(fn,undefined,{timeout});console.log('PASS',message);}
async function start(){await page.goto(`${base}/?test=1`);await page.locator('h1').waitFor();await page.click('[data-action="new"]');await waitFor(()=>window.__game.state.mode==='playing','new game starts');}
async function at(x,z,yaw=0){await api(p=>window.__game.teleport(...p),[x,z,yaw]);}
async function face(x,z,y=1){await api(p=>window.__game.face(...p),[x,z,y]);}
async function interact(id){await api(id=>window.__game.interact(id),id);}
async function key(code){await api(c=>window.__game.key(c,true),code);await page.waitForTimeout(250);await api(c=>window.__game.key(c,false),code);}
try {
  await page.goto(`${base}/?test=1`);await page.locator('h1').waitFor();await page.screenshot({path:'artifacts/menu.png'});
  await page.click('[data-action="controls"]');assert.match(await page.locator('.manual').textContent(),/W A S D/);await page.click('[data-action="menu"]');
  await page.click('[data-action="settings"]');await page.selectOption('#difficulty','story');await page.click('[data-action="back-settings"]');
  await page.click('[data-action="new"]');await waitFor(()=>window.__game.state.mode==='playing','new game starts from menu');
  assert.equal((await state()).audioState,'running');console.log('PASS user gesture unlocks procedural audio');
  for(const [x,z] of [[-11,-10],[25,-14],[28,-12],[11,24],[-11,-29],[10,-29],[0,38]])assert.ok(await api(p=>window.__game.pathTo(...p).length,[x,z]),`unreachable objective approach ${x},${z}`);console.log('PASS connected navigation to every escape and puzzle');
  await page.waitForTimeout(250);const before=(await state()).position.z;await page.keyboard.down('w');await page.waitForTimeout(650);await page.keyboard.up('w');assert.ok((await state()).position.z<before-.1);console.log('PASS keyboard movement');
  await at(-4.1,8);await page.keyboard.down('a');await page.waitForTimeout(700);await page.keyboard.up('a');assert.ok((await state()).position.x>-4.59);console.log('PASS live wall collision');
  await at(0,21.7,0);await key('Space');await waitFor(()=>window.__game.state.position.z<19,'forest barricade vault crosses obstacle');
  await at(-11,-10);await face(-11,-12,1.05);await page.waitForTimeout(300);assert.equal(await page.locator('#interaction strong').textContent(),'Ceramic fuse');await page.keyboard.press('e');await waitFor(()=>window.__game.state.inventory.includes('fuse'),'actual E interaction picks up fuse');
  await at(25,-14);await face(25,-16,1.4);await page.waitForTimeout(200);await page.keyboard.press('e');await waitFor(()=>window.__game.state.power,'fuse puzzle restores generator');
  await interact('lab-ammo');assert.equal((await state()).reserve,30);await interact('archive-note');assert.equal((await state()).mode,'note');await page.click('[data-action="resume"]');
  // Test hitscan against an actual enemy mesh, then reload with ammunition transfer.
  await at(0,8);await api(()=>window.__game.enemy(0,0,3));await face(0,3,1.3);const ammo=(await state()).ammo;await api(()=>window.__game.shoot());assert.equal((await state()).ammo,ammo-1);assert.ok((await state()).enemies[0].health<140);console.log('PASS weapon hitscan and enemy damage');
  await key('KeyR');await waitFor(()=>window.__game.state.ammo===6,'reload completes and transfers spare ammunition');
  // Run chase through the actual AI update and renderer, without applying damage from the test bridge.
  await at(0,8);await api(()=>window.__game.enemy(0,0,4));await waitFor(()=>['chase','attack'].includes(window.__game.state.enemies[0].state),'line of sight triggers enemy pursuit');
  await api(()=>window.__game.advance(6));await waitFor(()=>window.__game.state.health<100,'enemy pursuit reaches and attacks player',25000);
  // Death and retry retain objective progress.
  await api(()=>window.__game.damage(200));await waitFor(()=>window.__game.state.mode==='dead','death screen');await page.click('[data-action="continue"]');await waitFor(()=>window.__game.state.mode==='playing'&&window.__game.state.power,'death retry restores objective checkpoint');
  await at(-14,5.8);await face(-14,4,1.4);await page.waitForTimeout(200);await page.keyboard.press('e');await waitFor(()=>window.__game.state.hidden,'locker concealment');await page.keyboard.press('e');await waitFor(()=>!window.__game.state.hidden,'leave hiding place');
  // Noise must attract an enemy even when the player is occluded.
  await at(-11,8);await api(()=>window.__game.enemy(0,0,8));await api(()=>window.__game.noise(0,1,30));await waitFor(()=>window.__game.state.enemies[0].state==='investigate','enemy hearing investigates decoy location');
  await page.keyboard.press('Tab');await waitFor(()=>window.__game.state.mode==='journal','journal pauses game and lists routes');assert.match(await page.locator('.panel.journal').textContent(),/The drainage/);await page.click('[data-action="resume"]');
  // Complete all distinct endings through their real interaction conditions.
  await interact('lab-valve');await interact('drain-exit');await waitFor(()=>window.__game.state.mode==='won','drainage route victory');assert.match(await page.locator('.ending').textContent(),/SEWER ENDING/);await page.screenshot({path:'artifacts/victory.png'});
  await page.click('[data-action="new"]');await interact('archive-fuse');await interact('generator');await interact('forest-key');await interact('forest-exit');await waitFor(()=>window.__game.state.mode==='won','perimeter route victory');
  await page.click('[data-action="new"]');await interact('archive-fuse');await interact('generator');await interact('radio-exit');await page.fill('#radio-code','0000');await page.click('[data-action="submit-code"]');assert.match(await page.locator('#code-error').textContent(),/DENIED/);await page.fill('#radio-code','0417');await page.click('[data-action="submit-code"]');await waitFor(()=>window.__game.state.mode==='won','coded radio route victory');
  await page.click('[data-action="new"]');await page.screenshot({path:'artifacts/game.png'});
  assert.deepEqual(errors,[]);console.log('PASS desktop: no runtime or console errors');
  // Mobile viewport + native touch events. This emulates input, not Android GPU performance.
  const mobile=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});const m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));
  await m.addInitScript(()=>localStorage.setItem('ndz-settings',JSON.stringify({quality:'low',difficulty:'story',volume:0})));
  await m.goto(`${base}/?test=1`);await m.locator('h1').waitFor();await m.tap('[data-action="new"]');await m.waitForFunction(()=>window.__game.state.mode==='playing');assert.equal(await m.locator('#touch-ui').isVisible(),true);
  const z=await m.evaluate(()=>window.__game.state.position.z);const cdp=await mobile.newCDPSession(m);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:75,y:275}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:75,y:235}]});await m.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await m.evaluate(()=>window.__game.state.position.z)<z-.1);console.log('PASS mobile touch joystick moves player');
  await m.tap('[data-touch="KeyC"]');await m.tap('[data-touch="Space"]');await m.screenshot({path:'artifacts/mobile.png'});assert.deepEqual(errors,[]);await mobile.close();console.log('PASS mobile controls render without runtime errors');
} finally {await browser.close();}
