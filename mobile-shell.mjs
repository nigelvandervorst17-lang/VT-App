/**
 * Mobile navigation/auth/presentation bridge for the existing NDT research engine.
 * No exposure formula, reference data, validity range, IQI lookup or safety gate
 * is duplicated or modified here. Research only; server-side RLS stays authoritative.
 */
import {createSupabaseConnection,PUBLIC_CONFIG_KEY,SESSION_KEY} from './research/company-suite/supabase-rest.mjs';
import {DEFAULT_SUPABASE_PROJECT} from './research/company-suite/project-config.mjs';
import {businessEmailDomain} from './company-domain.mjs';
import {installRtFieldExtras} from './rt-field-extras.mjs';
import {trialCounter,TRIAL_MAX} from './research/company-suite/trial-50.mjs';

const $=id=>document.getElementById(id);
const TRIAL_CHOICE='ndt-ui-trial-choice-v1';
const OFFLINE_READY='ndt-offline-cache-ready-v1';
const normalizeEntryEmail=value=>String(value??'').trim().replace(/\.+$/, '');

const ASSET_TRANSFER='ndt-main-asset-selection-v1';
const trial=trialCounter();
const state={api:null,user:null,mode:'initializing',timer:null,signature:null,lastCounted:null};
const get=(store,key)=>{try{return store?.getItem(key)||null}catch{return null}};
const put=(store,key,value)=>{try{store?.setItem(key,value);return true}catch{return false}};
const remove=(store,key)=>{try{store?.removeItem(key)}catch{}};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
function config(){
 let saved=null;
 try{saved=JSON.parse(get(localStorage,PUBLIC_CONFIG_KEY)||'null')}catch{}
 return saved?.url&&saved?.key?saved:DEFAULT_SUPABASE_PROJECT;
}
function api(){
 if(!state.api)state.api=createSupabaseConnection(config());
 return state.api;
}
function status(text,kind='info'){
 const feedback=$('ndtEntryStatus');if(!feedback)return;
 feedback.textContent=text;
 feedback.dataset.kind=kind;
}
function modeLabel(){
 if(state.user?.email)return state.user.email;
 if(state.mode==='trial')return 'Gratis proefversie · '+trial.status().remaining+' van '+TRIAL_MAX+' over';
 if(state.mode==='offline-session')return 'Offline · sessie niet online geverifieerd';
 return 'Niet aangemeld';
}
function connection(){
 const el=$('ndtConnStatus');if(!el)return;
 const offline=!navigator.onLine||state.mode==='offline-session';
 el.dataset.offline=String(offline);
 const bunker=get(sessionStorage,'ndt-offline-workspace-v1')==='unlocked';
 el.textContent=offline?(bunker?'Offline Bunker':'Offline'):'Online';
 if($('ndtAccountEmail'))$('ndtAccountEmail').textContent=modeLabel();
}
function showMain(mode){
 state.mode=mode;
 document.body.classList.toggle('ndt-verified-session',mode==='signed-in');
 document.body.classList.toggle('ndt-demo-session',mode==='trial');
 const safety=$('ndtResearchCompactDisclaimer');
 if(safety)safety.textContent=mode==='signed-in'?'Veiligheidsinformatie · Niet vrijgegeven voor werkelijke RT-belichtingen. Controleer procedure, actuele brongegevens, IQI en veiligheidsmaatregelen.':'ONDERZOEKSVERSIE · Niet vrijgegeven voor werkelijke RT-belichtingen. Controleer procedure, actuele brongegevens, IQI en veiligheidsmaatregelen.';
 $('ndtEntryGate').hidden=true;
 document.documentElement.classList.remove('ndt-entry-loading');
 document.body.classList.remove('ndt-entry-active');
 document.body.classList.add('ndt-mobile-live');
 connection();
 document.querySelector('.bottom-nav [data-nav="calc"]')?.click();
 renderSticky();
 window.dispatchEvent(new CustomEvent('ndt-auth-scope-changed',{detail:{mode,email:state.user?.email||null}}));
 updateHeaderContext();
}
async function hasEncryptedOfflineCache(){
 if(get(localStorage,OFFLINE_READY))return true;
 const userId=get(localStorage,'ndt-last-user-id');
 const companyId=get(localStorage,'ndt-last-company-id');
 if(!/^[a-f0-9-]{36}$/i.test(userId||'')||!/^[a-f0-9-]{36}$/i.test(companyId||''))return false;
 if(!globalThis.indexedDB)return false;
 return new Promise(resolve=>{
  try{
   const request=indexedDB.open('ndt-company-offline-v1');
   request.onerror=()=>resolve(false);
   request.onsuccess=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains('records')){db.close();resolve(false);return;}
    const tx=db.transaction('records','readonly');
    const meta=tx.objectStore('records').get('ndt:'+userId+':'+companyId+':meta');
    meta.onsuccess=()=>{const exists=Boolean(meta.result?.check);db.close();resolve(exists);};
    meta.onerror=()=>{db.close();resolve(false);};
   };
  }catch{resolve(false);}
 });
}

