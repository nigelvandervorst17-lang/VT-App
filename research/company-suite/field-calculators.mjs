/**
 * Standalone research-only calculator workbench. Never authorises exposures.
 * Existing motor, exact-kV X-ray datasets, ISO IQI lookup and procedure
 * film coverage helpers are imported, not modified.
 */
import {calculateGamma,hms} from '../../rt-core.mjs';
import {curves} from '../../rt-curves.mjs';
import {calculateResearchXray,researchDatabase} from '../xray-core.mjs';
import {researchDensityFactors} from '../gamma-nine-point-review.mjs';
import {lookupWireIqi} from '../../iqi.mjs';
import {calculateFilmPlan} from '../../procedure-runtime/planning/filmPlanning.js';
import {equivalentSteelPreview} from './research-physics-preview.mjs';

const finite=Number.isFinite;
const pos=v=>finite(v)&&v>0;
const BLOCK='Niet berekend: ';
const RELEASE='Uitsluitend onderzoek; geen vrijgegeven RT-belichting of IQI-acceptatie.';
function blocked(code){return {ok:false,error:code,message:BLOCK+code};}
function okay(kind,heading,lines,extra={}){
 return {ok:true,kind,heading,lines,releaseAuthorized:false,caution:RELEASE,...extra};
}
export function gammaPreview({isotope,film,thicknessMm,distanceMm,activityCi,density,
 proposedD25=false,material='Fe'}={}){
 if(material!=='Fe')return blocked('Alleen staal (Fe) binnen onderzochte gamma-datasets');
 const input={isotope,film,thicknessMm,distanceMm,activityCi,density,material:'Fe',screens:'Pb'};
 const result=calculateGamma(input,curves);
 if(!result.ok)return blocked('Gamma-blokkade: '+result.error);
 let minutes=result.minutes,mode='Bestaande onderzoeksreferentie';
 if(proposedD25&&density===2.5&&researchDensityFactors[film]){
  const atTwo=calculateGamma({...input,density:2},curves);
  if(!atTwo.ok)return blocked('Onderzoeksfactor alleen bij ondersteunde D=2,0-curve');
  minutes=atTwo.minutes*researchDensityFactors[film];
  mode='Hypothetische PR #6 zwartingsfactor '+researchDensityFactors[film]+' (niet gevalideerd)';
 }
 return okay('gamma','Gamma · '+isotope+' / '+film,[
  'Onderzoeksresultaat: '+hms(minutes),
  'Staaldikte: '+thicknessMm+' mm · SFD: '+distanceMm+' mm',
  'Activiteit: '+activityCi+' Ci · zwarting: D '+density,
  'Berekenwijze: '+mode,
  'Broncurve: '+result.datasetId,
  RELEASE
 ],{minutes,mode});
}
export function xrayPreview({model,film,kv,ma,thicknessMm,distanceMm,density,material='Fe'}={}){
 if(material!=='Fe')return blocked('Alleen staal (Fe) voor een bestaande, passende X-ray-curve');
 const r=calculateResearchXray({model,film,kv,ma,thicknessMm,distanceMm,density,
  material:'Fe',deviceFactor:1});
 if(!r.ok)return blocked('X-ray-blokkade: '+r.error);
 return okay('xray','X-ray · '+model,[
  'Onderzoeksresultaat: '+hms(r.minutes),
  'Film '+film+' · '+kv+' kV · '+ma+' mA · D '+density,
  'Staaldikte: '+thicknessMm+' mm · SFD: '+distanceMm+' mm',
  'Bestaande exacte kV-referentie (geen vermenging): '+r.datasetId,
  'Toestelbron, Pb-schermen, opbrengst en verwerking zijn nog niet onafhankelijk gevalideerd.',
  RELEASE
 ],{minutes:r.minutes});
}
export function pipePreview({diameterMm,thicknessMm,usableFilmMm,overlapMm,
 maximumPathThicknessMm=null,penetratedThicknessMm=null,qualityClass='B'}={}){
 if(![diameterMm,thicknessMm,usableFilmMm,overlapMm].every(finite)
    ||diameterMm<=0||thicknessMm<=0||thicknessMm>=diameterMm/2
    ||usableFilmMm<=overlapMm||overlapMm<=0||!['A','B'].includes(qualityClass))
   return blocked('Ongeldige pijp-, film- of overlapgegevens');
 const input={geometry:{
  shape:'pipe',diameterMm,filmUsableLengthMm:usableFilmMm,
  filmWrapped:true,sourcePlacement:'external'
 },thicknessMm,technique:'sw',sfdMm:800,
 maximumPathThicknessMm:Number.isFinite(maximumPathThicknessMm)?maximumPathThicknessMm:null,
 penetratedThicknessMm:Number.isFinite(penetratedThicknessMm)?penetratedThicknessMm:null};
 const profile={class:qualityClass,planning:{
  minimumFilmOverlapMm:overlapMm,approvedExposureRules:[]
 }};
 const result=calculateFilmPlan(input,profile);
 if(!finite(result.plan.circumferenceMm)||!Number.isInteger(result.plan.filmSegments))
   return blocked('Filmdekking onvolledig of ongeldig');
 return okay('pipe','Pijp · filmdekking',[
  'Pijpomtrek: '+result.plan.circumferenceMm.toFixed(1)+' mm',
  'Omgelegde filmsegmenten (geometrische indicatie): '+result.plan.filmSegments,
  'Minimum aantal RT-opnamen: ONBEKEND zonder goedgekeurde bijlage-A-regel',
  ...result.checks.map(x=>x.message),
  RELEASE
 ],{filmSegments:result.plan.filmSegments});
}
export function iqiPreview({nominalThicknessMm,penetratedThicknessMm=null,technique='sw',
 iqiSide='source',qualityClass='B',isotope='Se-75',observedWire=null}={}){
 const result=lookupWireIqi({nominalThicknessMm,penetratedThicknessMm,technique,
  iqiSide,qualityClass,isotope});
 if(!result.ok)return blocked('IQI-regel ontbreekt of combinatie niet ondersteund: '+result.reason);
 const lines=[
  'Tabellookup: '+result.wire+' · '+result.diameterMm+' mm',
  result.table+' · klasse '+qualityClass+' · '+iqiSide,
  'Draadnummerhulp, geen bewijs van IQI-zichtbaarheid of filmacceptatie.'
 ];
 if(observedWire!==null&&observedWire!==''){
  const observed=Number(observedWire);
  if(!Number.isInteger(observed)||observed<1||observed>19)
   return blocked('Kies een bestaande werkelijk zichtbare draad W1–W19');
  lines.push('Waargenomen W'+observed+
   (observed>=result.wireNumber?
    ': nummer minstens zo fijn — zichtbaarheid/procedure apart controleren':
    ': grover dan tabelindicatie — vereiste draad niet aangetoond'));
 }
 lines.push(RELEASE);
 return okay('iqi','IQI · '+technique+' / klasse '+qualityClass,lines,{
  requiredWire:result.wireNumber,table:result.table});
}
export function materialPreview({material,mode,thicknessMm}={}){
 const r=equivalentSteelPreview({material,mode,thicknessMm});
 if(!r.ok)return blocked('Ongeldige materiaalonderzoek-invoer');
 return okay('material','Materiaal · '+r.label,[
  'Hypothetische equivalentie: '+r.equivalentSteelMm.toFixed(3)+' mm staal',
  'Voorgestelde factor '+r.factor+' · '+mode,
  r.warning,RELEASE
 ],{equivalentSteelMm:r.equivalentSteelMm});
}
export const WORKBENCH_KINDS=Object.freeze(['gamma','xray','pipe','iqi','material']);
export function researchWorkbench(kind,input){
 switch(kind){
  case 'gamma':return gammaPreview(input);
  case 'xray':return xrayPreview(input);
  case 'pipe':return pipePreview(input);
  case 'iqi':return iqiPreview(input);
  case 'material':return materialPreview(input);
  default:return blocked('Onbekende rekenmodule');
 }
}
export function availableXrayModels(){
 return Object.entries(researchDatabase().xray).filter(([,d])=>
  d?.enabled!==false&&Array.isArray(d?.curves)&&d.curves.length>0)
 .map(([model,d])=>({model,film:d.film,
  kv:d.curves.map(c=>c.kv).filter(Number.isInteger)}));
}
