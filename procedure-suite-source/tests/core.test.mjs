import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProcedureText} from '../.test-build/parser/parseProcedureDocument.js';
import {validateProfile} from '../.test-build/domain/validation.js';
import {calculateFilmPlan,evaluateSourceObjectGeometry} from '../.test-build/planning/filmPlanning.js';
import {evaluateIqi} from '../.test-build/planning/iqi.js';
import {evaluateExposurePlan} from '../.test-build/engine/evaluateExposurePlan.js';

const profile=()=>({
 schemaVersion:1,id:'test001',code:'RT-PRO-001',customer:'Klant A',revision:'2',norm:'ISO 17636-1:2022',class:'B',planarDefectsRequired:true,
 sources:['Se-75','Ir-192'],films:['D4','D5'],techniques:['SWSI','DWSI','DWDI-ELLIPSE'],
 thickness:{minMm:1,maxMm:22},density:{min:2,max:3.5},
 iqi:{side:'source',extraFinerWires:0,filmSideComparisonVerified:false,approvedRules:[{
  id:'iqi1',technique:'SWSI',side:'source',class:'B',basis:'nominal',aboveMm:10,upToMm:25,wireNumber:12,reference:'geverifieerde bijlage B / regel 1'
 }]},
 planning:{minimumFilmOverlapMm:10,approvedExposureRules:[{
  id:'shots1',technique:'SWSI',class:'B',minDiameterMm:90,maxDiameterMm:110,minWallMm:18,maxWallMm:22,
  minSfdMm:700,maxSfdMm:1000,minimumExposures:4,sourcePlacement:'external',reference:'eigen Level 3 plan QA 001'
 }]},
 confirmedBy:'Test Level 3',confirmedAt:'2026-11-15T00:00:00.000Z',createdAt:'2026-11-15T00:00:00.000Z',updatedAt:'2026-11-15T00:00:00.000Z',source:{kind:'text'}
});
const input=()=>({
 source:'Se-75',film:'D4',technique:'SWSI',thicknessMm:20,penetratedThicknessMm:20,maximumPathThicknessMm:22,
 density:2.5,sfdMm:800,activityCi:40,material:'Fe',iqiSide:'source',geometry:{diameterMm:100,sourcePlacement:'external',sourceSizeMm:1,objectToFilmMm:10,filmUsableLengthMm:150,filmWrapped:true}
});