function showGate(reason=''){
 state.mode='signed-out';state.user=null;
 document.body.classList.remove('ndt-verified-session','ndt-demo-session');
 updateHeaderContext();
 window.dispatchEvent(new CustomEvent('ndt-auth-scope-changed',{detail:{mode:'signed-out'}}));
 document.documentElement.classList.add('ndt-entry-loading');
 document.body.classList.add('ndt-entry-active');
 $('ndtEntryGate').hidden=false;
 $('ndtEntryOffline').hidden=true;
 hasEncryptedOfflineCache().then(found=>{
  if(state.mode==='signed-out')$('ndtEntryOffline').hidden=!found;
 });
 $('ndtAccountMenu').hidden=true;
 $('ndtEntryPassword').value='';
 status(reason||'Log in of kies de gratis proefversie.');
 connection();
 renderSticky();
}
async function bootAuth(){
 try{
  const session=api().restore();
  const chosen=get(localStorage,TRIAL_CHOICE);
  if(session){
   if(!navigator.onLine){
    showMain('offline-session');return;
   }
   try{
    state.user=await Promise.race([
     api().user(),
     new Promise((_,reject)=>setTimeout(()=>reject(Error('Netwerkcontrole verlopen')),6000))
    ]);
    if(state.user?.id){showMain('signed-in');return;}
   }catch(err){
    // No live authorization when offline. A network outage may still allow
    // the local research calculator, but company data stays protected.
    const msg=String(err?.message||err);
    if(!navigator.onLine||/failed to fetch|network|netwerk|load failed|time.?out|verbinding/i.test(msg)){
     showMain('offline-session');return;
    }
   }
  }
  if(chosen==='trial')showMain('trial');
  else if(get(sessionStorage,'ndt-offline-workspace-v1')==='unlocked'&&get(localStorage,OFFLINE_READY))showMain('offline-session');
  else showGate('Meld je aan om je bedrijfsgegevens te gebruiken, of kies de proefversie.');
 }catch{
  if(get(localStorage,TRIAL_CHOICE)==='trial')showMain('trial');
  else showGate('Aanmelden is tijdelijk niet beschikbaar. Proefversie blijft mogelijk.');
 }
}
let currentRoleLabel='';
function updateHeaderContext(){
 const field=$('ndtActiveAccountContext');if(!field)return;
 const bon=typeof window.ndtWorkbonContext==='function'?window.ndtWorkbonContext():null;
 const loggedIn=state.mode==='signed-in';
 field.hidden=!loggedIn;
 field.textContent=!loggedIn?'':bon?.bonnummer?
  'Bon '+bon.bonnummer+' · '+(bon.klant||'Onderzoeker'):
  currentRoleLabel||'Bedrijfsaccount · '+(state.user?.email||'aangemeld');
}
window.addEventListener('ndt-planning-role-ready',event=>{
 currentRoleLabel=event.detail?.label||'';updateHeaderContext();
});
window.addEventListener('ndt-active-workbon-changed',updateHeaderContext);
function closeMenu(){$('ndtAccountMenu').hidden=true;$('ndtAccountButton').setAttribute('aria-expanded','false');}
function initAuth(){
 const entryForm=$('ndtEntryForm');
 const emailInput=$('ndtEntryEmail'),passwordInput=$('ndtEntryPassword');
 const loginButton=$('ndtEntrySubmit'),registerButton=$('ndtEntryRegister');
 const registerLink=$('ndtEntryRegisterLink'),demoButton=$('ndtEntryTrial');
 let registering=false;
 const setRegisterView=next=>{
  registering=Boolean(next);
  registerButton.hidden=!registering;
  loginButton.hidden=registering;
  demoButton.hidden=registering;
  registerLink.textContent=registering?'Al een account? Terug naar Inloggen':
   'Nog geen account? Nieuw account registreren (klaar binnen 1 minuut)';
  registerLink.setAttribute('aria-expanded',String(registering));
  status(registering?'Vul je bedrijfs-e-mailadres en een wachtwoord van minimaal 6 tekens in.':
   'Vul je e-mailadres en wachtwoord in.');
 };
 registerLink.addEventListener('click',()=>setRegisterView(!registering));
 window.addEventListener('ndt-auth-scope-changed',event=>{
  if(event.detail?.mode==='signed-out')setRegisterView(false);
 });
 // The project uses its existing lightweight Supabase Auth REST client rather
 // than loading another browser SDK. This is the same Auth /signup endpoint.
 const supabase={auth:{
  signUp:({email,password})=>api().signUp(email,password)
 }};
 const normalizedEmail=()=>{
  emailInput.value=normalizeEntryEmail(emailInput.value);
  return emailInput.value;
 };
 emailInput.addEventListener('blur',normalizedEmail);
 const validate=(email,password)=>{
  const missing=!email||!password||password.length<6;
  const malformed=!missing&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||emailInput.validity.typeMismatch);
  emailInput.setAttribute('aria-invalid',String(!email||malformed));
  passwordInput.setAttribute('aria-invalid',String(!password||password.length<6));
  if(missing)return 'Vul een e-mailadres en wachtwoord van minimaal 6 tekens in.';
  if(malformed)return 'Vul een geldig e-mailadres in.';
  if(registering&&!businessEmailDomain(email))return 'Gebruik een zakelijk e-mailadres (geen Gmail, Hotmail of vergelijkbaar).';
  return '';
 };
 const lockEntry=(busy,button)=>{
  loginButton.disabled=busy;registerButton.disabled=busy;
  if(button)button.textContent=busy?'Bezig...':button===loginButton?'Inloggen':'Account registreren';
 };
 const entryValues=()=>{
  const email=normalizedEmail(),password=passwordInput.value;
  const message=validate(email,password);
  if(message){status(message,'error');return null;}
  return {email,password};
 };
 for(const input of [emailInput,passwordInput]){
  input.addEventListener('input',()=>{
   if($('ndtEntryStatus')?.dataset.kind==='error')status('','info');
   input.removeAttribute('aria-invalid');
  });
 }
 entryForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const values=entryValues();if(!values)return;
  lockEntry(true,loginButton);status('Inloggen...','busy');
  try{
   await api().signIn(values.email,values.password);
   state.user=await api().user();
   if(!state.user?.id)throw Error('Je identiteit kon niet worden gecontroleerd.');
   remove(localStorage,TRIAL_CHOICE);
   passwordInput.value='';
   showMain('signed-in');
  }catch(err){status('Inloggen mislukt: '+String(err?.message||err),'error');}
  finally{lockEntry(false,loginButton);passwordInput.value='';}
 });
 registerButton.addEventListener('click',async()=>{
  const values=entryValues();if(!values)return;
  lockEntry(true,registerButton);status('Accountregistratie verwerken...','busy');
  try{
   const response=await supabase.auth.signUp({email:values.email,password:values.password});
   if(!response||response.error)throw Error(response?.error?.message||'De registratie werd niet bevestigd door Supabase.');
   status('Account aangemaakt! Controleer je e-mail om te bevestigen.','success');
  }catch(err){status('Registratie mislukt: '+String(err?.message||err),'error');}
  finally{lockEntry(false,registerButton);passwordInput.value='';}
 });
 $('ndtEntryTrial').addEventListener('click',()=>{
  if(!trial.status().ok){status('De proefregistratie is niet beschikbaar op dit toestel.');return;}
  if(!put(localStorage,TRIAL_CHOICE,'trial')){
   status('De proefkeuze kan niet lokaal worden onthouden. Controleer je browserinstellingen.');return;
  }
  showMain('trial');
 });
 $('ndtEntryOffline').addEventListener('click',()=>{
  location.href='./research/company-suite/index.html#offline';
 });
 $('ndtAccountButton').addEventListener('click',()=>{
  const menu=$('ndtAccountMenu');menu.hidden=!menu.hidden;
  $('ndtAccountButton').setAttribute('aria-expanded',String(!menu.hidden));connection();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
 document.addEventListener('click',e=>{
  if(!$('ndtAccountMenu').hidden&&!$('ndtAccountMenu').contains(e.target)&&!$('ndtAccountButton').contains(e.target))closeMenu();
 });
 for(const id of ['ndtSwitchAccount','ndtSignOut'])$(id).addEventListener('click',async()=>{
  const wasOnline=navigator.onLine;
  try{if(wasOnline)await api().signOut();else api().clear();}
  catch{api().clear();}
  remove(localStorage,TRIAL_CHOICE);
  remove(sessionStorage,ASSET_TRANSFER);
  remove(sessionStorage,'ndt-offline-workspace-v1');
  window.dispatchEvent(new Event('ndt-private-naslag-logout'));
  state.user=null;state.api=null;state.signature=null;state.lastCounted=null;
  currentRoleLabel='';showGate('Uitgelogd. De versleutelde offline cache is behouden; deze blijft afgesloten.');
 });
 $('ndtEraseOffline').addEventListener('click',async()=>{
  if(!confirm('Alle versleutelde bedrijfsgegevens op dit toestel verwijderen? Dit verwijdert ook nog niet gesynchroniseerde conceptlogs.'))return;
  try{
   if('indexedDB' in window){
    await new Promise((resolve,reject)=>{
     const req=indexedDB.deleteDatabase('ndt-company-offline-v1');
     req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);
     req.onblocked=()=>reject(Error('Sluit andere open app-tabbladen en probeer opnieuw.'));
    });
   }
   for(const key of [OFFLINE_READY,'ndt-last-user-id','ndt-last-company-id'])remove(localStorage,key);
   $('ndtEntryOffline').hidden=true;connection();
   alert('Versleutelde offline bedrijfsgegevens zijn van dit toestel gewist.');
  }catch(err){alert('Offline gegevens konden niet worden gewist: '+String(err?.message||err));}
 });
 window.addEventListener('online',()=>{connection();if(state.mode==='offline-session')bootAuth();});
 window.addEventListener('offline',()=>{connection();if(state.mode==='signed-in')state.mode='offline-session';});
 bootAuth();
}

