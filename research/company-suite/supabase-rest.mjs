/**
 * Minimal Supabase Auth + PostgREST adapter (no external JS/CDN required).
 * Public publishable/anon key only; NEVER a service_role or secret key.
 * Access/refresh tokens persist in browser localStorage, not IndexedDB.
 * Server-side RLS remains the authorization boundary.
 * The separate offline-cache passphrase is NEVER stored.
 * The company code is never used as an authentication token.
 */
export const PUBLIC_CONFIG_KEY='ndt-supabase-public-connection-v1';
export const SESSION_KEY='ndt-supabase-session-v1';
export function createSupabaseConnection({url,key},environment=globalThis){
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url||''))
   throw Error('Ongeldige Supabase HTTPS-project-URL');
 if(typeof key!=='string'||key.length<24)
   throw Error('Vul uitsluitend de publishable/anon key van Supabase in.');
 if(/service_role|sb_secret_/i.test(key))throw Error('Geheime sleutel verboden in browser');
 // Supabase legacy anon keys may be JWTs: reject service_role claim as well.
 if(key.split('.').length===3){
  try{
   const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
   if(payload?.role==='service_role')throw Error('service_role-sleutel verboden in browser');
  }catch(error){
   if(String(error?.message).includes('service_role-sleutel verboden'))throw error;
  }
 }

 const root=url.replace(/\/$/,'');
 let auth=null;
 const durableStorage=()=>{
  try {const s=environment.localStorage;if(s&&typeof s.getItem==='function')return s;}
  catch{}
  return environment.sessionStorage;
 };
 function save(session){
  if(!session?.access_token||!session?.refresh_token)throw Error('Geen geldige Auth-sessie');
  auth={access_token:session.access_token,refresh_token:session.refresh_token,
   expires_at:Math.floor(Date.now()/1000)+(session.expires_in??3600)};
  durableStorage()?.setItem(SESSION_KEY,JSON.stringify(auth));
  if(durableStorage()!==environment.sessionStorage)environment.sessionStorage?.removeItem(SESSION_KEY);
 }
 function restore(){
  try{
   const current=durableStorage()?.getItem(SESSION_KEY);
   const legacy=environment.sessionStorage?.getItem(SESSION_KEY);
   auth=JSON.parse(current||legacy||'null');
   if(!current&&legacy&&durableStorage()!==environment.sessionStorage){
    durableStorage()?.setItem(SESSION_KEY,legacy);
    environment.sessionStorage?.removeItem(SESSION_KEY);
   }
  }catch{auth=null}
  if(!auth?.access_token||!auth?.refresh_token){auth=null;return false;}
  return true;
 }
 function clear(){
  auth=null;
  try{environment.localStorage?.removeItem(SESSION_KEY);}catch{}
  try{environment.sessionStorage?.removeItem(SESSION_KEY);}catch{}
 }
 async function request(path,{method='GET',body,authenticated=false,headers={}}={}){
  const h={apikey:key,'Content-Type':'application/json',...headers};
  if(authenticated){
   if(!auth?.access_token)throw Error('Meld je eerst aan.');
   if(Date.now()/1000>=auth.expires_at-45)await refresh();
   h.Authorization='Bearer '+auth.access_token;
  }
  const r=await environment.fetch(root+path,{method,headers:h,
   ...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!r.ok){
   const result=await r.json().catch(()=>({message:r.statusText}));
   throw Error(result.msg||result.message||result.error_description||result.error||('HTTP '+r.status));
  }
  if(r.status===204)return null;
  const data=await r.text();
  return data?JSON.parse(data):null;
 }
 async function refresh(){
  if(!auth?.refresh_token)throw Error('Geen sessie om te vernieuwen.');
  const latest=await request('/auth/v1/token?grant_type=refresh_token',{
    method:'POST',body:{refresh_token:auth.refresh_token}});
  save(latest);
  return latest;
 }
 async function signUp(email,password){
  return request('/auth/v1/signup',{method:'POST',body:{email,password}});
 }
 async function signIn(email,password){
  const data=await request('/auth/v1/token?grant_type=password',{
   method:'POST',body:{email,password}});
  save(data);return data.user??await user();
 }
 async function magicLink(email,redirectTo){
  return request('/auth/v1/otp?redirect_to='+encodeURIComponent(redirectTo),{
   method:'POST',body:{email,create_user:true}
  });
 }
 function acceptMagicLinkHash(hash){
  const parts=new URLSearchParams(String(hash||'').replace(/^#/,''));
  const access_token=parts.get('access_token'),refresh_token=parts.get('refresh_token');
  if(!access_token||!refresh_token)return false;
  save({access_token,refresh_token,expires_in:Number(parts.get('expires_in')||3600)});
  return true;
 }
 async function user(){return request('/auth/v1/user',{authenticated:true})}
 function token(){return auth?.access_token??null}
 async function signOut(){
  try{if(auth?.access_token)await request('/auth/v1/logout',{method:'POST',authenticated:true})}
  finally{clear()}
 }
 async function rpc(name,params={}){
  if(!/^[a-z_]+$/i.test(name))throw Error('Ongeldige RPC');
  return request('/rest/v1/rpc/'+name,{method:'POST',body:params,authenticated:true});
 }
 async function select(table,{filters={},columns='*',order}={}){
  if(!TABLES.has(table))throw Error('Onbekende tabel');
  const q=new URLSearchParams({select:columns});
  for(const [col,v] of Object.entries(filters)){
   if(!/^[a-z_]+$/.test(col))throw Error('Ongeldige filterkolom');
   q.set(col,'eq.'+v);
  }
  if(order)q.set('order',order);
  return request('/rest/v1/'+table+'?'+q,{authenticated:true});
 }
 async function insert(table,data,{upsert=false}={}){
  if(!TABLES.has(table))throw Error('Onbekende tabel');
  const query=upsert?'?on_conflict=client_id':'';
  return request('/rest/v1/'+table+query,{
   method:'POST',body:data,authenticated:true,
   headers:{Prefer:upsert?'resolution=merge-duplicates,return=representation':'return=representation'}
  });
 }
 async function update(table,id,data){
  if(!TABLES.has(table))throw Error('Onbekende tabel');
  return request('/rest/v1/'+table+'?id=eq.'+encodeURIComponent(id),{
   method:'PATCH',body:data,authenticated:true,
   headers:{Prefer:'return=representation'}
  });
 }
 restore();
 return {signUp,signIn,magicLink,acceptMagicLinkHash,user,signOut,refresh,restore,clear,
  token,rpc,select,insert,update,root};
}
const TABLES=new Set(['companies','company_members','join_requests','company_tubes',
 'company_sources','company_procedures','exposure_logs',
 'planning_members','planning_workbonnen','planning_opnames']);
