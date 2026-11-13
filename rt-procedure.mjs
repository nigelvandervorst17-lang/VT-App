/**
 * Basic RT PRO 2.5 — IQI + film placement planning aid (NOT approved RT procedure).
 * PRIMARY SOURCES supplied by user:
 * MM 18100 E rev22 §§ 10.3, 11.4, 12.1–12.3 (ISO welds, ≤ 75 mm w).
 * MM 11400 E rev23 §§ 9.2, 9.10–9.12 (ASME steel castings ≤ 76 mm).
 * MM 00102 E rev04 §§ 4.5, 4.6, 4.11 (lead tape and minimum 10 mm overlap in interpretation area).
 * A film-coverage plan is NOT a minimum exposure-count or code compliance calculation.
 * No interpolation/extrapolation of IQI tables. All numeric inputs must be positive.
 */
import {lookupWireIqi} from './iqi.mjs';
export const PROCEDURE_SOURCES=Object.freeze({
 ISO:'MM 18100 E r22: §§10.3,11.4,12.1-12.3, Tabellen 12.2-12.7; MM 00102 E r04: §§4.5,4.6,4.11',
 ASME:'MM 11400 E r23: §§9.2,9.10-9.12, Tabel 9.6; MM 00102 E r04: §§4.5,4.6'
});
const ASTM_THRESHOLDS=[
 {up:6.4,source:5,film:4},{up:9.5,source:6,film:5},
 {up:12.7,source:7,film:6},{up:19.0,source:8,film:7},
 {up:25.4,source:9,film:8},{up:38.1,source:10,film:9},
 {up:50.8,source:11,film:10},{up:63.5,source:12,film:11},
 {up:76,source:13,film:12}
];
const ASTM_DIAMETERS={1:.08,2:.1,3:.13,4:.16,5:.2,6:.25,7:.33,8:.41,9:.51,10:.64,11:.81,12:1.02,13:1.27,14:1.6,15:2.03,16:2.54};
function astmSet(w){return w<=6?'A':w<=11?'B':'C'};
export function lookupProcedureIqi({standard='iso',qualityClass='B',technique='sw',mme='1',iqiSide='source',tMm,wMm,material='steel'}={}){
 const t=Number(tMm),w=Number(wMm);
 if(standard==='iso'){
   if(!['steel','titanium','nickel'].includes(material))return {ok:false,error:'Kies een materiaal binnen het toepassingsgebied.'};
   if(!['A','B'].includes(qualityClass))return {ok:false,error:'Kies ISO klasse A of B.'};
   if(!['sw','dwsi','dwdi'].includes(technique))return {ok:false,error:'Kies SWSI, DWSI of DWDI.'};
   const actual=technique==='sw'?t:w;
   if(!Number.isFinite(actual)||actual<=0||actual>75)return {ok:false,error:'De gekozen doorstraalde dikte moet >0 en ≤75 mm zijn volgens MM 18100 E.'};
   const groups={sw:['1','2','3','7','8','9','10','11'],dwsi:['4','5','12'],dwdi:['6A','6B']};
   if(!groups[technique].includes(String(mme)))return {ok:false,error:'MME-techniek en SWSI/DWSI/DWDI passen niet bij elkaar; controleer de keuze.'};
   if(['6A','6B'].includes(String(mme)) && iqiSide==='film')return {ok:false,error:'MME 6A/6B: bronzijde voorgeschreven; filmzijde alleen na expliciete afspraak en beoordeling.'};
   const lookup=lookupWireIqi({nominalThicknessMm:t,penetratedThicknessMm:w,technique,iqiSide,qualityClass,isotope:'X-ray'});
   if(!lookup.ok)return {ok:false,error:'Voor deze combinatie heeft de geïntegreerde tabel geen onderbouwde IQI-eis. Controleer de officiële norm en procedure; er wordt niet gegokt.'};
   const count=String(mme)==='2'?3:1;
   const warnings=[];
   if(String(mme)==='2')warnings.push('Panoramisch MME 2: minimaal 3 IQI’s bij 0°, 120° en 240° per exposure.');
   if(iqiSide==='film')warnings.push('Filmzijde: loodletter F bij de IQI en vermelding in RT-rapport.');
   if(iqiSide==='film'&&['2','3','10','11'].includes(String(mme)))warnings.push('MME 2/3/10/11: vergelijkingsopname met bron- én filmzijde-IQI onder gelijke condities (§12).');
   if(['6A','6B'].includes(String(mme)))warnings.push('MME 6: IQI-draden dwars op buisas; zichtbaar ≥10 mm, of bij De <50 mm minimaal 20% van De.');
   if(material==='nickel')warnings.push('Controleer voor nikkellegeringen de IQI-materiaalgroep met RT Level 3.');
   const wireGroup=lookup.wireNumber<=7?'ISO set W1 (W1–W7)':lookup.wireNumber<=12?'ISO set W6 (W6–W12)':lookup.wireNumber<=16?'ISO set W10 (W10–W16)':'ISO set W13 (W13–W19)';
   return {ok:true,standard,wire:lookup.wire,diameterMm:lookup.diameterMm,wireGroup,iqiSide,minimumCount:count,
    materialGroup:material==='titanium'?'Ti':'Fe (staal; nikkel IQI-materiaal verifiëren)',
    source:`MM 18100 E r22 Tabel ${({'sw-source-A':'12.2','sw-source-B':'12.5','dwdi-source-A':'12.3','dwdi-source-B':'12.6','dw-film-A':'12.4','dw-film-B':'12.7'})[`${technique==='sw'?'sw-source':iqiSide==='film'?'dw-film':'dwdi-source'}-${qualityClass}`]}; ${lookup.table}`,
    note:'Minimale zichtbare draad (vereiste beeldkwaliteit), niet automatisch een vrijgave van de opname.',warnings};
 }
 if(standard==='asme'){
   if(material!=='steel')return {ok:false,error:'MM 11400 E behandelt alleen stalen gietstukken.'};
   if(!['1','2','3','4','6','7'].includes(String(mme)))return {ok:false,error:'Kies een MME-techniek die in MM 11400 E §9.3 is opgenomen (1, 2, 3, 4, 6 of 7).'};
   if(!Number.isFinite(t)||t<=0||t>76)return {ok:false,error:'Nominale enkelwandige dikte moet >0 en ≤76 mm zijn (stalen gietstukken).'};
   if(!['source','film'].includes(iqiSide))return {ok:false,error:'Kies bronzijde of filmzijde.'};
   if(String(mme)==='6'&&iqiSide==='film')return {ok:false,error:'MME 6: uitsluitend bronzijde-IQI volgens MM 11400 E §9.10.'};
   const row=ASTM_THRESHOLDS.find(r=>t<=r.up);
   const wireNo=row[iqiSide];const warnings=[];
   if(iqiSide==='film')warnings.push('Filmzijde: loodletter F en positie op RT-rapport vermelden.');
   if(String(mme)==='2')warnings.push('Axiale panoramische opname van volledige omtrek: minimaal 3 IQI’s circa 120° verdeeld (MM 11400 E §9.11.2).');
   const count=String(mme)==='2'?3:1;
   if(String(mme)!=='2')warnings.push('Ten minste één zichtbare IQI per film, behoudens gedocumenteerde uitzonderingen (§9.11).');
   return {ok:true,standard,wire:`ASTM nr. ${wireNo}`,diameterMm:ASTM_DIAMETERS[wireNo],wireGroup:`ASTM E747 Set ${astmSet(wireNo)}`,
     iqiSide,minimumCount:count,materialGroup:'ASTM materiaalgroep 1 (staal)',
     source:'MM 11400 E r23: §9.10 t/m §9.12, Tabel 9.6',note:'Gebaseerd op nominale enkelwandige dikte t, ook bij een dubbelwandige opname.',warnings};
 }
 return {ok:false,error:'Kies ISO-lassen of ASME-stalen gietstukken.'};
}

