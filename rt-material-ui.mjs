/**
 * Main UI only: research material comparison, never modify the exposure engine.
 * Uses the existing #material selector and compact geometry proxy.
 * The current engine retains its non-steel validation block.
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
const local=n=>n.toLocaleString('nl-NL',{maximumFractionDigits:3});
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
  material,mode,wallMm:selectedThickness(),
  customFactor:number($('rtMaterialCustomFactor')?.value)
 });
}
function info(){
 const output=$('rtMaterialSummary');
 if(!output)return;
 const comparison=current();
 if(!comparison.ok){
  output.textContent=selectedMaterial==='custom'?
   'Vul een positieve, aantoonbare factor in. Zonder validatie wordt geen belichtingstijd aangepast.':
   'Vul een geldige dikte in. De belichtingsmotor blijft ongewijzigd.';
  return;
 }
 if(selectedMaterial==='Fe'){
  output.textContent='Staal · factor 1,00 · staalequivalentie '+local(comparison.equivalentSteelMm)+
   ' mm. Referentiecurve zonder materiaalomrekening.';
 }else{
  output.textContent=comparison.label+' · '+(comparison.mode==='gamma'?'Gamma':'X-ray')+
   ' onderzoeksfactor '+local(comparison.proposedFactor)+' · w_eq = '+
   local(comparison.wallMm)+' × '+local(comparison.proposedFactor)+' = '+
   local(comparison.equivalentSteelMm)+' mm staal. NIET GEVALIDEERD en niet toegepast op de belichtingsmotor.';
 }
}
function renderCard(){
 const box=$('rtMaterialResult');if(!box)return;
 const cmp=current();
 if(!cmp.ok){box.hidden=true;return}
 if(selectedMaterial!=='Fe'){
  box.hidden=false;
  box.textContent='Materiaalonderzoek · '+cmp.label+': voorgestelde factor '+
   local(cmp.proposedFactor)+' ('+(cmp.mode==='gamma'?'Gamma':'X-ray')+
   '), equivalente staaldikte '+local(cmp.equivalentSteelMm)+' mm (w_eq = w × f_mat). '+
   'NIET TOEGEPAST: geen geverifieerde materiaalcurve. De bestaande berekeningsblokkade blijft gelden.';
  return;
 }
 // Only separate research comparison for D=2.5 in the supported gamma/Fe area.
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
 box.textContent='PR #6 · aparte D=2,5 onderzoeksvergelijking: '+trial.candidateTime+
  ' (factor '+local(trial.proposedFactor)+', '+trial.film+
  '). '+NOT_APPROVED+' · De tijd bovenaan blijft de ongewijzigde referentiemotor.';
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
}
function init(){
 const selector=$('material'),panel=$('rtMaterialChoices'),result=$('rtMaterialResult');
 if(!selector||!panel||!result)return;
 selectedMaterial=allowed.has(selector.value)?selector.value:
  selector.value==='Other'?'custom':'unsupported';
 for(const b of buttons())b.addEventListener('click',()=>choose(b.dataset.rtMaterial));
 $('rtMaterialCustomFactor')?.addEventListener('input',render);
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
 // The original app writes #resultTime. Observe only that node and never
 // modify it, so recalculation remains owned by the original engine.
 const time=$('resultTime');
 if(time&&typeof MutationObserver!=='undefined')
  new MutationObserver(renderCard).observe(time,{childList:true,characterData:true,subtree:true});
 window.addEventListener('rt-language-changed',render);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
