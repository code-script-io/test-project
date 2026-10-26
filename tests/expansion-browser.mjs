// Controlled actor placement covers progression and input; this is not an uninterrupted playthrough.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.GAME_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:640}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
await page.addInitScript(()=>{
  localStorage.setItem('ndz-settings',JSON.stringify({quality:'low',difficulty:'story',volume:0,reducedMotion:true,reducedScares:true}));
  Object.defineProperty(HTMLElement.prototype,'requestPointerLock',{configurable:true,value(){return Promise.reject(new DOMException('Pointer capture disabled for fallback test','NotSupportedError'));}});
});
await mkdir('artifacts',{recursive:true});
const state=()=>page.evaluate(()=>window.__game.state);
const at=(x,z,yaw=0)=>page.evaluate(p=>window.__game.teleport(...p),[x,z,yaw]);
const face=(x,z,y=1.7)=>page.evaluate(p=>window.__game.face(...p),[x,z,y]);
async function wait(predicate,message){await page.waitForFunction(predicate);console.log('PASS',message);}
async function useAt(x,z,targetX,targetZ,targetY,name){
  await at(x,z);await face(targetX,targetZ,targetY);
  await page.waitForFunction(expected=>document.querySelector('#interaction strong')?.textContent===expected,name);
  await page.keyboard.press('e');
}
const bell=async number=>{
  const x=21+(number-1)*4;
  await useAt(x,7.2,x,9,1.7,`Resonance bell ${['I','II','III'][number-1]}`);
};
try{
  await page.goto(`${base}/?test=1`);await page.click('[data-action="new"]');
  await wait(()=>window.__game.state.mode==='playing'&&window.__game.state.audioState==='running','new expansion starts and gesture unlocks audio');
  // Exercise the denied-pointer-lock desktop path with real mouse/keyboard events.
  const initialYaw=(await state()).yaw;
  await page.mouse.move(480,340);await page.mouse.down();await page.mouse.move(560,340,{steps:4});await page.mouse.up();
  await page.waitForFunction(previous=>Math.abs(window.__game.state.yaw-previous)>.05,initialYaw);
  const initialAmmo=(await state()).ammo;await page.keyboard.press('v');await page.waitForFunction(n=>window.__game.state.ammo<n,initialAmmo);
  await page.evaluate(()=>window.__game.advance(.5));const afterKey=(await state()).ammo;
  await page.mouse.click(480,340);await page.waitForFunction(n=>window.__game.state.ammo<n,afterKey);
  console.log('PASS denied pointer lock still permits drag-look, V fire and short-click fire');

  await at(0,8);
  for(const point of [[25,1.5],[21,7.2],[25,7.2],[29,7.2],[30,9.2]]){
    assert.ok(await page.evaluate(p=>window.__game.pathTo(...p).length,point),`unreachable annex approach ${point}`);
  }
  console.log('PASS navigation connects the original foyer to each bell and the new exit');

  await useAt(-8,10.2,-8,8,.3,'Hide beneath the bed');await wait(()=>window.__game.state.hidden,'E enters bed hiding');
  let hidden=await state();assert.ok(Math.abs(hidden.camera.y-.3)<.02);assert.ok(Math.hypot(hidden.camera.x+8,hidden.camera.z-8)<.02);
  const beforeHidden=hidden.position;await page.keyboard.down('w');await page.evaluate(()=>window.__game.advance(.6));await page.keyboard.up('w');
  hidden=await state();assert.ok(Math.hypot(hidden.position.x-beforeHidden.x,hidden.position.z-beforeHidden.z)<.01);assert.ok(Math.abs(hidden.camera.y-.3)<.02);
  await page.keyboard.press('e');await wait(()=>!window.__game.state.hidden,'E leaves bed hiding');
  let exited=await state();assert.ok(exited.camera.y>1.5);assert.ok(Math.hypot(exited.position.x+8,exited.position.z-10.2)<.02);
  console.log('PASS bed hiding uses the physical low camera, prevents movement and restores the safe exit');

  await useAt(-14,5.8,-14,4,1.4,'Hide in locker');await wait(()=>window.__game.state.hidden,'E enters locker hiding');
  hidden=await state();assert.ok(Math.abs(hidden.camera.y-1.55)<.02);assert.ok(Math.hypot(hidden.camera.x+14,hidden.camera.z-4.38)<.02);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('in-locker')),true);
  assert.equal(await page.locator('#hiding-mask').evaluate(el=>getComputedStyle(el).display),'block');
  await page.keyboard.press('e');await wait(()=>!window.__game.state.hidden,'E leaves locker hiding');
  assert.equal(await page.evaluate(()=>document.body.classList.contains('in-locker')),false);
  console.log('PASS locker hiding moves into its slit view and restores the outside camera');

  await bell(2);assert.equal((await state()).ritual.step,0);assert.equal((await state()).ritual.solved,false);
  assert.match(await page.locator('#toast').textContent(),/Restore laboratory power/);
  await useAt(30,9.2,30,11,1.6,'Echo Ward evacuation seal');assert.equal((await state()).ritual.extraction,'idle');assert.equal((await state()).mode,'playing');
  console.log('PASS unpowered bells and seal cannot advance the secret route');

  await useAt(20.6,10,20.6,11.5,1.04,'The last listening session');await wait(()=>window.__game.state.mode==='note','E recovers the listening-session clue');
  assert.match(await page.locator('.note-paper').textContent(),/II\s*→\s*I\s*→\s*III/);await page.click('[data-action="resume"]');
  await useAt(-11,-10,-11,-12,1.05,'Ceramic fuse');await wait(()=>window.__game.state.inventory.includes('fuse'),'E collects the archive fuse');
  await useAt(25,-14,25,-16,1.4,'Lab generator');await wait(()=>window.__game.state.power,'E powers the estate and Echo Ward');
  await bell(2);await wait(()=>window.__game.state.ritual.step===1,'bell II advances the actual E-key sequence');
  await bell(3);await wait(()=>window.__game.state.ritual.step===0&&!window.__game.state.ritual.solved,'wrong bell III clears partial ritual progress');
  await bell(2);await wait(()=>window.__game.state.ritual.step===1,'correct sequence can restart after a mistake');

  const savedEncounters=(await state()).encounters.slice().sort();
  await page.keyboard.press('p');await page.waitForFunction(()=>window.__game.state.mode==='paused'&&window.__game.state.audio.paused&&window.__game.state.audioState==='suspended');
  const pausedAudio=(await state()).audio;await page.waitForTimeout(600);const laterAudio=(await state()).audio;
  assert.equal(laterAudio.totalVoices,pausedAudio.totalVoices);assert.ok(laterAudio.activeVoices<=pausedAudio.activeVoices);
  console.log('PASS pause suspends audio and creates no new sound voices');
  await page.click('[data-action="menu"]');await page.click('[data-action="continue"]');
  await wait(()=>window.__game.state.mode==='playing'&&window.__game.state.audioState==='running','Continue restores the expansion checkpoint');
  assert.equal((await state()).ritual.step,1);assert.equal((await state()).power,true);assert.deepEqual((await state()).encounters.slice().sort(),savedEncounters);
  console.log('PASS partial bell progress and fired encounters persist through menu/Continue');

  await bell(1);await wait(()=>window.__game.state.ritual.step===2,'bell I advances restored ritual progress');
  await bell(3);await wait(()=>window.__game.state.ritual.solved&&window.__game.state.ritual.step===3,'bell III completes II → I → III');
  const audio=(await state()).audio;assert.ok(audio.totalVoices>0);assert.ok((audio.events.bell??0)>=6);assert.ok(audio.spatialEvents>=6);assert.equal(audio.procedural,true);
  console.log('PASS real bell interactions synthesize sound layers and positional cues');
  await at(25,6.8);await face(25,10,1.7);await page.screenshot({path:'artifacts/echo-ward.png'});

  await useAt(30,9.2,30,11,1.6,'Echo Ward evacuation seal');await wait(()=>window.__game.state.ritual.extraction==='opening','seal begins its timed release');
  // Repositioning resets test grace only; normal play has a real noisy holdout.
  await at(30,9.2);await face(30,11,1.6);await page.keyboard.press('e');
  assert.equal((await state()).mode,'playing');assert.equal((await state()).ritual.extraction,'opening');assert.ok((await state()).ritual.remaining>0);
  await page.evaluate(()=>window.__game.advance(1));assert.equal((await state()).mode,'playing');assert.equal((await state()).ritual.extraction,'opening');
  console.log('PASS repeated E and the first second of release cannot win early');
  await page.evaluate(()=>window.__game.advance(13));assert.equal((await state()).mode,'playing');assert.equal((await state()).ritual.extraction,'open');
  await page.keyboard.press('e');await wait(()=>window.__game.state.mode==='won','final E after the holdout reaches the fourth ending');
  assert.match(await page.locator('.ending').textContent(),/THE WITNESS ENDING/);await page.screenshot({path:'artifacts/secret-ending.png'});
  assert.deepEqual(errors,[]);console.log('PASS expansion route, physical hiding and fallback input without runtime/console errors');
}finally{await browser.close();}
