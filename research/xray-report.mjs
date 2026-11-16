/**
 * Ten-point X-ray report — compares with the original engine.
 * No invented reference times or kV values.
 * Run: node research/xray-report.mjs
 */
import {readFileSync} from 'node:fs';
import {calculateXray,hms} from '../rt-core.mjs';
import {calculateResearchXray,researchDatabase} from './xray-core.mjs';

export const MISSING='Referentie ontbreekt';
export const THICKNESS_POINTS=Object.freeze([2,4,6,8,10,12,15,20,25,30]);
const MISSING_RESULT='Niet berekend';

export function loadReferencePoints(){
 return JSON.parse(readFileSync(new URL('./xray-reference-points.json',import.meta.url),'utf8'));
}
export function parseReferenceTime(value){
 if(typeof value!=='string'||! /^\d{2,}:[0-5]\d:[0-5]\d$/.test(value))return null;
 const [h,m,s]=value.split(':').map(Number);
 const total=h*3600+m*60+s;
 return Number.isSafeInteger(total)&&total>0?total:null;
}
export function buildXrayReportRows(doc){
 if(!doc||!Array.isArray(doc.points)||doc.points.length!==10)
   throw new Error('Expected exactly ten X-ray research rows');
 const c=doc.conditions;
 if(!c||c.material!=='Fe'||c.sfdMm!==800||c.ma!==5||c.film!=='D4'||c.density!==2.0)
   throw new Error('Research conditions changed; write a separately reviewed test plan');
 return doc.points.map((point,i)=>{
   if(point.nr!==i+1||point.steelThicknessMm!==THICKNESS_POINTS[i])
     throw new Error('Unexpected thickness list or row order');
   const common={nr:point.nr,steelThicknessMm:point.steelThicknessMm,
     kv:point.kv,referenceTime:point.referenceTime,
     existingTime:MISSING_RESULT,researchTime:MISSING_RESULT,
     differenceSeconds:null,status:MISSING};
   if(point.kv===MISSING)return common;
   if(!Number.isInteger(point.kv)||point.kv<=0)
     return {...common,status:'Ongeldige kV'};
   const input={
     model:doc.equipment?.model,film:c.film,density:c.density,
     kv:point.kv,ma:c.ma,thicknessMm:point.steelThicknessMm,
     distanceMm:c.sfdMm,material:c.material
   };
   const old=calculateXray(input,researchDatabase());
   const candidate=calculateResearchXray(input);
   const oldTime=old.ok?hms(old.minutes):'Geblokkeerd ('+String(old.error)+')';
   const newTime=candidate.ok?hms(candidate.minutes):'Geblokkeerd ('+String(candidate.error)+')';
   const row={...common,existingTime:oldTime,researchTime:newTime};
   if(!old.ok||!candidate.ok)return {...row,status:'Geblokkeerd'};
   if(point.referenceTime===MISSING)return row;
   const refSeconds=parseReferenceTime(point.referenceTime);
   if(refSeconds===null)return {...row,status:'Ongeldige referentietijd'};
   const differenceSeconds=Math.round(candidate.minutes*60)-refSeconds;
   const originalDifferenceSeconds=Math.round(old.minutes*60)-refSeconds;
   return {...row,differenceSeconds,
     status:differenceSeconds===0&&originalDifferenceSeconds===0?'Overeenkomst':'Afwijking'};
 });
}
function safeCell(value){
 return String(value??'—').replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
}
export function formatXrayReport(rows){
 const header='| Nr | Staal | kV | Referentietijd | Huidige motor | Onderzoeksmotor | Verschil (sec) | Status |';
 const separator='|---:|---:|---|---|---|---|---:|---|';
 const lines=rows.map(r=>'| '+[
   r.nr,r.steelThicknessMm+' mm',r.kv,r.referenceTime,r.existingTime,
   r.researchTime,r.differenceSeconds??'—',r.status
 ].map(safeCell).join(' | ')+' |');
 return [header,separator,...lines].join('\n');
}
export function createXrayReport(doc=loadReferencePoints()){
 return formatXrayReport(buildXrayReportRows(doc));
}
if(typeof process!=='undefined'&&process.argv?.[1]?.endsWith('xray-report.mjs')){
 console.log(createXrayReport());
}
