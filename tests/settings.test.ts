import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings,normalizeSettings} from '../src/config.ts';
test('old saved settings gain a usable default brightness',()=>{assert.equal(normalizeSettings({quality:'low',volume:0}).brightness,1);assert.equal(normalizeSettings({volume:0}).volume,0);});
test('malformed settings cannot produce an undefined difficulty or NaN render exposure',()=>{const settings=normalizeSettings({difficulty:'broken',quality:null,brightness:NaN,sensitivity:-50,volume:9,subtitles:'no'});assert.equal(settings.difficulty,'survivor');assert.equal(settings.quality,defaultSettings.quality);assert.equal(settings.brightness,1);assert.equal(settings.sensitivity,.3);assert.equal(settings.volume,1);assert.equal(settings.subtitles,true);});
test('null, non-object and unknown settings are safely ignored',()=>{for(const value of [null,7,'invalid',[],{}])assert.deepEqual(normalizeSettings(value),defaultSettings);assert.equal(normalizeSettings({brightness:9}).brightness,2);assert.equal(normalizeSettings({brightness:-5}).brightness,.75);});
