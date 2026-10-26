import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clampAudio,spatialMix} from '../src/audio-math.ts';
test('positional audio follows listener-relative left and right',()=>{
  const listener={x:0,z:0,yaw:0};assert.equal(spatialMix({x:4,z:0},listener).pan,1);assert.equal(spatialMix({x:-4,z:0},listener).pan,-1);
  const turned={...listener,yaw:-Math.PI/2};assert.ok(Math.abs(spatialMix({x:0,z:4},turned).pan-1)<1e-9);
});
test('nearby audio is bounded and distant cues attenuate and lose high frequencies',()=>{
  const p={x:0,z:0,yaw:0},near=spatialMix({x:0,z:0},p),far=spatialMix({x:0,z:25},p);
  assert.equal(near.gain,1);assert.equal(near.pan,0);assert.ok(far.gain<.05);assert.ok(far.cutoff<near.cutoff);
  assert.equal(clampAudio(NaN,0,1,.6),.6);assert.equal(clampAudio(50,0,1),1);assert.equal(spatialMix({x:NaN,z:0},p).gain,0);
});
