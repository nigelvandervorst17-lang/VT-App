import test from 'node:test';import assert from 'node:assert/strict';
import {ciToGbq,gbqToCi,elapsedSeconds} from './rt-field-extras.mjs';
test('Ci-GBq conversions are arithmetically reversible',()=>{
 assert.equal(ciToGbq(10),370);assert.equal(gbqToCi(370),10);
 assert.equal(ciToGbq(-1),null);assert.equal(gbqToCi(NaN),null);
});
test('elapsed time uses absolute timestamps, not accumulated interval ticks',()=>{
 assert.equal(elapsedSeconds(1000,3500,0),2);
 assert.equal(elapsedSeconds(1000,10000,2000),11);
 assert.equal(elapsedSeconds(1000,0),0);
});