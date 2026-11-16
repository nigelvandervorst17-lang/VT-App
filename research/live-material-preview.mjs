/**
 * Visual-only research comparisons for the main NDT calculator.
 * No changes to rt-core, rt-curves or approved real-world exposure outputs.
 * Ratios are user-proposed and not validated for energy/material/film.
 */
import {calculateGamma,hms} from '../rt-core.mjs';
import {curves} from '../rt-curves.mjs';

export const PROPOSED_MATERIAL_FACTORS=Object.freeze({
 Fe:Object.freeze({name:'Staal',gamma:1,xray:1}),
 RVS300:Object.freeze({name:'RVS',gamma:1.02,xray:1.08}),
 Al:Object.freeze({name:'Aluminium',gamma:0.35,xray:0.30}),
 Cu:Object.freeze({name:'Koper',gamma:1.12,xray:1.50}),
 Ti:Object.freeze({name:'Titanium',gamma:0.58,xray:0.75})
});
export const D25_RESEARCH_FACTORS=Object.freeze({D4:1.4278,D5:1.3085});
export const NOT_APPROVED='NIET GEVALIDEERD — alleen onderzoeksvergelijking, geen RT-belichtingsinstructie';

export function compareMaterialEquivalence({
 material='Fe',mode='gamma',wallMm,customFactor=null
}={}){
 if(!Number.isFinite(wallMm)||wallMm<=0||wallMm>100||
    !['gamma','xray'].includes(mode))
  return {ok:false,error:'INVALID_THICKNESS_OR_MODE'};
 let ratio, label;
 if(material==='custom'){
  if(!Number.isFinite(customFactor)||customFactor<=0||customFactor>10)
   return {ok:false,error:'CUSTOM_FACTOR_UNDOCUMENTED'};
  ratio=customFactor;label='Eigen factor';
 }else{
  const entry=PROPOSED_MATERIAL_FACTORS[material];
  if(!entry)return {ok:false,error:'MATERIAL_UNSUPPORTED'};
  ratio=entry[mode];label=entry.name;
 }
 const equivalentSteelMm=wallMm*ratio;
 if(!Number.isFinite(equivalentSteelMm)||equivalentSteelMm<=0||equivalentSteelMm>100)
  return {ok:false,error:'EQUIVALENT_OUTSIDE_DATA_RANGE'};
 return {ok:true,material,label,mode,wallMm,proposedFactor:ratio,equivalentSteelMm,
  appliedToExposureEngine:false,validatedForExposure:false,warning:NOT_APPROVED};
}

/**
 * Research-only PR #6 D2.5 candidate for steel/Se-75 or Ir-192.
 * Independent, exact call against D2.0 baseline; never patched into engine.
 */
export function compareGammaDensityD25({
 isotope,film,wallMm,activityCi,sfdMm,density,material
}={}){
 if(material!=='Fe'||density!==2.5||!Object.hasOwn(D25_RESEARCH_FACTORS,film))
  return {ok:false,error:'NOT_A_RESEARCH_D25_STEEL_CASE'};
 const base=calculateGamma({
  isotope,film,density:2.0,thicknessMm:wallMm,
  distanceMm:sfdMm,activityCi,material:'Fe',screens:'Pb'
 },curves);
 if(!base.ok)return {ok:false,error:base.error};
 const current=calculateGamma({
  isotope,film,density:2.5,thicknessMm:wallMm,
  distanceMm:sfdMm,activityCi,material:'Fe',screens:'Pb'
 },curves);
 if(!current.ok)return {ok:false,error:current.error};
 const proposedFactor=D25_RESEARCH_FACTORS[film];
 const candidateMinutes=base.minutes*proposedFactor;
 return {ok:true,film,isotope,density,proposedFactor,
  referenceMinutes:current.minutes,candidateMinutes,
  candidateTime:hms(candidateMinutes),
  appliedToExposureEngine:false,validatedForExposure:false,warning:NOT_APPROVED};
}
