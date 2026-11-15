import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseProcedureText} from '../.test-build/parser/parseProcedureDocument.js';
import {evaluateSourceObjectGeometry} from '../.test-build/planning/filmPlanning.js';
import {evaluateExposurePlan} from '../.test-build/engine/evaluateExposurePlan.js';

const src=readFileSync(new URL('../src/ui/ProcedureSuite.tsx',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../../procedure-runtime/ui/ProcedureSuite.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/ui/procedureSuite.css',import.meta.url),'utf8');
const rootCss=readFileSync(new URL('../../procedure-suite.css',import.meta.url),'utf8');
const page=readFileSync(new URL('../../procedure-suite.html',import.meta.url),'utf8');
const example=()=>({source:'Se-75',film:'D4',technique:'SWSI',thicknessMm:10,penetratedThicknessMm:10,maximumPathThicknessMm:11,density:2.5,sfdMm:800,activityCi:40,material:'Fe',iqiSide:'source',geometry:{shape:'pipe',diameterMm:100,sourcePlacement:'external',sourceSizeMm:1,objectToFilmMm:null,filmUsableLengthMm:200,filmWrapped:true}});
const profile=()=>({schemaVersion:1,id:'p-4',code:'RT-TEST',customer:'Demo',revision:'1',norm:'ISO 17636-1:2022',class:'B',planarDefectsRequired:false,sources:['Se-75'],films:['D4'],techniques:['SWSI'],thickness:{minMm:1,maxMm:25},density:{min:2,max:3.5},iqi:{side:'source',extraFinerWires:0,filmSideComparisonVerified:false,approvedRules:[]},planning:{minimumFilmOverlapMm:null,approvedExposureRules:[]},confirmedBy:'Demo',confirmedAt:'2026-11-15T19:00:00.000Z',createdAt:'2026-11-15T19:00:00.000Z',updatedAt:'2026-11-15T19:00:00.000Z',source:{kind:'text'}});

test('1 — randdikte zichtbaar alleen voor pijp, placeholder 11.0',()=>{
 assert.match(src,/input\.geometry\.shape==='pipe'&&<FloatField label="Maximale doorstraalde dikte aan rand \(mm\)"[^\n]*placeholder="Bijv\. 11\.0"/);
 assert.doesNotMatch(src,/placeholder="Bijv\. 22\.0"/);
 assert.match(runtime,/shape === 'pipe' && React\.createElement\(FloatField,[\s\S]*?"Bijv\. 11\.0"/);
});
test('2 — overlap toont voorbeeld 25, niet een geprefilde waarde',()=>{
 assert.match(src,/label="Minimale filmoverlap \(mm\), indien bekend"[^\n]*placeholder="Bijv\. 25"/);
 assert.match(src,/minimumFilmOverlapMm:null/);
});
test('3 — draadcompensatie leeg tenzij expliciet uit document of onderzoeker',()=>{
 assert.match(src,/extraFinerWires:Number\.NaN/);
 assert.match(src,/label="Extra fijnere draden t\.o\.v\. tabel"[^\n]*placeholder="Bijv\. 0"/);
 assert.match(src,/extraFinerWires:v\?\?Number\.NaN/);
 const unknown=parseProcedureText('Procedurecode: RT-1');
 assert.ok(Number.isNaN(unknown.candidate.iqi.extraFinerWires));
 const explicit=parseProcedureText('IQI extra: 0');
 assert.equal(explicit.candidate.iqi.extraFinerWires,0);
});
test('4 — lege b gebruikt voorlopig w, zonder groene procedurevrijgave',()=>{
 const inp=example();const checks=evaluateSourceObjectGeometry(inp,profile());
 assert.equal(checks.length,1);assert.equal(checks[0].status,'orange');
 assert.match(checks[0].message,/b = w voorlopig aangenomen/);
 assert.equal(inp.geometry.objectToFilmMm,null,'oorspronkelijke input blijft ongewijzigd');
 const explicit=structuredClone(inp);explicit.geometry.objectToFilmMm=10;
 const manual=evaluateSourceObjectGeometry(explicit,profile());
 assert.equal(manual[0].status,'green');
 const impossible=structuredClone(inp);impossible.sfdMm=12;
 assert.equal(evaluateSourceObjectGeometry(impossible,profile())[0].status,'red');
 assert.match(src,/placeholder="Standaard = w"/);
});
test('4b — met lege b bereikt de oorspronkelijke calculator exact dezelfde input',async()=>{
 const inp=example();let calls=0;
 const outcome=await evaluateExposurePlan(inp,profile(),received=>{
  assert.deepEqual(received,inp);calls++;return {ok:true,minutes:14.466666666666667,calibrationStatus:'unverified'};
 });
 assert.equal(calls,1);assert.equal(outcome.exposure?.minutes,14.466666666666667);
 assert.equal(outcome.status,'orange');
 assert.equal(outcome.input.geometry.objectToFilmMm,null);
});
test('5 — drie vereiste vinkjes zijn toegankelijke, volledige aanklikbare kaarten',()=>{
 for(const name of ['planarDefectsRequired','filmSideComparisonVerified','checked={ack}']){
  assert.ok(src.includes(name));
 }
 const cards=src.match(/className="ndt-toggle-card(?: ndt-ack| ndt-wide)?"/g)??[];
 assert.equal(cards.length,3);
 assert.match(css,/\.ndt-toggle-card input:checked \+ \.ndt-toggle-content/);
 assert.match(css,/\.ndt-toggle-card input:focus-visible \+ \.ndt-toggle-content/);
});
test('6 — sticky knop heeft onderaan veilige ruimte, ook met safe-area',()=>{
 assert.match(css,/\.ndt-suite\{padding-bottom:calc\(156px \+ env\(safe-area-inset-bottom\)\)\}/);
 assert.match(css,/\.ndt-suite \.ndt-planner-card\{padding-bottom:calc\(158px \+ env\(safe-area-inset-bottom\)\)\}/);
 assert.match(page,/padding:14px 13px calc\(156px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/\.ndt-planner-sticky\{position:fixed/);
 assert.equal(rootCss,css,'root-CSS en bron-CSS mogen niet uiteenlopen');
});
test('7 — bij nul regels geen lege accordions, wel knop om eerste regel toe te voegen',()=>{
 assert.equal((src.match(/if\(rows\.length===0\)return <div className="ndt-empty-rule-action">/g)??[]).length,2);
 assert.match(src,/\+ IQI-regel toevoegen/);
 assert.match(src,/\+ Opnameregel toevoegen/);
 assert.match(src,/IQI-regels — door Level 3 gecontroleerde normtabellen \(\{rows\.length\}\)/);
 assert.match(src,/Goedgekeurde opnameaantallen \(bijlage A \/ geometrie\) \(\{rows\.length\}\)/);
});
test('gecompileerde browsercomponent bevat de nieuwe UI-onderdelen',()=>{
 for(const word of ['Standaard = w','Bijv. 25','Bijv. 11.0','Bijv. 0','ndt-toggle-card','ndt-empty-rule-action'])assert.ok(runtime.includes(word),word);
});
