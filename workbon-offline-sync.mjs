/**
 * Encrypted, explicitly unlocked offline workbon snapshots and an idempotent
 * outbox. The passphrase is NEVER persisted. AES-GCM encryption is provided
 * by the existing company Offline Bunker module, with a SEPARATE namespace.
 */
import {openOfflineCache} from './research/company-suite/offline-cache.mjs';

export const WORKBON_OFFLINE_SCOPE='00000000-0000-4000-8000-000000000149';
export const WORKBON_OFFLINE_USER='ndt-workbon-offline-user-v1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function validateOfflineIdentity(userId){
 if(!UUID.test(String(userId||'')))throw Error('Geen geldig geverifieerd account voor offline werkbonnen.');
 return String(userId).toLowerCase();
}
export async function unlockWorkbonCache({userId,passphrase,allowCreate=false}){
 const id=validateOfflineIdentity(userId);
 const cache=await openOfflineCache({userId:id,companyId:WORKBON_OFFLINE_SCOPE,passphrase,allowCreate});
 return {
  userId:id,
  async snapshot(){
   const result=await cache.snapshot();
   if(!result||result.userId!==id||result.companyId!==WORKBON_OFFLINE_SCOPE)
    return null;
   return result;
  },
  async saveSnapshot({bons=[],opnames=[],role='researcher'}){
   // Only already-authorized assigned rows, not full company registers.
   if(role!=='researcher')throw Error('Offline werkbonnen zijn uitsluitend voor toegewezen onderzoekers.');
   if(!Array.isArray(bons)||!Array.isArray(opnames))throw Error('Ongeldige offlinegegevens.');
   if(bons.some(b=>b.assigned_to!==id))throw Error('Een werkbon is niet aan dit account toegewezen.');
   if(opnames.some(r=>r.created_by!==id))throw Error('Opname behoort tot ander account.');
   await cache.saveSnapshot({
    userId:id,companyId:WORKBON_OFFLINE_SCOPE,role,bons,opnames
   });
  },
  async queueShot({client_id,bon_id,details}){
   if(!UUID.test(client_id)||!UUID.test(bon_id)||!details||typeof details!=='object')
    throw Error('Ongeldige opname voor offline wachtrij.');
   return cache.queueDraftLog({
    client_id,bon_id,details,company_id:WORKBON_OFFLINE_SCOPE,created_by:id
   });
  },
  draftLogs:()=>cache.draftLogs(),
  markSynced:clientId=>cache.markSynced(clientId),
  close:()=>cache.close()
 };
}
export async function syncWorkbonOutbox({cache,client,bons,userId,onProgress=()=>{}}){
 if(!cache||!client||cache.userId!==validateOfflineIdentity(userId))throw Error('Offline cache hoort niet bij dit account.');
 const pending=await cache.draftLogs();
 let success=0;
 for(const row of pending){
  if(row.created_by!==userId||row.company_id!==WORKBON_OFFLINE_SCOPE)continue;
  const bon=bons.find(item=>item.id===row.bon_id&&item.assigned_to===userId);
  if(!bon){onProgress('Toewijzing gewijzigd; offline opname blijft bewaard.');continue;}
  try{
   await client.addOpname(bon,{...row.details,client_id:row.client_id});
   await cache.markSynced(row.client_id);
   success++;
  }catch(error){
   onProgress('Synchronisatie gepauzeerd: '+String(error?.message||error));
   break;
  }
 }
 return {success,remaining:(await cache.draftLogs()).length};
}
