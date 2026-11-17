/**
 * Agenda, universal work orders, procedure metadata, per-user draft shot logs and mail.
 * UI-only integration: reads the existing result and writes only existing input controls.
 * No exposure engine, material, IQI or safety formula is imported or modified.
 */
import {createSupabaseConnection,PUBLIC_CONFIG_KEY} from './research/company-suite/supabase-rest.mjs';
import {DEFAULT_SUPABASE_PROJECT} from './research/company-suite/project-config.mjs';
import {localISODate,normalizeStatus,sanitizeBon,proceduresForStore,findProcedure,
 procedurePrefill,makeStore,safeUserScope,NO_RT_RELEASE,buildReport,reportMailto} from './planning-data.mjs';
import {extractBonText,parseBonViaGemini,setupBonTurnstile} from './workbon-reader.mjs';

const $=id=>document.getElementById(id);
const state={scope:null,user:null,store:null,data:null,filter:'today',search:'',loading:false};
const msg=(content,isError=false)=>{
 const el=$('planningNotice');if(!el)return;
 el.textContent=content;el.dataset.error=String(isError);
};
const importMsg=(content,isError=false)=>{
 const el=$('planningImportStatus');if(!el)return;
 el.textContent=content;el.dataset.error=String(isError);
};
function config(){
 let saved=null;try{saved=JSON.parse(localStorage.getItem(PUBLIC_CONFIG_KEY)||'null');}catch{}
 return saved?.url&&saved?.key?saved:DEFAULT_SUPABASE_PROJECT;
}
function el(tag,cls,text){
 const node=document.createElement(tag);if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);return node;
}
function userNotice(){
 return 'Werkbonnen blijven lokaal in deze browser per account opgeslagen. Geen synchronisatie of versleuteling. Deel dit toestel niet zonder je lokale gegevens te wissen.';
}
function activeBon(){
 return state.data?.workbonnen.find(b=>b.id===state.data.activeId)||null;
}
function persist(){
 if(!state.store||!state.data)return false;
 try{state.data=state.store.save(state.data);return true;}
 catch(e){msg('Opslaan mislukt op dit toestel: '+String(e?.message||e),true);return false;}
}
async function openScope(){
 if(state.loading)return;
 state.loading=true;
 try{
  let scope=null,user=null;
  const api=createSupabaseConnection(config());
  if(api.restore()){
   if(!navigator.onLine)throw Error('Persoonlijke planning vereist online sessiecontrole. De calculator blijft offline beschikbaar.');
   user=await api.user();scope=safeUserScope(user?.id);
   if(!scope)throw Error('Geen verifieerbaar gebruikersaccount. Log opnieuw in.');
  }else if(localStorage.getItem('ndt-ui-trial-choice-v1')==='trial')scope='trial';
  else throw Error('Log in of start de proefversie om je planning te bekijken.');
  if(state.scope!==scope){
   state.scope=scope;state.user=user;state.store=makeStore(localStorage,scope);
   state.data=state.store.read();
  }else state.user=user;
  msg((scope==='trial'?'Proefplanning · ':'Mijn planning · ')+userNotice());
  render();
 }catch(error){
  // Never show data belonging to a previous user while the new session is unresolved.
  state.scope=null;state.user=null;state.store=null;state.data=null;
  render();msg(String(error?.message||error),true);
 }finally{state.loading=false;}
}
function openPlanning(){
 state.filter='today';$('planningSearch').value='';state.search='';
 document.querySelector('.bottom-nav [data-nav="planning"]')?.click();
}
function procedureFor(bon){
 return findProcedure(state.data?.procedures||[],bon?.procedure_code,bon?.revisie);
}
function procedureText(bon){
 const ref=bon.procedure_code?bon.procedure_code+(bon.revisie?' Rev. '+bon.revisie:''):'Geen procedure';
 return ref;
}
function renderActive(){
 const bon=activeBon(),bar=$('planningActiveBar'),records=$('planningRecordsSummary');
 bar.hidden=!bon;
 const label=bon?'Actief: Bon '+(bon.bonnummer||'—')+' · '+(bon.klant||'—')+' ('+procedureText(bon)+')':'';
 if(bon){
  $('planningActiveLabel').textContent=label;
  const missing=[!bon.geometrie?'geometrie':null,!bon.techniek?'opnametechniek':null,!bon.wanddikte_mm?'wanddikte':null].filter(Boolean);
  $('planningActiveWarning').hidden=missing.length===0;
  $('planningActiveWarning').textContent=missing.length?'Niet vermeld op werkbon: '+missing.join(', ')+'. Kies zelf in Rekenen.':'';
  const details=$('planningActiveDetails');details.replaceChildren();
  details.append(el('p','',bon.adres||'Adres niet vermeld'),el('p','',bon.opmerkingen||'Geen werkinstructies op de bon'));
  if(bon.adres){
   const maps=el('a','plan-link','📍 Google Maps'),apple=el('a','plan-link','Apple Kaarten');
   maps.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(bon.adres);
   apple.href='https://maps.apple.com/?q='+encodeURIComponent(bon.adres);
   maps.target='_blank';apple.target='_blank';maps.rel='noopener noreferrer';apple.rel='noopener noreferrer';
   details.append(maps,apple);
  }
 }
 const count=bon?state.data.opnames.filter(x=>x.bonId===bon.id).length:
  state.data?state.data.opnames.filter(x=>x.day===localISODate()).length:0;
 const logText=bon?(label+' · '+count+' opgeslagen onderzoeksopname(s)'):'Werkdag vandaag · '+count+' opgeslagen onderzoeksopname(s)';
 if(records)records.textContent=state.data?logText:'Log in of kies de proefversie.';
 const summary=$('planningLogSummary');
 if(summary)summary.textContent=state.data?logText:'Geen persoonlijke planning geladen.';
 for(const id of ['planningMailReport','planningRecordsMail']){
  const button=$(id);if(button)button.disabled=!state.data;
 }
}
function statusClass(status){
 return status==='Afgerond'?'done':status==='In behandeling'?'doing':'queued';
}
function rowForBon(bon){
 const row=el('div','plan-row');
 const hours=el('div','plan-hours',(bon.starttijd||'--:--')+' – '+(bon.eindtijd||'--:--'));
 const info=el('div','plan-info');
 const action=el('button','plan-open');
 action.type='button';
 const name=el('strong','',bon.klant||'Klant onbekend');
 const secondary=el('small','',bon.adres||'Adres onbekend');
 const technical=el('small','',(bon.bron_of_toestel||'Bron/toestel onbekend')+' • '+procedureText(bon));
 const number=el('small','','Opdracht- / Bonnummer: '+(bon.bonnummer||'—')+' · Order: '+(bon.ordernummer||'—'));
 action.append(name,secondary,technical,number);
 action.addEventListener('click',()=>activate(bon.id));
 info.append(action);
 if(bon.adres){
  const nav=el('a','plan-map','📍 Open route');
  nav.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(bon.adres);
  nav.target='_blank';nav.rel='noopener noreferrer';nav.title='Navigeer naar '+bon.adres;
  info.append(nav);
 }
 const badge=el('span','plan-status '+statusClass(bon.status),normalizeStatus(bon.status));
 row.append(hours,info,badge);return row;
}
function renderProcedures(){
 const box=$('planningProcedures');box.replaceChildren();
 if(!state.data)return;
 for(const p of state.data.procedures){
  const item=el('div','plan-procedure-item');
  item.append(el('strong','',p.code+' · Rev. '+p.revision),
   el('small','',(p.norm||'Geen norm')+' · Klasse '+(p.klasse||'—')+' · Film '+(p.film||'—')+
     ' · Min. zwarting '+(p.minDensity??'—')+' · IQI '+(p.iqiSide==='source'?'Bronzijde':p.iqiSide==='film'?'Filmzijde':'—')));
  box.append(item);
 }
}
function renderLog(){
 const box=$('planningLoggedShots');box.replaceChildren();
 if(!state.data)return;
 const bon=activeBon();
 const rows=(bon?state.data.opnames.filter(x=>x.bonId===bon.id):
  state.data.opnames.filter(x=>x.day===localISODate())).slice().reverse();
 if(!rows.length){box.append(el('p','small-muted','Nog geen onderzoeksopnames opgeslagen.'));return;}
 for(const item of rows){
  box.append(el('div','plan-shot',item.date+' · '+(item.source||'Bron onbekend')+
   ' · '+(item.result||'Geen uitkomst')+' · IQI '+(item.iqiWire||'niet bepaald')+
   ' · '+NO_RT_RELEASE));
 }
}
function render(){
 const list=$('planningDayList');if(!list)return;list.replaceChildren();
 document.querySelectorAll('[data-plan-filter]').forEach(btn=>{
  const selected=btn.dataset.planFilter===state.filter;
  btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));
 });
 renderActive();renderProcedures();renderLog();
 if(!state.data){
  list.append(el('p','plan-empty','Geen persoonlijke planning geopend. Meld je aan of gebruik de proefversie.'));
  return;
 }
 const today=localISODate(),search=state.search;
 const matches=state.data.workbonnen.filter(b=>{
  if(state.filter==='done')return b.status==='Afgerond';
  if(b.status==='Afgerond')return false;
  if(state.filter==='today'&&b.datum!==today)return false;
  if(state.filter==='upcoming'&&(!b.datum||b.datum<=today))return false;
  return true;
 }).filter(b=>!search||[b.klant,b.bonnummer,b.ordernummer].some(v=>String(v||'').toLocaleLowerCase('nl-NL').includes(search)));
 matches.sort((a,b)=>(a.datum||'').localeCompare(b.datum||'')||(a.starttijd||'').localeCompare(b.starttijd||''));
 if(!matches.length){list.append(el('p','plan-empty','Geen werkbonnen gevonden in dit filter.'));return;}
 const grouped=new Map();
 for(const bon of matches){
  const key=bon.datum||'Datum niet vermeld';
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push(bon);
 }
 for(const [date,items] of grouped){
  const title=date===today?'VANDAAG · '+date:state.filter==='upcoming'?'KOMENDE · '+date:'AFGEROND · '+date;
  list.append(el('h2','plan-date-header',title));
  for(const bon of items)list.append(rowForBon(bon));
 }
}
function setValue(id,value){
 if(value===undefined||value===null||String(value)==='')return;
 const input=$(id);if(!input)return;
 if(input.tagName==='SELECT'&&![...input.options].some(o=>o.value===String(value)))return;
 input.value=String(value);
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.dispatchEvent(new Event('change',{bubbles:true}));
}
function press(id){
 const node=$(id);if(node&&node.getAttribute('aria-pressed')!=='true')node.click();
}
function applyBon(bon){
 if(!window.basicRTAppReady){msg('De rekenmachine is nog niet gestart; probeer opnieuw.',true);return;}
 const proc=procedureFor(bon),fields=procedurePrefill(bon,proc);
 const source=String(bon.bron_of_toestel||'');
 const isGamma=/\b(?:Se-75|Ir-192)\b/i.test(source);
 const isXray=/\bx[\s-]?ray\b|\br[oö]ntgen\b/i.test(source);
 // An unknown X-ray tube is NOT assigned the curve of a different model.
 if(isXray){
  press('modeXray');
  const raw=source.replace(/^[^(]*\(/,'').split(',')[0].replace(/[)]/g,'').trim();
  const norm=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const brands=$('xrayBrand'),model=$('xrayModel');
  const matchingBrand=[...brands.options].find(o=>norm(raw).startsWith(norm(o.textContent))||norm(raw).startsWith(norm(o.value)));
  if(matchingBrand)setValue('xrayBrand',matchingBrand.value);
  const matched=[...model.options].find(o=>norm(o.value)===norm(raw)||norm(o.textContent)===norm(raw));
  if(matched)setValue('xrayModel',matched.value);
  else if(raw){
   if(![...model.options].some(o=>o.value==='')){
    const unavailable=document.createElement('option');unavailable.value='';unavailable.textContent='Onbekend model · kies zelf';model.prepend(unavailable);
   }
   setValue('xrayModel','');
   model.value='';model.dispatchEvent(new Event('change',{bubbles:true}));
   msg('Bron/toestel niet exact gekoppeld aan bestaande referentiecurve. Kies zelf het juiste model; geen automatische onderzoeksuitkomst.',true);
  }
 }else if(isGamma){
  press('modeGamma');
  const iso=source.match(/Se-75|Ir-192/i)?.[0];
  const radio=document.querySelector('input[name="isotope"][value="'+(iso?.toLowerCase()==='ir-192'?'Ir-192':'Se-75')+'"]');
  if(radio&&!radio.checked){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}
 }
 // Null geometry and technique intentionally do nothing. Never choose automatically.
 if(fields.shape)press(fields.shape==='pipe'?'workPipe':'workPlate');
 if(fields.wall)setValue('workWall',fields.wall);
 if(fields.technique)setValue('iqiTechnique',fields.technique);
 if(fields.iqiClass)setValue('iqiClass',fields.iqiClass);
 if(fields.iqiSide)setValue('iqiSide',fields.iqiSide);
 if(fields.film)setValue('film',fields.film);
 if(fields.density)setValue('density',fields.density);
 if(fields.sfd)setValue('distance',fields.sfd);
 if(isXray){if(fields.kv)setValue('kv',fields.kv);if(fields.ma)setValue('ma',fields.ma);}
 if(isGamma&&fields.ci){
  const manual=document.querySelector('input[name="activityMode"][value="manual"]');
  if(manual&&!manual.checked){manual.checked=true;manual.dispatchEvent(new Event('change',{bubbles:true}));}
  setValue('manualCi',fields.ci);
 }
 // Do not automatically calculate or claim validation. Existing calculator reacts to inputs itself.
}
function activate(id){
 const bon=state.data?.workbonnen.find(x=>x.id===id);if(!bon)return;
 bon.status='In behandeling';state.data.activeId=id;persist();render();
 document.querySelector('.bottom-nav [data-nav="calc"]')?.click();
 applyBon(bon);
 window.dispatchEvent(new Event('ndt-active-workbon-changed'));
}
function detach(){
 if(!state.data)return;
 state.data.activeId=null;persist();render();
 window.dispatchEvent(new Event('ndt-active-workbon-changed'));
}
function readCurrentShot(){
 const $val=id=>$(id)?.value||null;
 const gamma=$('modeGamma')?.getAttribute('aria-pressed')==='true';
 const valid=$('resultCard')?.classList.contains('success')&&
  $('saveResult')?.disabled!==true;
 if(!valid)return null;
 const bon=activeBon();if(!bon)return null;
 return {
  id:crypto.randomUUID(),bonId:bon.id,day:localISODate(),
  date:new Date().toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam'}),
  source:gamma?document.querySelector('input[name="isotope"]:checked')?.value:$val('xrayModel'),
  kv:gamma?null:$val('kv'),ma:gamma?null:$val('ma'),
  activityCi:gamma?($('sourceActiveCi')?.textContent?.trim()||$val('manualCi')):null,
  material:$val('material'),wall:$val('workWall'),thickness:$val('thickness'),
  distance:$val('distance'),film:$val('film'),density:$val('density'),
  result:$('resultTime')?.textContent?.trim()||null,
  iqiWire:$('iqiWire')?.textContent?.trim()||null,
  iqiObserved:$val('rtIqiObserved'),status:NO_RT_RELEASE
 };
}
function captureLog(){
 if(!state.data||!activeBon())return;
 const row=readCurrentShot();if(!row)return;
 state.data.opnames.push(row);
 if(state.data.opnames.length>400)state.data.opnames=state.data.opnames.slice(-400);
 persist();render();
}
function finishAndMail(){
 if(!state.data){msg('Open eerst je eigen planning.',true);return;}
 if(!state.user?.email){msg('Meld je online aan met je werkmailadres om een rapport te adresseren.',true);return;}
 const bon=activeBon(),today=localISODate();
 const target=bon||{bonnummer:'Werkdag '+today,ordernummer:'Meerdere orders',klant:'Werkdagoverzicht',procedure_code:null};
 const opnames=bon?state.data.opnames.filter(r=>r.bonId===bon.id):
  state.data.opnames.filter(r=>r.day===today);
 const report=buildReport({bon:target,opnames,onderzoekerEmail:state.user.email,datum:today});
 let href;
 try{href=reportMailto({email:state.user.email,bon:target,report});}
 catch(err){msg(String(err?.message||err),true);return;}
 if(bon){bon.status='Afgerond';state.data.activeId=null;if(!persist())return;}
 render();window.dispatchEvent(new Event('ndt-active-workbon-changed'));
 msg('Werkbon afgerond. Je e-mailprogramma opent met een concept. Controleer het rapport en druk zelf op Verzenden.');
 window.location.href=href;
}
function formDataObject(form){
 const raw=Object.fromEntries(new FormData(form).entries());
 for(const key of Object.keys(raw))if(raw[key]==='')raw[key]=null;
 return sanitizeBon(raw);
}
function populateBonForm(bon){
 const form=$('planningBonForm');
 for(const [key,value] of Object.entries(bon)){
  const element=form.elements.namedItem(key);
  if(element)element.value=value??'';
 }
}
function openAdd(){
 if(!state.data){msg('Log eerst in of kies de proefversie.',true);return;}
 $('planningBonForm').reset();$('planningText').value='';$('planningFile').value='';
 importMsg('Vul handmatig in of lees een bestand uit.');
 $('planningImportDialog').showModal();
 if(!navigator.onLine)return;
 // A distinct Turnstile widget ensures the workbon reader uses the existing Worker safely.
 setupBonTurnstile($('planningTurnstile')).catch(err=>importMsg(String(err?.message||err),true));
}
async function readFile(){
 const file=$('planningFile').files?.[0];if(!file){importMsg('Selecteer een PDF, foto of tekstbestand.',true);return;}
 const button=$('planningReadFile');button.disabled=true;
 try{
  const raw=await extractBonText(file,message=>importMsg(message));
  if(!raw.trim())throw Error('Geen tekst gevonden. Plak de gegevens of voer ze zelf in.');
  $('planningText').value=raw;
  importMsg('Tekst lokaal gelezen. Controleer hem en klik op AI uitlezen. De originele afbeelding is niet verstuurd.');
 }catch(error){importMsg(String(error?.message||error),true);}
 finally{button.disabled=false;}
}
async function aiRead(){
 const button=$('planningAIRead');button.disabled=true;
 try{
  if($('planningFile').files?.[0]&&!$('planningText').value.trim())await readFile();
  const parsed=await parseBonViaGemini($('planningText').value,$('planningTurnstile'),m=>importMsg(m));
  populateBonForm(parsed);
  importMsg('AI heeft mogelijke bonvelden voorgesteld. Ontbrekende waarden blijven leeg. Controleer en corrigeer alle velden vóór Opslaan.');
 }catch(error){importMsg('AI-uitlezen niet voltooid: '+String(error?.message||error)+'. Handmatig invoeren blijft mogelijk.',true);}
 finally{button.disabled=false;}
}
function saveBon(event){
 event.preventDefault();if(!state.data)return;
 const form=$('planningBonForm'),values=formDataObject(form);
 if(!values.bonnummer||!values.klant||!values.datum){
  importMsg('Opdracht- / Bonnummer, klant en datum zijn verplicht. Geen waarden raden.',true);return;
 }
 const bon={...values,id:crypto.randomUUID(),status:'Ingepland',demo:false};
 state.data.workbonnen.push(bon);
 if(!persist()){importMsg('Kon werkbon niet opslaan.',true);return;}
 $('planningImportDialog').close();
 render();msg('Werkbon '+bon.bonnummer+' opgeslagen. Tik op de rij om deze te activeren.');
}
function saveProcedure(event){
 event.preventDefault();if(!state.data)return;
 const form=$('planningProcedureForm');
 const raw=Object.fromEntries(new FormData(form).entries());
 if(!raw.code?.trim()||!raw.revision?.trim()){msg('Procedurecode en revisie zijn verplicht.',true);return;}
 if(raw.minDensity&&(!/^\d+(?:[.,]\d+)?$/.test(raw.minDensity)||Number(raw.minDensity.replace(',','.'))>10)){msg('Voer een geldige minimale zwarting in.',true);return;}
 if(raw.minDensity)raw.minDensity=raw.minDensity.replace(',','.');
 const old=state.data.procedures;
 const merged=proceduresForStore([...old,raw]);
 state.data.procedures=merged;
 if(!persist()){state.data.procedures=old;return;}
 form.reset();render();msg('Procedure opgeslagen als administratief voorstel. Geen RT-vrijgave.');
}
function workbonContext(){
 const bon=activeBon();if(!bon||!state.user?.id&&state.scope!=='trial')return null;
 const procedure=procedureFor(bon);
 return {
  bonnummer:bon.bonnummer,ordernummer:bon.ordernummer,klant:bon.klant,
  bron_of_toestel:bon.bron_of_toestel,geometrie:bon.geometrie,
  techniek:bon.techniek,procedure_code:bon.procedure_code,revisie:bon.revisie,
  procedure:procedure?{code:procedure.code,revision:procedure.revision,norm:procedure.norm,
   klasse:procedure.klasse,film:procedure.film,minDensity:procedure.minDensity,iqiSide:procedure.iqiSide}:null,
  caution:NO_RT_RELEASE
 };
}
function init(){
 if(!$('screen-planning'))return;
 // The existing app.mjs navigation handles every .screen, including this new screen.
 $('planningOpenTop')?.addEventListener('click',openPlanning);
 document.querySelector('.bottom-nav [data-nav="planning"]')?.addEventListener('click',()=>{
  state.filter='today';state.search='';$('planningSearch').value='';
  openScope();
 });
 document.querySelectorAll('[data-plan-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  state.filter=btn.dataset.planFilter;render();
 }));
 $('planningSearch')?.addEventListener('input',e=>{state.search=e.target.value.toLocaleLowerCase('nl-NL').trim();render();});
 $('planningAdd')?.addEventListener('click',openAdd);
 $('planningCancel')?.addEventListener('click',()=>$('planningImportDialog').close());
 $('planningReadFile')?.addEventListener('click',readFile);
 $('planningAIRead')?.addEventListener('click',aiRead);
 $('planningBonForm')?.addEventListener('submit',saveBon);
 $('planningProcedureForm')?.addEventListener('submit',saveProcedure);
 $('planningActiveInfo')?.addEventListener('click',()=>{
  const details=$('planningActiveDetails');details.hidden=!details.hidden;
 });
 $('planningDetach')?.addEventListener('click',detach);
 for(const id of ['planningFinish','planningMailReport','planningRecordsMail'])
  $(id)?.addEventListener('click',finishAndMail);
 // Capture is before the existing async sticky handler. It never modifies the saved result.
 $('ndtSaveToLog')?.addEventListener('click',captureLog,true);
 window.addEventListener('ndt-auth-scope-changed',()=>{
  state.scope=null;state.user=null;state.store=null;state.data=null;
  render();window.dispatchEvent(new Event('ndt-active-workbon-changed'));
 });
 window.addEventListener('offline',()=>{
  if(state.scope?.startsWith('user:')){
   state.scope=null;state.user=null;state.store=null;state.data=null;
   render();msg('Planning opnieuw openen na een online sessiecontrole. Rekenen blijft beschikbaar.',true);
  }
 });
 window.addEventListener('ndt-private-naslag-logout',()=>{
  state.scope=null;state.user=null;state.store=null;state.data=null;
  render();window.dispatchEvent(new Event('ndt-active-workbon-changed'));
 });
 window.ndtWorkbonContext=workbonContext;
 render();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
