/**
 * ISO wire IQI research lookup — metal weld film radiography.
 * Source: ISO 17636-1:2022 Annex B tables B.1/B.3/B.5/B.7/B.9/B.11,
 * diameters ISO 19232-1:2013 table 1.
 * Numeric thresholds are a lookup aid only; always check licensed standard
 * and approved RT procedure. No exceptional relaxations are automatic.
 * For double wall the operator MUST provide actual penetrated thickness w.
 */
const DIAMETERS_MM = Object.freeze({
  1:3.2,2:2.5,3:2,4:1.6,5:1.25,6:1,7:.8,8:.63,9:.5,
  10:.4,11:.32,12:.25,13:.2,14:.16,15:.125,16:.1,17:.08,18:.063,19:.05
});
const TABLES=Object.freeze({
  'sw-source-A':{number:'B.1',limits:[1.2,2,3.5,5,7,10,15,25,32,40,55,85,150,250,Infinity],wires:[18,17,16,15,14,13,12,11,10,9,8,7,6,5,4]},
  'sw-source-B':{number:'B.3',limits:[1.5,2.5,4,6,8,12,20,30,35,45,65,120,200,350,Infinity],wires:[19,18,17,16,15,14,13,12,11,10,9,8,7,6,5]},
  'dwdi-source-A':{number:'B.5',limits:[1.2,2,3.5,5,7,12,18,30,40,50,60,85,120,220,380,Infinity],wires:[18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3]},
  'dwdi-source-B':{number:'B.7',limits:[1.5,2.5,4,6,8,15,25,38,45,55,70,100,170,250,Infinity],wires:[19,18,17,16,15,14,13,12,11,10,9,8,7,6,5]},
  'dw-film-A':{number:'B.9',limits:[1.2,2,3.5,5,10,15,22,38,48,60,85,125,225,375,Infinity],wires:[18,17,16,15,14,13,12,11,10,9,8,7,6,5,4]},
  'dw-film-B':{number:'B.11',limits:[1.5,2.5,4,6,12,18,30,45,55,70,100,180,300,Infinity],wires:[19,18,17,16,15,14,13,12,11,10,9,8,7,6]}
});
export function lookupWireIqi({nominalThicknessMm,penetratedThicknessMm,technique,iqiSide,qualityClass,isotope='X-ray'}={}){
  if(!['A','B'].includes(qualityClass)||!['sw','dwsi','dwdi'].includes(technique)||!['source','film'].includes(iqiSide))
    return {ok:false,reason:'selection'};
  // No supported Annex B wire table for SW with film-side IQI or DWSI with source-side IQI in this implementation.
  if((technique==='sw'&&iqiSide!=='source')||(technique==='dwsi'&&iqiSide!=='film'))
    return {ok:false,reason:'unsupported'};
  const thicknessMm=technique==='sw'?Number(nominalThicknessMm):Number(penetratedThicknessMm);
  if(!Number.isFinite(thicknessMm)||thicknessMm<=0)
    return {ok:false,reason:technique==='sw'?'thickness':'penetrated'};
  const name=technique==='sw'?'sw-source':iqiSide==='film'?'dw-film':'dwdi-source';
  const table=TABLES[`${name}-${qualityClass}`];
  if(!table)return {ok:false,reason:'unsupported'};
  const ix=table.limits.findIndex(limit=>thicknessMm<=limit);
  if(ix<0)return {ok:false,reason:'range'};
  const wireNumber=table.wires[ix];
  const gammaException=['Se-75','Ir-192'].includes(isotope);
  return {
    ok:true,wire:`W${wireNumber}`,wireNumber,diameterMm:DIAMETERS_MM[wireNumber],
    table:`ISO 17636-1:2022 — Table ${table.number}`,
    thicknessMm,thicknessKind:technique==='sw'?'t':'w',
    qualityClass,iqiSide,technique,
    gammaException,
    se75ThinB: isotope==='Se-75'&&qualityClass==='B'&&thicknessMm<12,
    status:'NORMATIVE_LOOKUP_AID_UNAPPROVED'
  };
}
