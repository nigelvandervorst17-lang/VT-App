import {proposedMaterialFactor} from './research/material-factor-data.mjs';
/**
 * Steel-equivalent research conversions.
 * Non-steel factors come from the existing material tiles and are intentionally
 * marked research-only until approved source/energy-specific evidence is attached.
 */
export const MATERIALS=Object.freeze({
 Fe:'Staal / koolstofstaal',RVS300:'RVS 300-serie',RVSother:'Andere RVS-legering',
 Al:'Aluminium',Cu:'Koper',Bronze:'Brons',Ti:'Titanium',
 InconelX:'Inconel X',Monel:'Monel',Brass:'Messing',
 Mg:'Magnesium',Other:'Ander materiaal / legering'
});
export function materialSteelEquivalent({material='Fe',thicknessMm,mode='gamma',isotope='Se-75',kv,customFactor}={}){
 if(!Number.isFinite(thicknessMm)||thicknessMm<=0||thicknessMm>100)
  return {ok:false,error:'thickness_input',inputMinMm:0,inputMaxMm:100};
 if(!(material in MATERIALS))
  return {ok:false,error:'material',reason:'unknown_material'};
 if(material==='Fe')
  return {ok:true,steelEquivalentMm:thicknessMm,factor:1,
    source:'Staal (Fe) · rechtstreeks referentiemateriaal',researchOnly:false};
 if(!['gamma','xray'].includes(mode))return {ok:false,error:'material',reason:'invalid_mode'};
 const factor=material==='Other'?customFactor:proposedMaterialFactor(material,mode,isotope);
 if(!Number.isFinite(factor)||factor<=0||factor>10)
  return {ok:false,error:'material',reason:'requires_validated_material_equivalence',material,mode,isotope,kv};
 const steelEquivalentMm=thicknessMm*factor;
 if(!Number.isFinite(steelEquivalentMm)||steelEquivalentMm<=0||steelEquivalentMm>100)
  return {ok:false,error:'range',reason:'equivalent_outside_input_range',material,equivalentMm:steelEquivalentMm,lower:0,upper:100};
 return {ok:true,steelEquivalentMm,factor,
  material,source:material==='Other'?'Eigen onderzoeksfactor':'Voorgestelde materiaalonderzoeksfactor',
  researchOnly:true,validatedForExposure:false};
}