test('parses explicit, labeled rules but not unverified IQI or Annex A data',()=>{
 const d=parseProcedureText('Procedurecode: RT-001\nKlant: Mevrouw Test\nRevisie: 3\nNorm: ISO 17636-1:2022\nTestklasse: B\nVlakke defecten: ja\nToegestane isotopen: Se-75, Ir-192\nToegestane films: D4, D5\nToegestane technieken: SWSI, DWSI\nWanddikte: 5 - 40 mm\nZwarting: D=2,0 - 3,5\nIQI positie: bronzijde\nMinimale overlap: 15 mm');
 assert.equal(d.candidate.code,'RT-001');assert.equal(d.candidate.customer,'Mevrouw Test');assert.equal(d.candidate.revision,'3');
 assert.equal(d.candidate.class,'B');assert.equal(d.candidate.planarDefectsRequired,true);
 assert.deepEqual(d.candidate.sources,['Se-75','Ir-192']);assert.deepEqual(d.candidate.films,['D4','D5']);
 assert.deepEqual(d.candidate.techniques,['SWSI','DWSI']);assert.deepEqual(d.candidate.thickness,{minMm:5,maxMm:40});
 assert.deepEqual(d.candidate.density,{min:2,max:3.5});assert.equal(d.candidate.iqi.side,'source');
 assert.equal(d.candidate.planning.minimumFilmOverlapMm,15);assert.deepEqual(d.candidate.iqi.approvedRules,[]);
 assert.deepEqual(d.candidate.planning.approvedExposureRules,[]);assert.ok(d.evidence['thickness'][0].quote);
});
test('detects contradictory class labels and does not set class',()=>{
 const d=parseProcedureText('Testklasse: A\nTestklasse: B\nISO 17636-1:2022');
 assert.equal(d.candidate.class,undefined);assert.ok(d.warnings.some(w=>w.includes('Tegenstrijdige waarden voor class')));
});
test('does not treat arbitrary mentions of Se-75/D4 as allowed list',()=>{
 const d=parseProcedureText('Bijvoorbeeld Se-75 of D4 kan een voorbeeld zijn.');
 assert.equal(d.candidate.sources,undefined);assert.equal(d.candidate.films,undefined);
});
test('profile validation catches invented, empty, out-of-range requirements',()=>{
 assert.deepEqual(validateProfile(profile()),[]);
 const p=profile();p.iqi.approvedRules[0].wireNumber=20;
 assert.ok(validateProfile(p).some(x=>x.includes('W1 t/m W19')));
});
test('wrapped circumference film count and approved exposure-count rule are independent',()=>{
 const {plan,checks}=calculateFilmPlan(input(),profile());
 assert.equal(plan.filmSegments,3); // ceil(pi*100/(150-10))
 assert.equal(plan.minimumExposures,4);
 assert.ok(checks.some(x=>x.code==='PATH_VARIATION'&&x.status==='green')); // exactly 10%
});
test('does not fabricate exposure count if Annex A mapping is absent',()=>{
 const p=profile();p.planning.approvedExposureRules=[];
 const r=calculateFilmPlan(input(),p);
 assert.equal(r.plan.filmSegments,3);assert.equal(r.plan.minimumExposures,null);
 assert.equal(r.checks.find(x=>x.code==='EXPOSURES').status,'orange');
});
test('geometry class A + planar flaws uses class B distance requirement',()=>{
 const p=profile();p.class='A';p.planarDefectsRequired=true;
 const a=input();a.sfdMm=100;a.geometry.sourceSizeMm=1;a.geometry.objectToFilmMm=10; // f=90; fMin=15*20^(2/3)=110.5
 const c=evaluateSourceObjectGeometry(a,p)[0];assert.equal(c.status,'red');assert.match(c.message,/geometrieklasse B/);
 p.planarDefectsRequired=false;
 assert.equal(evaluateSourceObjectGeometry(a,p)[0].status,'green');
});
test('IQI lookup matches approved table and applies additional finer wire increment',()=>{
 const p=profile();p.iqi.extraFinerWires=1;
 const i=evaluateIqi(input(),p);
 assert.equal(i.requirement.wireNumber,13);assert.equal(i.requirement.wireDiameterMm,0.2);
 assert.equal(i.checks.find(x=>x.code==='IQI_REQUIRED').status,'green');
});
test('IQI reports unknown on unapproved missing table, and overlap as red',()=>{
 const p=profile();p.iqi.approvedRules=[];
 assert.equal(evaluateIqi(input(),p).requirement.wireNumber,null);
 p.iqi.approvedRules=[profile().iqi.approvedRules[0],{...profile().iqi.approvedRules[0],id:'duplicate'}];
 assert.equal(evaluateIqi(input(),p).checks[0].status,'red');
});
test('hard stop never invokes original physical engine',async()=>{
 let called=0;const a=input();a.thicknessMm=100;
 const result=await evaluateExposurePlan(a,profile(),()=>{called++;return {ok:true,minutes:42}});
 assert.equal(called,0);assert.equal(result.status,'red');assert.equal(result.exposure,null);
 assert.ok(result.checks.some(c=>c.code==='ENGINE_BLOCKED'));
});
test('hard stop also applies to unapproved IQI side',async()=>{
 let called=0;const a=input();a.iqiSide='film';
 const result=await evaluateExposurePlan(a,profile(),()=>{called++;return {ok:true,minutes:25}});
 assert.equal(called,0);assert.equal(result.status,'red');
});
test('engine minutes pass through unchanged with valid approved control rows',async()=>{
 let called=0;const initial=input();const raw=14.466666666666667;
 const result=await evaluateExposurePlan(initial,profile(),(received)=>{
  called++;assert.deepEqual(received,initial);return {ok:true,minutes:raw,calibrationStatus:'verified',datasetId:'unmodified-host-dataset'};
 });
 assert.equal(called,1);assert.equal(result.status,'green');assert.equal(result.exposure.minutes,raw);
 assert.equal(result.filmPlan.filmSegments,3);assert.equal(result.filmPlan.minimumExposures,4);
 assert.equal(result.iqi.wireNumber,12);
});
test('engine unverified never turns a control result green',async()=>{
 const result=await evaluateExposurePlan(input(),profile(),()=>({ok:true,minutes:12.345,calibrationStatus:'unverified'}));
 assert.equal(result.status,'orange');assert.ok(result.checks.some(c=>c.code==='ENGINE_UNVERIFIED'));
});
test('invalid imported profile is hard blocked before engine access',async()=>{
 const p=profile();p.code='';let calls=0;
 const result=await evaluateExposurePlan(input(),p,()=>{calls++;return {ok:true,minutes:1}});
 assert.equal(result.status,'red');assert.equal(calls,0);
});
test('extracts a complete explicit IQI rule as suggestion requiring manual confirmation',()=>{
 const d=parseProcedureText('IQI: klasse B SWSI bronzijde t 10-25 mm W12\nProcedurecode: ABC-123');
 assert.equal(d.candidate.iqi.approvedRules.length,1);
 assert.equal(d.candidate.iqi.approvedRules[0].wireNumber,12);
 assert.equal(d.candidate.iqi.approvedRules[0].upToMm,25);
 assert.ok(d.warnings.some(w=>w.includes('VOORSTEL')));
});