/** Keep the exact existing validation and result messages. Never produce times here. */
function renderSticky(pending=false){
 const sticky=$('stickyOutcome'),card=$('resultCard');
 if(!sticky||!card)return;
 const active=!$('screen-calc').hidden&&state.mode!=='signed-out';
 sticky.hidden=!active;
 if(!active)return;
 const ok=card.classList.contains('success');
 const blocked=card.classList.contains('blocked');
 sticky.classList.toggle('sticky-error',blocked);
 if(pending){
  $('stickyLabel').textContent='Invoer gewijzigd · onderzoek';
  $('stickyTime').textContent='—';
  $('ndtStickyReason').textContent='Onderzoeksberekening wordt bijgewerkt. Nog geen actuele uitkomst.';
  $('ndtStickyFe').textContent='Fe-equivalent: —';
  $('ndtSaveToLog').disabled=true;
  return;
 }
 $('stickyLabel').textContent=ok?'ONDERZOEKSUITKOMST · GEEN VRIJGAVE':blocked?'BEREKENING GEBLOKKEERD':'Onderzoeksberekening';
 $('stickyTime').textContent=ok?$('resultTime').textContent:'—';
 const src=$('rtCompactXray')?.getAttribute('aria-pressed')==='true'?'X-ray':'Gamma';
 $('stickyNote').textContent=state.mode==='trial'?src+' · proef '+trial.status().remaining+'/'+TRIAL_MAX+' over':src+' · onderzoek';
 $('ndtStickyReason').textContent=(ok||blocked)?$('resultReason').textContent:'Wijzig een veld om met de bestaande calculator te rekenen.';
 const fe=ok?Number(card.dataset.feEquivalent):NaN;
 $('ndtStickyFe').textContent=Number.isFinite(fe)&&fe>0?'Fe-equivalent: '+fe.toLocaleString('nl-NL',{maximumFractionDigits:3})+' mm':'Fe-equivalent: —';
 $('ndtSaveToLog').disabled=!ok||$('saveResult')?.disabled===true;
}
function inputSignature(){
 const ids=['workWall','workOutside','workPenetrated','film','density','distance','manualCi','certCi','certDate','referenceDate','material','ma','kv','xrayBrand','xrayModel','rtMaterialCustomFactor'];
 const values=ids.map(id=>$(id)?.value||'');
 values.push(document.querySelector('input[name="isotope"]:checked')?.value||'');
 values.push(document.querySelector('input[name="activityMode"]:checked')?.value||'');
 values.push($('modeGamma')?.getAttribute('aria-pressed')||'');
 values.push($('workPipe')?.getAttribute('aria-pressed')||'');
 return JSON.stringify(values);
}
function blockTrial(){
 const sticky=$('stickyOutcome');
 if(sticky){
  sticky.hidden=false;
  sticky.classList.add('sticky-error');
  $('stickyLabel').textContent='PROEFVERSIE AFGELOPEN';
  $('stickyTime').textContent='—';
  $('ndtStickyReason').textContent='De 50 gratis onderzoeksberekeningen zijn gebruikt. Meld je aan om verder te gaan.';
  $('ndtStickyFe').textContent='Fe-equivalent: —';
  $('ndtSaveToLog').disabled=true;
 }
}
function runExisting(){
 if(!window.basicRTAppReady||$('screen-calc').hidden||document.body.classList.contains('ndt-entry-active'))return;
 const signature=inputSignature();
 if(signature===state.signature)return;
 state.signature=signature;
 if(state.mode==='trial'&&(!trial.status().ok||trial.status().remaining===0)){blockTrial();return;}
 $('calculate')?.click(); // Existing app.mjs checks and safety blocks remain the only engine.
 renderSticky();
}
function schedule(){
 if(state.timer)clearTimeout(state.timer);
 renderSticky(true);
 state.timer=setTimeout(()=>{state.timer=null;runExisting();},700);
}
function makeIqiCompact(){
 const section=$('rtCompactIqiQuick');
 if(!section||section.querySelector('.ndt-iqi-accordion'))return;
 const wrapper=document.createElement('details');wrapper.className='ndt-iqi-accordion';
 const summary=document.createElement('summary');summary.textContent='▸ IQI Snelcontrole';
 const content=document.createElement('div');content.className='ndt-iqi-accordion-body';
 while(section.firstChild)content.append(section.firstChild);
 wrapper.append(summary,content);section.append(wrapper);
 wrapper.addEventListener('toggle',()=>{summary.textContent=wrapper.open?'▾ IQI Snelcontrole':'▸ IQI Snelcontrole'});
}
function compactLongWarnings(){
 const pairs=[
  [$('rtCompactPipeCaution'),'ⓘ Controleer werkelijke buisgeometrie'],
  [$('densityHelp'),'ⓘ Ondersteunde filmzwarting en curvegrenzen'],
  [$('workShapePanel')?.querySelector('.workshape-caution'),'ⓘ Controle van dubbelwandige geometrie']
 ];
 for(const [warning,title] of pairs){
  if(!warning||warning.parentElement?.classList.contains('ndt-warning-detail'))continue;
  const wrap=document.createElement('details');wrap.className='ndt-warning-detail';
  const summary=document.createElement('summary');summary.textContent=title;
  warning.before(wrap);wrap.append(summary,warning);
 }
}
function moveAiConfig(){
 const configPanel=$('aiConfigDetails')?.closest('.ai-config');
 const settings=$('screen-settings');
 if(!configPanel||!settings||settings.contains(configPanel))return;
 const heading=document.createElement('h2');heading.textContent='AI Expert · verbindingsinstellingen';
 configPanel.prepend(heading);
 settings.append(configPanel);
 const shortcuts=$('ndtSettingsLinks');
 if(shortcuts){
  for(const [url,text] of [['./research/company-suite/index.html','Bedrijfsgegevens en offline bunker'],['./procedure-suite.html','Procedure Suite']]){
   const link=document.createElement('a');link.href=url;link.textContent=text;shortcuts.append(link);
  }
 }
}
async function saveCompanyDraft(){
 if(state.mode!=='signed-in'||!navigator.onLine)return false;
 const me=await api().user();
 if(!me?.id)throw Error('Gebruiker niet opnieuw geverifieerd');
 const members=(await api().select('company_members',{filters:{user_id:me.id}})).filter(m=>m.active);
 const chosen=get(localStorage,'ndt-last-company-id');
 const member=members.find(m=>m.company_id===chosen)||members[0];
 if(!member)throw Error('Geen actief bedrijf gekoppeld');
 const gamma=$('modeGamma')?.getAttribute('aria-pressed')==='true';
 const detail={
  workReference:'Onderzoeksberekening '+new Date().toISOString(),
  researchOnly:true,exposureAuthorised:false,
  calculationStatus:'RESEARCH_ONLY_NOT_VALIDATED',
  source:gamma?document.querySelector('input[name="isotope"]:checked')?.value:$('xrayModel')?.value,
  modality:gamma?'gamma':'xray',
  thicknessMm:$('thickness')?.value||'',
  material:$('material')?.value||'',
  film:$('film')?.value||'',
  density:$('density')?.value||'',
  distanceMm:$('distance')?.value||'',
  activityMode:gamma?document.querySelector('input[name="activityMode"]:checked')?.value:null,
  activityCiInput:gamma?$('manualCi')?.value:null,
  certificateDate:gamma?$('certDate')?.value:null,
  kv:gamma?null:$('kv')?.value,
  ma:gamma?null:$('ma')?.value,
  researchResult:$('resultTime')?.textContent||'',
  researchWarning:$('resultReason')?.textContent||''
 };
 // The existing Supabase insert and per-company RLS remain authoritative.
 await api().insert('exposure_logs',{
  client_id:crypto.randomUUID(),company_id:member.company_id,created_by:me.id,
  status:'draft',details:detail
 });
 return true;
}

