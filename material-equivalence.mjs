/**
 * BASIC RT PRO — steel-equivalent research guard.
 * Conversion factors from withdrawn proprietary work procedures are removed.
 * Material Fe is the only direct, non-approximated steel reference.
 * Other materials require a separately verified source-dependent factor.
 */
export const MATERIALS=Object.freeze({
 Fe:'Staal / koolstofstaal',RVS300:'RVS 300-serie',RVSother:'Andere RVS-legering',
 Al:'Aluminium',Cu:'Koper',Bronze:'Brons',Ti:'Titanium',
 InconelX:'Inconel X',Monel:'Monel',Brass:'Messing',
 Mg:'Magnesium',Other:'Ander materiaal / legering'
});
export function materialSteelEquivalent({material='Fe',thicknessMm,mode='gamma',isotope='Se-75',kv}={}){
 if(!Number.isFinite(thicknessMm)||thicknessMm<=0||thicknessMm>100)
  return {ok:false,error:'thickness_input',inputMinMm:0,inputMaxMm:100};
 if(!(material in MATERIALS))
  return {ok:false,error:'material',reason:'unknown_material'};
 if(material==='Fe')
  return {ok:true,steelEquivalentMm:thicknessMm,factor:1,
    source:'Staal (Fe) · rechtstreeks referentiemateriaal',researchOnly:false};
 return {ok:false,error:'material',reason:'requires_validated_material_equivalence',
  material,mode,isotope,kv,
  caution:'Geen onderbouwde materiaalequivalentie beschikbaar. Selecteer staal of voer een gevalideerde materiaalreferentie in buiten dit hulpmiddel.'};
}
