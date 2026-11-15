/**
 * NDT company test UI. Server RLS is the ONLY authority for permissions.
 * The client does not update the legacy engine or authorize RT exposures.
 */
import {createSupabaseConnection,PUBLIC_CONFIG_KEY} from './supabase-rest.mjs';
import {openOfflineCache} from './offline-cache.mjs';
import {MATERIAL_RESEARCH_FACTORS,equivalentSteelPreview,gammaDecayPreview,isoFMinResearch} from './research-physics-preview.mjs';
import {mountResearchWorkbench} from './workbench-ui.mjs';
const $=id=>document.getElementById(id);
const state={api:null,user:null,memberships:[],member:null,company:null,cache:null,
 snapshot:null,mode:'signed-out',material:'Fe',companyCode:null};
const STALE='OFFLINE · gegevens niet live gecontroleerd; ingetrokken rechten zijn mogelijk nog niet verwerkt';
const number=x=>{
 const s=String(x??'').trim().replace(',','.');
 return /^\+?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)?Number(s):NaN;
};
function notice(message){$('stateLine').textContent=message}
function fail(e){notice('Fout: '+String(e?.message||e))}
const selected=id=>$(id).value;
function uuid(){return crypto.randomUUID()}
function output(id,msg){$(id).textContent=msg}
function errorString(e){return String(e?.message??e)}
function atOnline(){return Boolean(state.api&&state.api.token()&&state.mode==='online')}
const show=(id,yes)=>$(id).hidden=!yes;
const formData=form=>Object.fromEntries(new FormData(form));
function setTab(tab){
 if(tab==='admin'&&!(state.member?.role==='admin'&&atOnline()))tab='field';
 for(const s of document.querySelectorAll('.tab'))s.hidden=s.id!=='tab-'+tab;
 for(const btn of document.querySelectorAll('[data-tab]'))
   btn.setAttribute('aria-pressed',String(btn.dataset.tab===tab));
}
function updateRole(){
 const admin=state.member?.role==='admin'&&atOnline();
 show('adminTab',admin);show('companySetupPanel',!state.member);
 show('membershipPanel',Boolean(state.member));
 show('signOutBtn',Boolean(state.api?.token()));
 if($('tab-admin').hidden===false&&!admin)setTab('field');
 output('membershipSummary',state.member
  ?'Bedrijf: '+(state.company?.name??state.member.company_id)+
   '\nRol: '+(state.member.role==='admin'?'Hoofdgebruiker / Level 3':'Personeel / Radiograaf')+
   '\nStatus: '+(state.mode==='offline'?'Offline cache, verouderd mogelijk':'Online, RLS actief')
  :'Nog geen goedgekeurde bedrijfstoegang.');
 if(!state.member&&atOnline())setTab('account');
}
function applyAuthIntent(){
 const join=document.querySelector('input[name=authType]:checked')?.value==='join';
 show('registerCompanyForm',!join);show('joinCompanyForm',join);
}
for(const radio of document.querySelectorAll('input[name=authType]'))
 radio.addEventListener('change',applyAuthIntent);
applyAuthIntent();
for(const btn of document.querySelectorAll('[data-tab]'))
 btn.addEventListener('click',()=>setTab(btn.dataset.tab));
