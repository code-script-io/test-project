import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPath, lineClear, moveCircle, overlaps, segmentBox, type Box } from '../src/physics.ts';
const wall:Box={x:0,z:0,w:1,d:8,h:3};
test('swept circle cannot tunnel through a wall on a long frame',()=>{const p=moveCircle({x:-2,z:0},6,0,.3,0,[wall]);assert.ok(p.x<=-.79);});
test('collision slides along wall rather than sticking',()=>{const p=moveCircle({x:-1,z:-2},3,3,.3,0,[wall]);assert.ok(p.x<=-.79);assert.ok(p.z>.9);});
test('jumping clears low barricades but not tall walls',()=>{const low={...wall,h:.8};assert.ok(moveCircle({x:-2,z:0},4,0,.3,1,[low]).x>1);assert.ok(moveCircle({x:-2,z:0},4,0,.3,1,[wall]).x<0);});
test('vision is occluded by a wall and clear around it',()=>{assert.equal(lineClear({x:-2,z:0},{x:2,z:0},[wall]),false);assert.equal(lineClear({x:-2,z:5},{x:2,z:5},[wall]),true);});
test('slab intersection handles parallel segments and endpoints',()=>{assert.equal(segmentBox({x:0,z:-7},{x:0,z:7},wall),true);assert.equal(segmentBox({x:2,z:-7},{x:2,z:7},wall),false);assert.equal(segmentBox({x:-2,z:0},{x:0,z:0},wall),true);});
test('A* finds a navigable route around obstructing geometry',()=>{const path=findPath({x:-3,z:0},{x:3,z:0},[wall]);assert.ok(path.length>10);assert.deepEqual(path.at(-1),{x:3,z:0});assert.ok(path.every(p=>!overlaps(p.x,p.z,.35,wall)));});
test('A* reports unreachable destinations without hanging',()=>{const sealed:Box[]=[{x:0,z:0,w:3,d:3,h:3}];assert.deepEqual(findPath({x:8,z:0},{x:0,z:0},sealed),[]);});

test('a clear landing does not allow a vault through an intervening wall',async()=>{const {vaultClear}=await import('../src/physics.ts');const obstacle={x:0,z:0,w:2,d:.5,h:.8};const blocking={x:0,z:-1,w:5,d:.1,h:3};assert.equal(vaultClear({x:0,z:1.6},{x:0,z:-1.7},obstacle,[obstacle,blocking]),false);assert.equal(vaultClear({x:0,z:1.6},{x:0,z:-1.7},obstacle,[obstacle]),true);});
test('support detects furniture tops without snapping up to higher surfaces',async()=>{const {supportHeight}=await import('../src/physics.ts');const table={x:0,z:0,w:3,d:1,h:.925};assert.equal(supportHeight({x:0,z:0},.925,[table]),.925);assert.equal(supportHeight({x:0,z:0},0,[table]),0);assert.equal(supportHeight({x:3,z:0},.925,[table]),0);});

test('A* reaches a legal player beside a wall when rounding would occupy the wall',()=>{
  const partition={x:5,z:8,w:.25,d:10,h:3.8},target={x:4.5,z:8};
  assert.equal(overlaps(target.x,target.z,.3,partition),false);
  const path=findPath({x:0,z:8},target,[partition]);
  assert.ok(path.length>0,'a legal near-wall target must not freeze pursuit');
  assert.deepEqual(path.at(-1),{x:4,z:8});
  assert.ok(path.every(p=>!overlaps(p.x,p.z,.35,partition)));
});
test('A* resolves a legal near-wall start without crossing the partition',()=>{
  const partition={x:5,z:8,w:.25,d:10,h:3.8},start={x:4.5,z:8};
  const path=findPath(start,{x:0,z:8},[partition]);
  assert.ok(path.length>0);assert.deepEqual(path.at(-1),{x:0,z:8});
  let previous=start;
  for(const point of path){assert.equal(segmentBox(previous,point,{...partition,w:partition.w+.64,d:partition.d+.64}),false);previous=point;}
});
test('A* routes around a thin wall between two otherwise free grid cells',()=>{
  const partition={x:.5,z:0,w:.05,d:6,h:3.8},start={x:0,z:0};
  const path=findPath(start,{x:1,z:0},[partition]);
  assert.ok(path.length>6,'the route must go around the partition, not across it');
  assert.deepEqual(path.at(-1),{x:1,z:0});
  let previous=start;
  for(const point of path){assert.equal(segmentBox(previous,point,{...partition,w:partition.w+.64,d:partition.d+.64}),false);previous=point;}
});
test('A* does not snap an actually solid target into a neighboring reachable cell',()=>{
  const partition={x:.5,z:0,w:.05,d:6,h:3.8};
  assert.deepEqual(findPath({x:-3,z:0},{x:.5,z:0},[partition]),[]);
});
