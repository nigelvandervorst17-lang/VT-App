/**
 * Mobile research workbench with local 50-preview trial. NOT an exposure
 * release, billing/licensing security boundary or practical RT calculator.
 */
import {trialCounter,TRIAL_MAX} from './trial-50.mjs';
import {researchWorkbench,availableXrayModels} from './field-calculators.mjs';
const $=id=>document.getElementById(id);
const value=id=>$(id).value;
function numeric(id){
 const str=String(value(id)||'').trim().replace(',','.');
 return /^\+?(?:\d+(?:\.\d*)?|\.\d+)$/.test(str)?Number(str):NaN;
}
function optionalNumeric(id){return String(value(id)||'').trim()===''?null:numeric(id)}
function currentInput(kind,material){
 switch(kind){
  case 'gamma':return {
   isotope:value('gIsotope'),film:value('gFilm'),
   thicknessMm:numeric('gThickness'),distanceMm:numeric('gSfd'),
   activityCi:numeric('gActivity'),density:numeric('gDensity'),
   proposedD25:$('gResearchFactor').checked,material:'Fe'
  };
  case 'xray':return {
   model:value('xModel'),film:value('xFilm'),kv:numeric('xKv'),
   ma:numeric('xMa'),thicknessMm:numeric('xThickness'),
   distanceMm:numeric('xSfd'),density:numeric('xDensity'),material:'Fe'
  };
  case 'pipe':return {
   diameterMm:numeric('pipeDiameter'),thicknessMm:numeric('pipeThickness'),
   usableFilmMm:numeric('pipeFilmLength'),overlapMm:numeric('pipeOverlap'),
   qualityClass:value('pipeClass'),dMm:optionalNumeric('pipeSpot'),
   bMm:optionalNumeric('pipeB'),sfdMm:optionalNumeric('pipeSfd'),
   planarDefects:$('pipePlanar').checked
  };
  case 'iqi':return{
   qualityClass:value('qClass'),technique:value('qTechnique'),
   iqiSide:value('qSide'),nominalThicknessMm:numeric('qThickness'),
   penetratedThicknessMm:optionalNumeric('qPenetrated'),
   isotope:value('qIsotope'),observedWire:value('qObserved')||null
  };
  case 'material':return{
   mode:value('wmMode'),material,thicknessMm:numeric('wmThickness')
  };
  default:return {};
 }
}
function option(text,value){
 const opt=document.createElement('option');
 opt.value=String(value);opt.textContent=text;return opt;
}
function populateXray(){
 const models=availableXrayModels(),select=$('xModel');
 select.replaceChildren(option('Kies een passende curve',''),
  ...models.map(x=>option(x.model+' · '+x.film,x.model)));
 function update(){
  const model=models.find(x=>x.model===select.value);
  $('xFilm').replaceChildren(option(model?.film??'Geen gekoppelde film',model?.film??''));
  $('xKv').replaceChildren(option('Kies kV',''),
   ...(model?.kv??[]).map(k=>option(k+' kV',k)));
 }
 select.addEventListener('change',update);
 update();
}
function populateIqi(){
 const select=$('qObserved');
 select.replaceChildren(option('Nog niet beoordeeld',''),
  ...Array.from({length:19},(_,i)=>option('W'+(i+1),i+1)));
}
export function mountResearchWorkbench({
 isAuthenticated=()=>false,onLogin=()=>{},storage=globalThis.localStorage
}={}){
 const counter=trialCounter(storage);
 let kind='gamma',material='Fe';
 const panel=$('researchWorkbenchPanel'),workbench=$('researchWorkbenchForm');
 function remaining(){
  if(isAuthenticated())return {ok:true,remaining:TRIAL_MAX,used:0,authenticated:true};
  return counter.status();
 }
 function refresh(){
  const status=remaining(),allowed=status.authenticated||status.ok&&status.remaining>0;
  const label=status.authenticated?'Ingelogd · onderzoeksberekeningen beschikbaar':
   'Gratis proefversie: nog '+status.remaining+' van 50 berekeningen';
  $('trialCounterLabel').textContent=label;
  $('trialProgress').style.width=(status.authenticated?'100':(status.used/TRIAL_MAX*100))+'%';
  $('trialGate').hidden=Boolean(allowed);
  $('workbenchCompute').disabled=!allowed;
  panel.classList.toggle('workbench-locked',!allowed);
  if(!status.ok&&!status.authenticated)
   $('workbenchResult').textContent=
    'Proefmodus niet beschikbaar: browseropslag is geblokkeerd of beschadigd. Meld je aan.';
  return status;
 }
 function setKind(next){
  kind=next;
  for(const btn of document.querySelectorAll('[data-workbench]'))
   btn.setAttribute('aria-pressed',String(btn.dataset.workbench===kind));
  for(const p of document.querySelectorAll('.workbench-module'))
   p.hidden=p.id!=='calc-'+kind;
  $('workbenchResult').textContent='Vul de gegevens in en druk op Bereken. Alleen ondersteunde onderzoeksgevallen leveren een uitkomst.';
 }
 for(const btn of document.querySelectorAll('[data-workbench]'))
  btn.addEventListener('click',()=>setKind(btn.dataset.workbench));
 for(const btn of document.querySelectorAll('[data-field-material]'))
  btn.addEventListener('click',()=>{
   material=btn.dataset.fieldMaterial;
   for(const t of document.querySelectorAll('[data-field-material]'))
    t.setAttribute('aria-pressed',String(t===btn));
  });
 $('researchWorkbenchForm').addEventListener('submit',event=>{
  event.preventDefault();
  const before=refresh();
  if(!isAuthenticated()&&(!before.ok||before.remaining===0)){
   onLogin();return;
  }
  let result;
  try{result=researchWorkbench(kind,currentInput(kind,material))}
  catch(e){result={ok:false,message:'Onderzoekscontrole geblokkeerd: '+String(e.message??e)}}
  if(!result.ok){
   $('workbenchResult').textContent=result.message||'Invoer niet ondersteund';
   return; // Invalid/blocked inputs do not consume a trial calculation.
  }
  if(!isAuthenticated()){
   const after=counter.consume();
   if(!after.allowed){
    $('workbenchResult').textContent='Proeflimiet bereikt — meld je aan.';
    refresh();onLogin();return;
   }
  }
  $('workbenchResult').textContent=
   result.heading+'\n\n'+result.lines.join('\n')+
   '\n\nGeen radiografische vrijgave.';
  const final=refresh();
  if(!isAuthenticated()&&final.remaining===0)onLogin();
 });
 $('trialGateLoginBtn').addEventListener('click',onLogin);
 $('trialLoginBtn').addEventListener('click',onLogin);
 $('trialStartBtn').addEventListener('click',()=>{
  const s=refresh();
  if(!isAuthenticated()&&s.remaining===0){onLogin();return}
  if($('tab-field').hidden){
   // App's existing tab switch is the single owner of navigation.
   document.querySelector('[data-tab="field"]')?.click();
  }
  panel.scrollIntoView?.({behavior:'smooth',block:'start'});
 });
 // Research-only pre-filled sample values; none are measured radiographic data.
 $('gThickness').value='12';$('gSfd').value='800';
 $('gActivity').value='40';$('gDensity').value='2,0';
 $('xThickness').value='20';$('xMa').value='5';
 $('xSfd').value='800';$('xDensity').value='2,5';
 populateXray();populateIqi();setKind('gamma');refresh();
 return {refresh,status:remaining,setKind};
}
