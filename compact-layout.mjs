/* Basic RT PRO — compact 2-column calculator view, visual bridge only.
 * Reuses the existing calculation/validation handlers. Never creates a new RT exposure model.
 * The original full controls remain available under a details disclosure.
 */
'use strict';
const $ = id => document.getElementById(id);
const screen = $('screen-calc');
const panel = $('rtCompactPanel');
const advanced = $('rtCompactAdvanced');
const advancedBody = $('rtCompactAdvancedBody');
const activity = $('rtCompactActivity');
const thickness = $('rtCompactThickness');
const film = $('rtCompactFilm');
const distance = $('rtCompactDistance');
const density = $('rtCompactDensity');
let syncing = false;

const translations = {
  nl:{activity:'Activiteit (Ci)',current:'Stroom (mA)',thickness:'Staaldikte t (mm)',penetrated:'Doorstraalde dikte w (mm)',
      locked:'Certificaatmodus actief: wijzig activiteit onder Extra instellingen.',noRuntime:'Geen vrijgegeven belichtingstijd. Controleer de volledige geometrie en brongegevens.',xray:'X-ray: toestel, spanning en stroom moeten met de fabrikantcurve overeenkomen.',
      summary:'Extra instellingen · opnamegeometrie, IQI en werkvoorbereiding',details:'Meer over onderzoek en beperkingen',title:'Snelle onderzoeksberekening',film:'Filmtype',distance:'Bron-/focus-filmafstand (mm)',density:'Doelzwarting (D)'},
  en:{activity:'Activity (Ci)',current:'Current (mA)',thickness:'Steel thickness t (mm)',penetrated:'Penetrated thickness w (mm)',
      locked:'Certificate mode: edit activity under Advanced settings.',noRuntime:'No approved exposure time. Check geometry and source data.',xray:'X-ray: model, voltage and current must match manufacturer chart.',
      summary:'Advanced settings · geometry, IQI and preparation',details:'Research limitations',title:'Quick research estimate',film:'Film type',distance:'Source/focus-to-film (mm)',density:'Target optical density (D)'},
  pl:{activity:'Aktywność (Ci)',current:'Prąd (mA)',thickness:'Grubość stali t (mm)',penetrated:'Grubość prześwietlana w (mm)',
      locked:'Tryb certyfikatu: zmień aktywność w ustawieniach zaawansowanych.',noRuntime:'Brak zatwierdzonego czasu ekspozycji. Sprawdź geometrię i dane źródła.',xray:'RTG: model, napięcie i prąd muszą odpowiadać wykresowi producenta.',
      summary:'Ustawienia dodatkowe · geometria, IQI i przygotowanie',details:'Ograniczenia wersji badawczej',title:'Szybkie obliczenie badawcze',film:'Typ błony',distance:'Odległość źródło/błona (mm)',density:'Docelowa gęstość (D)'}
};
const lang=()=>['nl','en','pl'].includes($('language')?.value)?$('language').value:'nl';
const tr=k=>translations[lang()]?.[k]||translations.nl[k]||k;
const gamma=()=>$('modeGamma')?.getAttribute('aria-pressed')==='true';
const isPipe=()=>$('workPipe')?.getAttribute('aria-pressed')==='true';
const certificate=()=>document.querySelector('input[name="activityMode"]:checked')?.value==='certificate';
const activeIsotope=()=>document.querySelector('input[name="isotope"]:checked')?.value||'Se-75';
const sourceInput=()=>gamma()?$('manualCi'):$('ma');
const thicknessInput=()=>isPipe() ? $('workPenetrated') : $('workWall');
function copy(source,target){if(source&&target&&document.activeElement!==target){target.value=source.value;}}
function dispatch(target){
  if(!target)return;
  target.dispatchEvent(new Event('input',{bubbles:true}));
  target.dispatchEvent(new Event('change',{bubbles:true}));
}
function sync(){
  if(!panel||syncing)return;
  syncing=true;
  try{
    const g=gamma(),pipe=isPipe(),cert=certificate();
    const source=sourceInput();
    const activityLabel=$('rtCompactActivityLabel'),thicknessLabel=$('rtCompactThicknessLabel');
    if(activityLabel)activityLabel.textContent=g?tr('activity'):tr('current');
    if(thicknessLabel)thicknessLabel.textContent=pipe?tr('penetrated'):tr('thickness');
    for(const [id,label] of [['rtCompactTitle','title'],['rtCompactFilmLabel','film'],['rtCompactDistanceLabel','distance'],['rtCompactDensityLabel','density']]){
      const item=$(id);if(item)item.textContent=tr(label);
    }
    for(const [id,active] of [['rtCompactSe',g&&activeIsotope()==='Se-75'],['rtCompactIr',g&&activeIsotope()==='Ir-192'],['rtCompactXray',!g]]){
      const button=$(id);if(button){button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
    }
    const disabled=g&&cert;
    if(activity){activity.disabled=disabled;activity.placeholder=disabled?'Certificaat':'';}
    if(disabled) {if(activity&&document.activeElement!==activity)activity.value='';}
    else copy(source,activity);
    copy(thicknessInput(),thickness);
    copy($('film'),film);
    copy($('distance'),distance);
    copy($('density'),density);
    const equipment=$('rtCompactXrayEquipment');
    if(equipment)equipment.hidden=g;
    const note=$('rtCompactModeNote');
    if(note)note.textContent=disabled?tr('locked'):g?tr('noRuntime'):tr('xray');
    const summary=$('rtCompactAdvancedLabel');
    if(summary)summary.textContent=tr('summary');
    const help=$('rtCompactHelpTitle');
    if(help)help.textContent=tr('details');
    updateDensityButtons();
  }finally{syncing=false;}
}
function updateDensityButtons(){
  const val=String(density?.value||'').replace(',','.').trim();
  document.querySelectorAll('[data-rt-compact-density]').forEach(b=>{
    const on=Number(val)===Number(b.dataset.rtCompactDensity);
    b.classList.toggle('active',on);
    b.setAttribute('aria-pressed',String(on));
  });
}
function setupInput(proxy,getOriginal){
  const relay=()=>{
    const original=getOriginal();
    if(!original||proxy.disabled)return;
    if(original.value!==proxy.value){
      original.value=proxy.value;
      dispatch(original);
    }
    requestAnimationFrame(sync);
  };
  proxy?.addEventListener('input',relay);
  proxy?.addEventListener('change',relay);
}
function selectMode(which){
  if(which==='xray'){
    if(gamma())$('modeXray')?.click();
  }else{
    if(!gamma())$('modeGamma')?.click();
    const original=document.querySelector('input[name="isotope"][value="'+which+'"]');
    if(original&&!original.checked){original.checked=true;dispatch(original);}
  }
  setTimeout(sync,0);
}
function init(){
  if(!screen||!panel||!advanced||!advancedBody||!activity||!thickness||!film||!distance||!density)return;
  const button=$('calculate'),result=$('resultCard'),mount=$('rtCompactResultMount');
  if(!button||!result||!mount)return;
  // Keep original calculators, inputs and their event listeners. Only change their locations.
  mount.append(button,result);
  const keep=new Set([panel,advanced]);
  const mainHeading=screen.querySelector(':scope > .section-heading');
  if(mainHeading)keep.add(mainHeading);
  for(const el of [...screen.children]){
    if(!keep.has(el))advancedBody.append(el);
  }
  // Place device selectors, kV, and current original elements in the compact X-ray area;
  // their original event handlers stay attached. Other X-ray explanations remain under details.
  const xrayControls=$('xrayFields')?.querySelector(':scope > .fields-grid');
  const xrayEquipment=$('rtCompactXrayEquipment');
  if(xrayControls&&xrayEquipment)xrayEquipment.append(xrayControls);
  panel.hidden=false;advanced.hidden=false;screen.classList.add('rt-compact-ready');
  $('rtCompactSe')?.addEventListener('click',()=>selectMode('Se-75'));
  $('rtCompactIr')?.addEventListener('click',()=>selectMode('Ir-192'));
  $('rtCompactXray')?.addEventListener('click',()=>selectMode('xray'));
  setupInput(activity,sourceInput);
  setupInput(thickness,thicknessInput);
  setupInput(film,()=>$('film'));
  setupInput(distance,()=>$('distance'));
  setupInput(density,()=>$('density'));
  document.querySelectorAll('[data-rt-compact-distance]').forEach(b=>b.addEventListener('click',()=>{
    if(distance){distance.value=b.dataset.rtCompactDistance;dispatchProxy(distance);}
  }));
  document.querySelectorAll('[data-rt-compact-density]').forEach(b=>b.addEventListener('click',()=>{
    if(density){density.value=b.dataset.rtCompactDensity;dispatchProxy(density);}
  }));
  document.querySelectorAll('[data-rt-jump]').forEach(b=>b.addEventListener('click',()=>{
    const target=$(b.dataset.rtJump);
    if(target&&advancedBody.contains(target))advanced.open=true;
  },true));
  $('activityJump')?.addEventListener('click',()=>{advanced.open=true;},true);
  document.querySelectorAll('[data-proc-open],#workOpenProcedure').forEach(b=>b.addEventListener('click',()=>{advanced.open=true;},true));
  const selectors=['workWall','workPenetrated','film','distance','density','manualCi','ma','xrayModel','kv'];
  for(const id of selectors){$(id)?.addEventListener('input',()=>requestAnimationFrame(sync));$(id)?.addEventListener('change',()=>requestAnimationFrame(sync));}
  for(const id of ['workPlate','workPipe','modeGamma','modeXray'])$(id)?.addEventListener('click',()=>setTimeout(sync,0));
  document.querySelectorAll('input[name="isotope"],input[name="activityMode"]').forEach(el=>el.addEventListener('change',()=>setTimeout(sync,0)));
  document.querySelectorAll('#screen-calc select').forEach(el=>el.addEventListener('change',()=>setTimeout(sync,0)));
  document.querySelectorAll('.bottom-nav [data-nav],#moreMenu [data-nav]').forEach(b=>b.addEventListener('click',()=>setTimeout(sync,0)));
  window.addEventListener('rt-language-changed',sync);
  sync();
}
function dispatchProxy(input){input.dispatchEvent(new Event('input',{bubbles:true}));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
