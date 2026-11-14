/* Basic RT PRO — AI Expert, read-only bridge. No credentials live in this file. */
import {AI_WORKER_URL, AI_TURNSTILE_SITE_KEY} from './ai-config.mjs';

const $ = id => document.getElementById(id);
const STORAGE = 'basic-rt-pro-ai-public-config-v1';
const HISTORY_LIMIT = 6;
let history = [], waiting = false, widgetId = null, widgetSiteKey = '';
let apiLoad = null;
const config = (()=>{try{return {...JSON.parse(localStorage.getItem(STORAGE) || '{}')};}catch{return {};}})();

function getField(id) {return $(id)?.value?.trim() || '';}
function getText(id) {return $(id)?.textContent?.trim().slice(0,500) || '';}
function getRadio(name) {return document.querySelector(`input[name="${name}"]:checked`)?.value || '';}
function status(message, problem = false){
  const el=$('aiStatus'); if(!el)return;
  el.textContent=message; el.classList.toggle('ai-error',problem);
}
function sanitizeWorkerUrl(raw) {
  try {
    const url = new URL(raw.trim());
    if(url.username || url.password || url.search || url.hash) return null;
    if(url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) return null;
    return url.origin + url.pathname.replace(/\/$/, '');
  }catch{return null;}
}
function publicConfig(){
  return {endpoint: getField('aiWorkerUrl') || AI_WORKER_URL,
    siteKey: getField('aiSiteKey') || AI_TURNSTILE_SITE_KEY};
}
function savePublicConfig(){
  const values = {endpoint:getField('aiWorkerUrl'),siteKey:getField('aiSiteKey')};
  if(values.endpoint && !sanitizeWorkerUrl(values.endpoint)) {status('Vul een geldige HTTPS-Worker-URL in.',true);return false;}
  try {localStorage.setItem(STORAGE,JSON.stringify(values));}
  catch {status('Instellingen konden niet worden opgeslagen op dit toestel.',true);return false;}
  status('Publieke verbindingsinstellingen opgeslagen op dit toestel.');
  installTurnstile();
  return true;
}
function snapshot(){
  const gamma = $('modeGamma')?.getAttribute('aria-pressed') === 'true';
  const result = $('resultCard');
  // Report only already calculated results; never claim an estimated exposure is approved.
  const calculated = result?.classList.contains('success') || result?.classList.contains('blocked');
  const isPipe = $('workPipe')?.getAttribute('aria-pressed') === 'true';
  return {
    app:'Basic RT PRO 3.8.6 BETA',status:'ONDERZOEK / NIET GEVALIDEERD / GEEN RT-VRIJGAVE',
    modality:gamma?'gamma':'xray',
    source:gamma?getRadio('isotope'):getField('xrayModel'),
    sourceActivityCi: gamma ? getText('sourceActiveCi') : null,
    xray:gamma?null:{brand:getField('xrayBrand'),kV:getField('kv'),mA:getField('ma')},
    material:getField('material'),film:getField('film'),density:getField('density'),
    penetrationThicknessMm:getField('thickness'),SFD_or_FFD_mm:getField('distance'),
    object:isPipe?'buis':'plaat',outsideDiameterMm:isPipe?getField('workOutside'):null,
    wallThicknessMm:isPipe?getField('workWall'):null,
    IQI:{class:getField('iqiClass'),technique:getField('iqiTechnique'),side:getField('iqiSide'),
      penetratedThicknessMm:getField('iqiPenetrated'),wire:getText('iqiWire'),reference:getText('iqiRef')},
    procedure:{norm:getField('procNorm'),class:getField('procClass'),MME:getField('procMme'),
      technique:getField('procTechnique'),IQISide:getField('procSide')},
    geometry:{sourceSizeMm:getField('geoSource'),objectFilmDistanceMm:getField('geoOFD'),
      sourceObjectDistanceMm:getField('geoSOD'),appUgResult:getText('geoResult')},
    appCalculation:calculated?{
      status:result.classList.contains('success')?'indicatieve uitkomst':'geblokkeerd',
      time:getText('resultTime'),reason:getText('resultReason'),
      provenance:getText('resultProvenance')
    }:{status:'nog geen actuele berekening — geen tijd beschikbaar'},
    chartStatus:getText('rt29StatusText')
  };
}
function preview(){
  const el=$('aiPreview');
  if(el && !el.hidden) el.textContent=$('aiSendContext').checked ? JSON.stringify(snapshot(),null,2) : 'Context wordt niet meegestuurd.';
}
function appendMessage(role, content){
  const el=document.createElement('div');
  el.className='ai-message '+(role==='user'?'ai-user':'ai-model');
  const label=document.createElement('strong');label.textContent=role==='user'?'Jij':'AI Expert';
  const body=document.createElement('p');body.textContent=content; // no HTML injection
  el.append(label,body);
  $('aiMessages').append(el);
  el.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function loadTurnstileApi(){
  if(window.turnstile) return Promise.resolve();
  if(apiLoad) return apiLoad;
  apiLoad=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.onload=()=>resolve();
    script.onerror=()=>reject(new Error('Turnstile-script kon niet worden geladen'));
    document.head.append(script);
  }).catch(err=>{apiLoad=null;throw err;});
  return apiLoad;
}
async function installTurnstile(){
  const siteKey = publicConfig().siteKey.trim();
  const el=$('aiTurnstile');
  if(!el) return;
  if(widgetId!==null && window.turnstile){window.turnstile.remove(widgetId);widgetId=null;widgetSiteKey='';}
  el.replaceChildren();
  if(!siteKey){status('Stel eerst de publieke Turnstile-sitekey en Worker-URL in.',true);return;}
  try {
    await loadTurnstileApi();
    if(siteKey !== publicConfig().siteKey.trim())return;
    widgetId = window.turnstile.render(el,{sitekey:siteKey,theme:'dark',
      callback:()=>status('Beveiligingscontrole gereed. Je kunt je vraag versturen.'),
      'expired-callback':()=>status('Controle verlopen; voer deze opnieuw uit.',true),
      'error-callback':()=>status('Beveiligingscontrole mislukt; probeer opnieuw.',true)});
    widgetSiteKey=siteKey;
  }catch(err){status(err.message,true);}
}
function resetTurnstile(){
  if(widgetId!==null && window.turnstile) window.turnstile.reset(widgetId);
}
async function ask(){
  if(waiting)return;
  const question=getField('aiQuestion');
  if(!question || question.length>1500){status('Vul een vraag van maximaal 1.500 tekens in.',true);return;}
  const {endpoint,siteKey} = publicConfig();
  const worker=sanitizeWorkerUrl(endpoint);
  if(!worker){status('Vul eerst een geldige publieke Worker-URL in.',true);return;}
  if(!siteKey || widgetId===null || widgetSiteKey!==siteKey){status('Turnstile is nog niet ingesteld of geladen.',true);return;}
  const token = window.turnstile?.getResponse(widgetId);
  if(!token){status('Voltooi eerst de Turnstile-beveiligingscontrole.',true);return;}
  if(!navigator.onLine){status('AI Expert werkt alleen met internet. De overige appfuncties blijven offline beschikbaar.',true);return;}
  const context = $('aiSendContext').checked ? snapshot() : null;
  waiting=true; $('aiAsk').disabled=true;
  appendMessage('user',question); $('aiQuestion').value='';
  status('AI-antwoord wordt opgehaald…');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try {
    const resp=await fetch(worker+'/chat',{
      method:'POST',mode:'cors',cache:'no-store',credentials:'omit',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question,history:history.slice(-HISTORY_LIMIT),context,turnstileToken:token}),
      signal:controller.signal
    });
    const response=await resp.json().catch(()=>({}));
    if(!resp.ok) throw new Error(response.error || `Verbinding mislukt (HTTP ${resp.status})`);
    if(typeof response.answer!=='string' || !response.answer.trim()) throw new Error('Geen bruikbaar antwoord ontvangen.');
    appendMessage('model',response.answer);
    history.push({role:'user',text:question},{role:'model',text:response.answer.slice(0,1500)});
    history=history.slice(-HISTORY_LIMIT);
    status('Antwoord ontvangen. Controleer normverwijzingen en gebruik een goedgekeurde procedure.');
  }catch(err){
    appendMessage('model','Geen AI-antwoord ontvangen: '+(err.name==='AbortError'?'time-out':err.message));
    status('Verzoek mislukt. Probeer het later opnieuw.',true);
  }finally{
    clearTimeout(timer);waiting=false;$('aiAsk').disabled=false;resetTurnstile();
    preview();
  }
}
function init(){
  if(!$('aiAsk'))return;
  $('aiWorkerUrl').value=config.endpoint || AI_WORKER_URL;
  $('aiSiteKey').value=config.siteKey || AI_TURNSTILE_SITE_KEY;
  $('aiSaveConfig').addEventListener('click',savePublicConfig);
  $('aiAsk').addEventListener('click',ask);
  $('aiQuestion').addEventListener('keydown',e=>{
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();ask();}
  });
  $('aiClearChat').addEventListener('click',()=>{
    history=[];$('aiMessages').replaceChildren();status('Chatgeheugen van deze sessie gewist.');
  });
  $('aiPreviewToggle').addEventListener('click',()=>{
    const el=$('aiPreview');el.hidden=!el.hidden;preview();
    $('aiPreviewToggle').setAttribute('aria-expanded',String(!el.hidden));
  });
  $('aiRecalculate').addEventListener('click',()=>{
    if(!window.basicRTAppReady){status('De RT-rekenmodule is nog niet gereed.',true);return;}
    $('calculate')?.click();preview();
    status('De bestaande calculator is uitgevoerd. Controleer de status en uitkomst.');
  });
  $('aiSendContext').addEventListener('change',preview);
  // If a site key was configured previously, initialize on first visit to AI Expert.
  document.querySelector('[data-nav="ai"]')?.addEventListener('click',()=>{
    if(widgetId===null) installTurnstile(); preview();
  });
  if(!publicConfig().endpoint || !publicConfig().siteKey)status('Configureer eerst de Worker-URL en publieke Turnstile-sitekey.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
