/**
 * Nine-point gamma correction hypothesis — ENGINE UNCHANGED.
 *
 * This is a diagnostic, NOT an exposure calculator. It is intentionally
 * disconnected from the app UI. All candidate extensions and film factors
 * outside the current reference range are UNVALIDATED.
 *
 * Run: node research/gamma-nine-point-review.mjs
 */
import {calculateGamma, interpolateLog, hms} from '../rt-core.mjs';
import {curves} from '../rt-curves.mjs';

export const nineCases = Object.freeze([
  {nr:32,isotope:'Se-75',film:'D5',mm:8,ci:40,sfd:800,density:2.0},
  {nr:33,isotope:'Se-75',film:'D7',mm:8,ci:40,sfd:800,density:2.0},
  {nr:38,isotope:'Ir-192',film:'D5',mm:15,ci:40,sfd:800,density:2.0},
  {nr:39,isotope:'Ir-192',film:'D7',mm:15,ci:40,sfd:800,density:2.0},
  {nr:43,isotope:'Se-75',film:'D4',mm:10,ci:40,sfd:800,density:1.2},
  {nr:48,isotope:'Se-75',film:'D7',mm:20,ci:40,sfd:800,density:3.5},
  {nr:49,isotope:'Ir-192',film:'D4',mm:40,ci:40,sfd:800,density:3.9},
  {nr:53,isotope:'Se-75',film:'D5',mm:12,ci:52,sfd:250,density:2.5,expected:'00:00:57'},
  {nr:54,isotope:'Se-75',film:'D4',mm:10,ci:15,sfd:1000,density:2.5,expected:'01:26:04'}
]);

export const proposedDensityAnchors = Object.freeze([
  {density:1.2,factor:0.53},
  {density:1.5,factor:0.66},
  {density:2.0,factor:1.0},
  {density:2.5,factor:1.415},
  {density:3.9,factor:2.25}
]);

function proposedDensity(density) {
  const match=proposedDensityAnchors.find(x=>x.density===density);
  if(match)return {factor:match.factor,assumption:false};
  for(let i=1;i<proposedDensityAnchors.length;i++){
    const left=proposedDensityAnchors[i-1],right=proposedDensityAnchors[i];
    if(left.density<density&&density<right.density){
      // Only a mathematical what-if: user provided no factor for D=3.5.
      const f=(density-left.density)/(right.density-left.density);
      return {factor:left.factor+(right.factor-left.factor)*f,assumption:true};
    }
  }
  return null;
}

function proposedFilmRatio(ds,film) {
  if(film==='D4')return {factor:1,assumption:false};
  if(film==='D5'&&ds===curves.gamma['Se-75'])
    return {factor:0.60,assumption:true,source:'Door gebruiker voorgestelde Se-75 D5-factor'};

  // Read ratio from currently SUPPORTED overlapping curves. Applying that
  // ratio beyond their published coverage remains UNVALIDATED extrapolation.
  const original=ds.curves[film],d4=ds.curves.D4;
  if(!Array.isArray(original)||!Array.isArray(d4))return null;
  const mm=original[0].mm;
  const d4Value=interpolateLog(d4,mm),filmValue=interpolateLog(original,mm);
  if(!Number.isFinite(d4Value)||!Number.isFinite(filmValue)||d4Value<=0)return null;
  return {factor:filmValue/d4Value,assumption:true,source:'Verhouding afgeleid van bestaande, beperkte filmcurve'};
}

export function reviewCase(t) {
  const ds=curves.gamma[t.isotope];
  const current=calculateGamma({
    isotope:t.isotope,film:t.film,density:t.density,
    thicknessMm:t.mm,distanceMm:t.sfd,activityCi:t.ci,
    material:'Fe',screens:'Pb'
  },curves);
  const currentTime=current.ok?hms(current.minutes):'GEBLOKKEERD: '+current.error;
  if(!ds)return {nr:t.nr,currentTime,candidateTime:'ONBEKEND',reason:'Isotoop ontbreekt'};
  const base=interpolateLog(ds.curves.D4,t.mm);
  const filmRatio=proposedFilmRatio(ds,t.film),densityRatio=proposedDensity(t.density);
  if(!Number.isFinite(base)||!filmRatio||!densityRatio)
    return {nr:t.nr,currentTime,candidateTime:'ONBEKEND',reason:'Voorgestelde factoren niet volledig'};
  const minutes=base*60/t.ci*(t.sfd/ds.referenceDistanceMm)**2*filmRatio.factor*densityRatio.factor;
  const candidateTime=hms(minutes);
  const warning=[
    'NIET GEVALIDEERD: alleen rekenkundige simulatie, niet voor RT-belichtingen',
    ...(filmRatio.assumption?['Filmratiogeldigheid moet onafhankelijk worden aangetoond']:[]),
    ...(densityRatio.assumption?['Dichtheidsfactor D='+t.density+' is aangenomen via lineaire interpolatie']:[])
  ].join('; ');
  return {
    nr:t.nr,isotope:t.isotope,film:t.film,currentTime,candidateTime,
    expected:t.expected??null,
    matchesExpected:t.expected?candidateTime===t.expected:null,
    filmFactor:filmRatio.factor,densityFactor:densityRatio.factor,
    warning
  };
}
export function reviewAll() {return nineCases.map(reviewCase);}
if(typeof process!=='undefined'&&process.argv?.[1]?.endsWith('gamma-nine-point-review.mjs')){
  console.table(reviewAll().map(x=>({
    nr:x.nr,huidig:x.currentTime,
    voorstel:x.candidateTime,
    verwacht:x.expected??'Geen onafhankelijke tijd opgegeven',
    gelijk:x.matchesExpected===null?'niet aantoonbaar':String(x.matchesExpected)
  })));
}
