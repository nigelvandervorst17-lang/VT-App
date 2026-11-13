/**
 * BASIC RT PRO 2.0 — RESEARCH MODE ONLY.
 * This module NEVER authorizes an exposure. Every curve requires source-condition match.
 * No extrapolation, no film-density factor, no kV interpolation.
 */
export const HALF_LIFE_DAYS = Object.freeze({'Se-75':119.78,'Ir-192':73.827});
export const ERROR = Object.freeze({
  INVALID:'invalid', MATERIAL:'material', NO_CURVE:'no_curve', DENSITY:'density',
  FILM:'film', RANGE:'range', KV:'kv', MA:'ma', CHART_LIMIT:'chart_limit',
  DATE:'date', SOURCE:'source', GEOMETRY:'geometry', MODEL:'model'
});
const finite = (v)=>Number.isFinite(v);
export function parseDecimal(input){
  const s=String(input ?? '').trim().replace(/\s/g,'').replace(',','.');
  return /^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s) ? Number(s) : NaN;
}
/** Strict date-only UTC parsing: never normalize invalid certificate dates. */
export function isoDateMillis(input){
  if(typeof input!=='string'||!/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(input)) return NaN;
  const [y,m,d]=input.split('-').map(Number);
  const stamp=Date.UTC(y,m-1,d),dt=new Date(stamp);
  return Number.isFinite(stamp)&&dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d ? stamp : NaN;
}
export function dayDifference(start,end){
  const a=isoDateMillis(start),b=isoDateMillis(end);
  return Number.isFinite(a)&&Number.isFinite(b) ? (b-a)/86400000 : NaN;
}
export function ciToGBq(ci){return finite(ci)&&ci>=0 ? ci*37 : NaN;}
export function gbqToCi(gbq){return finite(gbq)&&gbq>=0 ? gbq/37 : NaN;}
/** Geometric unsharpness; geometry only, not proof of procedural compliance. */
export function geometricUnsharpnessMm({sourceSizeMm,objectToFilmMm,sourceToObjectMm}){
  const values=[sourceSizeMm,objectToFilmMm,sourceToObjectMm];
  return values.every(finite)&&sourceSizeMm>0&&objectToFilmMm>=0&&sourceToObjectMm>0 ? sourceSizeMm*objectToFilmMm/sourceToObjectMm : NaN;
}
/** Regular dates for decay illustration; certificate start is always required. */
export function decayTable({isotope,initialCi,certificateDate,offsetsDays=[0,7,30,60,90,120,180,365]}){
  const start=isoDateMillis(certificateDate),hl=HALF_LIFE_DAYS[isotope];
  if(!finite(start)||!finite(initialCi)||initialCi<=0||!finite(hl)||!Array.isArray(offsetsDays)||offsetsDays.length>100) return [];
  if(offsetsDays.some(d=>!Number.isInteger(d)||d<0||d>3650)) return [];
  return offsetsDays.map(days=>{
    const ci=decayedCi(initialCi,days,hl);
    const date=new Date(start+days*86400000).toISOString().slice(0,10);
    return {days,date,ci,gbq:ciToGBq(ci),percent:100*ci/initialCi};
  });
}
export function decayedCi(initial,days,halfLife){
  if(![initial,days,halfLife].every(finite)||initial<=0||days<0||halfLife<=0) return NaN;
  return initial*Math.pow(0.5,days/halfLife);
}
export function certificateActivity({isotope,initialCi,certificateDate,referenceDate}){
  const hl=HALF_LIFE_DAYS[isotope];
  const days=dayDifference(certificateDate,referenceDate);
  const ci=decayedCi(initialCi,days,hl);
  if(!finite(ci)||ci<=0) return {ok:false,error:ERROR.DATE};
  return {ok:true,ci,days,halfLifeDays:hl};
}
export function interpolateLog(points,mm){
  if(!finite(mm)||!Array.isArray(points)||points.length<2) return NaN;
  if(points.some(p=>!finite(p.mm)||!finite(p.ci_h)||p.ci_h<=0)) return NaN;
  for(let i=0;i<points.length;i++) {
    if(points[i].mm===mm) return points[i].ci_h;
    if(i&&points[i].mm<=points[i-1].mm) return NaN;
  }
  for(let i=1;i<points.length;i++) {
    const a=points[i-1], b=points[i];
    if(mm>a.mm && mm<b.mm){
      const f=(mm-a.mm)/(b.mm-a.mm);
      return Math.exp(Math.log(a.ci_h)*(1-f)+Math.log(b.ci_h)*f);
    }
  }
  return NaN;
}
function inputValid(thicknessMm,distanceMm){
  return [thicknessMm,distanceMm].every(finite)&&thicknessMm>0&&distanceMm>thicknessMm&&
      thicknessMm<=1000&&distanceMm<=100000;
}
export function calculateGamma({isotope,film,density,thicknessMm,distanceMm,activityCi,material='Fe',screens='Pb'},db){
  if(!inputValid(thicknessMm,distanceMm)||!finite(activityCi)||activityCi<=0||activityCi>100000) return {ok:false,error:ERROR.INVALID};
  if(material!=='Fe'||screens!=='Pb') return {ok:false,error:ERROR.MATERIAL};
  const ds=db?.gamma?.[isotope];
  if(!ds) return {ok:false,error:ERROR.NO_CURVE};
  if(!ds.curves?.[film]) return {ok:false,error:ERROR.FILM};
  if(!finite(density)||Math.abs(density-ds.density)>1e-8) return {ok:false,error:ERROR.DENSITY,requiredDensity:ds.density};
  if(thicknessMm<ds.minThicknessMm||thicknessMm>ds.maxThicknessMm) return {ok:false,error:ERROR.RANGE,lower:ds.minThicknessMm,upper:ds.maxThicknessMm};
  const ciHours=interpolateLog(ds.curves[film],thicknessMm);
  if(!finite(ciHours)||ciHours<=0) return {ok:false,error:ERROR.NO_CURVE};
  const minutes=ciHours*60/activityCi*(distanceMm/ds.referenceDistanceMm)**2;
  if(!finite(minutes)||minutes<=0||minutes>1e9) return {ok:false,error:ERROR.INVALID};
  return {ok:true,minutes,exposure:ciHours,exposureUnit:'Ci·h',datasetId:ds.datasetId,sourceTitle:ds.sourceTitle,sourceUrl:ds.sourceUrl,referenceDistanceMm:ds.referenceDistanceMm,referenceDensity:ds.density,status:ds.status};
}
export function calculateXray({model,film,density,kv,ma,thicknessMm,distanceMm,material='Fe'},db){
  if(!inputValid(thicknessMm,distanceMm)||!finite(ma)||ma<=0||ma>1000) return {ok:false,error:ERROR.INVALID};
  if(material!=='Fe') return {ok:false,error:ERROR.MATERIAL};
  const ds=db?.xray?.[model];
  if(!ds) return {ok:false,error:ERROR.MODEL};
  if(film!==ds.film) return {ok:false,error:ERROR.FILM,requiredFilm:ds.film};
  if(!finite(density)||Math.abs(density-ds.density)>1e-8) return {ok:false,error:ERROR.DENSITY,requiredDensity:ds.density};
  if(!finite(kv)||!Number.isInteger(kv)) return {ok:false,error:ERROR.KV};
  const line=ds.curves.find(x=>x.kv===kv);
  if(!line) return {ok:false,error:ERROR.KV,availableKv:ds.curves.map(c=>c.kv)};
  if(thicknessMm<line.minThicknessMm||thicknessMm>line.maxThicknessMm) return {ok:false,error:ERROR.RANGE,lower:line.minThicknessMm,upper:line.maxThicknessMm};
  const mam=Math.pow(10,thicknessMm*line.log10MamPerMm+line.log10MamIntercept);
  if(!finite(mam)||mam<line.minMam-1e-7||mam>line.maxMam+1e-7) return {ok:false,error:ERROR.CHART_LIMIT};
  const minutes=(mam/ma)*(distanceMm/ds.referenceDistanceMm)**2;
  if(!finite(minutes)||minutes<=0||minutes>1e9) return {ok:false,error:ERROR.INVALID};
  return {ok:true,minutes,exposure:mam,exposureUnit:'mA·min',datasetId:ds.datasetId,sourceTitle:ds.sourceTitle,referenceDistanceMm:ds.referenceDistanceMm,referenceDensity:ds.density,screens:ds.screens,status:ds.status};
}
export function hms(minutes){
  if(!finite(minutes)||minutes<=0) return '—';
  const secs=Math.round(minutes*60), hrs=Math.floor(secs/3600), mins=Math.floor((secs%3600)/60), ss=secs%60;
  return [hrs,mins,ss].map(n=>String(n).padStart(2,'0')).join(':');
}
