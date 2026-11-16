/**
 * Research-only information previews. NONE of the proposed material ratios
 * changes rt-core.mjs, rt-curves.mjs, xray curves or approved procedures.
 */
export const MATERIAL_RESEARCH_FACTORS=Object.freeze({
 Fe:{label:'Staal',gamma:1,xray:1},
 RVS:{label:'RVS',gamma:1.02,xray:1.08},
 Al:{label:'Aluminium',gamma:0.35,xray:0.30},
 Cu:{label:'Koper',gamma:1.12,xray:1.50},
 Ti:{label:'Titanium',gamma:0.58,xray:0.75}
});
export function equivalentSteelPreview({material,mode,thicknessMm}){
 const item=MATERIAL_RESEARCH_FACTORS[material];
 if(!item||!['gamma','xray'].includes(mode)||!Number.isFinite(thicknessMm)||thicknessMm<=0)
   return {ok:false,error:'INVALID_INPUT'};
 const factor=item[mode];
 return {ok:true,material,label:item.label,mode,factor,
  equivalentSteelMm:thicknessMm*factor,
  validatedForExposure:material==='Fe',
  warning:material==='Fe'?'Staal: identieke dikte':
   'VOORSTEL, NIET GEVALIDEERD — niet doorgeven aan de RT-belichtingsmotor'};
}
const HALF_LIFE=Object.freeze({'Se-75':119.78,'Ir-192':73.827});
export function gammaDecayPreview({isotope,activityCi,referenceAt,asOf=new Date().toISOString()}){
 if(!HALF_LIFE[isotope]||!Number.isFinite(activityCi)||activityCi<=0)
   return {ok:false,error:'INVALID_SOURCE'};
 const start=Date.parse(referenceAt),end=Date.parse(asOf);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)
   return {ok:false,error:'INVALID_REFERENCE_DATE'};
 const days=(end-start)/86400000;
 return {ok:true,activityCi:activityCi*Math.pow(2,-days/HALF_LIFE[isotope]),
  elapsedDays:days,halfLifeDays:HALF_LIFE[isotope],researchOnly:true,
  warning:'Vervalberekening is geen broncertificaatcontrole of RT-vrijgave'};
}
/** Informative ISO 17636-1:2022 geometry research; independent procedure review still required.
 * If b < 1.2*t, substitute nominal t for b in the f_min expression.
 * Class A with planar defects relevant uses B multiplier (subject to procedure).
 * Source-object f = SFD - b; never change exposure calculation.
 */
export function isoFMinResearch({classification,dMm,bMm,tMm,sfdMm,planarDefects=false}){
 if(!['A','B'].includes(classification)||![dMm,bMm,tMm,sfdMm].every(Number.isFinite)||
   dMm<=0||bMm<0||tMm<=0||sfdMm<=bMm)
   return {ok:false,error:'INVALID_GEOMETRY'};
 const effectiveClass=classification==='A'&&planarDefects?'B':classification;
 const effectiveB=bMm<1.2*tMm?tMm:bMm;
 const factor=effectiveClass==='B'?15:7.5;
 const fMinMm=factor*dMm*Math.pow(effectiveB,2/3);
 const actualFmm=sfdMm-bMm;
 return {ok:true,classification,effectiveClass,effectiveBmm:effectiveB,
  fMinMm,actualFmm,comparison:actualFmm>=fMinMm?'meets_nominal_geometry_expression':'below_nominal_geometry_expression',
  validatedForExposure:false,
  warning:'Normatieve researchvergelijking; juiste normeditie en procedure, IQI en opstelling onafhankelijk controleren'};
}
