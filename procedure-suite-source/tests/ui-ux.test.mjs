import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const tsx=readFileSync(new URL('../src/ui/ProcedureSuite.tsx',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../../procedure-runtime/ui/ProcedureSuite.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/ui/procedureSuite.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../../procedure-suite.html',import.meta.url),'utf8');
test('source, film and technique choices are touch tiles with explicit pressed state',()=>{
 assert.match(tsx,/function CheckGroup</); assert.match(tsx,/function ChoiceGroup</);
 assert.match(tsx,/aria-pressed=\{selected.includes\(item\)\}/);
 assert.match(tsx,/aria-pressed=\{selected===item\}/);
 assert.match(tsx,/items=\{ALL_SOURCES\}/); assert.match(tsx,/items=\{ALL_FILMS\}/);assert.match(tsx,/items=\{ALL_TECHNIQUES\}/);
 assert.match(css,/min-height:58px/);assert.match(css,/\.ndt-option-button\[aria-pressed="true"\]/);
});
test('IQI choices display dutch and english side while preserving values',()=>{
 assert.match(tsx,/source:'Bronzijde \(Source\)'/);
 assert.match(tsx,/film:'Filmzijde \(Film\)'/);
 assert.match(tsx,/items=\{\['source','film','either'\] as const\}/);
});
test('empty thickness and density do not default to zero',()=>{
 assert.match(tsx,/minMm:Number\.NaN,maxMm:Number\.NaN/);
 assert.match(tsx,/density:\{min:Number\.NaN,max:Number\.NaN\}/);
 assert.match(tsx,/thicknessMm:Number\.NaN/);
 assert.match(tsx,/density:Number\.NaN,sfdMm:Number\.NaN/);
 assert.match(tsx,/placeholder="Bijv\. 3\.5"/);
 assert.match(tsx,/placeholder="Bijv\. 2\.0"/);
});
test('iPhone decimals remain in typed text while state holds numeric values',()=>{
 assert.match(tsx,/type="text" inputMode="decimal"/);
 assert.match(tsx,/setDisplay\(next\)/);
 assert.match(tsx,/replace\(',','\.'\)/);
 assert.match(tsx,/Object\.is\(lastEmitted\.current,current\)/);
});
test('confirmed researcher preference survives reload, only after save',()=>{
 assert.match(tsx,/RESEARCHER_STORAGE_KEY='ndt-procedure-suite-confirming-researcher-v1'/);
 assert.match(tsx,/useState\(getSavedResearcher\)/);
 assert.match(tsx,/localStorage\.setItem\(RESEARCHER_STORAGE_KEY,who\.trim\(\)\)/);
 const setter=tsx.indexOf('localStorage.setItem('), saver=tsx.indexOf('const save=async()=>');
 assert.ok(setter>saver);
});
test('successful save activates the new profile and offers one-tap planner',()=>{
 assert.match(tsx,/await setActiveProcedure\(profile\.id\)/);
 assert.match(tsx,/setReadyToPlan\(true\)/);
 assert.match(tsx,/Verder naar Opnameplan →/);
 assert.match(tsx,/savedBanner\.current\?\.scrollIntoView/);
});
test('warning is compact but cannot hide the research-only restriction',()=>{
 assert.match(html,/Onderzoeksversie/);
 assert.match(html,/Niet vrijgegeven voor echte RT-opnamen/);
 assert.match(html,/<details><summary>Privacy en beperkingen/);
 assert.match(html,/externe servers/);
});
test('generated browser runtime includes current UI contract',()=>{
 assert.match(runtime,/ndt-option-button/);
 assert.match(runtime,/Verder naar Opnameplan/);
 assert.match(runtime,/inputMode: "decimal"/);
 assert.match(runtime,/getSavedResearcher/);
});
