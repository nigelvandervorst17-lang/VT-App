import type {ProcedureProfile, SavedPlan, ProcedureBackup} from '../domain/types.js';
import {validateProfile,newId} from '../domain/validation.js';
const DB='ndt-radiography-pro-procedure-suite';
const VERSION=1;
const PROFILE_STORE='profiles',PLAN_STORE='plans',SETTING_STORE='settings';

function openDb():Promise<IDBDatabase>{
 if(typeof indexedDB==='undefined')return Promise.reject(new Error('IndexedDB niet beschikbaar. Browser/private mode controleren.'));
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,VERSION);
  r.onupgradeneeded=()=>{
   const db=r.result;
   if(!db.objectStoreNames.contains(PROFILE_STORE))db.createObjectStore(PROFILE_STORE,{keyPath:'id'});
   if(!db.objectStoreNames.contains(PLAN_STORE))db.createObjectStore(PLAN_STORE,{keyPath:'id'});
   if(!db.objectStoreNames.contains(SETTING_STORE))db.createObjectStore(SETTING_STORE,{keyPath:'key'});
  };
  r.onerror=()=>reject(r.error??new Error('IndexedDB openen mislukt'));
  r.onblocked=()=>reject(new Error('Database geblokkeerd door een ander tabblad'));
  r.onsuccess=()=>resolve(r.result);
 });
}
async function operate<T>(store:string,mode:IDBTransactionMode,run:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  let value:T;let settled=false;
  const tx=db.transaction(store,mode);
  const req=run(tx.objectStore(store));
  req.onsuccess=()=>{value=req.result};
  tx.oncomplete=()=>{settled=true;db.close();resolve(value)};
  tx.onabort=()=>{settled=true;db.close();reject(tx.error??new Error('Opslagtransactie afgebroken'))};
  tx.onerror=()=>{};
  req.onerror=()=>{};
 });
}
async function clearStore(store:string):Promise<void>{await operate(store,'readwrite',s=>s.clear());}
export async function listProcedures():Promise<ProcedureProfile[]>{
 const profiles=await operate<ProcedureProfile[]>(PROFILE_STORE,'readonly',s=>s.getAll());
 return profiles.sort((a,b)=>a.customer.localeCompare(b.customer)||a.code.localeCompare(b.code));
}
export async function loadProcedure(id:string):Promise<ProcedureProfile|null>{return (await operate<ProcedureProfile|undefined>(PROFILE_STORE,'readonly',s=>s.get(id)))??null;}
export async function saveProcedure(profile:ProcedureProfile):Promise<void>{
 const errors=validateProfile(profile);if(errors.length)throw new Error('Procedure niet opgeslagen: '+errors.join('; '));
 await operate(PROFILE_STORE,'readwrite',s=>s.put(profile));
}
export async function deleteProcedure(id:string):Promise<void>{
 await operate(PROFILE_STORE,'readwrite',s=>s.delete(id));
 if(await getActiveProcedureId()===id)await setActiveProcedure(null);
}
export async function setActiveProcedure(id:string|null):Promise<void>{
 if(id!==null && !await loadProcedure(id))throw new Error('Procedure bestaat niet');
 await operate(SETTING_STORE,'readwrite',s=>s.put({key:'activeProcedure',value:id}));
}
export async function getActiveProcedureId():Promise<string|null>{
 const v=await operate<{key:string;value:string|null}|undefined>(SETTING_STORE,'readonly',s=>s.get('activeProcedure'));
 return v?.value??null;
}
export async function loadActiveProcedure():Promise<ProcedureProfile|null>{
 const id=await getActiveProcedureId();return id?loadProcedure(id):null;
}
export async function savePlan(plan:SavedPlan):Promise<void>{
 if(!plan.name.trim()||!plan.id||!Number.isFinite(Date.parse(plan.createdAt)))throw new Error('Ongeldig opnameplan');
 if(validateProfile(plan.procedureSnapshot).length)throw new Error('Ongeldig procedure-snapshot in logboek');
 if(!['green','orange','red'].includes(plan.result.status)||!Array.isArray(plan.result.checks))throw new Error('Ongeldig evaluatieresultaat');
 await operate(PLAN_STORE,'readwrite',s=>s.put(plan));
}
export async function listPlans():Promise<SavedPlan[]>{
 return (await operate<SavedPlan[]>(PLAN_STORE,'readonly',s=>s.getAll())).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function deletePlan(id:string):Promise<void>{await operate(PLAN_STORE,'readwrite',s=>s.delete(id));}
export async function exportBackup():Promise<ProcedureBackup>{
 return {format:'ndt-radiography-pro-backup',version:1,exportedAt:new Date().toISOString(),activeProcedureId:await getActiveProcedureId(),profiles:await listProcedures(),plans:await listPlans()};
}
export function downloadBackup(backup:ProcedureBackup):void{
 const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=`ndt-radiography-pro-backup-${new Date().toISOString().slice(0,10)}.json`;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
/** Safe incremental import; never erase the existing library. Colliding IDs are remapped. */
export async function importBackup(json:string):Promise<{procedures:number;plans:number}>{
 if(json.length>15_000_000)throw new Error('Importbestand te groot');
 const data=JSON.parse(json) as ProcedureBackup;
 if(data?.format!=='ndt-radiography-pro-backup'||data.version!==1||!Array.isArray(data.profiles)||!Array.isArray(data.plans))throw new Error('Onbekend backupformaat');
 if(data.profiles.length>1000||data.plans.length>10000)throw new Error('Te veel records');
 const seenIds=new Set<string>();
 for(const p of data.profiles){const e=validateProfile(p);if(e.length)throw new Error(`Procedure ${p?.code??'?'} ongeldig: ${e.join(', ')}`);if(seenIds.has(p.id))throw new Error('Dubbele procedure-ID in back-up');seenIds.add(p.id);}
 for(const p of data.plans){if(typeof p?.name!=='string'||!p?.id||!p?.result||!['green','orange','red'].includes(p.result.status)||!Array.isArray(p.result.checks)||validateProfile(p.procedureSnapshot).length)throw new Error('Ongeldig logboekrecord');}
 const existing=new Set((await listProcedures()).map(x=>x.id));
 const ids=new Map<string,string>();
 for(const p of data.profiles){const newKey=existing.has(p.id)||ids.has(p.id)?newId():p.id;ids.set(p.id,newKey);await saveProcedure({...p,id:newKey});existing.add(newKey);}
 for(const plan of data.plans){await savePlan({...plan,id:newId(),procedureSnapshot:{...plan.procedureSnapshot,id:ids.get(plan.procedureSnapshot.id)??plan.procedureSnapshot.id}});}
 // Intentionally do not switch the active procedure during import.
 return {procedures:data.profiles.length,plans:data.plans.length};
}
export const createSavedPlan=(name:string,profile:ProcedureProfile,result:SavedPlan['result']):SavedPlan=>
 ({id:newId(),name,createdAt:new Date().toISOString(),procedureSnapshot:structuredClone(profile),result:structuredClone(result)});
