/**
 * Admin-only visual Naslag viewer. No calculator/curve/film/validation code imports.
 * Images are fetched from Supabase PRIVATE Storage using a verified Auth JWT.
 * A browser flag or company role is NEVER sufficient: the server RPC and Storage
 * policy both check the exact owner-admin allowlist.
 */
import {createSupabaseConnection,PUBLIC_CONFIG_KEY} from './research/company-suite/supabase-rest.mjs';
import {DEFAULT_SUPABASE_PROJECT} from './research/company-suite/project-config.mjs';
import {exposureDiagrams} from './reference-data.mjs';

const $=id=>document.getElementById(id);
const BUCKET='ndt-admin-naslag';
const FOLDER='visuals/';
const WELD_FILE='weld-details.webp';
const FILES=Object.freeze([...new Set([...exposureDiagrams.map(d=>d.file),WELD_FILE])]);
const GUEST_NOTICE='Bedrijfsgebonden referentiegrafieken zijn alleen toegankelijk voor geautoriseerde beheerders.';
const urls=new Map();
let auth=null;
let approved=false;
let checkVersion=0;
let status='waiting';
const config=()=>{
 let fromLocal=null;
 try{fromLocal=JSON.parse(localStorage.getItem(PUBLIC_CONFIG_KEY)||'null')}catch{}
 return fromLocal?.url&&fromLocal?.key?fromLocal:DEFAULT_SUPABASE_PROJECT;
};
const privateKey=name=>FOLDER+name;
const available=name=>FILES.includes(name)&&/^[a-z0-9-]+\.webp$/.test(name);
const applyGate=allowed=>{
 approved=Boolean(allowed);
 document.body.classList.toggle('ndt-naslag-authorized',approved);
 const gate=$('privateNaslagMessage');
 if(gate)gate.hidden=approved;
 const uploads=$('privateNaslagUpload');if(uploads)uploads.hidden=!approved;
 for(const id of ['ndtNaslagCharts','ndtNaslagWeld']){
  const el=$(id);if(el)el.hidden=!approved;
 }
};
const describe=text=>{
 const out=$('privateNaslagStatus');
 if(out)out.textContent=text;
};
function revokeAll(){
 for(const url of urls.values())URL.revokeObjectURL(url);
 urls.clear();
 for(const id of ['refDiagramImage','ndtNaslagWeldImage']){
  const el=$(id);if(el)el.removeAttribute('src');
 }
 const a=$('refDiagramOpen');
 if(a)a.removeAttribute('href');
 const zoom=document.querySelector('#rtChartDialog img');
 if(zoom)zoom.removeAttribute('src');
}
function resetAccess(){
 ++checkVersion;approved=false;auth=null;status='waiting';
 revokeAll();applyGate(false);
 describe(GUEST_NOTICE);
}
function authenticatedApi(){
 const api=createSupabaseConnection(config());
 return api.restore()?api:null;
}
export function canUseNaslagResult(result){
 // Only a literal server-side true is accepted. No company role or client flag.
 return result===true;
}
async function verify(){
 const version=++checkVersion;
 resetAccess();
 if(!navigator.onLine){describe(GUEST_NOTICE+' Online verificatie vereist.');return false;}
 try{
  const api=authenticatedApi();
  if(!api){describe(GUEST_NOTICE);return false;}
  await api.user(); // refresh the JWT if needed, fail closed when expired
  const allowed=await api.rpc('can_view_private_naslag',{});
  if(version!==checkVersion-1)return false;
  if(!canUseNaslagResult(allowed)){describe(GUEST_NOTICE);return false;}
  auth=api;status='authorized';
  applyGate(true);
  describe('Beheerder geverifieerd · privénaslag beschikbaar.');
  await Promise.allSettled([loadChart(),loadWeld()]);
  return true;
 }catch{
  if(version===checkVersion-1)describe(GUEST_NOTICE+' Meld je aan met je beheerder-account.');
  return false;
 }
}
async function loadObject(name){
 if(!approved||!auth||!available(name))throw Error('Geen geautoriseerde Naslag-toegang');
 if(urls.has(name))return urls.get(name);
 await auth.user(); // refresh expired JWT through the same existing adapter
 const {url,key}=config();
 const path=privateKey(name).split('/').map(encodeURIComponent).join('/');
 const response=await fetch(url.replace(/\/$/,'')+'/storage/v1/object/authenticated/'+BUCKET+'/'+path,{
  method:'GET',cache:'no-store',credentials:'omit',
  headers:{apikey:key,Authorization:'Bearer '+auth.token()}
 });
 if(!response.ok)throw Error('Privébestand niet beschikbaar (HTTP '+response.status+').');
 const blob=await response.blob();
 if(!blob.type.startsWith('image/'))throw Error('Onverwacht bestandsformaat');
 if(!approved)throw Error('Sessie niet meer geautoriseerd');
 const localUrl=URL.createObjectURL(blob);
 urls.set(name,localUrl);
 return localUrl;
}
async function loadChart(){
 if(!approved)return;
 const d=exposureDiagrams.find(item=>item.id===$('refDiagram')?.value)||exposureDiagrams[0];
 if(!d)return;
 const img=$('refDiagramImage'),open=$('refDiagramOpen');
 if(!img||!open)return;
 img.removeAttribute('src');open.removeAttribute('href');
 const selectId=d.id;
 try{
  const src=await loadObject(d.file);
  if(!approved||$('refDiagram').value!==selectId)return;
  img.src=src;
  open.href=src;
  describe('Beheerder geverifieerd · '+d.name+' geladen uit private opslag.');
 }catch(e){
  describe('Privégrafiek nog niet geladen: '+String(e?.message||e)+' Gebruik Beheerder → Bestanden uploaden.');
 }
}
async function loadWeld(){
 if(!approved)return;
 const img=$('ndtNaslagWeldImage');if(!img)return;
 try{img.src=await loadObject(WELD_FILE);}
 catch(e){describe('Lasdetailschets nog niet geladen: '+String(e?.message||e));}
}
async function upload(event){
 event.preventDefault();
 if(!approved||!auth)return;
 const selected=[...($('privateNaslagFiles')?.files||[])];
 if(!selected.length){describe('Selecteer de oorspronkelijke .webp-bestanden.');return;}
 const unique=new Set();
 for(const file of selected){
  if(!available(file.name)||unique.has(file.name)){
   describe('Ongeldig of dubbel bestand: '+file.name+'. Alleen de tien oorspronkelijke .webp-bestanden zijn toegestaan.');
   return;
  }
  if(file.type!=='image/webp'||file.size<=0||file.size>20971520){
   describe('Alleen geldige WEBP-afbeeldingen tot 20 MB zijn toegestaan.');
   return;
  }
  unique.add(file.name);
 }
 const button=$('privateNaslagUploadButton');button.disabled=true;
 try{
  await auth.user();
  const {url,key}=config();
  let uploaded=0;
  for(const file of selected){
   if(!approved)throw Error('Geen beheerderstoegang');
   describe('Privébestand uploaden: '+file.name);
   const path=privateKey(file.name).split('/').map(encodeURIComponent).join('/');
   const response=await fetch(url.replace(/\/$/,'')+'/storage/v1/object/'+BUCKET+'/'+path,{
    method:'POST',cache:'no-store',credentials:'omit',
    headers:{
     apikey:key,Authorization:'Bearer '+auth.token(),'Content-Type':'image/webp',
     'x-upsert':'false'
    },body:file
   });
   if(!response.ok){
    const reason=await response.text();
    throw Error('Upload '+file.name+' geweigerd (HTTP '+response.status+'): '+reason.slice(0,160));
   }
   uploaded++;
  }
  revokeAll();
  $('privateNaslagFiles').value='';
  await Promise.allSettled([loadChart(),loadWeld()]);
  describe(uploaded+' privébestand(en) opgeslagen. Alleen jouw geautoriseerde beheerder-account kan ze ophalen.');
 }catch(e){describe('Upload niet voltooid: '+String(e?.message||e));}
 finally{button.disabled=false;}
}
function init(){
 applyGate(false);
 const select=$('refDiagram');
 select?.addEventListener('change',()=>{if(approved)loadChart();});
 const form=$('privateNaslagUploadForm');
 form?.addEventListener('submit',upload);
 document.querySelectorAll('[data-nav="refs"]').forEach(el=>el.addEventListener('click',()=>{
  // Every visit validates authorization anew on the server.
  verify();
 }));
 $('ndtNaslagRetry')?.addEventListener('click',verify);
 window.addEventListener('ndt-private-naslag-logout',resetAccess);
 window.addEventListener('storage',event=>{if(event.key==='ndt-supabase-session-v1')resetAccess();});
 window.addEventListener('offline',resetAccess);
 window.addEventListener('pagehide',()=>{revokeAll();applyGate(false)});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)revokeAll();});
 // The page initializes with NO private-image request or exposure.
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
