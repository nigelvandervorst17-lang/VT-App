/**
 * Central planning API: Supabase Auth + RLS are the sole authorization boundary.
 * No exposure engine, safety code, material factors, IQI rules or public Naslag access.
 */
import {createSupabaseConnection,PUBLIC_CONFIG_KEY} from './research/company-suite/supabase-rest.mjs';
import {DEFAULT_SUPABASE_PROJECT} from './research/company-suite/project-config.mjs';
import {sanitizeBon} from './planning-data.mjs';

const BUCKET='planning-werkbonnen';
const MIME_TO_EXT=Object.freeze({
 'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp','text/plain':'txt'
});
export function connectionConfig(storage=globalThis.localStorage){
 let saved=null;
 try{saved=JSON.parse(storage?.getItem(PUBLIC_CONFIG_KEY)||'null');}catch{}
 return saved?.url&&saved?.key?saved:DEFAULT_SUPABASE_PROJECT;
}
export function dispatchStatus({status,assigned_to,data}){
 const required=Boolean(data?.bonnummer?.trim()&&data?.klant?.trim()&&data?.datum);
 if(!required)return 'Concept';
 if(!assigned_to)return 'Concept';
 return ['In behandeling','Gereed','Afgerond'].includes(status)?status:'Ingepland';
}
export function planningRecord(values){
 const data=sanitizeBon(values);
 // Only planning metadata is stored. Researcher setup always lives in the opnames.
 const administrative=['bonnummer','klant','adres','ordernummer','bron_of_toestel','procedure_code','revisie','opmerkingen','datum','starttijd','eindtijd'];
 return Object.fromEntries(administrative.map(key=>[key,data[key]??null]));
}
export function makePlanningAPI(options={}){
 const env=options.environment||globalThis;
 const api=options.connection||createSupabaseConnection(connectionConfig(env.localStorage),env);
 const root=api.root;
 const key=(options.key||connectionConfig(env.localStorage).key);
 const fetcher=options.fetch||env.fetch.bind(env);
 const online=()=>env.navigator?.onLine!==false;
 let sessionUser=null,role=null;
 async function authenticate(){
  if(!online())throw Error('Gedeelde planning vereist een internetverbinding.');
  if(!api.restore())throw Error('Log in met je Supabase-account.');
  sessionUser=await api.user();
  if(!sessionUser?.id)throw Error('De aanmelding kon niet worden geverifieerd.');
  const own=await api.select('planning_members',{filters:{user_id:sessionUser.id}});
  if(!own?.length)throw Error('Geen planningsrol gekoppeld. Vraag Planning om je account toe te voegen.');
  role=own[0].role;
  if(!['planning','researcher'].includes(role))throw Error('Ongeldige planningsrol.');
  return {user:sessionUser,role};
 }
 const requireAuth=async()=>{
  if(!sessionUser)await authenticate();
  if(!online())throw Error('Geen internet. Gedeelde gegevens kunnen niet worden gewijzigd.');
 };
 const requirePlanner=async()=>{await requireAuth();if(role!=='planning')throw Error('Alleen Planning kan dit wijzigen.');};
 const requireResearcher=async()=>{await requireAuth();if(role!=='researcher')throw Error('Alleen toegewezen onderzoekers kunnen opnames opslaan.');};
 async function list(){
  await requireAuth();
  const [bons,opnames,members]=await Promise.all([
   api.select('planning_workbonnen',{order:'created_at.desc'}),
   api.select('planning_opnames',{order:'created_at.desc'}),
   role==='planning'?api.select('planning_members'):[]
  ]);
  return {user:sessionUser,role,bons:bons||[],opnames:opnames||[],members:members||[]};
 }
 async function addResearcher(email){
  await requirePlanner();
  const normalized=String(email||'').trim().replace(/\.+$/,'').toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw Error('Vul een geldig bestaand onderzoeker-e-mailadres in.');
  const result=await api.rpc('planning_add_researcher',{p_email:normalized});
  if(result!==true)throw Error('Dit account heeft al een andere rol. Neem contact op met de beheerder.');
  return result;
 }
 async function saveBon({id=null,values,assignedTo=null,status=null}){
  await requirePlanner();
  const data=planningRecord(values);
  const assigned_to=assignedTo||null;
  const nextStatus=dispatchStatus({data,assigned_to,status});
  if(id){
   const changes={data,assigned_to,status:nextStatus,updated_at:new Date().toISOString()};
   const rows=await api.update('planning_workbonnen',id,changes);
   if(!rows?.length)throw Error('Werkbon niet bijgewerkt. Controleer je planningsrechten.');
   return rows[0];
  }
  const rows=await api.insert('planning_workbonnen',{
   created_by:sessionUser.id,assigned_to,data,status:nextStatus
  });
  if(!rows?.length)throw Error('Werkbon is niet aangemaakt.');
  return rows[0];
 }
 async function setPlannerStatus(id,status){
  await requirePlanner();
  if(!['Concept','Ingepland','Afgerond'].includes(status))throw Error('Ongeldige status');
  const rows=await api.update('planning_workbonnen',id,{status,updated_at:new Date().toISOString()});
  if(!rows?.length)throw Error('Status niet opgeslagen.');
  return rows[0];
 }
 async function changeResearchStatus(id,status){
  await requireResearcher();
  const ok=await api.rpc('planning_change_status',{p_bon_id:id,p_status:status});
  if(ok!==true)throw Error('Statusverandering niet toegestaan; vernieuw de toegewezen werkbon.');
  return true;
 }
 async function addOpname(bon,details){
  await requireResearcher();
  if(!bon?.id||bon.assigned_to!==sessionUser.id||bon.status!=='In behandeling')
   throw Error('Open eerst je toegewezen werkbon en kies Start onderzoek.');
  const rows=await api.insert('planning_opnames',{bon_id:bon.id,created_by:sessionUser.id,details});
  if(!rows?.length)throw Error('Opname is niet opgeslagen bij de werkbon.');
  return rows[0];
 }
 async function attachmentRequest(path,{method='GET',file=null}={}){
  await requireAuth();
  // Calling /user refreshes the short-lived JWT using the existing adapter.
  await api.user();
  const token=api.token();
  if(!token)throw Error('Geen geldige aanmeldsessie voor privédocumenten.');
  const url=root+'/storage/v1/object/'+(method==='GET'?'authenticated/':'')+
   BUCKET+'/'+path.split('/').map(encodeURIComponent).join('/');
  const response=await fetcher(url,{
   method,headers:{apikey:key,Authorization:'Bearer '+token,
    ...(file?{'Content-Type':file.type,'x-upsert':'false'}:{})},
   ...(file?{body:file}:{})
  });
  if(!response.ok){
   const data=await response.json().catch(()=>({}));
   throw Error(data.message||data.error||'Privébestand niet beschikbaar (HTTP '+response.status+').');
  }
  return response;
 }
 async function uploadOriginal(bon,file){
  await requirePlanner();
  if(!bon?.id||!file)return null;
  const ext=MIME_TO_EXT[file.type];
  if(!ext||file.size>14000000)throw Error('Upload uitsluitend PDF, JPG, PNG, WEBP of TXT van maximaal 14 MB.');
  const path=bon.id+'/'+env.crypto.randomUUID()+'.'+ext;
  await attachmentRequest(path,{method:'POST',file});
  const rows=await api.update('planning_workbonnen',bon.id,{
   original_path:path,updated_at:new Date().toISOString()
  });
  if(!rows?.length)throw Error('Bon opgeslagen, maar bestandsverwijzing niet bijgewerkt.');
  return path;
 }
 async function downloadOriginal(bon){
  if(!bon?.original_path)throw Error('Geen originele werkbon opgeslagen.');
  // Defense-in-depth: never request arbitrary storage paths.
  if(!bon.original_path.startsWith(bon.id+'/'))throw Error('Ongeldig bonbestandspad.');
  const response=await attachmentRequest(bon.original_path);
  const blob=await response.blob();
  const ext=bon.original_path.split('.').at(-1)||'bin';
  return {blob,filename:'Werkbon-'+(bon.data?.bonnummer||bon.id).replace(/[^a-z0-9-]/gi,'_')+'.'+ext};
 }
 return {authenticate,list,addResearcher,saveBon,setPlannerStatus,
  changeResearchStatus,addOpname,uploadOriginal,downloadOriginal,
  get user(){return sessionUser},get role(){return role},clear(){sessionUser=null;role=null}};
}
