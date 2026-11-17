/**
 * Shared planning / researcher workflow. Cloud data is always scoped by Supabase RLS.
 * The existing RT calculator is only driven via its original input controls.
 * No new exposure calculations, IQI acceptance, material factors or safety shortcuts.
 */
import {makePlanningAPI} from './planning-api.mjs';
import {buildPlanningTeamInvite} from './planning-team-invite.mjs';
import {unlockWorkbonCache,WORKBON_OFFLINE_USER,syncWorkbonOutbox} from './workbon-offline-sync.mjs';
import {demoWorkbonnen,PROCEDURE_SEEDS,proceduresForStore,findProcedure,
 localISODate,NO_RT_RELEASE} from './planning-data.mjs';
import {extractBonText,parseBonViaGemini,setupBonTurnstile} from './workbon-reader.mjs';

const $=id=>document.getElementById(id);
const state={client:null,role:null,user:null,bons:[],opnames:[],members:[],companyAdminOptions:[],offlineCache:null,offlineUserId:null,
 filter:'today',search:'',activeId:null,setupBonId:null,setupReady:false,
 selectedId:null,editingId:null,pendingFile:null,pendingText:'',readGeneration:0,
 processing:false,loading:false,procedureList:proceduresForStore([])};
const $text=(id,value)=>{if($(id))$(id).textContent=String(value??'');};
const elem=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text??'');return n;};
const errorText=e=>String(e?.message||e);
function notice(message,isError=false){
 $text('planningNotice',message);
 if($('planningNotice'))$('planningNotice').dataset.error=String(isError);
}
function importNotice(message,isError=false){
 $text('planningImportStatus',message);
 if($('planningImportStatus'))$('planningImportStatus').dataset.error=String(isError);
}
const activeBon=()=>state.bons.find(b=>b.id===state.activeId)||null;
const bonData=bon=>bon?.data||bon||{};
const idLabel=bon=>(bonData(bon).bonnummer||'Zonder nummer');
const bonTitle=bon=>{
 const data=bonData(bon);
 return 'Bon '+idLabel(bon)+' · '+(data.klant||'Klant niet vermeld');
};
const activeRole=role=>state.role===role;
const localToday=()=>localISODate();
function clearUserData(){
 state.client=null;state.role=null;state.user=null;state.bons=[];state.opnames=[];
 state.members=[];state.companyAdminOptions=[];state.activeId=null;state.setupBonId=null;state.setupReady=false;
 state.offlineCache?.close();state.offlineCache=null;
 window.dispatchEvent(new CustomEvent('ndt-planning-role-ready',{detail:{role:null,label:''}}));
 render();window.dispatchEvent(new Event('ndt-active-workbon-changed'));
}
async function refreshPlanning(){
 if(state.loading)return;
 state.loading=true;
 const oldId=state.user?.id;
 try{
  const client=state.client||makePlanningAPI();
  const auth=await client.authenticate();
  const snapshot=await client.list();
  if(oldId&&oldId!==auth.user.id){
   state.activeId=null;state.setupBonId=null;state.setupReady=false;
  }
  state.client=client;state.role=snapshot.role;state.user=snapshot.user;
  state.bons=snapshot.bons;state.opnames=snapshot.opnames;state.members=snapshot.members;
  state.companyAdminOptions=snapshot.companyAdminOptions||[];
  if(state.role==='researcher'){
   localStorage.setItem(WORKBON_OFFLINE_USER,state.user.id);
   if(state.offlineCache&&state.offlineCache.userId===state.user.id){
    await state.offlineCache.saveSnapshot({bons:state.bons,opnames:state.opnames,role:'researcher'});
    await flushOfflineOutbox();
   }
  }
  window.dispatchEvent(new CustomEvent('ndt-planning-role-ready',{
   detail:{role:state.role,label:state.role==='planning'?'Planning · '+(state.user.email||'beheer'):
    state.role==='researcher'?'Onderzoeker · '+(state.user.email||'aangemeld'):state.user.email||''}
  }));
  if(state.activeId&&!state.bons.some(b=>b.id===state.activeId))state.activeId=null;
  state.procedureList=readProcedures();
  notice(state.role==='planning'?
   'Planning · centraal opgeslagen. Wijs bestaande, bevestigde accounts aan een werkbon toe.':
   'Mijn toegewezen werkbonnen · gedeeld tussen computer en telefoon.');
 }catch(e){
  clearUserData();
  // Trial users can inspect the two sample orders but cannot publish private data.
  if(localStorage.getItem('ndt-ui-trial-choice-v1')==='trial'){
   state.role='trial';state.bons=demoWorkbonnen().map(b=>({...b,data:b}));
   notice('Proefweergave · twee voorbeeldbonnen. Log in voor gedeelde werkbonnen en rollen.');
  }else notice('Gedeelde Planning: '+errorText(e),true);
 }finally{
  state.loading=false;render();
 }
}
function readProcedures(){
 try{const raw=JSON.parse(localStorage.getItem('ndt-planning-procedures-'+state.user?.id)||'[]');return proceduresForStore(raw);}
 catch{return proceduresForStore([]);}
}
function renderProcedures(){
 const box=$('planningProcedures');if(!box)return;
 box.replaceChildren();
 for(const p of state.procedureList){
  const card=elem('div','plan-procedure-item');
  card.append(elem('strong','',p.code+' · Rev. '+p.revision),
   elem('small','',(p.norm||'Norm onbekend')+' · Klasse '+(p.klasse||'—')+' · Film '+(p.film||'—')+
     ' · Min. zwarting '+(p.minDensity??'—')+' · IQI '+(p.iqiSide==='source'?'Bronzijde':p.iqiSide==='film'?'Filmzijde':'—')));
  box.append(card);
 }
}
function renderMembership(){
 const planning=activeRole('planning');
 $('planningTeam').hidden=!planning;$('planningAdd').hidden=!planning;
 $('planningDraftFilter').hidden=!planning;
 $('planningProcedureForm').hidden=!planning;
 $('planningOfflinePanel').hidden=!activeRole('researcher');
 $text('planningRole',planning?'Planning · bonnen aanmaken/toewijzen':
  activeRole('researcher')?'Onderzoeker · toegewezen werkbonnen':'Voorbeeldplanning');
 const list=state.members.filter(m=>m.role==='researcher');
 const companies=$('planningInviteCompany');
 if(companies&&planning){
  const selected=companies.value;
  companies.replaceChildren(new Option('Planning-werkruimte',''));
  for(const item of state.companyAdminOptions)companies.add(new Option(item.name,item.id));
  companies.value=state.companyAdminOptions.some(x=>x.id===selected)?selected:'';
 }
 $text('planningTeamStatus',list.length?list.map(m=>m.email).join(' · '):
  'Nog geen onderzoekers toegevoegd. Voeg een bevestigd account toe.');
}
function timeText(bon){const d=bonData(bon);return (d.starttijd||'--:--')+' – '+(d.eindtijd||'--:--');}
function badgeClass(status){
 return status==='Afgerond'||status==='Gereed'?'done':status==='In behandeling'?'doing':'queued';
}
function action(label,click,cls=''){
 const button=elem('button',cls,label);button.type='button';button.addEventListener('click',click);return button;
}
function originalAction(bon){
 return action('Originele bon',async()=>{
  try{
   if(!state.client)throw Error('Alleen na aanmelden beschikbaar.');
   notice('Originele werkbon ophalen…');
   const {blob,filename}=await state.client.downloadOriginal(bon);
   const url=URL.createObjectURL(blob),anchor=elem('a');
   anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
   notice('Originele bon gedownload uit privéopslag.');
  }catch(e){notice('Originele bon: '+errorText(e),true);}
 },'plan-original');
}
function renderCard(bon){
 const data=bonData(bon),row=elem('article','plan-row');
 const times=elem('div','plan-hours',timeText(bon));
 const content=elem('div','plan-info');
 const open=action('',()=>openBon(bon),'plan-open');
 open.append(elem('strong','',data.klant||'Klant niet vermeld'),
  elem('small','',data.adres||'Adres niet vermeld'),
  elem('small','',(data.bron_of_toestel||'Bron/toestel niet vermeld')+' · '+(data.procedure_code||'Procedure ontbreekt')+
   (data.revisie?' Rev. '+data.revisie:'')),
  elem('small','','Opdracht- / Bonnummer: '+idLabel(bon)+' · Order: '+(data.ordernummer||'—')));
 content.append(open);
 const actions=elem('div','plan-card-actions');
 if(data.adres){
  const link=elem('a','plan-map','📍 Route');
  link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(data.adres);
  link.target='_blank';link.rel='noopener noreferrer';actions.append(link);
 }
 if(bon.original_path)actions.append(originalAction(bon));
 if(activeRole('planning')){
  const assigned=state.members.find(m=>m.user_id===bon.assigned_to);
  actions.append(elem('small','plan-assignee',assigned?'Onderzoeker: '+assigned.email:'Nog niet toegewezen'));
  actions.append(action('Controleer / wijs toe',()=>openBonDialog(bon),'plan-edit'));
  if(bon.status==='Gereed')actions.append(elem('small','plan-status-pending','Onderzoeker gereed · metingen beschikbaar voor kantoor'));
 }else if(activeRole('researcher')){
  actions.append(action(bon.status==='Gereed'?'Details bekijken':'Start onderzoek',
   ()=>openBon(bon),'plan-start'));
 }
 const opnameCount=state.opnames.filter(x=>x.bon_id===bon.id).length;
 actions.append(elem('small','plan-shot-count',opnameCount+' opname(s) gekoppeld'));
 content.append(actions);
 const status=elem('span','plan-status '+badgeClass(bon.status),bon.status||'Concept');
 row.append(times,content,status);
 return row;
}
function renderAgenda(){
 const list=$('planningDayList');list.replaceChildren();
 const date=localToday();
 const matches=state.bons.filter(b=>{
  if(state.filter==='draft')return b.status==='Concept';
  if(state.filter==='done')return b.status==='Gereed'||b.status==='Afgerond';
  if(b.status==='Concept'||b.status==='Afgerond'||b.status==='Gereed')return false;
  const day=bonData(b).datum;
  return state.filter==='today'?(!day||day===date):day>date;
 }).filter(b=>!state.search||[
  bonData(b).bonnummer,bonData(b).klant,bonData(b).ordernummer
 ].some(v=>String(v||'').toLocaleLowerCase('nl-NL').includes(state.search)));
 matches.sort((a,b)=>String(bonData(a).datum||'9999').localeCompare(String(bonData(b).datum||'9999'))||
  String(bonData(a).starttijd||'').localeCompare(String(bonData(b).starttijd||'')));
 document.querySelectorAll('[data-plan-filter]').forEach(button=>{
  const on=button.dataset.planFilter===state.filter;
  button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));
 });
 if(!matches.length){
  list.append(elem('p','plan-empty',state.role?'Geen werkbonnen in dit filter.':'Log in om je gedeelde werkbonnen te zien.'));
  return;
 }
 let lastDay=null;
 for(const bon of matches){
  const day=bonData(bon).datum||'Datum niet vermeld';
  if(day!==lastDay){
   lastDay=day;
   const heading=day===date?'VANDAAG · '+day:day==='Datum niet vermeld'?day:state.filter==='draft'?'CONCEPT · '+day:day;
   list.append(elem('h2','plan-date-header',heading));
  }
  list.append(renderCard(bon));
 }
}
function renderActive(){
 const bon=activeBon(),bar=$('planningActiveBar'),researcher=activeRole('researcher');
 bar.hidden=!researcher||!bon;
 $('planningNextShot').hidden=!(researcher&&state.setupReady&&state.setupBonId===bon?.id);
 $('planningCalculate').hidden=!(researcher&&bon);
 $('planningStartResearch').hidden=!researcher||!bon||bon.status==='Gereed';
 $('planningFinish').hidden=!researcher||!bon||bon.status==='Gereed';
 if(researcher&&bon){
  $text('planningActiveLabel','Actief: '+bonTitle(bon));
  const missing=state.setupReady&&state.setupBonId===bon.id?[]:[
   'geometrie','techniek','wanddikte','SFD en broninstelling'];
  $('planningActiveWarning').hidden=!missing.length;
  $text('planningActiveWarning',missing.length?
   'Vul zelf in vóór Berekenen: '+missing.join(', ')+'. De vorige werkboninstellingen worden niet overgenomen.':'');
  const details=$('planningActiveDetails');details.replaceChildren();
  const d=bonData(bon);
  details.append(elem('p','',(d.adres||'Adres ontbreekt')+' · '+(d.opmerkingen||'Geen opmerkingen')),
   elem('p','','Procedure: '+(d.procedure_code||'—')+' Rev. '+(d.revisie||'—')));
  if(bon.original_path)details.append(originalAction(bon));
 }
 const saving=$('ndtSaveToLog');
 if(saving)saving.textContent=researcher&&bon?'Opslaan bij werkbon':'Opslaan in logboek';
 const count=bon?state.opnames.filter(x=>x.bon_id===bon.id).length:0;
 $text('planningRecordsSummary',bon?bonTitle(bon)+' · '+count+' onderzoeksopname(s)':
  'Kies een toegewezen werkbon via Planning.');
 $text('planningLogSummary',bon?bonTitle(bon)+' · '+count+' opnames':
  'Selecteer een werkbon voor het werklogboek.');

}
function renderShots(){
 const box=$('planningLoggedShots');box.replaceChildren();
 const bon=activeBon();
 const shots=bon?state.opnames.filter(x=>x.bon_id===bon.id):
  activeRole('planning')?state.opnames:[];
 if(!shots.length){box.append(elem('p','small-muted','Nog geen opgeslagen onderzoeksopnames.'));return;}
 for(const row of shots.slice(0,80)){
  const d=row.details||{};
  box.append(elem('div','plan-shot',
   (row.created_at||'').slice(0,16).replace('T',' ')+' · '+
   (d.source||'Bron onbekend')+' · '+(d.result||'Geen indicatieve tijd')+
   ' · IQI '+(d.iqiWire||'onbekend')+' · '+NO_RT_RELEASE));
 }
}
function render(){
 renderMembership();renderProcedures();renderAgenda();renderActive();renderShots();
}
function changeInput(id,value){
 const input=$(id);if(!input||value===null||value===undefined)return;
 if(input.tagName==='SELECT'&&![...input.options].some(o=>o.value===String(value)))return;
 input.value=String(value);
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.dispatchEvent(new Event('change',{bubbles:true}));
}
function press(id){
 const node=$(id);if(node&&node.getAttribute('aria-pressed')!=='true')node.click();
}
function clearResearchInputs(){
 // A new workbon must not inherit any of the five technical values from a prior workbon.
 for(const id of ['workWall','workPenetrated','thickness','distance','manualCi','certCi','kv','ma','iqiTechnique','iqiPenetrated']){
  const input=$(id);if(!input)continue;
  input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
 }
 // A different workbon must never inherit a previous tube's selected curve.
 const model=$('xrayModel');
 if(model){
  if(![...model.options].some(o=>o.value==='')){
   const option=document.createElement('option');option.value='';option.textContent='Kies exact toestelmodel';
   model.prepend(option);
  }
  model.value='';model.dispatchEvent(new Event('change',{bubbles:true}));
 }
 state.setupReady=false;state.setupBonId=null;
}
function displayResearchType(){
 const xray=$('planningResearchModality').value==='xray';
 $('planningResearchCiWrap').hidden=xray;$('planningResearchIsotopeWrap').hidden=xray;
 $('planningResearchKvWrap').hidden=!xray;$('planningResearchMaWrap').hidden=!xray;
}
const SUGGESTED_FIELDS=Object.freeze([
 ['material','materiaal'],['film','film'],['density','doelzwarting'],
 ['wall','wanddikte_mm'],['distance','sfd_mm'],['ci','activiteit_ci'],
 ['kv','kv'],['ma','ma']
]);
function showResearchSuggestions(bon){
 const form=$('planningResearchForm'),data=bonData(bon);
 for(const [inputName,bonName] of SUGGESTED_FIELDS){
  const input=form.elements.namedItem(inputName),value=data[bonName];
  if(!input)continue;
  const present=value!==undefined&&value!==null&&String(value).trim()!=='';
  const supported=input.tagName!=='SELECT'||[...input.options].some(o=>o.value===String(value));
  if(present&&supported)input.value=String(value);
  input.classList.toggle('plan-proposed',present&&supported);
  input.classList.toggle('plan-missing',!present||!supported);
  input.title=present&&supported?'Voorstel van de werkbon: zelf controleren':
   'Nog in te vullen op locatie. Geen waarde geraden.';
 }
 for(const key of ['geometry','technique']){
  const input=form.elements.namedItem(key);if(input)input.classList.add('plan-missing');
 }
 const count=SUGGESTED_FIELDS.filter(([_,field])=>data[field]!=null&&String(data[field]).trim()).length;
 $text('planningResearchBonSummary',bonTitle(bon)+' · '+(data.procedure_code||'Procedure ontbreekt')+
  ' · '+count+' technisch(e) bonvoorstel(len). Alles blijft handmatig aanpasbaar.');
}
function markMissingCalculatorInputs(bon){
 const d=bonData(bon);
 const pairs=[['workWall','wanddikte_mm'],['distance','sfd_mm'],
  ['material','materiaal'],['film','film'],['density','doelzwarting'],
  ['manualCi','activiteit_ci'],['kv','kv'],['ma','ma']];
 for(const [id,field] of pairs){
  const input=$(id);if(!input)continue;
  input.classList.toggle('plan-missing',d[field]==null||String(d[field]).trim()==='');
  input.title=d[field]==null?'Nog in te vullen: niet vermeld op bon. Controleer op locatie.':
   'Bonvoorstel: controleer de actuele waarde.';
 }
 $('iqiTechnique')?.classList.add('plan-missing');
}
function clearMissingCalculatorMarkers(){
 for(const input of document.querySelectorAll('.plan-missing,.plan-proposed')){
  input.classList.remove('plan-missing','plan-proposed');input.removeAttribute('title');
 }
}
function openResearchDialog(bon,fresh=true){
 const form=$('planningResearchForm');
 if(fresh)form.reset();
 if(fresh){
  const source=String(bonData(bon).bron_of_toestel||'');
  form.elements.namedItem('modality').value=/x[\s-]?ray|r[oö]ntgen/i.test(source)?'xray':'gamma';
  const iso=source.match(/\bSe-75\b|\bIr-192\b/i)?.[0];
  if(iso)form.elements.namedItem('isotope').value=iso.toLowerCase()==='ir-192'?'Ir-192':'Se-75';
 }
 showResearchSuggestions(bon);
 displayResearchType();$('planningResearchError').hidden=true;
 $('planningResearchDialog').showModal();
}
async function openBon(bon){
 if(!activeRole('researcher')){
  if(activeRole('planning'))openBonDialog(bon);
  else notice('Log in als toegewezen onderzoeker om te starten.',true);
  return;
 }
 if(bon.status==='Gereed'){notice(bonTitle(bon)+' is als gereed gemeld en kan niet worden bewerkt.');return;}
 if(bon.status==='Ingepland'){
  try{
   await state.client.changeResearchStatus(bon.id,'In behandeling');
   bon.status='In behandeling';
  }catch(e){notice('Start onderzoek: '+errorText(e),true);return;}
 }
 if(bon.status!=='In behandeling'){
  notice('Deze werkbon is niet vrijgegeven voor onderzoek. Vraag Planning om toewijzing.',true);return;
 }
 const switching=state.activeId!==bon.id;
 state.activeId=bon.id;
 if(switching)clearResearchInputs();
 render();window.dispatchEvent(new Event('ndt-active-workbon-changed'));
 document.querySelector('.bottom-nav [data-nav="calc"]')?.click();
 if(switching||!state.setupReady)openResearchDialog(bon,true);
 else notice('Werkbon '+idLabel(bon)+' actief. Gebruik Volgende opname om instellingen te hergebruiken.');
}
function currentSetup(){
 const form=$('planningResearchForm'),raw=Object.fromEntries(new FormData(form).entries());
 const num=value=>{const str=String(value??'').trim().replace(',','.');return /^\d+(?:\.\d+)?$/.test(str)&&Number(str)>0?str:null;};
 if(!['plate','pipe'].includes(raw.geometry)||!['sw','dwsi','dwdi'].includes(raw.technique)||
   !num(raw.wall)||!num(raw.distance))
  throw Error('Kies geometrie en techniek, en vul een positieve wanddikte en SFD in.');
 if(raw.modality==='xray'){
  if(!num(raw.kv)||!num(raw.ma))throw Error('Vul kV én mA zelf in.');
  return {...raw,wall:num(raw.wall),distance:num(raw.distance),kv:num(raw.kv),ma:num(raw.ma)};
 }
 if(!['Se-75','Ir-192'].includes(raw.isotope)||!num(raw.ci))
  throw Error('Kies Se-75 of Ir-192 en vul de actuele activiteit in Ci in.');
 return {...raw,wall:num(raw.wall),distance:num(raw.distance),ci:num(raw.ci)};
}
function startResearch(event){
 event.preventDefault();
 const bon=activeBon();if(!bon)return;
 try{
  const setup=currentSetup();
  // Procedure metadata may prefill only explicitly registered film / IQI fields;
  // the five researcher settings remain independent and mandatory.
  const record=bonData(bon);
  const proc=findProcedure(state.procedureList,record.procedure_code,record.revisie);
  if(proc){
   if(proc.film)changeInput('film',proc.film);
   if(proc.minDensity!==null)changeInput('density',String(proc.minDensity));
   if(proc.klasse)changeInput('iqiClass',proc.klasse);
   if(proc.iqiSide)changeInput('iqiSide',proc.iqiSide);
  }
  if(setup.modality==='xray')press('modeXray');
  else{
   press('modeGamma');
   const radio=document.querySelector('input[name="isotope"][value="'+setup.isotope+'"]');
   if(radio&&!radio.checked){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  press(setup.geometry==='pipe'?'workPipe':'workPlate');
  changeInput('workWall',setup.wall);
  changeInput('iqiTechnique',setup.technique);
  changeInput('distance',setup.distance);
  if(setup.modality==='xray'){
   // Never leave a previous bon's model selected; the original engine
   // requires the researcher to choose a supported device curve.
   const model=$('xrayModel');
   if(model){
    if(![...model.options].some(o=>o.value==='')){
     const option=document.createElement('option');option.value='';option.textContent='Kies exact toestelmodel';
     model.prepend(option);
    }
    model.value='';model.dispatchEvent(new Event('change',{bubbles:true}));
   }
   changeInput('kv',setup.kv);changeInput('ma',setup.ma);
  }else{
   const radio=document.querySelector('input[name="activityMode"][value="manual"]');
   if(radio&&!radio.checked){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}
   changeInput('manualCi',setup.ci);
  }
  state.setupReady=true;state.setupBonId=bon.id;
  $('planningResearchDialog').close();render();
  notice('Onderzoeksgegevens ingevuld voor bon '+idLabel(bon)+'. Controleer het toestelmodel, de doorstraalde dikte, IQI en de originele veiligheidscontroles. Klik daarna Berekenen.');
 }catch(e){
  $('planningResearchError').hidden=false;$text('planningResearchError',errorText(e));
 }
}
function readCurrentShot(){
 const bon=activeBon();
 if(!bon||!state.setupReady||state.setupBonId!==bon.id)throw Error('Kies eerst Start onderzoek en controleer de vijf onderzoeksgegevens.');
 if(!$('resultCard')?.classList.contains('success')||$('saveResult')?.disabled)
  throw Error('Geen geldige actuele onderzoeksuitkomst. Gebruik eerst Berekenen.');
 const get=id=>$(id)?.value||null;
 const gamma=$('modeGamma')?.getAttribute('aria-pressed')==='true';
 return {
  source:gamma?document.querySelector('input[name="isotope"]:checked')?.value:get('xrayModel'),
  kv:gamma?null:get('kv'),ma:gamma?null:get('ma'),
  activityCi:gamma?($('sourceActiveCi')?.textContent?.trim()||get('manualCi')):null,
  material:get('material'),wall:get('workWall'),thickness:get('thickness'),
  distance:get('distance'),film:get('film'),density:get('density'),
  result:$('resultTime')?.textContent?.trim()||null,iqiWire:$('iqiWire')?.textContent?.trim()||null,
  iqiObserved:get('rtIqiObserved'),workbonnummer:idLabel(bon),
  ordernummer:bonData(bon).ordernummer,klant:bonData(bon).klant,
  geometry:$('workPipe')?.getAttribute('aria-pressed')==='true'?'Buis / Pijp':'Plaat / Las',
  technique:get('iqiTechnique'),status:NO_RT_RELEASE
 };
}
async function captureShot(event){
 if(!activeBon()||!activeRole('researcher'))return;
 // Suppress the old generic-save event only for active assigned workbonnen.
 event.preventDefault();event.stopImmediatePropagation();
 const button=$('ndtSaveToLog');if(button.disabled)return;
 button.disabled=true;
 try{
  const details=readCurrentShot(),bon=activeBon();
  const row=await state.client.addOpname(bon,details);
  state.opnames.unshift(row);
  $('saveResult')?.click(); // Reuse existing local logbook without changing its formulas.
  $text('ndtStickyReason','Opname centraal opgeslagen bij bon '+idLabel(bon)+'. '+NO_RT_RELEASE);
  notice('Opname veilig opgeslagen bij '+bonTitle(bon)+'. Kies Volgende opname om instellingen te hergebruiken.');
  render();
 }catch(e){
  $text('ndtStickyReason','Opslaan bij werkbon mislukt: '+errorText(e));
  notice('Opslaan bij werkbon mislukt: '+errorText(e),true);
 }finally{button.disabled=$('saveResult')?.disabled===true;}
}
async function markReady(){
 const bon=activeBon();if(!bon||!activeRole('researcher'))return;
 if(!state.opnames.some(s=>s.bon_id===bon.id)){
  notice('Sla eerst minimaal één opname bij deze werkbon op.',true);return;
 }
 try{
  await state.client.changeResearchStatus(bon.id,'Gereed');
  bon.status='Gereed';state.activeId=null;state.setupReady=false;state.setupBonId=null;
  render();window.dispatchEvent(new Event('ndt-active-workbon-changed'));
  notice('Werkbon '+idLabel(bon)+' als Gereed gemeld. Planning ziet de voortgang en resultaten.');
  document.querySelector('.bottom-nav [data-nav="planning"]')?.click();
 }catch(e){notice('Gereedmelden mislukt: '+errorText(e),true);}
}
function populateForm(bon){
 const form=$('planningBonForm'),data=bonData(bon);
 form.reset();
 for(const [key,value] of Object.entries(data)){
  const input=form.elements.namedItem(key);
  if(input)input.value=value??'';
 }
 form.elements.namedItem('assigned_to').value=bon?.assigned_to||'';
 renderImportSummary();
}
function renderImportSummary(){
 const form=$('planningBonForm'),raw=Object.fromEntries(new FormData(form).entries());
 const summary=$('planningImportSummary');summary.replaceChildren();
 const fields=[
  ['Opdracht- / Bonnummer','bonnummer'],['Klant','klant'],['Adres','adres'],['Order','ordernummer'],
  ['Datum','datum'],['Start','starttijd'],['Einde','eindtijd'],['Bron / toestel','bron_of_toestel'],
  ['Materiaal','materiaal'],['Wanddikte','wanddikte_mm'],['SFD','sfd_mm'],
  ['Film','film'],['Doelzwarting','doelzwarting'],['Procedure','procedure_code'],['Revisie','revisie']
 ];
 summary.append(elem('strong','','Controleer gegevens van de werkbon'));
 for(const [name,key] of fields){
  const value=String(raw[key]||'').trim();
  summary.append(elem('small',value?'plan-field-ready':'plan-status-pending',
   name+': '+(value||'Nog in te vullen')));
 }
}
function openBonDialog(bon=null){
 if(!activeRole('planning')){notice('Alleen Planning kan werkbonnen maken.',true);return;}
 state.editingId=bon?.id||null;state.pendingFile=null;state.pendingText='';
 state.readGeneration++;$('planningFile').value='';$('planningText').value='';
 const assignee=$('planningAssignee');assignee.replaceChildren(new Option('Nog niet toegewezen · Concept',''));
 for(const member of state.members.filter(m=>m.role==='researcher'))assignee.add(new Option(member.email,member.user_id));
 populateForm(bon);
 $text('planningImportHeading',bon?'Werkbon controleren / toewijzen':'Nieuwe werkbon of concept');
 importNotice('Kies een bestand voor automatische herkenning, of corrigeer de velden handmatig.');
 $('planningImportDialog').showModal();
 setupBonTurnstile($('planningTurnstile'),()=>{
  if(state.pendingText&&!state.processing)void autoAnalyze(state.readGeneration);
 }).catch(e=>importNotice('AI-beveiliging niet beschikbaar: '+errorText(e)+'. Handmatig invullen kan altijd.',true));
}
async function autoAnalyze(generation){
 if(state.processing||!state.pendingText||generation!==state.readGeneration)return;
 if(!window.turnstile?.getResponse(Number($('planningTurnstile')?.dataset.widgetId))) {
  importNotice('Tekst herkend. Voltooi de beveiligingscontrole; daarna worden bonvelden automatisch ingevuld.');
  return;
 }
 state.processing=true;
 try{
  const values=await parseBonViaGemini(state.pendingText,$('planningTurnstile'),importNotice);
  if(generation!==state.readGeneration)return;
  // Only planning values are populated, never the researcher-specific measurements.
  const form=$('planningBonForm');
  for(const field of ['bonnummer','klant','adres','ordernummer','bron_of_toestel',
   'procedure_code','revisie','opmerkingen','datum','starttijd','eindtijd',
   'materiaal','materiaal_omschrijving','wanddikte_mm','sfd_mm','film','doelzwarting','activiteit_ci','kv','ma']){
   const input=form.elements.namedItem(field);
   if(input)input.value=values[field]??'';
  }
  renderImportSummary();
  state.pendingText=''; // Prevent automatic repeated submissions on Turnstile reset.
  importNotice('Herkenning gereed. Controleer en corrigeer de bonvelden; onvolledig mag als concept.');
 }catch(e){
  importNotice('Automatische herkenning: '+errorText(e)+'. Corrigeer of vul handmatig in.',true);
 }finally{state.processing=false;}
}
async function autoReadFile(){
 const file=$('planningFile').files?.[0];
 if(!file)return;
 const generation=++state.readGeneration;
 state.pendingFile=file;state.pendingText='';
 importNotice('Bestand automatisch herkennen…');
 try{
  const text=await extractBonText(file,message=>{
   if(generation===state.readGeneration)importNotice(message);
  });
  if(generation!==state.readGeneration)return;
  if(!text.trim())throw Error('Geen leesbare tekst; vul de bon handmatig in.');
  state.pendingText=text;$('planningText').value=text;
  await autoAnalyze(generation);
 }catch(e){
  if(generation===state.readGeneration)importNotice('Herkenning niet compleet: '+errorText(e)+'. Handmatige correctie blijft mogelijk.',true);
 }
}
async function saveBon(event){
 event.preventDefault();
 if(!activeRole('planning')||!state.client)return;
 const button=$('planningSaveBon');button.disabled=true;$text('planningSaveBon','Opslaan…');
 try{
  const form=$('planningBonForm');
  const values=Object.fromEntries(new FormData(form).entries());
  const assignedTo=values.assigned_to||null;delete values.assigned_to;
  const existing=state.bons.find(b=>b.id===state.editingId);
  const saved=await state.client.saveBon({
   id:state.editingId,values,assignedTo,status:existing?.status||null
  });
  let uploadFailure=null;
  if(state.pendingFile){
   try{saved.original_path=await state.client.uploadOriginal(saved,state.pendingFile);}
   catch(e){uploadFailure=errorText(e);}
  }
  const index=state.bons.findIndex(b=>b.id===saved.id);
  if(index<0)state.bons.unshift(saved);else state.bons[index]=saved;
  $('planningImportDialog').close();state.pendingFile=null;state.pendingText='';
  render();
  notice('Werkbon '+idLabel(saved)+' opgeslagen als '+saved.status+
   (uploadFailure?'. Privébestand niet opgeslagen: '+uploadFailure:''),Boolean(uploadFailure));
 }catch(e){importNotice('Werkbon niet opgeslagen: '+errorText(e),true);}
 finally{button.disabled=false;$text('planningSaveBon','Werkbon / Concept opslaan');}
}
async function addResearcher(event){
 event.preventDefault();if(!activeRole('planning')||!state.client)return;
 const button=event.currentTarget.querySelector('button');button.disabled=true;
 try{
  const invite=await state.client.createInvite(
   $('planningResearcherEmail').value,$('planningInviteCompany').value||null);
  const company=state.companyAdminOptions.find(x=>x.id===invite.company_id);
  const compose=buildPlanningTeamInvite({
   email:invite.email,token:invite.token,origin:location.origin,path:location.pathname,
   companyName:company?.name||'de NDT Planning-werkruimte'
  });
  $('planningResearcherEmail').value='';
  const panel=$('planningTeamStatus');panel.replaceChildren();
  panel.append(elem('span','','Uitnodiging aangemaakt (7 dagen, eenmalig). Er is nog geen e-mail verzonden. '));
  const link=elem('a','plan-invite-send','Open uitnodigingsmail en klik op Verzenden');
  link.href=compose.mailto;panel.append(link);
  const copy=action('Kopieer uitnodigingslink',async()=>{
   try{await navigator.clipboard.writeText(compose.link);notice('Uitnodigingslink gekopieerd. Deel deze uitsluitend met '+invite.email+'.');}
   catch{notice('Kopiëren niet toegestaan. Gebruik de uitnodigingsmail.',true);}
  },'plan-invite-copy');
  panel.append(copy);
 }catch(e){$text('planningTeamStatus','Uitnodiging mislukt: '+errorText(e));}
 finally{button.disabled=false;}
}
function saveProcedure(event){
 event.preventDefault();if(!activeRole('planning'))return;
 const form=event.currentTarget;
 const raw=Object.fromEntries(new FormData(form).entries());
 if(!raw.code?.trim()||!raw.revision?.trim())return notice('Procedurecode en revisie zijn verplicht.',true);
 if(raw.minDensity)raw.minDensity=raw.minDensity.replace(',','.');
 state.procedureList=proceduresForStore([...state.procedureList,raw]);
 try{localStorage.setItem('ndt-planning-procedures-'+state.user.id,JSON.stringify(state.procedureList));}
 catch(e){return notice('Procedure niet opgeslagen: '+errorText(e),true);}
 form.reset();renderProcedures();notice('Procedureadministratie bijgewerkt; dit geeft geen RT-vrijgave.');
}
function context(){
 const bon=activeBon();if(!bon||!activeRole('researcher'))return null;
 const d=bonData(bon);
 const p=findProcedure(state.procedureList,d.procedure_code,d.revisie);
 return {bonnummer:d.bonnummer,ordernummer:d.ordernummer,klant:d.klant,
  bron_of_toestel:d.bron_of_toestel,procedure_code:d.procedure_code,revisie:d.revisie,
  procedure:p?{code:p.code,revision:p.revision,norm:p.norm,klasse:p.klasse,film:p.film}:null,
  onderzoeksstatus:NO_RT_RELEASE};
}
function init(){
 if(!$('screen-planning'))return;
 window.ndtWorkbonContext=context;
 const planningNav=document.querySelector('.bottom-nav [data-nav="planning"]');
 planningNav?.addEventListener('click',()=>{
  state.filter='today';state.search='';$('planningSearch').value='';void refreshPlanning();
 });
 $('planningOpenTop')?.addEventListener('click',()=>planningNav?.click());
 $('planningRefresh')?.addEventListener('click',()=>void refreshPlanning());
 $('planningAdd')?.addEventListener('click',()=>openBonDialog());
 $('planningAddResearcherForm')?.addEventListener('submit',addResearcher);
 document.querySelectorAll('[data-plan-filter]').forEach(b=>b.addEventListener('click',()=>{
  state.filter=b.dataset.planFilter;renderAgenda();
 }));
 $('planningSearch')?.addEventListener('input',e=>{
  state.search=e.target.value.trim().toLocaleLowerCase('nl-NL');renderAgenda();
 });
 $('planningBonForm')?.addEventListener('input',renderImportSummary);
 $('planningBonForm')?.addEventListener('change',renderImportSummary);
 $('planningBonForm')?.addEventListener('submit',saveBon);
 $('planningCancel')?.addEventListener('click',()=>$('planningImportDialog').close());
 $('planningFile')?.addEventListener('change',()=>void autoReadFile());
 $('planningText')?.addEventListener('paste',()=>{
  setTimeout(()=>{
   const text=$('planningText').value.trim();
   if(!text)return;state.pendingText=text;state.readGeneration++;void autoAnalyze(state.readGeneration);
  },100);
 });
 $('planningProcedureForm')?.addEventListener('submit',saveProcedure);
 $('planningResearchModality')?.addEventListener('change',displayResearchType);
 $('planningResearchForm')?.addEventListener('submit',startResearch);
 $('planningResearchCancel')?.addEventListener('click',()=>$('planningResearchDialog').close());
 $('planningStartResearch')?.addEventListener('click',()=>{
  if(activeBon())openResearchDialog(activeBon(),!state.setupReady);
 });
 $('planningNextShot')?.addEventListener('click',()=>{
  notice('Volgende opname: eerdere instellingen blijven staan. Controleer gewijzigde parameters en klik Berekenen.');
  document.querySelector('.bottom-nav [data-nav="calc"]')?.click();
 });
 $('planningCalculate')?.addEventListener('click',()=>{
  const bon=activeBon();
  if(!bon||!state.setupReady||state.setupBonId!==bon.id){
   notice('Kies eerst Start onderzoek en vul de vijf onderzoeksgegevens in.',true);
   if(bon)openResearchDialog(bon,true);
   return;
  }
  $('calculate')?.click(); // Never an independent exposure calculation.
 });
 $('planningFinish')?.addEventListener('click',()=>void markReady());
 $('planningActiveInfo')?.addEventListener('click',()=>{
  const panel=$('planningActiveDetails');panel.hidden=!panel.hidden;
 });
 $('planningDetach')?.addEventListener('click',()=>{
  state.activeId=null;state.setupBonId=null;state.setupReady=false;render();
  window.dispatchEvent(new Event('ndt-active-workbon-changed'));
 });
 // The original calculator is untouched; only prevent a new assigned bon
 // being calculated with stale values before its five researcher inputs are set.
 $('calculate')?.addEventListener('click',event=>{
  if(!activeRole('researcher')||!activeBon()||state.setupReady&&state.setupBonId===activeBon().id)return;
  event.preventDefault();event.stopImmediatePropagation();
  notice('Kies eerst Start onderzoek en vul de vijf onderzoekersgegevens in.',true);
  if(!$('planningResearchDialog').open)openResearchDialog(activeBon(),true);
 },true);
 $('ndtSaveToLog')?.addEventListener('click',captureShot,true);
 window.addEventListener('ndt-auth-scope-changed',()=>{
  clearUserData();
 });
 window.addEventListener('ndt-private-naslag-logout',()=>clearUserData());
 window.addEventListener('offline',()=>{if(state.role==='researcher'||state.role==='planning'){
  clearUserData();notice('Gedeelde Planning offline niet beschikbaar. De lokale onderzoekscalculator blijft werken.',true);
 }});
 render();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}
