/* BASIC RT PRO — IQI Snelcontrole.
 * Adds an observation comparison alongside the existing ISO table lookup.
 * Does not change IQI thresholds, source settings, exposure calculations,
 * Waygate references, records, or film data.
 */
'use strict';
import {lookupWireIqi} from './iqi.mjs';
const $=id=>document.getElementById(id);
const decimal=value=>{
 const s=String(value??'').trim().replace(',','.');
 return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)?Number(s):NaN;
};
const copy={
 nl:{
  title:'IQI Snelcontrole',subtitle:'Klasse · techniek · positie',
  field:'Fijnste duidelijk zichtbare IQI-draad op de film',
  choose:'Nog niet beoordeeld',
  empty:'Kies de werkelijk waargenomen draad om deze met de IQI-eis te vergelijken.',
  notReady:'De vereiste draad is nog niet bepaald. Controleer klasse, techniek, IQI-positie, materiaal en dikte.',
  adequate:(seen,required)=>'Nummervergelijking: '+seen+' is gelijk aan of fijner dan '+required+'. Controleer ook de werkelijke zichtbaarheid, plaatsing, markering en goedgekeurde procedure; dit is geen RT-vrijgave.',
  inadequate:(seen,required)=>'Nummervergelijking: '+seen+' is grover dan '+required+'. Het vereiste draadnummer is daarmee nog niet aangetoond; beoordeel de opname volgens de geldige procedure.',
  caution:'Alleen hulpmiddel voor draadnummervergelijking, geen formele acceptatie. Beoordeel de film en IQI volgens de geldige norm en RT-procedure.'
 },
 en:{
  title:'IQI Quick Check',subtitle:'Class · technique · position',
  field:'Finest clearly visible IQI wire on the film',
  choose:'Not assessed yet',
  empty:'Choose the wire actually visible on the film to compare it with the IQI requirement.',
  notReady:'The required wire has not been determined. Check class, technique, IQI position, material and thickness.',
  adequate:(seen,required)=>'Wire-number comparison: '+seen+' is as fine as or finer than '+required+'. Verify visibility, positioning, markers and the approved procedure. This is not RT approval.',
  inadequate:(seen,required)=>'Wire-number comparison: '+seen+' is coarser than '+required+'. The required wire-number criterion has not been demonstrated.',
  caution:'Wire-number comparison aid only, not formal acceptance. Assess the film and IQI using the applicable standard and approved RT procedure.'
 },
 pl:{
  title:'Szybka kontrola IQI',subtitle:'Klasa · technika · pozycja',
  field:'Najcieńszy wyraźnie widoczny drut IQI na błonie',
  choose:'Jeszcze nie oceniono',
  empty:'Wybierz drut rzeczywiście widoczny na błonie, aby porównać go z wymaganiem IQI.',
  notReady:'Wymagany drut nie został ustalony. Sprawdź klasę, technikę, położenie IQI, materiał i grubość.',
  adequate:(seen,required)=>'Porównanie numerów: '+seen+' jest tak samo cienki lub cieńszy niż '+required+'. Sprawdź widoczność, położenie, oznaczenia i zatwierdzoną procedurę. To nie jest zatwierdzenie RT.',
  inadequate:(seen,required)=>'Porównanie numerów: '+seen+' jest grubszy niż '+required+'. Kryterium numeru drutu nie zostało wykazane.',
  caution:'Wyłącznie pomoc w porównaniu numerów drutów, nie formalna akceptacja. Oceń błonę i IQI według normy oraz zatwierdzonej procedury.'
 }
};
copy.de={...copy.en,title:'IQI-Schnellprüfung',subtitle:'Klasse · Technik · Position',field:'Dünnster eindeutig sichtbarer IQI-Draht auf dem Film',choose:'Noch nicht beurteilt',empty:'Tatsächlich sichtbaren Draht auswählen und mit der IQI-Anforderung vergleichen.',notReady:'Erforderlicher Draht noch nicht bestimmt. Klasse, Technik, IQI-Seite, Material und Dicke prüfen.',adequate:(seen,required)=>'Drahtvergleich: '+seen+' ist gleich fein oder feiner als '+required+'. Sichtbarkeit, Position, Markierung und Verfahren prüfen. Keine RT-Freigabe.',inadequate:(seen,required)=>'Drahtvergleich: '+seen+' ist gröber als '+required+'. Die erforderliche Drahtnummer ist nicht nachgewiesen.',caution:'Nur Hilfsmittel zum Drahtnummervergleich, keine formelle Abnahme. Film und IQI nach geltender Norm beurteilen.'};
function lang(){const l=$('language')?.value;return l==='en'||l==='de'?l:'nl';}
function t(){return copy[lang()];}
function currentReference(){
 const material=$('material')?.value;
 if(!['Fe','RVS300'].includes(material))return {ok:false,reason:'material'};
 const gamma=$('modeGamma')?.getAttribute('aria-pressed')==='true';
 const isotope=gamma
  ?document.querySelector('input[name="isotope"]:checked')?.value||'Se-75'
  :'X-ray';
 return lookupWireIqi({
  nominalThicknessMm:decimal($('thickness')?.value),
  penetratedThicknessMm:decimal($('iqiPenetrated')?.value),
  technique:$('iqiTechnique')?.value,
  iqiSide:$('iqiSide')?.value,
  qualityClass:$('iqiClass')?.value,
  isotope
 });
}
function compareWire(reference,observed){
 if(!reference?.ok||!Number.isInteger(reference.wireNumber))
  return {status:'unknown'};
 const n=Number(observed);
 if(!/^(?:[1-9]|1[0-9])$/.test(String(observed??''))||!Number.isInteger(n))
  return {status:'unassessed'};
 return {status:n>=reference.wireNumber?'finerOrEqual':'coarser',
  required:'W'+reference.wireNumber,observed:'W'+n};
}
function context(){
 return JSON.stringify({
  material:$('material')?.value,thickness:$('thickness')?.value,
  penetrated:$('iqiPenetrated')?.value,cls:$('iqiClass')?.value,
  technique:$('iqiTechnique')?.value,side:$('iqiSide')?.value,
  mode:$('modeGamma')?.getAttribute('aria-pressed'),
  isotope:document.querySelector('input[name="isotope"]:checked')?.value,
  film:$('film')?.value,shape:$('workPipe')?.getAttribute('aria-pressed')
 });
}
let previous=null;
function refresh(){
 const control=$('rtIqiObserved'),text=$('rtIqiObservedStatus');
 if(!control||!text)return;
 const updated=context();
 if(previous!==null&&previous!==updated)control.value='';
 previous=updated;
 const L=t();
 const quick=$('rtCompactIqiQuick');
 if(quick){
  const headline=quick.querySelector('.rt-iqi-quick-title strong');
  const subtitle=quick.querySelector('.rt-iqi-quick-title span');
  const label=quick.querySelector('.rt-iqi-observed label');
  const caution=quick.querySelector('.rt-iqi-quick-caution');
  if(headline)headline.textContent=L.title;
  if(subtitle)subtitle.textContent=L.subtitle;
  if(label)label.textContent=L.field;
  if(caution)caution.textContent=L.caution;
 }
 if(control.options[0])control.options[0].textContent=L.choose;
 const reference=currentReference();
 const comparison=compareWire(reference,control.value);
 text.classList.toggle('rt-iqi-observed-lower',comparison.status==='coarser');
 text.classList.toggle('rt-iqi-observed-higher',comparison.status==='finerOrEqual');
 if(!reference.ok)text.textContent=L.notReady;
 else if(comparison.status==='unassessed')text.textContent=L.empty;
 else if(comparison.status==='finerOrEqual')text.textContent=L.adequate(comparison.observed,comparison.required);
 else if(comparison.status==='coarser')text.textContent=L.inadequate(comparison.observed,comparison.required);
 else text.textContent=L.empty;
}
function init(){
 if(!$('rtCompactIqiQuick')||!$('rtIqiObserved'))return;
 $('rtIqiObserved').addEventListener('change',refresh);
 // Event handlers in app.mjs remain the owners of the normative IQI lookup.
 for(const id of ['iqiClass','iqiTechnique','iqiSide','iqiPenetrated','thickness',
  'workWall','workPenetrated','material','film']){
  const el=$(id);if(!el)continue;
  el.addEventListener('input',refresh);
  el.addEventListener('change',refresh);
 }
 for(const id of ['modeGamma','modeXray','rtCompactSe','rtCompactIr','rtCompactXray',
  'rtCompactPlate','rtCompactPipe','workPlate','workPipe','iqiUseDouble','workResetDouble']){
  $(id)?.addEventListener('click',()=>setTimeout(refresh,0));
 }
 document.querySelectorAll('input[name="isotope"]').forEach(el=>el.addEventListener('change',refresh));
 $('language')?.addEventListener('change',refresh);
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
