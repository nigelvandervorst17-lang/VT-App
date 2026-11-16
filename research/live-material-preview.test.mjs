import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 PROPOSED_MATERIAL_FACTORS,compareMaterialEquivalence,compareGammaDensityD25
} from './live-material-preview.mjs';
import {calculateXray,calculateGamma} from '../rt-core.mjs';
import {materialSteelEquivalent} from '../material-equivalence.mjs';
import {curves} from '../rt-curves.mjs';

const at=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=at('../index.html');
test('Six distinct accessible material buttons are immediately under plate/pipe',()=>{
 const between=html.slice(html.indexOf('id="rtCompactPipe"'),html.indexOf('id="rtCompactPipeFields"'));
 for(const mat of ['Fe','RVS300','Al','Cu','Ti','custom'])
  assert.ok(between.includes('data-rt-material="'+mat+'"'),mat);
 assert.equal((between.match(/data-rt-material="/g)||[]).length,6);
 assert.ok(between.indexOf('rtMaterialChoices')>0);
});
test('Bottom navigation has exactly five requested items and charts under Meer',()=>{
 const nav=html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0];
 assert.ok(nav);
 const choices=[...nav.matchAll(/data-nav="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(choices,['calc','sources','refs','ai']);
 assert.equal((nav.match(/id="moreToggle"/g)||[]).length,1);
 assert.match(html,/id="moreMenu"[\s\S]*?data-nav="curves"/);
});
test('Wanddikte is shown in Dutch compact interface and other languages also updated',()=>{
 assert.match(html,/id="rtCompactThicknessLabel">Wanddikte t \(mm\)/);
 const layout=at('../compact-layout.mjs');
 assert.ok(layout.includes("thickness:'Wanddikte t (mm)'"));
 assert.ok(layout.includes("thickness:'Wall thickness t (mm)'"));
 assert.ok(layout.includes("thickness:'Grubość ścianki t (mm)'"));
});
test('All five proposed ratios remain distinct gamma and X-ray only-research hypotheses',()=>{
 const target={Fe:[1,1],RVS300:[1.02,1.08],Al:[0.35,0.30],Cu:[1.12,1.50],Ti:[0.58,0.75]};
 for(const [key,[g,x]] of Object.entries(target)){
  assert.equal(PROPOSED_MATERIAL_FACTORS[key].gamma,g);
  assert.equal(PROPOSED_MATERIAL_FACTORS[key].xray,x);
  const actualGamma=compareMaterialEquivalence({material:key,mode:'gamma',wallMm:10});
  const actualXray=compareMaterialEquivalence({material:key,mode:'xray',wallMm:10});
  assert.equal(actualGamma.equivalentSteelMm,10*g);
  assert.equal(actualXray.equivalentSteelMm,10*x);
  assert.equal(actualXray.appliedToExposureEngine,false);
  assert.equal(actualXray.validatedForExposure,false);
 }
});
test('Custom factor only previews within 0 < f <=10 and actual data thickness range',()=>{
 const trial=compareMaterialEquivalence({material:'custom',mode:'gamma',wallMm:10,customFactor:0.85});
 assert.equal(trial.ok,true);
 assert.equal(trial.equivalentSteelMm,8.5);
 assert.equal(trial.appliedToExposureEngine,false);
 for(const factor of [0,-1,11,NaN]){
  assert.equal(compareMaterialEquivalence({material:'custom',mode:'xray',wallMm:10,customFactor:factor}).ok,false);
 }
});
test('PR #6 reference case 53 is exactly 00:00:57, but NOT applied to live motor',()=>{
 const testCase=compareGammaDensityD25({
  isotope:'Se-75',film:'D5',density:2.5,wallMm:12,activityCi:52,
  sfdMm:250,material:'Fe'
 });
 assert.equal(testCase.ok,true);
 assert.equal(testCase.candidateTime,'00:00:57');
 assert.equal(testCase.proposedFactor,1.3085);
 assert.equal(testCase.appliedToExposureEngine,false);
});
test('PR #6 reference case 54 stays a separate unvalidated 01:26:04 candidate',()=>{
 const r=compareGammaDensityD25({
  isotope:'Se-75',film:'D4',density:2.5,wallMm:10,activityCi:15,
  sfdMm:1000,material:'Fe'
 });
 assert.equal(r.ok,true);
 assert.equal(r.candidateTime,'01:26:04');
 assert.equal(r.proposedFactor,1.4278);
});
test('PR #6 density hypothesis is never computed for non-steel or wrong D',()=>{
 assert.equal(compareGammaDensityD25({
  isotope:'Se-75',film:'D5',wallMm:12,density:2.5,activityCi:52,sfdMm:250,material:'Al'
 }).ok,false);
 assert.equal(compareGammaDensityD25({
  isotope:'Se-75',film:'D5',wallMm:12,density:3,activityCi:52,sfdMm:250,material:'Fe'
 }).ok,false);
});
test('Six user-supplied Waygate points are stored, not fabricated into curve files',()=>{
 const points=JSON.parse(at('./waygate-six-user-points-unverified.json'));
 assert.equal(points.points.length,6);
 assert.deepEqual(points.points.map(x=>x.referenceTime),
  ['00:01:17','00:00:59','00:01:25','00:01:45','00:02:12','00:01:06']);
 assert.equal(points.sharedConditions.model,null);
 assert.equal(points.sharedConditions.sfdMm,null);
 assert.equal(points.sharedConditions.ma,null);
 assert.equal(points.researchOnly,true);
});
test('Unavailable Andrex D4 x-ray remains blocked rather than inventing curve',()=>{
 const result=calculateXray({
  model:'Andrex SMART 225',film:'D4',density:2.0,
  thicknessMm:20,kv:225,ma:5,distanceMm:800,material:'Fe'
 },curves);
 assert.equal(result.ok,false);
});
test('Reference curve datasets and film response remain unchanged',()=>{
 const baseline={
  'rt-curves.mjs':'7438a25576539f79f89d562a70504ccf2cb42d7c',
  'film-response.mjs':'53dbe7aa23317dc55d06862ad82a08006a1daaab'
 };
 for(const [file,sha] of Object.entries(baseline)){
  const b=readFileSync(new URL('../'+file,import.meta.url));
  const actual=createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
  assert.equal(actual,sha,file);
 }
});
test('Material tile ratios automatically drive equivalent thickness in research engine',()=>{
 for(const mode of ['gamma','xray']){
  for(const [mat,config] of Object.entries(PROPOSED_MATERIAL_FACTORS)){
   const result=materialSteelEquivalent({material:mat,thicknessMm:20,mode});
   assert.equal(result.ok,true,mat+'/'+mode);
   assert.equal(result.steelEquivalentMm,20*config[mode]);
   if(mat!=='Fe'){
    assert.equal(result.researchOnly,true);
    assert.equal(result.validatedForExposure,false);
   }
  }
 }
});
test('Copper selection uses steel equivalent while keeping research warning',()=>{
 const copper=calculateGamma({isotope:'Se-75',film:'D4',density:2,
  thicknessMm:25,distanceMm:500,activityCi:36,material:'Cu'},curves);
 const steel=calculateGamma({isotope:'Se-75',film:'D4',density:2,
  thicknessMm:28,distanceMm:500,activityCi:36,material:'Fe'},curves);
 assert.equal(copper.ok,true);
 assert.equal(steel.ok,true);
 assert.ok(Math.abs(copper.minutes-steel.minutes)<1e-10);
 assert.equal(copper.materialFactor,1.12);
 assert.ok(Math.abs(copper.equivalentSteelMm-28)<1e-10);
 assert.equal(copper.materialFactorApproximate,true);
 assert.match(copper.status,/material_factor_research_unverified/);
});
test('Custom factor is used only when valid and within curve input range',()=>{
 const custom=materialSteelEquivalent({material:'Other',thicknessMm:10,
  mode:'gamma',customFactor:0.85});
 assert.equal(custom.ok,true);
 assert.equal(custom.steelEquivalentMm,8.5);
 for(const v of [0,-1,NaN,11]){
  assert.equal(materialSteelEquivalent({material:'Other',thicknessMm:10,mode:'gamma',customFactor:v}).ok,false);
 }
 assert.equal(materialSteelEquivalent({material:'Cu',thicknessMm:95,mode:'xray'}).ok,false);
});
test('Main UI uses a separate preview and does not replace original result time',()=>{
 const ui=at('../rt-material-ui.mjs');
 assert.ok(ui.includes('compareGammaDensityD25'));
 assert.ok(ui.includes('rtMaterialResult'));
 assert.ok(ui.includes('rtMaterialCustomFactor'));
 assert.equal(ui.includes("resultTime').textContent="),false);
 assert.ok(ui.includes('Automatisch meegenomen'));
 const sw=at('../sw.js');
 assert.ok(sw.includes("'./rt-material-ui.mjs'"));
 assert.ok(sw.includes("'./research/live-material-preview.mjs'"));
 const css=at('../styles.css');
 assert.ok(css.includes('.rt-material-tiles'));
});
