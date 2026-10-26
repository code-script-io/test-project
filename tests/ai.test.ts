import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Enemy,type Target} from '../src/ai.ts';
import type {Box} from '../src/physics.ts';
const hidden:Target={x:30,z:30,hidden:true,crouched:false,flashlight:false};
function hunter(boxes:Box[]=[],kind:'warden'|'crawler'='warden'){return new Enemy(kind,new THREE.Scene(),boxes,[{x:0,z:0},{x:6,z:0},{x:6,z:6}]);}
function run(enemy:Enemy,seconds:number,target=hidden,hit:(n:number)=>void=()=>{},alert:()=>void=()=>{}){for(let t=0;t<seconds-.001;t+=.05)enemy.update(.05,t,target,'story',hit,alert);}

test('noise investigation reaches a distant sound before its search timer starts',()=>{
  const enemy=hunter();enemy.hear({x:12,z:0},30,'story');run(enemy,8);
  assert.equal(enemy.state,'investigate');assert.ok(enemy.position.x>8,'hunter must travel instead of expiring after seven seconds');
  run(enemy,4);assert.equal(enemy.state,'search');assert.ok(enemy.position.x>10);
});
test('search visits the remembered location and explores around it before resuming patrol',()=>{
  const enemy=hunter();enemy.hear({x:5,z:0},30,'story');let searched=false,explored=false,returned=false;
  for(let t=0;t<26;t+=.05){enemy.update(.05,t,hidden,'story',()=>{},()=>{});if(enemy.state==='search'){searched=true;if(Math.hypot(enemy.position.x-5,enemy.position.z)>1)explored=true;}if(searched&&enemy.state==='patrol')returned=true;}
  assert.ok(searched);assert.ok(explored,'search should move beyond the last-known point');assert.ok(returned);assert.ok(enemy.stepCount>0);
});
test('loss of sight searches the last seen point without following hidden player coordinates',()=>{
  const enemy=hunter();const visible:Target={x:0,z:-5,hidden:false,crouched:false,flashlight:false};let alerts=0;
  run(enemy,.1,visible,()=>{},()=>alerts++);assert.equal(enemy.state,'chase');assert.equal(alerts,1);
  run(enemy,3.2,{...hidden,x:18,z:18});assert.equal(enemy.state,'search');assert.deepEqual(enemy.lastKnown,{x:0,z:-5});
});
test('first melee attack has an audible telegraph and cannot hit through walls',()=>{
  const target:Target={x:0,z:-1.2,hidden:false,crouched:false,flashlight:false};
  const enemy=hunter();let hits=0;run(enemy,.75,target,()=>hits++);assert.equal(hits,0);run(enemy,.2,target,()=>hits++);assert.equal(hits,1);
  const wall={x:0,z:-.6,w:4,d:.2,h:3.8};const blocked=new Enemy('warden',new THREE.Scene(),[wall],[{x:0,z:0}]);let throughWall=0;
  run(blocked,4,target,()=>throughWall++);assert.equal(throughWall,0);
});
test('four pistol body hits down the Warden and two down the crawler for 22 seconds',()=>{
  for(const [kind,hits] of [['warden',4],['crawler',2]] as const){const enemy=hunter([],kind);for(let i=0;i<hits;i++)enemy.damage(38);assert.equal(enemy.state,'down');run(enemy,21);assert.equal(enemy.state,'down');run(enemy,1.1);assert.equal(enemy.state,'search');assert.equal(enemy.health,kind==='warden'?140:70);}
});
test('crawler geometry stays low and its pursuit is faster but quieter than the Warden',()=>{
  const warden=hunter(),crawler=hunter([],'crawler');const target:Target={x:0,z:-12,hidden:false,crouched:false,flashlight:false};run(warden,2,target);run(crawler,2,target);
  assert.ok(Math.abs(crawler.position.z)>Math.abs(warden.position.z));
  warden.mesh.updateMatrixWorld(true);crawler.mesh.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(crawler.mesh);assert.ok(box.max.y<1.1);
  const farNoise=hunter([],'crawler');farNoise.hear({x:10,z:0},20,'story');assert.equal(farNoise.state,'patrol');
});
test('a legal target near a wall remains reachable by pursuit',()=>{
  const wall={x:5,z:8,w:.25,d:10,h:3.8};
  const enemy=new Enemy('warden',new THREE.Scene(),[wall],[{x:0,z:8}]);let hits=0;
  run(enemy,3,{x:4.5,z:8,hidden:false,crouched:false,flashlight:false},()=>hits++);
  assert.ok(enemy.position.x>2.8,'hunter must not freeze because the target rounds into a wall cell');assert.ok(hits>0);
});
