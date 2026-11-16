import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trialCounter,TRIAL_MAX} from './trial-50.mjs';
import {researchWorkbench,gammaPreview,xrayPreview,pipePreview,iqiPreview,materialPreview,availableXrayModels} from './field-calculators.mjs';

const gamma={isotope:'Se-75',film:'D4',thicknessMm:12,distanceMm:800,activityCi:40,density:2,material:'Fe'};
test('Gratis limiet: precies 50, daarna blokkade, ook na opnieuw laden',()=>{
 const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const counter=trialCounter(store);
 assert.equal(counter.status().remaining,50);
 for(let i=1;i<=50;i++){
  const r=counter.consume();
  assert.equal(r.allowed,true);assert.equal(r.used,i);assert.equal(r.remaining,50-i);
 }
 assert.equal(counter.consume().allowed,false);
 assert.equal(trialCounter(store).status().remaining,0);
});
test('Opslagfout of corruptie: fail closed, geen onbeperkte gastmodus',()=>{
 for(const s of [
  {getItem:()=>'{bad',setItem(){}},
  {getItem(){throw Error('blocked')}}
 ]){
  assert.equal(trialCounter(s).status().remaining,0);
  assert.equal(trialCounter(s).consume().allowed,false);
 }
});
test('Onmogelijke tellerstanden worden geweigerd',()=>{
 for(const used of [-1,TRIAL_MAX+1,2.5]){
  const c=trialCounter({getItem:()=>JSON.stringify({version:1,used})});
  assert.equal(c.status().ok,false);
 }
});
test('Gamma bestaand ondersteunt staal en geeft uitsluitend onderzoek',()=>{
 const r=gammaPreview(gamma);
 assert.equal(r.ok,true);assert.ok(r.minutes>0);assert.equal(r.releaseAuthorized,false);
 assert.match(r.lines.join(' '),/geen vrijgegeven RT-belichting/i);
});
test('PR6 factor vereist expliciete keuze en D2,5',()=>{
 const base=gammaPreview({...gamma,density:2.5});
 const r=gammaPreview({...gamma,density:2.5,proposedD25:true});
 assert.equal(r.ok,true);assert.notEqual(r.minutes,base.minutes);
 assert.match(r.mode,/niet gevalideerd/);
});
test('De vijf beschermde gamma-blokkades blijven bestaan',()=>{
 for(const p of [
  {isotope:'Ir-192',film:'D5',thicknessMm:15,density:2},
  {isotope:'Ir-192',film:'D7',thicknessMm:15,density:2},
  {isotope:'Se-75',film:'D4',thicknessMm:10,density:1.2},
  {isotope:'Se-75',film:'D7',thicknessMm:20,density:3.5},
  {isotope:'Ir-192',film:'D4',thicknessMm:40,density:3.9}
 ])assert.equal(gammaPreview({...gamma,...p}).ok,false,JSON.stringify(p));
});
test('Gamma verandert niet stilzwijgend voor niet-gevalideerde materialen',()=>{
 assert.equal(gammaPreview({...gamma,material:'Al'}).ok,false);
});
const x={model:'Andrex SMART 225',film:'D5',kv:225,ma:5,thicknessMm:20,distanceMm:800,density:2.5};
test('X-ray bestaande exacte kV-lijn zonder vrijgave',()=>{
 const r=xrayPreview(x);assert.equal(r.ok,true);assert.equal(r.releaseAuthorized,false);
 assert.ok(r.minutes>0);
});
test('X-ray D4, onbekende buis en niet-bestaande tussen-kV blokkeren',()=>{
 for(const p of [{film:'D4'},{model:'Unknown CP'},{kv:224}])
  assert.equal(xrayPreview({...x,...p}).ok,false);
 assert.ok(availableXrayModels().some(r=>r.model==='Andrex SMART 225'&&r.kv.includes(225)));
});
test('Pijp: omtrek/filmsegmenten maar geen verzonnen minimaal aantal opnamen',()=>{
 const r=pipePreview({diameterMm:168.3,thicknessMm:8,usableFilmMm:300,overlapMm:25});
 assert.equal(r.ok,true);assert.equal(r.filmSegments,2);
 assert.match(r.lines.join(' '),/ONBEKEND/);
 assert.equal(r.releaseAuthorized,false);
});
test('Pijp: optionele f_min in dezelfde rekenmodule',()=>{
 const r=pipePreview({diameterMm:168.3,thicknessMm:8,usableFilmMm:300,
  overlapMm:25,dMm:2,bMm:8,sfdMm:800});
 assert.equal(r.ok,true);assert.match(r.lines.join(' '),/f_min=/);
});
test('Pijp: foutieve overlap blijft geblokkeerd',()=>{
 assert.equal(pipePreview({diameterMm:168.3,thicknessMm:8,
  usableFilmMm:300,overlapMm:300}).ok,false);
});
test('IQI: bestaande normtabelhulp geeft W-nummer, geen formele acceptatie',()=>{
 const r=iqiPreview({nominalThicknessMm:12,technique:'sw',
  iqiSide:'source',qualityClass:'B',isotope:'Se-75'});
 assert.equal(r.ok,true);assert.ok(r.requiredWire>=1);
 assert.equal(r.releaseAuthorized,false);
});
test('IQI: ongeschikte filmzijde/techniek is geblokkeerd',()=>{
 assert.equal(iqiPreview({nominalThicknessMm:12,technique:'sw',
  iqiSide:'film',qualityClass:'B'}).ok,false);
});
test('Materiaalfactoren alleen hypothetische onderzoeksvergelijking',()=>{
 const r=materialPreview({material:'Al',mode:'xray',thicknessMm:10});
 assert.equal(r.ok,true);assert.equal(r.equivalentSteelMm,3);
 assert.match(r.lines.join(' '),/NIET GEVALIDEERD/);
 assert.equal(r.releaseAuthorized,false);
});
test('Alle vijf rekenmodules via één dispatcher bereikbaar',()=>{
 assert.equal(researchWorkbench('gamma',gamma).ok,true);
 assert.equal(researchWorkbench('xray',x).ok,true);
 assert.equal(researchWorkbench('pipe',{diameterMm:168.3,thicknessMm:8,usableFilmMm:300,overlapMm:25}).ok,true);
 assert.equal(researchWorkbench('iqi',{nominalThicknessMm:12,technique:'sw',
  iqiSide:'source',qualityClass:'B'}).ok,true);
 assert.equal(researchWorkbench('material',{material:'Fe',mode:'gamma',thicknessMm:10}).ok,true);
 assert.equal(researchWorkbench('unsupported',{}).ok,false);
});
test('iPhone UI heeft teller, 50-gate, login en alle vijf knoppen',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 for(const id of ['trialCounterLabel','trialGate','trialStartBtn','trialLoginBtn','workbenchButtons',
  'gIsotope','xModel','pipeDiameter','qObserved','workbenchMaterials'])
  assert.ok(html.includes('id="'+id+'"'),id);
 const app=readFileSync(new URL('./company-app.mjs',import.meta.url),'utf8');
 assert.ok(app.includes("setTab('field');"));assert.ok(app.includes('mountResearchWorkbench'));
 const ui=readFileSync(new URL('./workbench-ui.mjs',import.meta.url),'utf8');
 assert.ok(ui.includes('counter.consume()'));
 assert.ok(ui.indexOf('if(!result.ok)')<ui.indexOf('counter.consume()'));
 assert.ok(ui.includes('if(!isAuthenticated()&&final.remaining===0)onLogin()'));
});
