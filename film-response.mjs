/** BASIC RT PRO 3.4 — RESEARCH ONLY.
 * Relative optical film-response model from AGFA/Waygate Radiographic Film Systems brochure printed p.13.
 * Digitized raster coordinates at prescribed densities from AGFA PDF, x-axis logarithmic relative exposure.
 * Source: 200 kV, Pb screens, G135 developer, 8 min at 28°C; transfer to gamma/other kV is UNVALIDATED.
 * Values are not OEM-supplied numeric tables. Never extrapolate.
 */
export const FILM_RESPONSE=Object.freeze({"version":"agfa-printed-p13-digitized-20261113-v1","sourceUrl":"https://dam.bakerhughes.com/m/15e84aab13c9d73d/original/Radiographic-Film-Systems-Brochure_EN_LR.pdf","sourceTitle":"Waygate/AGFA Film Systems p.13; 200 kV Pb G135/28°C 8min","minDensity":1.5,"maxDensity":3.2,"curves":{"D2":[[1.5,3.108889],[1.6,3.137778],[1.8,3.191111],[2.0,3.24],[2.2,3.277778],[2.4,3.311111],[2.5,3.328889],[2.6,3.342222],[2.8,3.368889],[3.0,3.388889],[3.2,3.406667]],"D3":[[1.5,2.777778],[1.6,2.808889],[1.8,2.866667],[2.0,2.915556],[2.2,2.957778],[2.4,2.991111],[2.5,3.008889],[2.6,3.022222],[2.8,3.044444],[3.0,3.062222],[3.2,3.08]],"D4":[[1.5,2.555556],[1.6,2.582222],[1.8,2.635556],[2.0,2.68],[2.2,2.724444],[2.4,2.76],[2.5,2.777778],[2.6,2.795556],[2.8,2.826667],[3.0,2.853333],[3.2,2.88]],"D5":[[1.5,2.324444],[1.6,2.351111],[1.8,2.4],[2.0,2.44],[2.2,2.48],[2.4,2.515556],[2.5,2.533333],[2.6,2.551111],[2.8,2.582222],[3.0,2.608889],[3.2,2.635556]],"D7":[[1.5,2.151111],[1.6,2.177778],[1.8,2.226667],[2.0,2.271111],[2.2,2.311111],[2.4,2.346667],[2.5,2.364444],[2.6,2.382222],[2.8,2.413333],[3.0,2.444444],[3.2,2.471111]],"D8":[[1.5,2.004444],[1.6,2.035556],[1.8,2.093333],[2.0,2.142222],[2.2,2.186667],[2.4,2.226667],[2.5,2.244444],[2.6,2.262222],[2.8,2.297778],[3.0,2.326667],[3.2,2.355556]]}});

const finite=Number.isFinite;
function linear(xs,value){
 if(!finite(value)||value<xs[0][0]-1e-9||value>xs[xs.length-1][0]+1e-9)return NaN;
 for(let i=0;i<xs.length;i++){
   if(Math.abs(value-xs[i][0])<1e-9)return xs[i][1];
   if(i>0 && value<xs[i][0]){const a=xs[i-1],b=xs[i];return a[1]+(b[1]-a[1])*(value-a[0])/(b[0]-a[0]);}
 }return NaN;
}
// One Waygate screenshot supplied by user D2.5, Se75 36Ci D4 10mm at 800mm = 21m20s.
// D2.0 screenshot and 9-point series: 10mm, 40Ci = 14m28s.
// This anchor tunes D4/Se75 *shape*, and is not a universal sensitometric calibration.
const WAYGATE_SE75_D4_25_RATIO = 1280 / (868*40/36);
export function densityCorrectionFactor({film,isotope=null,density,baseDensity=2.0}){
 const series=FILM_RESPONSE.curves[film];
 if(!series || !finite(density)||!finite(baseDensity))return {ok:false,error:'density'};
 const logTarget=linear(series,density), logBase=linear(series,baseDensity);
 if(!finite(logTarget)||!finite(logBase))return {ok:false,error:'density',minDensity:FILM_RESPONSE.minDensity,maxDensity:FILM_RESPONSE.maxDensity};
 let logShift=logTarget-logBase, method='AGFA_200kv_sensitometric_digitization_unvalidated';
 if(isotope==='Se-75' && film==='D4' && Math.abs(baseDensity-2.0)<1e-8){
   const agfaAt25=linear(series,2.5)-linear(series,2.0);
   logShift*=Math.log10(WAYGATE_SE75_D4_25_RATIO)/agfaAt25;
   method='AGFA_shape_anchored_to_one_Waygate_D2.5_reference_unvalidated';
 }
 const factor=Math.pow(10,logShift);
 if(!finite(factor)||factor<=0)return {ok:false,error:'density'};
 return {ok:true,factor,method,sourceUrl:FILM_RESPONSE.sourceUrl,sourceTitle:FILM_RESPONSE.sourceTitle,anchorRatio:method.startsWith('AGFA_shape_')?WAYGATE_SE75_D4_25_RATIO:undefined};
}
