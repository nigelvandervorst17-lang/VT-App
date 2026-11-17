/**
 * One-use team invitation acceptance. The invite token lives ONLY in a URL
 * fragment (never sent to the website/server) and sessionStorage until the
 * matching, confirmed Supabase user accepts it. No service role in the browser.
 */
import {createSupabaseConnection,PUBLIC_CONFIG_KEY} from './research/company-suite/supabase-rest.mjs';
import {DEFAULT_SUPABASE_PROJECT} from './research/company-suite/project-config.mjs';
const KEY='ndt-pending-planning-invite-v1';
const HASH_PREFIX='#planning-uitnodiging=';
function config(){
 let raw=null;try{raw=JSON.parse(localStorage.getItem(PUBLIC_CONFIG_KEY)||'null');}catch{}
 return raw?.url&&raw?.key?raw:DEFAULT_SUPABASE_PROJECT;
}
export function readPlanningInviteHash(hash){
 const input=String(hash||'');
 const value=input.startsWith(HASH_PREFIX)?input.slice(HASH_PREFIX.length):null;
 return value&&/^[0-9a-f]{64}$/.test(value)?value:null;
}
export function buildPlanningInviteLink(origin,path,token){
 if(!/^[0-9a-f]{64}$/.test(token))throw Error('Geen geldig eenmalig token.');
 const base=new URL(path||'/',origin);
 base.search='';base.hash='';
 return base.toString()+HASH_PREFIX+token;
}
function message(text,isError=false){
 let panel=document.getElementById('ndtInvitationFeedback');
 if(!panel){
  panel=document.createElement('p');panel.id='ndtInvitationFeedback';
  panel.className='ndt-invite-feedback';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
  document.getElementById('ndtEntryGate')?.insertAdjacentElement('afterend',panel);
 }
 panel.textContent=text;
 panel.dataset.error=String(isError);
}
let handling=false;
export async function acceptPendingInvitation({connection=null,storage=sessionStorage}={}){
 if(handling)return false;
 const token=storage.getItem(KEY);
 if(!token)return false;
 if(!navigator.onLine){message('Uitnodiging opgeslagen. Accepteer na verbinden met internet.');return false;}
 handling=true;
 try{
  const api=connection||createSupabaseConnection(config());
  if(!api.restore()){message('Meld je aan of registreer met het uitgenodigde e-mailadres.');return false;}
  const user=await api.user();
  if(!user?.id)throw Error('Verifieer eerst je account via de bevestigingsmail.');
  const accepted=await api.rpc('planning_accept_invitation',{p_token:token});
  if(accepted!==true)throw Error('Uitnodiging is niet geaccepteerd.');
  storage.removeItem(KEY);
  message('Uitnodiging geaccepteerd. Je bent gekoppeld als onderzoeker. Open Planning.');
  window.dispatchEvent(new Event('ndt-planning-invite-accepted'));
  return true;
 }catch(err){
  message('Uitnodiging nog niet geaccepteerd: '+String(err?.message||err),true);
  return false;
 }finally{handling=false;}
}
function init(){
 const token=readPlanningInviteHash(location.hash);
 if(token){
  sessionStorage.setItem(KEY,token);
  // Erase token from browser address bar/history immediately.
  history.replaceState(null,'',location.pathname+location.search);
 }
 if(sessionStorage.getItem(KEY)){
  message('Je hebt een uitnodiging ontvangen. Meld je aan met dat bevestigde e-mailadres om je team te koppelen.');
  void acceptPendingInvitation();
 }
 window.addEventListener('ndt-auth-scope-changed',e=>{
  if(e.detail?.mode==='signed-in')void acceptPendingInvitation();
 });
 window.addEventListener('online',()=>void acceptPendingInvitation());
}
if(typeof window!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
