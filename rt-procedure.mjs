/**
 * BASIC RT PRO — Independent IQI reference lookup and geometric film layout.
 * IQI numbers use the ISO table module; the film planner is purely geometry.
 * Not an approved RT procedure, exposure chart, or exposure-count recommendation.
 */
import {lookupWireIqi} from './iqi.mjs';

const positive=n=>Number.isFinite(Number(n))&&Number(n)>0?Number(n):NaN;
const round=(n,places=2)=>Math.round(n*10**places)/10**places;

export function lookupProcedureIqi({standard='iso',qualityClass='B',technique='sw',
  iqiSide='source',tMm,wMm,material='steel'}={}){
 if(standard!=='iso')
  return {ok:false,error:'Geen onafhankelijke ASME-IQI-tabel opgenomen. Raadpleeg de geldige norm en jouw goedgekeurde procedure.'};
 if(material!=='steel')
  return {ok:false,error:'Deze IQI-hulp is alleen voor staal geconfigureerd. Controleer de materiaal-IQI-groep volgens de norm.'};
 const reference=lookupWireIqi({
  qualityClass,technique,iqiSide,
  nominalThicknessMm:positive(tMm),penetratedThicknessMm:positive(wMm),
  isotope:'X-ray'
 });
 if(!reference.ok){
  const explanations={
   selection:'Kies een opnameklasse, techniek en IQI-positie.',
   unsupported:'Geen onderbouwde tabel voor deze techniek en IQI-positie.',
   thickness:'Vul een geldige nominale dikte t in.',
   penetrated:'Vul een geldige werkelijk doorstraalde dikte w in.'
  };
  return {ok:false,error:explanations[reference.reason]||'Geen bruikbaar IQI-resultaat. Raadpleeg de officiële norm.'};
 }
 const no=reference.wireNumber;
 const wireGroup=no<=7?'ISO W1–W7':no<=12?'ISO W6–W12':no<=16?'ISO W10–W16':'ISO W13–W19';
 return {
  ok:true,standard:'iso',wire:reference.wire,diameterMm:reference.diameterMm,
  wireGroup,iqiSide,materialGroup:'Staal (Fe)',
  thicknessMm:reference.thicknessMm,thicknessKind:reference.thicknessKind,
  source:reference.table+' · ISO 19232-1:2013',
  note:'Normtabelhulpmiddel, geen formele opnameacceptatie. Het aantal benodigde IQI’s, de materiaal-IQI-groep en de zichtbaarheid worden volgens de geldige procedure beoordeeld.',
  warnings:iqiSide==='film'
    ?['Filmzijde-IQI: controleer de voorgeschreven markering en eventuele aanvullende voorwaarden.']
    :[]
 };
}

export function planFilmPlacement({shape='ring',outerDiameterMm,examinedLengthMm,
  usableFilmLengthMm,overlapMm}={}){
 if(!['ring','straight'].includes(shape))
  return {ok:false,error:'Kies een rondlas of een rechte las.'};
 const film=positive(usableFilmLengthMm),overlap=Number(overlapMm);
 if(!Number.isFinite(film)||!Number.isFinite(overlap)||overlap<0||overlap>=film)
  return {ok:false,error:'Vul een positieve bruikbare filmlengte en een overlap van 0 mm of meer in, kleiner dan de filmlengte.'};
 const total=shape==='ring'?Math.PI*Number(outerDiameterMm):Number(examinedLengthMm);
 if(!Number.isFinite(total)||total<=0||total>1e8)
  return {ok:false,error:shape==='ring'?'Vul een geldige buitendiameter in.':'Vul een geldige lengte van de rechte las in.'};
 const coverage=film-overlap;
 let count;
 if(shape==='ring')count=Math.max(1,Math.ceil(total/coverage-1e-11));
 else count=total<=film?1:Math.max(2,Math.ceil((total-overlap)/coverage-1e-11));
 if(count>250)
  return {ok:false,error:'Meer dan 250 filmstroken nodig. Deel het werkstuk op in kleinere zones.'};
 const spacingMm=shape==='ring'?total/count:(count===1?0:(total-film)/(count-1));
 const placement=[];
 for(let i=0;i<count;i++){
  const start=shape==='ring'
   ?i*spacingMm
   :(count===1?0:i*spacingMm);
  const center=shape==='ring'
   ?(count===1&&film>=total?total/2:start+film/2)
   :(count===1?total/2:start+film/2);
  const end=start+film;
  placement.push({
    film:i+1,startMm:round(start),positionMm:round(center),
    endMm:round(end),wrapsPastZeroMm:shape==='ring'?round(Math.max(0,end-total)):0,
    angleDeg:shape==='ring'?round(center/total*360):null
  });
 }
 const actualOverlap=shape==='ring'
  ?film-spacingMm
  :(count===1?Math.max(0,film-total):film-spacingMm);
 const notes=[
  'Dit schema berekent alleen een theoretische, gelijkmatige verdeling van de opgegeven bruikbare filmstroken.',
  'Controleer de daadwerkelijk bruikbare beeldlengte, lasdekking, markers en de vereiste overlap volgens de goedgekeurde procedure.',
  'De filmhoeveelheid bepaalt niet het aantal radiografische belichtingen.'
 ];
 if(shape==='ring'&&film>total)
  notes.push('De filmstrook is langer dan de volledige buitenomtrek; controleer of de plaatsing fysiek mogelijk is.');
 return {
  ok:true,shape,filmCount:count,totalMm:round(total),enteredFilmLengthMm:round(film),
  selectedStripMidpointMm:round(film/2),usefulSegmentMidpointMm:round(film/2),
  usefulLengthMm:round(film),requestedOverlapMm:overlap,
  actualPlanningOverlapMm:round(actualOverlap),spacingMm:round(spacingMm),
  spacingCm:round(spacingMm/10),placement,
  exposureGuide:'Aantal belichtingen en IQI-plaatsing worden afzonderlijk bepaald volgens de geldige procedure.',
  notes,source:'BASIC RT PRO — geometrisch verdeelmodel (geen normatieve filmberekening).'
 };
}