function finitePositive(x){const n=Number(x);return Number.isFinite(n)&&n>0?n:null;}
const round=(n,places=1)=>Math.round(n*10**places)/10**places;
export function planFilmPlacement({standard='iso',shape='ring',mme='1',outerDiameterMm,examinedLengthMm,usableFilmLengthMm,overlapMm,sourceFilmDistanceMm,technique='sw'}={}){
 if(!['iso','asme'].includes(standard)||!['ring','straight'].includes(shape))return {ok:false,error:'Kies een norm en rechte of rondgaande las.'};
 if((standard==='iso'&&['6A','6B'].includes(String(mme)))||(standard==='asme'&&String(mme)==='6'))return {ok:false,error:'DWDI/MME 6: geen automatische filmverdeling per omtrek. Bepaal de hoekposities en 2/3 exposures met de toepasselijke procedure; één film kan meerdere richtingsopnames krijgen.'};
 const film=finitePositive(usableFilmLengthMm),overlap=Number(overlapMm);
 const minOverlap=standard==='asme'?40:10;
 if(!film||!Number.isFinite(overlap)||overlap<minOverlap)return {ok:false,error:`Vul een bruikbare filmlengte in en minimaal ${minOverlap} mm geplande overlap.`};
 const total=shape==='ring'?Math.PI*Number(outerDiameterMm):Number(examinedLengthMm);
 if(!Number.isFinite(total)||total<=0)return {ok:false,error:shape==='ring'?'Vul een positieve buitendiameter in.':'Vul een positieve te beoordelen laslengte in.'};
 let maxCoverage=film;const notes=[];
 if(standard==='iso'&&['1','5'].includes(String(mme))){
   const sfd=finitePositive(sourceFilmDistanceMm);
   if(!sfd)return {ok:false,error:'MME 1/5: vul de SFD in; de te beoordelen lengte per opname mag maximaal 70% van SFD bedragen.'};
   maxCoverage=Math.min(film,.70*sfd);
   notes.push(`MME ${mme}: maximaal 70% SFD (${round(.7*sfd)} mm) per opname, toegepast op de planlengte.`);
 }
 if(overlap>=maxCoverage)return {ok:false,error:'Overlap is gelijk aan of groter dan de effectieve/bruikbare filmlengte.'};
 let count;
 if(shape==='ring')count=Math.max(1,Math.ceil(total/(maxCoverage-overlap)-1e-11));
 else count=total<=maxCoverage?1:Math.max(2,Math.ceil((total-overlap)/(maxCoverage-overlap)-1e-11));
 if(count>250)return {ok:false,error:'Meer dan 250 films nodig. Plan dit werk in deeltrajecten.'};
 const placement=[];
 let spacingMm=0;
 if(shape==='ring'){
  spacingMm=total/count;
  // Het 0-punt ligt bij het BEGIN van het eerste bruikbare film-/beeldsegment.
  // Niet bij het middelpunt van de eerste film. Zo is het eerste middelpunt
  // voor een film van 240 mm direct 120 mm vanaf het 0-punt.
  for(let i=0;i<count;i++){
   const start=i*spacingMm;
   const midpoint=(count===1 && maxCoverage>total)?total/2:start+maxCoverage/2;
   const end=start+maxCoverage;
   placement.push({film:i+1,startMm:round(start,2),positionMm:round(midpoint,2),endMm:round(end,2),
     wrapsPastZeroMm:round(Math.max(0,end-total),2),angleDeg:round(midpoint/total*360,2),
     label:`Film ${i+1}: MIDDELPUNT ${round(midpoint/10,2)} cm vanaf buis-0 · begin ${round(start/10,2)} cm · einde ${round(end/10,2)} cm${end>total?' (over 0-punt heen)':''}`});
  }
  notes.push('Nulpunt (0 cm) = begin van de eerste bruikbare filmstrook. Markeer het MIDDEN van iedere film op de opgegeven cm-positie langs de buitenomtrek.');
  if(maxCoverage>total)notes.push('De film is langer dan één volledige omtrek; beoordeel of de fysieke plaatsing zonder ongewenste zelfoverlap mogelijk is.');
  notes.push('Filmmiddenpunten bepalen niet automatisch het minimaal vereiste aantal RT-belichtingen.');
 }else{
  spacingMm=count===1?0:(total-maxCoverage)/(count-1);
  for(let i=0;i<count;i++){
   const centre=count===1?total/2:maxCoverage/2+i*spacingMm;
   const start=centre-maxCoverage/2;
   const end=centre+maxCoverage/2;
   placement.push({film:i+1,startMm:round(start,2),positionMm:round(centre,2),endMm:round(end,2),wrapsPastZeroMm:0,
     angleDeg:null,label:`Film ${i+1}: MIDDELPUNT ${round(centre/10,2)} cm vanaf las-0 · bruikbaar segment ${round(start/10,2)}–${round(end/10,2)} cm`});
  }
  notes.push('Plaatsingen zijn middens van de bruikbare beeldsegmenten langs de rechte las, geen volledig RT-belichtingsplan.');
 }
 const exposureGuide=standard==='asme'
   ?'ASME-gietstukken: minimum aantal exposures moet op aanvraag/filmmap staan (§9.8); niet uit filmhoeveelheid af te leiden.'
   :String(mme)==='2'?'MME 2 (bron in as van buis): 1 panoramische exposure mogelijk onder §11.4.2, hoewel meerdere films nodig kunnen zijn.'
   :['6A','6B'].includes(String(mme))?'MME 6A/6B: afzonderlijke voorschriften voor 2 of 3 exposures; filmverdeling is niet gelijk aan opnameverdeling.'
   :['3','4','7'].includes(String(mme))?'MME 3/4/7: minimum aantal exposures via grafieken/figuren van MM 18100 E §11.4; deze filmindeling bepaalt dat aantal NIET.'
   :'Het aantal exposures wordt afzonderlijk door opnametechniek, SFD en toepasselijke procedure bepaald.';
 const totalOverlap=shape==='ring'?maxCoverage-spacingMm:(count===1?maxCoverage-total:maxCoverage-spacingMm);
 return {ok:true,standard,shape,filmCount:count,totalMm:round(total,2),enteredFilmLengthMm:round(film,2),selectedStripMidpointMm:round(film/2,2),usefulSegmentMidpointMm:round(maxCoverage/2,2),usefulLengthMm:round(maxCoverage,2),requestedOverlapMm:overlap,
   actualPlanningOverlapMm:round(totalOverlap,2),spacingMm:round(spacingMm,2),spacingCm:round(spacingMm/10,2),placement,
   minReferenceOverlapMm:minOverlap,
   source:standard==='asme'?'MM 11400 E r23 §9.2 (minimaal 40 mm)':'MM 00102 E r04 §4.11 (10 mm); MM 18100 E r22 §10.3 (overlap met markers verifiëren)',
   note:'REKENHULP: geen garantie voor bruikbare opnamebreedte, lasdekking, stralingshoek of minimale exposure-aantallen.',
   notes,exposureGuide};
}