function applyConfig(){
 let config;
 try{config=JSON.parse(localStorage.getItem(PUBLIC_CONFIG_KEY)||'null')}catch{}
 if(!config?.url||!config?.key)return false;
 $('projectUrl').value=config.url;$('projectKey').value=config.key;
 state.api=createSupabaseConnection(config);
 return true;
}
$('connectionForm').addEventListener('submit',e=>{
 e.preventDefault();try{
  const config={url:selected('projectUrl').trim(),key:selected('projectKey').trim()};
  state.api=createSupabaseConnection(config);
  localStorage.setItem(PUBLIC_CONFIG_KEY,JSON.stringify(config));
  notice('Supabase-project ingesteld. Je kunt nu een persoonlijk account gebruiken.');
 }catch(err){fail(err)}
});
async function authorize(fn){
 if(!state.api)throw Error('Vul eerst de Supabase project-URL en publishable key in');
 return fn();
}
async function afterSignIn(){
 if(!state.api)throw Error('Supabase ontbreekt');
 state.user=await state.api.user();state.mode='online';
 if(!state.user?.id)throw Error('Gebruikers-ID niet ontvangen');
 notice('Aangemeld als '+(state.user.email||state.user.id));
 await loadMemberships();
 updateRole();
 workbenchUI.refresh();
}
$('authForm').addEventListener('submit',async e=>{
 e.preventDefault();try{
  await authorize(()=>state.api.signIn(selected('email'),selected('password')));
  await afterSignIn();output('authMessage','Ingelogd met Supabase Auth.');
 }catch(err){fail(err)}
});
$('signUpBtn').addEventListener('click',async()=>{
 try{
  const email=selected('email'),password=selected('password');
  if(password.length<8)throw Error('Gebruik een wachtwoord van minimaal 8 tekens');
  await authorize(()=>state.api.signUp(email,password));
  output('authMessage','Controleer je e-mail. Na bevestiging kun je inloggen. Accountrollen worden uitsluitend in de database toegekend.');
 }catch(err){fail(err)}
});
$('magicBtn').addEventListener('click',async()=>{
 try{
  const url=location.origin+location.pathname;
  await authorize(()=>state.api.magicLink(selected('email'),url));
  output('authMessage','Magic Link aangevraagd. Controleer je mailbox; configureer de exacte Redirect URL in Supabase.');
 }catch(err){fail(err)}
});
$('signOutBtn').addEventListener('click',async()=>{
 try{await state.api?.signOut()}catch(err){notice('Uitloggen zonder netwerk: '+errorString(err))}
 state.cache?.close();state.cache=null;state.user=null;state.member=null;
 state.memberships=[];state.snapshot=null;state.mode='signed-out';
 updateRole();workbenchUI.refresh();setTab('account');notice('Uitgelogd. Offline cache blijft versleuteld op dit toestel.');
});
async function loadMemberships(){
 if(!atOnline())throw Error('Online sessie vereist');
 state.memberships=(await state.api.select('company_members',{
  filters:{user_id:state.user.id}})).filter(m=>m.active);
 const select=$('companySelect');select.replaceChildren();
 for(const m of state.memberships){
  const option=document.createElement('option');
  option.value=m.company_id;option.textContent=m.company_id+' · '+m.role;
  select.append(option);
 }
 if(!state.memberships.length){
  state.member=null;state.company=null;updateRole();return;
 }
 const remembered=localStorage.getItem('ndt-last-company-id');
 select.value=state.memberships.find(x=>x.company_id===remembered)?.company_id||
  state.memberships[0].company_id;
 await selectCompany(select.value);
}
async function selectCompany(id){
 const m=state.memberships.find(x=>x.company_id===id);
 if(!m)throw Error('Dit bedrijf behoort niet tot je actieve lidmaatschappen');
 state.member=m;state.mode='online';
 const companies=await state.api.select('companies',{filters:{id}});
 state.company=companies[0]??null;
 localStorage.setItem('ndt-last-company-id',id);
 localStorage.setItem('ndt-last-user-id',state.user.id);
 $('offlineCompanyId').value=id;$('offlineUserId').value=state.user.id;
 updateRole();
 await syncOnline();
 if(m.role==='admin')$('loadRequestsBtn').click();
}
$('companySelect').addEventListener('change',async e=>{
 try{state.cache?.close();state.cache=null;await selectCompany(e.target.value)}
 catch(err){fail(err)}
});
$('registerCompanyForm').addEventListener('submit',async e=>{
 e.preventDefault();try{
  if(!atOnline())throw Error('Log eerst online in');
  const result=await state.api.rpc('register_company',{
   p_name:selected('companyName'),p_admin_name:selected('adminName')});
  const company=Array.isArray(result)?result[0]:result;
  state.companyCode=company?.company_code;
  output('joinCodeOutput','Bedrijfscode: '+(state.companyCode||'onbekend')+
   '\nDeel deze alleen rechtstreeks met gemachtigde medewerkers.');
  notice('Nieuw bedrijf geregistreerd. Bewaar de code veilig.');
  await loadMemberships();setTab('account');
 }catch(err){fail(err)}
});
$('joinCompanyForm').addEventListener('submit',async e=>{
 e.preventDefault();try{
  if(!atOnline())throw Error('Log eerst online in');
  await state.api.rpc('request_company_join',{
   p_company_code:selected('companyCode').trim(),
   p_display_name:selected('staffName').trim(),
   p_certificate_code:selected('staffCertificate').trim()||null
  });
  notice('Toegang aangevraagd. Je Hoofdgebruiker moet deze aanvraag goedkeuren.');
 }catch(err){fail(err)}
});
$('loadRequestsBtn').addEventListener('click',async()=>{
 try{
  if(state.member?.role!=='admin'||!atOnline())throw Error('Alleen online Hoofdgebruiker');
  const rows=await state.api.select('join_requests',{
   filters:{company_id:state.member.company_id},order:'requested_at.desc'});
  const list=$('requestsList');list.replaceChildren();
  for(const row of rows){
   const entry=document.createElement('div');entry.className='item';
   const title=document.createElement('div');
   title.textContent=row.display_name+' · '+row.status+' · '+(row.certificate_code||'geen certificaatcode');
   entry.append(title);
   if(row.status==='pending'){
    for(const accepted of [true,false]){
     const btn=document.createElement('button');btn.type='button';
     btn.textContent=accepted?'Goedkeuren':'Afwijzen';btn.className=accepted?'':'ghost';
     btn.addEventListener('click',async()=>{
      try{await state.api.rpc('approve_company_join',{
       p_request_id:row.id,p_approve:accepted
      });notice('Aanvraag behandeld via Supabase RLS/RPC.');
      $('loadRequestsBtn').click()}catch(err){fail(err)}
     });entry.append(btn);
    }
   }
   list.append(entry);
  }
  if(!rows.length)list.textContent='Geen aanvragen';
 }catch(err){fail(err)}
});
async function saveRecord(table,data){
 if(!atOnline()||state.member?.role!=='admin')throw Error('Beheer alleen online voor admins');
 const payload={...data,company_id:state.member.company_id,created_by:state.user.id};
 await state.api.insert(table,payload);
 notice('Record opgeslagen in Supabase (administratieve status, geen RT-vrijgave).');
 await syncOnline();
}
function checkApprovalStatus(d){
 if(d.approval_status==='approved'&&!String(d.approval_reference||'').trim())
   throw Error('Een administratief goedgekeurd record heeft een referentie nodig');
}
$('tubeForm').addEventListener('submit',async e=>{
 e.preventDefault();try{
  const d=formData(e.target);checkApprovalStatus(d);
  await saveRecord('company_tubes',{
   name:d.name,manufacturer:d.manufacturer,model:d.model,
   serial_reference:d.serial_reference||null,
   generator_type:d.generator_type,beam_type:d.beam_type,
   max_kv:number(d.max_kv),max_ma:number(d.max_ma),
   focal_spot_mm:number(d.focal_spot_mm),
   approval_status:d.approval_status,approval_reference:d.approval_reference||null,
   research_factor:1,data:{referenceStatus:'NOT_TECHNICALLY_CALIBRATED'}
  });e.target.reset();
 }catch(err){fail(err)}
});
$('sourceForm').addEventListener('submit',async e=>{
 e.preventDefault();try{
  const d=formData(e.target);checkApprovalStatus(d);
  const dt=new Date(d.activity_reference_at);
  if(!Number.isFinite(dt.valueOf()))throw Error('Ongeldige bronreferentiedatum');
  await saveRecord('company_sources',{
   name:d.name,isotope:d.isotope,activity_ci:number(d.activity_ci),
   activity_reference_at:dt.toISOString(),source_reference:d.source_reference||null,
   approval_status:d.approval_status,approval_reference:d.approval_reference||null
  });e.target.reset();
 }catch(err){fail(err)}
});
$('procedureForm').addEventListener('submit',async e=>{
 e.preventDefault();try{
  const d=formData(e.target);checkApprovalStatus(d);
  await saveRecord('company_procedures',{
   name:d.name,revision:d.revision,procedure_reference:d.procedure_reference||null,
   data:{description:d.description||''},
   approval_status:d.approval_status,approval_reference:d.approval_reference||null
  });e.target.reset();
 }catch(err){fail(err)}
});
const approved=rows=>(rows||[]).filter(r=>r.approval_status==='approved');
function fillSelect(selectId,rows){
 const el=$(selectId);el.replaceChildren();
 const empty=document.createElement('option');empty.value='';
 empty.textContent='Kies vrijgegeven record';el.append(empty);
 for(const row of approved(rows)){
  const option=document.createElement('option');
  option.value=row.id;option.textContent=row.name;
  el.append(option);
 }
}
function renderField(){
 const snap=state.snapshot;
 fillSelect('fieldTube',snap?.tubes);
 fillSelect('fieldSource',snap?.sources);
 fillSelect('fieldProcedure',snap?.procedures);
 output('fieldStatus',!snap?'Geen goedgekeurde bedrijfsgegevens geladen':
  (state.mode==='offline'?STALE:'Synchronisatie geslaagd')+
  '\nLaatste sync: '+(snap.lastSync||'niet vastgelegd')+
  '\nBuis: '+approved(snap.tubes).length+
  ' · Bron: '+approved(snap.sources).length+
  ' · Procedure: '+approved(snap.procedures).length);
 $('adminTab').hidden=!(state.member?.role==='admin'&&atOnline());
 output('sourceDecay','Kies een gammabron voor uitsluitend informatieve vervalberekening.');
}
$('fieldSource').addEventListener('change',()=>{
 const row=state.snapshot?.sources?.find(x=>x.id===$('fieldSource').value);
 if(!row){output('sourceDecay','Geen bron gekozen');return}
 const r=gammaDecayPreview({
  isotope:row.isotope,activityCi:Number(row.activity_ci),
  referenceAt:row.activity_reference_at
 });
 output('sourceDecay',r.ok?
  row.name+' · '+row.isotope+
  '\nActiviteit (rekenkundig): '+r.activityCi.toFixed(4)+' Ci'+
  '\n'+r.warning:
  'Niet berekend: '+r.error);
});
$('fieldTube').addEventListener('change',()=>{
 const row=state.snapshot?.tubes?.find(x=>x.id===$('fieldTube').value);
 if(row?.focal_spot_mm)$('isoSpot').value=String(row.focal_spot_mm);
});
async function syncOnline(){
 if(!atOnline()||!state.member)throw Error('Online account en goedgekeurd bedrijf vereist');
 const id=state.member.company_id;
 const [tubes,sources,procedures]=await Promise.all([
  state.api.select('company_tubes',{filters:{company_id:id}}),
  state.api.select('company_sources',{filters:{company_id:id}}),
  state.api.select('company_procedures',{filters:{company_id:id}})
 ]);
 state.snapshot={companyId:id,companyName:state.company?.name??'Bedrijf',
  role:state.member.role,tubes,sources,procedures,lastSync:new Date().toISOString()};
 if(state.cache&&state.cache.companyId===id){
  await state.cache.saveSnapshot(state.snapshot);
  const draftLogs=await state.cache.draftLogs();
  let count=0;
  for(const row of draftLogs){
   if(row.company_id!==id||row.created_by!==state.user.id)continue;
   await state.api.insert('exposure_logs',row,{upsert:true});
   await state.cache.markSynced(row.client_id);count++;
  }
  output('cacheStatus','Gesynchroniseerd: '+state.snapshot.lastSync+
   (count?' · '+count+' conceptlog(s) geüpload':''));
 }
 renderField();
 notice('Online · Bedrijf '+state.snapshot.companyName+
  ' · '+(state.member.role==='admin'?'Hoofdgebruiker':'Personeel'));
}
$('syncBtn').addEventListener('click',async()=>{try{await syncOnline()}catch(err){fail(err)}});
async function unlock(online){
 const passphrase=$('offlinePassphrase').value,
  userId=online?state.user?.id:selected('offlineUserId').trim(),
  companyId=online?state.member?.company_id:selected('offlineCompanyId').trim();
 if(state.cache)state.cache.close();
 state.cache=await openOfflineCache({userId,companyId,passphrase,allowCreate:online});
 if(online){
  await syncOnline();
 }else{
  const snap=await state.cache.snapshot();
  if(!snap||snap.companyId!==companyId)throw Error('Geen eerder gesynchroniseerde bedrijfscache');
  state.user={id:userId};state.member={company_id:companyId,role:snap.role};
  state.company={id:companyId,name:snap.companyName};
  state.mode='offline';state.snapshot=snap;
  updateRole();renderField();setTab('field');
  notice(STALE);
 }
 output('cacheStatus','Versleutelde cache ontgrendeld. Laatste sync: '+
  (state.snapshot?.lastSync||'nog niet'));
 $('offlinePassphrase').value='';
}
$('offlineForm').addEventListener('submit',async e=>{
 e.preventDefault();try{await unlock(atOnline()&&Boolean(state.member))}
 catch(err){fail(err)}
});
$('offlineOpenBtn').addEventListener('click',async()=>{
 try{await unlock(false)}catch(err){fail(err)}
});
$('logForm').addEventListener('submit',async e=>{
 e.preventDefault();try{
  if(!state.cache||!state.user||!state.member)
   throw Error('Ontgrendel eerst je versleutelde bedrijfscache');
  const note=selected('workNote').trim(),ref=selected('workRef').trim();
  if(!ref)throw Error('Werkreferentie ontbreekt');
  const row={client_id:uuid(),company_id:state.member.company_id,
   created_by:state.user.id,status:'draft',
   details:{
    workReference:ref,note,
    tubeId:selected('fieldTube')||null,sourceId:selected('fieldSource')||null,
    procedureId:selected('fieldProcedure')||null,
    offlineCreatedAt:new Date().toISOString(),
    researchOnly:true,exposureAuthorised:false
   }};
  const count=await state.cache.queueDraftLog(row);
  output('logStatus','Concept lokaal versleuteld opgeslagen ('+count+' wachtend).'+
   (atOnline()?' Synchroniseer om te uploaden.':' Upload na nieuwe online aanmelding.'));
  e.target.reset();
 }catch(err){fail(err)}
});
for(const btn of document.querySelectorAll('[data-material]'))
 btn.addEventListener('click',()=>{
  state.material=btn.dataset.material;
  for(const t of document.querySelectorAll('[data-material]'))
   t.setAttribute('aria-pressed',String(t===btn));
 });
