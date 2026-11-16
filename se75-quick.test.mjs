import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateGamma,hms} from './rt-core.mjs';
import {curves} from './rt-curves.mjs';
import {calculateSe75Research,se75ErrorMessage,quickResearchAccess} from './se75-quick.mjs';

const input={thicknessMm:'10',film:'D4',density:'2,0',activityCi:'40',distanceMm:'800'};
test('quick Se-75 uses the existing engine without new exposure formulas',()=>{
 const expected=calculateGamma({isotope:'Se-75',film:'D4',density:2,thicknessMm:10,activityCi:40,distanceMm:800,material:'Fe',screens:'Pb'},curves);
 const actual=calculateSe75Research(input);
 assert.equal(actual.ok,true);
 assert.deepEqual(actual,expected);
 assert.equal(hms(actual.minutes),hms(expected.minutes));
 assert.match(actual.status,/NOT_APPROVED/);
});
test('missing fields never trigger a default or automatic calculation',()=>{
 for(const key of Object.keys(input)){
  const noValue={...input,[key]:''};
  assert.deepEqual(calculateSe75Research(noValue),{ok:false,error:'missing'});
 }
 assert.equal(calculateSe75Research({}).error,'missing');
});
test('numeric parser accepts commas, rejects negative or invalid numbers',()=>{
 assert.equal(calculateSe75Research({...input,thicknessMm:'10,0'}).ok,true);
 for(const value of ['-2','x2','10mm','1e4']){
  assert.equal(calculateSe75Research({...input,thicknessMm:value}).ok,false);
 }
 for(const field of ['thicknessMm','activityCi','distanceMm']){
  assert.equal(calculateSe75Research({...input,[field]:'0'}).ok,false);
 }
});
test('film/density/curve limitations remain blocked by the legacy engine',()=>{
 assert.equal(calculateSe75Research({...input,film:'D3'}).error,'film');
 assert.equal(calculateSe75Research({...input,film:'D5',thicknessMm:'1'}).error,'range');
 assert.equal(calculateSe75Research({...input,thicknessMm:'41'}).error,'range');
 assert.equal(calculateSe75Research({...input,density:'3,95'}).error,'density');
 assert.match(se75ErrorMessage(calculateSe75Research({...input,thicknessMm:'41'})),/Geen extrapolatie/);
});
test('UI labels research status; no operational approval and no hardcoded time',()=>{
 const html=readFileSync(new URL('./se75.html',import.meta.url),'utf8');
 assert.match(html,/ONDERZOEKSVERSIE/);
 assert.match(html,/Geen goedgekeurde RT-belichtingstijd/);
 assert.match(html,/Doorstraalde staaldikte/);
 assert.match(html,/Bron-filmafstand/);
 assert.match(html,/type="module" src="\.\/se75-quick\.mjs"/);
 assert.doesNotMatch(html,/<input[^>]+value="(?:36|40|800|500|25)"/);
 const js=readFileSync(new URL('./se75-quick.mjs',import.meta.url),'utf8');
 assert.match(js,/calculateGamma\(/);
 assert.doesNotMatch(js,/return \{ok:true,minutes:/);
});

test('Se-75 research access is restricted to the existing entry flow',()=>{
 const empty={getItem:()=>null};
 assert.deepEqual(quickResearchAccess({local:empty,session:empty}),{allowed:false,trial:false});
 const guest={getItem:k=>k==='ndt-ui-trial-choice-v1'?'trial':null};
 assert.deepEqual(quickResearchAccess({local:guest,session:empty}),{allowed:true,trial:true});
 const signedIn={getItem:k=>k==='ndt-supabase-session-v1'?'test-token':null};
 assert.deepEqual(quickResearchAccess({local:signedIn,session:empty}),{allowed:true,trial:false});
 const bunker={getItem:k=>k==='ndt-offline-workspace-v1'?'unlocked':null};
 assert.deepEqual(quickResearchAccess({local:empty,session:bunker}),{allowed:true,trial:false});
});
test('Se-75 research shortcut uses the same 50-preview counter without altering calculateGamma',()=>{
 const js=readFileSync(new URL('./se75-quick.mjs',import.meta.url),'utf8');
 assert.match(js,/const trial=trialCounter\(\)/);
 assert.match(js,/trial\.status\(\)/);
 assert.match(js,/trial\.consume\(\)/);
 assert.match(js,/if\(access\.trial&&result\.ok\)/);
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 assert.match(html,/id="ndtSe75ResearchShortcut"/);
});