function initCalc(){
 const calculate=$('calculate');
 if(!calculate)return;
 // Guard even programmatic clicks from AI tools when the guest preview is exhausted.
 calculate.addEventListener('click',event=>{
  if(state.mode==='trial'&&(!trial.status().ok||trial.status().remaining<=0)){
   event.preventDefault();event.stopImmediatePropagation();blockTrial();
  }
 },true);
 // Place the selector beside the relevant top input, not below all fields.
 $('rtCompactActivity')?.closest('.rt-compact-field')?.after($('ndtChooseAsset'));
 makeIqiCompact();compactLongWarnings();moveAiConfig();installRtFieldExtras();
 $('ndtSaveToLog').addEventListener('click',async()=>{
  const save=$('ndtSaveToLog');
  if($('saveResult')?.disabled)return;
  save.disabled=true;
  $('saveResult').click(); // Existing local record, not a company authorization.
  $('ndtStickyReason').textContent='Lokaal onderzoeksrecord opgeslagen. Bedrijfslogboek controleren…';
  try{
   const online=await saveCompanyDraft();
   $('ndtStickyReason').textContent=online?
    'Onderzoeksrecord lokaal en als bedrijfsconcept opgeslagen. Geen technische RT-vrijgave.':
    'Onderzoeksrecord lokaal opgeslagen. Voor een bedrijfslogboek: online aanmelden of de versleutelde offline bunker openen.';
  }catch(err){
   $('ndtStickyReason').textContent='Lokaal onderzoeksrecord opgeslagen. Bedrijfslogboek niet bijgewerkt: '+String(err?.message||err);
  }finally{save.disabled=$('saveResult')?.disabled===true;}
 });
 const relevant=new Set(['rtCompactActivity','rtCompactThickness','rtCompactOutside','rtCompactWall','rtCompactFilm','rtCompactDistance','rtCompactDensity','rtCompactKv',
  'workWall','workOutside','workPenetrated','film','density','distance','manualCi','certCi','certDate','referenceDate','material','ma','kv','xrayBrand','xrayModel','rtMaterialCustomFactor']);
 $('screen-calc').addEventListener('input',e=>{if(relevant.has(e.target?.id))schedule()});
 $('screen-calc').addEventListener('change',e=>{
  if(relevant.has(e.target?.id)||e.target?.matches('input[name="isotope"],input[name="activityMode"]'))schedule();
 });
 for(const id of ['modeGamma','modeXray','rtCompactSe','rtCompactIr','rtCompactXray','workPlate','workPipe','rtCompactPlate','rtCompactPipe'])
  $(id)?.addEventListener('click',()=>setTimeout(schedule,0));
 document.querySelectorAll('.bottom-nav [data-nav],#moreMenu [data-nav]').forEach(b=>
  b.addEventListener('click',()=>setTimeout(()=>renderSticky(),30)));
 window.addEventListener('ndt-result',()=>{
  const sig=inputSignature();
  if(state.mode==='trial'&&$('resultCard').classList.contains('success')&&sig!==state.lastCounted){
   const used=trial.consume();
   if(!used.allowed){blockTrial();return;}
   state.lastCounted=sig;connection();
  }
  renderSticky();
 });
 window.addEventListener('ndt-result-cleared',()=>renderSticky(true));
 renderSticky();
}
/** Company selection is authorized online by Supabase Auth + RLS; offline only after separate cache unlock. */
function assign(id,value){
 const el=$(id);if(!el)return;
 el.value=String(value??'');
 for(const event of ['input','change'])el.dispatchEvent(new Event(event,{bubbles:true}));
}
function radio(name,value){
 const el=document.querySelector('input[name="'+name+'"][value="'+value+'"]');
 if(!el)return false;
 el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
function applySource(row,offline=false){
 if(!['Se-75','Ir-192'].includes(row?.isotope))return 'De geselecteerde isotoop wordt niet ondersteund.';
 if($('modeGamma')?.getAttribute('aria-pressed')!=='true')$('modeGamma').click();
 radio('isotope',row.isotope);
 const ci=Number(row.activity_ci);
 const reference=String(row.activity_reference_at||'').slice(0,10);
 if(Number.isFinite(ci)&&ci>0&&/^\d{4}-\d{2}-\d{2}$/.test(reference)){
  radio('activityMode','certificate');
  assign('certCi',ci);assign('certDate',reference);assign('referenceDate',today());
  // app.mjs calculates activity with the ORIGINAL certificateActivity() validation.
 }else{
  radio('activityMode','manual');assign('manualCi','');
 }
 schedule();
 return (offline?'OFFLINE CACHE · Verouderde gegevens mogelijk. ':'')+
  'Bron gekozen. Controleer certificaat, datum, actuele activiteit, geometrie en procedure. Administratieve goedkeuring is geen RT-vrijgave.';
}
function normalize(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function applyTube(row,offline=false){
 if($('modeXray')?.getAttribute('aria-pressed')!=='true')$('modeXray').click();
 const brand=$('xrayBrand');
 const actual=[...brand.options].find(o=>normalize(o.value)===normalize(row.manufacturer));
 if(actual)assign('xrayBrand',actual.value);
 const model=$('xrayModel');
 const wanted=[row.model,row.manufacturer+' '+row.model].map(normalize);
 const matched=actual?[...model.options].find(o=>wanted.includes(normalize(o.value))):null;
 if(matched)assign('xrayModel',matched.value);
 else{
  // Never silently keep a different existing model's curve.
  const unsupported=document.createElement('option');
  unsupported.value='';unsupported.textContent='Geen passende toestelcurve';model.prepend(unsupported);
  assign('xrayModel','');
 }
 schedule();
 return (offline?'OFFLINE CACHE · Niet actueel gecontroleerd. ':'')+
  (matched?'Exact toestelmodel gekozen. Controleer kV, mA en grafiekvoorwaarden zelf.':'Voor deze buis is geen exact gekoppelde toestelcurve aanwezig: geen onderzoeksuitkomst.')+
  ' Max. kV/mA zijn toestelgrenzen, geen voorgestelde opname-instellingen.';
}
function option(parent,title,subtitle,handler){
 const b=document.createElement('button');b.type='button';
 const top=document.createElement('strong'),sub=document.createElement('small');
 top.textContent=title;sub.textContent=subtitle;
 b.append(top,sub);b.addEventListener('click',()=>{
  const notice=handler();
  $('ndtAssetDialog').close();
  $('ndtAssetNote').textContent=notice;
  $('ndtAssetNote').hidden=false;
  document.querySelector('.nav[data-nav="calc"]')?.click();
 });parent.append(b);
}
async function openPicker(){
 const dlg=$('ndtAssetDialog'),list=$('ndtAssetList');
 list.replaceChildren();$('ndtAssetState').textContent='Bronnen en toestellen worden gecontroleerd…';
 dlg.showModal();
 const localInventory=(()=>{try{return JSON.parse(get(localStorage,'basic-rt31-source-inventory')||'[]')}catch{return []}})();
 if(Array.isArray(localInventory))for(const row of localInventory.slice(0,50)){
  if(!['Se-75','Ir-192'].includes(row.iso))continue;
  option(list,row.name+' · '+row.iso,'Lokaal bronregister · activiteit moet opnieuw worden gecontroleerd',()=>{
   if($('modeGamma').getAttribute('aria-pressed')!=='true')$('modeGamma').click();
   radio('isotope',row.iso);
   radio('activityMode','manual');assign('manualCi','');
   schedule();return 'Lokale bron gekozen. Voer de actuele certificaatactiviteit zelf in; geen automatische vrijgave.';
  });
 }
 if(!navigator.onLine||state.mode!=='signed-in'){
  $('ndtAssetState').textContent='Bedrijfsgegevens alleen online na gecontroleerde login of via ontgrendelde offline bunker. Lokaal bronregister is niet technisch goedgekeurd.';
  return;
 }
 try{
  state.user=await api().user();
  const memberships=(await api().select('company_members',{filters:{user_id:state.user.id}})).filter(m=>m.active);
  const last=get(localStorage,'ndt-last-company-id');
  const member=memberships.find(m=>m.company_id===last)||memberships[0];
  if(!member){$('ndtAssetState').textContent='Nog geen actieve bedrijfstoegang.';return;}
  const [sources,tubes]=await Promise.all([
   api().select('company_sources',{filters:{company_id:member.company_id}}),
   api().select('company_tubes',{filters:{company_id:member.company_id}})
  ]);
  const approved=rows=>rows.filter(r=>r.approval_status==='approved');
  for(const row of approved(sources))option(list,row.name+' · '+row.isotope,'Bedrijf · administratief goedgekeurd, technisch niet vrijgegeven',()=>applySource(row));
  for(const row of approved(tubes))option(list,row.name+' · '+row.model,'Bedrijf · toestelcurve moet exact overeenkomen',()=>applyTube(row));
  $('ndtAssetState').textContent=(approved(sources).length+approved(tubes).length)+' administratief goedgekeurde bedrijfsbronnen en -toestellen gevonden. Controleer altijd certificaten en vrijgave.';
 }catch(err){
  $('ndtAssetState').textContent='Bedrijfsgegevens niet geladen: '+String(err?.message||err);
 }
}
function consumeTransferredAsset(){
 const raw=get(sessionStorage,ASSET_TRANSFER);
 if(!raw)return;
 remove(sessionStorage,ASSET_TRANSFER);
 try{
  const transfer=JSON.parse(raw);
  if(!transfer?.row||!['source','tube'].includes(transfer.type))return;
  // A transfer only pre-fills research inputs; never authorizes company access.
  const note=transfer.type==='source'?applySource(transfer.row,transfer.offline):applyTube(transfer.row,transfer.offline);
  $('ndtAssetNote').textContent=note;
  $('ndtAssetNote').hidden=false;
 }catch{}
}
function init(){
 initAuth();
 initCalc();
 $('ndtChooseAsset').addEventListener('click',openPicker);
 $('ndtAssetClose').addEventListener('click',()=>$('ndtAssetDialog').close());
 consumeTransferredAsset();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
