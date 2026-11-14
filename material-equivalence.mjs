/**
 * BASIC RT PRO 3.6 — material-to-steel equivalence, research preparation only.
 * Primary source: MM 00102 E revision 04 (2026), §7.1 table 7.1.
 * Se-75 supplements: ASTM E94/E94M-22 approximate material equivalence table 2.
 * These are approximate ENERGY-DEPENDENT multipliers, not validated exposures.
 * Missing combinations must NOT default to 1 or be guessed/interpolated.
 */
export const MATERIALS=Object.freeze({
 Fe:'Staal / koolstofstaal',RVS300:'RVS 300-serie',RVSother:'Andere RVS-legering',
 Al:'Aluminium',Cu:'Koper',Bronze:'Brons',Ti:'Titanium',
 InconelX:'Inconel X',Monel:'Monel',Brass:'Messing',
 Mg:'Magnesium',Other:'Ander materiaal / legering'
});
const FACTORS_MM=Object.freeze({
 RVS300:{100:1.1,150:1.1,220:1.1,250:1.0,Ir192:1.0},
 InconelX:{100:1.4,150:1.4,220:1.4,250:1.4,Ir192:1.3},
 Cu:{100:1.5,150:1.6,220:1.4,250:1.4,Ir192:1.1},
 Bronze:{150:1.4,220:1.3,250:1.3,Ir192:1.1},
 Al:{100:0.08,150:0.12,220:0.18,Ir192:0.35},
 Ti:{150:0.54,220:0.54,Ir192:0.9},
 Monel:{100:1.7,150:1.4,220:1.2}
});
// ASTM E94/E94M-22 Table 2: Se75 column; approximate, and alloy compositions vary.
const SE75_APPROX=Object.freeze({RVS300:1.0,Al:0.5,Cu:1.4,Ti:0.6,Brass:1.3});
export function materialSteelEquivalent({material='Fe',thicknessMm,mode='gamma',isotope='Se-75',kv}={}){
 if(!Number.isFinite(thicknessMm)||thicknessMm<0||thicknessMm>100)
   return {ok:false,error:'thickness_input',inputMinMm:0,inputMaxMm:100};
 if(thicknessMm===0)return {ok:false,error:'zero_thickness'};
 if(!(material in MATERIALS))return {ok:false,error:'material',reason:'unknown_material'};
 if(material==='Fe')return {ok:true,steelEquivalentMm:thicknessMm,factor:1,source:'Staal is referentiemateriaal; MM 00102 E §7.1',researchOnly:false};
 let factor,source;
 if(mode==='gamma'&&isotope==='Se-75'){
  factor=SE75_APPROX[material];source='ASTM E94/E94M-22 tabel 2 · Se-75 (benadering)';
 }else if(mode==='gamma'&&isotope==='Ir-192'){
  factor=FACTORS_MM[material]?.Ir192;source='MM 00102 E rev04 §7.1 tabel 7.1 · Ir-192 (benadering)';
 }else if(mode==='xray'){
  factor=FACTORS_MM[material]?.[kv];source=`MM 00102 E rev04 §7.1 tabel 7.1 · ${kv} kV (benadering)`;
 }
 if(!Number.isFinite(factor)||factor<=0)return {ok:false,error:'material',reason:'no_supported_energy_factor',material,mode,isotope,kv};
 const steelEquivalentMm=thicknessMm*factor;
 return {ok:true,steelEquivalentMm,factor,source,researchOnly:true,material,
  caution:'Benaderde materiaalequivalentie; samenstelling, stralingsenergie en verstrooiing beïnvloeden de uitkomst. Niet gevalideerd voor opnames.'};
}
