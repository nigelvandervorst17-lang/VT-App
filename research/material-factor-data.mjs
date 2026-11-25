/**
 * Centrally defined material ratios for the research calculation view.
 * Coefficients are proposals from the existing UI; independent source/energy
 * validation evidence is not stored in this repository.
 * Do not use these constants as authorization for RT exposures.
 */
export const PROPOSED_MATERIAL_FACTORS=Object.freeze({
 Fe:Object.freeze({name:'Staal',gamma:1,xray:1}),
 RVS300:Object.freeze({name:'RVS',gamma:1.02,xray:1.08,gammaByIsotope:Object.freeze({'Se-75':1.06,'Ir-192':1.02})}),
 Al:Object.freeze({name:'Aluminium',gamma:0.35,xray:0.30}),
 Cu:Object.freeze({name:'Koper',gamma:1.12,xray:1.50}),
 Ti:Object.freeze({name:'Titanium',gamma:0.58,xray:0.75})
});

/** Isotope-specific gamma hypothesis. Unknown gamma isotopes fail closed for RVS300. */
export function proposedMaterialFactor(material,mode,isotope='Se-75'){
 const config=PROPOSED_MATERIAL_FACTORS[material];
 if(!config)return undefined;
 if(mode==='gamma' && config.gammaByIsotope)return config.gammaByIsotope[isotope];
 return config[mode];
}
