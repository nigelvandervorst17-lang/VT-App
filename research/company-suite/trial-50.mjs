/**
 * Client-side 50-calculation UX limit for the RESEARCH demo only.
 * Not a security boundary: clearing browser storage resets the count.
 * Only successful numerical/geometry/IQI research previews consume a unit.
 */
export const TRIAL_MAX=50;
export const TRIAL_KEY='ndt-company-guest-trial-v1';
export function trialCounter(storage=globalThis.localStorage){
 function read(){
  try{
   if(!storage||typeof storage.getItem!=='function')return {ok:false,used:TRIAL_MAX,remaining:0};
   const raw=storage.getItem(TRIAL_KEY);
   if(raw===null)return {ok:true,used:0,remaining:TRIAL_MAX};
   const parsed=JSON.parse(raw);
   if(parsed?.version!==1||!Number.isInteger(parsed.used)||parsed.used<0||parsed.used>TRIAL_MAX)
     return {ok:false,used:TRIAL_MAX,remaining:0};
   return {ok:true,used:parsed.used,remaining:TRIAL_MAX-parsed.used};
  }catch{return {ok:false,used:TRIAL_MAX,remaining:0}}
 }
 function consume(){
  const before=read();
  if(!before.ok||before.remaining<=0)return {...before,allowed:false};
  try{
   const next=before.used+1;
   storage.setItem(TRIAL_KEY,JSON.stringify({version:1,used:next}));
   return {...read(),allowed:true};
  }catch{return {ok:false,used:TRIAL_MAX,remaining:0,allowed:false}}
 }
 return {status:read,consume};
}
