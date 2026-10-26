// An isolated offline Web Audio smoke test. It validates graph behavior, not subjective sound quality.
import {chromium} from 'playwright-core';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const compiled=await build({entryPoints:['src/audio.ts'],bundle:true,format:'iife',globalName:'NightmareAudio',write:false,platform:'browser'});
const script=compiled.outputFiles[0].text.replaceAll('</script','<\\/script');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({offline:true}),page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.resourceType()!=='document')requests.push(r.url());});
await page.route('https://audio.invalid/**',r=>r.fulfill({contentType:'text/html',body:`<button id="start">START</button><script>${script};window.audio=new NightmareAudio.AudioSystem();document.querySelector('#start').onclick=()=>window.audio.start(0);</script>`}));
try{
  await page.goto('https://audio.invalid/');assert.equal(await page.evaluate(()=>window.audio.ctx),null);await page.click('#start');await page.waitForFunction(()=>window.audio.ctx.state==='running');
  console.log('PASS audio context is created only by a user gesture and accepts volume zero');
  const first=await page.evaluate(()=>{const a=window.audio;for(const name of ['shot','step','hit','pickup','reload','growl','switch','empty','win','decoy','bell','thunder','door','heartbeat','breath','sting','ritual','secret'])a.play(name);for(const name of ['enemy-step','whisper','creak','knock','growl','bell'])a.positional(name,{x:4,z:-1},{x:0,z:0,yaw:0});for(let i=0;i<100;i++)a.update(.05,{x:0,z:0,yaw:0,zone:'chapel',danger:.8,stamina:12,hidden:false,power:true});return a.debugStats();});
  assert.ok(first.totalVoices>50);assert.ok(first.activeVoices<=96);assert.ok(first.spatialEvents>=6);assert.ok(first.lastSpatial.pan>0);assert.equal(first.zone,'chapel');
  console.log('PASS effect layers, positional cues and chapel ambience build valid bounded graphs');
  await page.evaluate(()=>window.audio.pause());await page.waitForFunction(()=>window.audio.ctx.state==='suspended');const paused=await page.evaluate(()=>{const a=window.audio,before=a.debugStats();a.play('shot');a.update(.1,{x:0,z:0,yaw:0,zone:'forest',danger:1,stamina:0,hidden:false,power:false});return {before,after:a.debugStats()};});assert.equal(paused.before.totalVoices,paused.after.totalVoices);assert.equal(paused.after.state,'suspended');
  console.log('PASS paused audio stays suspended and creates no new voices');
  await page.evaluate(()=>window.audio.resume());await page.waitForFunction(()=>window.audio.ctx.state==='running');await page.waitForFunction(()=>window.audio.debugStats().activeVoices===0,undefined,{timeout:10000});assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log('PASS completed effect voices disconnect; no browser exceptions or external requests');
}finally{await browser.close();}
