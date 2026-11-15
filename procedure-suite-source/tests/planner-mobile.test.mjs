import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nominalPenetratedThickness,applyPlannerInputs,applyPlannerShape,applySourceSelection} from '../.test-build/planning/plannerInput.js';
import {calculateFilmPlan} from '../.test-build/planning/filmPlanning.js';
const tsx=readFileSync(new URL('../src/ui/ProcedureSuite.tsx',import.meta.url),'utf8');
const js=readFileSync(new URL('../../procedure-runtime/ui/ProcedureSuite.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/ui/procedureSuite.css',import.meta.url),'utf8');
const sample=()=>({source:'Se-75',film:'D4',technique:'SWSI',thicknessMm:Number.NaN,penetratedThicknessMm:null,maximumPathThicknessMm:null,density:Number.NaN,sfdMm:Number.NaN,activityCi:40,model:'old',kv:150,ma:4,material:'Fe',iqiSide:'source',geometry:{shape:'pipe',diameterMm:100,sourcePlacement:'external',sourceSizeMm:1.5,objectToFilmMm:10,filmUsableLengthMm:300,filmWrapped:true}});
test('SWSI yields t, DWSI/DWDI nominal 2t; input stays blank until positive finite wall',()=>{
 assert.equal(nominalPenetratedThickness(12.5,'SWSI'),12.5);
 assert.equal(nominalPenetratedThickness(12.5,'DWSI'),25);
 assert.equal(nominalPenetratedThickness(12.5,'DWDI-ELLIPSE'),25);
 assert.equal(nominalPenetratedThickness(Number.NaN,'SWSI'),null);
 assert.equal(nominalPenetratedThickness(0,'DWSI'),null);
 assert.equal(nominalPenetratedThickness(-2,'DWSI'),null);
 assert.equal(nominalPenetratedThickness(Number.POSITIVE_INFINITY,'DWSI'),null);
});
test('changing wall or technique recomputes w only, while nominal wall t remains unchanged',()=>{
 const first=applyPlannerInputs(sample(),{thicknessMm:8.2});
 assert.equal(first.thicknessMm,8.2);assert.equal(first.penetratedThicknessMm,8.2);
 const double=applyPlannerInputs(first,{technique:'DWDI-ELLIPSE'});
 assert.equal(double.thicknessMm,8.2);assert.equal(double.penetratedThicknessMm,16.4);
 assert.equal(first.penetratedThicknessMm,8.2); // immutability
 const blank=applyPlannerInputs(double,{thicknessMm:Number.NaN});
 assert.equal(blank.penetratedThicknessMm,null);
});
test('source switch clears hidden device fields, preserving physics input thickness',()=>{
 const a=sample();const x=applySourceSelection(a,'X-ray');
 assert.equal(x.source,'X-ray');assert.equal(x.activityCi,undefined);assert.equal(x.thicknessMm,a.thicknessMm);
 assert.equal(x.model,'old');assert.equal(x.kv,150);assert.equal(x.ma,4);
 const g=applySourceSelection(x,'Ir-192');
 assert.equal(g.source,'Ir-192');assert.equal(g.model,'');assert.equal(g.kv,undefined);assert.equal(g.ma,undefined);
});
test('switch to plate wipes stale pipe geometry but keeps source size and object film distance',()=>{
 const p=applyPlannerShape(sample(),'plate');
 assert.equal(p.geometry.shape,'plate');assert.equal(p.geometry.diameterMm,null);
 assert.equal(p.geometry.filmUsableLengthMm,null);assert.equal(p.geometry.filmWrapped,false);assert.equal(p.geometry.sourcePlacement,null);
 assert.equal(p.geometry.sourceSizeMm,1.5);assert.equal(p.geometry.objectToFilmMm,10);
 const round=applyPlannerShape(p,'pipe');assert.equal(round.geometry.shape,'pipe');
});
test('plate planning does not apply pipe circumference nor make up number of exposures',()=>{
 const x=applyPlannerShape(sample(),'plate');x.thicknessMm=12;
 const profile={class:'B',planning:{minimumFilmOverlapMm:10,approvedExposureRules:[]}};
 const result=calculateFilmPlan(x,profile);
 assert.equal(result.plan.circumferenceMm,null);assert.equal(result.plan.filmSegments,null);assert.equal(result.plan.minimumExposures,null);
 assert.ok(result.checks.some(c=>c.code==='PLATE_COVERAGE'&&c.status==='orange'));
 assert.ok(!result.checks.some(c=>c.code==='PIPE_DIAMETER'));
});
test('planner JSX renders only fields for selected source and selected workpiece',()=>{
 assert.match(tsx,/input\.source==='X-ray'\?<\>/);
 assert.match(tsx,/Bronactiviteit \(Ci\)/);
 assert.match(tsx,/Röntgenapparaat \/ model/);
 assert.match(tsx,/input\.geometry\.shape==='pipe'&&<>/);
 for(const phrase of ['Pijpbuitendiameter Ø','Bruikbare filmlengte langs omtrek','Film volgt de buisomtrek'])assert.ok(tsx.includes(phrase));
 assert.match(tsx,/ChoiceGroup label="Werkstuk" items=\{\['plate','pipe'\] as const\}/);
 assert.match(tsx,/source:'Bronzijde \(Source\)'/);
 assert.match(tsx,/film:'Filmzijde \(Film\)'/);
 assert.match(tsx,/inputMode="decimal"/);
 assert.match(tsx,/Vul wanddikte t in/);
 assert.match(tsx,/nominale schatting/);
});
test('fixed iPhone calculate action invokes unchanged evaluate handler and is represented in browser build',()=>{
 assert.match(tsx,/className="ndt-planner-sticky"/);
 assert.match(tsx,/onClick=\{\(\)=>void evaluate\(\)\}/);
 assert.match(css,/\.ndt-planner-sticky\{position:fixed/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(js,/applyPlannerInputs/);
 assert.match(js,/ndt-planner-sticky/);
});
