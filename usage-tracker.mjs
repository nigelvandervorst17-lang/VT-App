/**
 * Privacy-friendly usage counts: verified signed-in users only.
 * One aggregate user/day row in Supabase; no IP address, device fingerprint,
 * anonymous visitor ID, location, browsing history or calculator input.
 * Dashboard is only readable by the server-authorized Planning owner.
 */
import {createSupabaseConnection,PUBLIC_CONFIG_KEY,SESSION_KEY} from './research/company-suite/supabase-rest.mjs';
import {DEFAULT_SUPABASE_PROJECT} from './research/company-suite/project-config.mjs';

export function usageConnectionConfig(storage=globalThis.localStorage){
 let saved=null;try{saved=JSON.parse(storage?.getItem(PUBLIC_CONFIG_KEY)||'null');}catch{}
 return saved?.url&&saved?.key?saved:DEFAULT_SUPABASE_PROJECT;
}
export function makeUsageClient(options={}){
 const environment=options.environment||globalThis;
 const connection=options.connection||createSupabaseConnection(usageConnectionConfig(environment.localStorage),environment);
 let lastKey=null,pending=null;
 async function record(){
  if(environment.navigator?.onLine===false||!connection.restore())return false;
  if(pending)return pending;
  pending=(async()=>{
   const user=await connection.user();
   if(!user?.id)return false;
   const localDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Amsterdam',
    year:'numeric',month:'2-digit',day:'2-digit'}).format(options.now?.()||new Date());
   const key=user.id+':'+localDay;
   if(lastKey===key)return true;
   const success=await connection.rpc('ndt_record_app_usage');
   if(success===true)lastKey=key;
   return success===true;
  })().finally(()=>{pending=null;});
  return pending;
 }
 async function summary(){
  if(!connection.restore())throw Error('Log eerst in voor gebruiksstatistieken.');
  return connection.rpc('ndt_app_usage_summary');
 }
 return {record,summary};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const client=makeUsageClient();
 const record=()=>{client.record().catch(()=>{});};
 window.addEventListener('ndt-auth-scope-changed',event=>{
  if(event.detail?.mode==='signed-in')record();
 });
 window.addEventListener('online',record);
 // The auth UI may already have completed its startup before this module loads.
 if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{
   if(window.localStorage?.getItem(SESSION_KEY))record();
  },{once:true});
 }else if(window.localStorage?.getItem(SESSION_KEY))record();
}