$('materialCalcBtn').addEventListener('click',()=>{
 const r=equivalentSteelPreview({
  material:state.material,mode:selected('materialMode'),
  thicknessMm:number(selected('materialThickness'))
 });
 output('materialOutput',r.ok?
  r.label+' · '+r.mode+' · voorgestelde factor '+r.factor+
  '\nHypothetische staaldikte: '+r.equivalentSteelMm.toFixed(3)+' mm'+
  '\n'+r.warning:'Geen geldige invoer');
});
$('isoCalcBtn').addEventListener('click',()=>{
 const r=isoFMinResearch({
  classification:selected('isoClass'),
  dMm:number(selected('isoSpot')),bMm:number(selected('isoB')),
  tMm:number(selected('isoT')),sfdMm:number(selected('isoSfd')),
  planarDefects:$('isoPlanar').checked
 });
 output('isoOutput',r.ok?
  'Klasse gebruikt: '+r.effectiveClass+
  '\nEffectieve b: '+r.effectiveBmm.toFixed(3)+' mm'+
  '\nf_min (onderzoek): '+r.fMinMm.toFixed(3)+' mm'+
  '\nWerkelijk f: '+r.actualFmm.toFixed(3)+' mm'+
  '\nVergelijking: '+r.comparison+'\n'+r.warning:
  'Geometrie niet berekend: '+r.error);
});
async function boot(){
 try{
  if('serviceWorker' in navigator){
   navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  $('offlineUserId').value=localStorage.getItem('ndt-last-user-id')||'';
  $('offlineCompanyId').value=localStorage.getItem('ndt-last-company-id')||'';
  if(!applyConfig()){notice('Supabase nog niet ingesteld — bekijk schermen of configureer je testproject');return}
  if(location.hash.includes('access_token=')){
   if(state.api.acceptMagicLinkHash(location.hash)){
    history.replaceState(null,'',location.pathname+location.search);
   }
  }
  if(state.api.token()&&navigator.onLine){
   try{await afterSignIn()}catch(err){notice('Online sessie kon niet worden vernieuwd. Offline cache ontgrendelen mogelijk.')}
  }else notice('Supabase ingesteld · meld aan of ontgrendel een bestaande offline cache.');
 }catch(err){fail(err)}
}
const workbenchUI=mountResearchWorkbench({
 isAuthenticated:()=>Boolean((atOnline()&&state.user?.id)||
  (state.mode==='offline'&&state.cache&&state.member?.company_id)),
 onLogin:()=>{
  setTab('account');
  $('email').focus();
  $('authMessage').textContent='De 50 gratis onderzoeksberekeningen zijn gebruikt of je kiest direct voor inloggen. Meld je aan of registreer een account.';
  $('authForm').scrollIntoView?.({behavior:'smooth',block:'start'});
 }
});
setTab('field');
updateRole();
boot();
