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
