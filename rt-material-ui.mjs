/**
 * Materials control the research calculator through the existing #material selector.
 * Keep a visible research warning; there is no RT procedure approval here.
 */
import {
 PROPOSED_MATERIAL_FACTORS,NOT_APPROVED,compareMaterialEquivalence,
 compareGammaDensityD25
} from './research/live-material-preview.mjs';

const $=id=>document.getElementById(id);
const allowed=new Set([...Object.keys(PROPOSED_MATERIAL_FACTORS),'custom']);
const buttons=()=>[...document.querySelectorAll('[data-rt-material]')];
const number=value=>{
 const str=String(value??'').trim().replace(',','.');
 return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(str)?Number(str):NaN;
};
const lang=()=>['nl','en','de'].includes($('language')?.value)?$('language').value:'nl';
const local=n=>new Intl.NumberFormat(lang()==='de'?'de-DE':lang()==='en'?'en-GB':'nl-NL',
 {minimumFractionDigits:1,maximumFractionDigits:3}).format(n);
const phrase=(key,vars,fallback)=>{const translated=window.NDTI18n?.tr(key,vars);return translated&&translated!==key?translated:fallback;};
const name=material=>phrase('materials.'+material,{},material==='Fe'?'Staal':material);
const gammaMode=()=>$('modeGamma')?.getAttribute('aria-pressed')==='true';
const selectedDensity=()=>number($('density')?.value);
const selectedThickness=()=>number($('thickness')?.value||$('rtCompactThickness')?.value);
const selectedDistance=()=>number($('distance')?.value);
const film=()=>$('film')?.value;
let selectedMaterial='Fe';
function current(){
 const mode=gammaMode()?'gamma':'xray';
 const material=selectedMaterial==='custom'?'custom':selectedMaterial;
 return compareMaterialEquivalence({
  material,mode,isotope:document.querySelector('input[name="isotope"]:checked')?.value||'Se-75',wallMm:selectedThickness(),
  customFactor:number($('rtMaterialCustomFactor')?.value)
 });
}
function info(){
 const output=$('rtMaterialSummary');
 if(!output)return;
 const comparison=current();
 if(!comparison.ok){
  output.textContent=selectedMaterial==='custom'?
   phrase('ui.materialInvalidFactor',{},'Vul een positieve onderzoeksfactor in.') :
   phrase('ui.materialInvalidThickness',{},'Vul een geldige dikte in.');
  return;
 }
 const args={
  material:name(selectedMaterial==='custom'?'Other':selectedMaterial),
  thickness:local(comparison.wallMm), fe_eq:local(comparison.equivalentSteelMm),
  factor:local(comparison.proposedFactor||1), mode:comparison.mode==='gamma'?'Gamma':'X-ray'
 };
 output.textContent=phrase(selectedMaterial==='Fe'?'ui.materialSteelInfo':'ui.materialResearchInfo',args,
  args.thickness+' mm '+args.material+' → '+args.fe_eq+' mm Fe equivalent.');
}
function renderCard(){
 const box=$('rtMaterialResult');if(!box)return;
 const cmp=current();
 if(!cmp.ok){box.hidden=true;return}
 if(selectedMaterial!=='Fe'){
  box.hidden=false;
  const args={material:name(selectedMaterial==='custom'?'Other':selectedMaterial),
   thickness:local(cmp.wallMm),fe_eq:local(cmp.equivalentSteelMm),
   factor:local(cmp.proposedFactor),mode:cmp.mode==='gamma'?'Gamma':'X-ray'};
  box.textContent=phrase('ui.materialComparison',args,
   args.material+' · '+args.thickness+' mm ≈ '+args.fe_eq+' mm Fe.');
  return;
 }
 if(!gammaMode()||selectedDensity()!==2.5||
    !['D4','D5'].includes(film())||
    $('resultTime')?.textContent?.trim()==='—'){
  box.hidden=true;return;
 }
 const activityMode=document.querySelector('input[name="activityMode"]:checked')?.value;
 if(activityMode!=='manual'){box.hidden=true;return}
 const isotope=document.querySelector('input[name="isotope"]:checked')?.value;
 const trial=compareGammaDensityD25({
  isotope,film:film(),wallMm:selectedThickness(),activityCi:number($('manualCi')?.value),
  sfdMm:selectedDistance(),density:2.5,material:'Fe'
 });
 if(!trial.ok){box.hidden=true;return}
 box.hidden=false;
 const vars={time:trial.candidateTime,factor:local(trial.proposedFactor),film:trial.film};
 box.textContent=phrase('ui.steelComparison',vars,'Onderzoeksvergelijking: '+vars.time);
}
function render(){
 const other=selectedMaterial==='custom';
 if($('rtMaterialCustomWrap'))$('rtMaterialCustomWrap').hidden=!other;
 for(const b of buttons()){
  const active=b.dataset.rtMaterial===selectedMaterial;
  b.classList.toggle('active',active);
  b.setAttribute('aria-pressed',String(active));
 }
 info();renderCard();
}
function choose(material){
 if(!allowed.has(material))return;
 selectedMaterial=material;
 const original=$('material');
 if(original){
  original.value=material==='custom'?'Other':material;
  original.dispatchEvent(new Event('input',{bubbles:true}));
  original.dispatchEvent(new Event('change',{bubbles:true}));
 }
 render();
 // Gamma has an existing debounced auto-update; trigger an immediate X-ray update.
 if(!gammaMode())$('calculate')?.click();
}
function init(){
 const selector=$('material'),panel=$('rtMaterialChoices'),result=$('rtMaterialResult');
 if(!selector||!panel||!result)return;
 selectedMaterial=allowed.has(selector.value)?selector.value:
  selector.value==='Other'?'custom':'unsupported';
 for(const b of buttons())b.addEventListener('click',()=>choose(b.dataset.rtMaterial));
 $('rtMaterialCustomFactor')?.addEventListener('input',()=>{
  $('material')?.dispatchEvent(new Event('input',{bubbles:true}));
  render();
  if(!gammaMode())$('calculate')?.click();
 });
 // Extended settings and source-mode selection update the visual hypothesis.
 selector.addEventListener('change',()=>{
  selectedMaterial=allowed.has(selector.value)?selector.value:
   selector.value==='Other'?'custom':'unsupported';
  render();
 });
 for(const id of ['thickness','workWall','workPenetrated','rtCompactThickness',
  'density','film','distance','manualCi','modeGamma','modeXray']){
  const el=$(id);if(!el)continue;
  el.addEventListener('input',render);
  el.addEventListener('change',render);
  if(id==='modeGamma'||id==='modeXray')el.addEventListener('click',()=>setTimeout(render,0));
 }
 document.querySelectorAll('input[name="isotope"],input[name="activityMode"]').forEach(el=>
  el.addEventListener('change',render));
 // The original app owns #resultTime. Keep this card in sync without changing it.
 const time=$('resultTime');
 if(time&&typeof MutationObserver!=='undefined')
  new MutationObserver(renderCard).observe(time,{childList:true,characterData:true,subtree:true});
 window.addEventListener('rt-language-changed',render);
 window.addEventListener('rt-locales-ready',render);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
