/* Local, reference-only Waygate X-ray software outputs.
 * Software screenshots are NEVER physical film measurements or calibrated exposure instructions.
 * No data are included in this public source file: users import their private JSON locally.
 * Does not call exposure computation code, send network requests, or alter calibration curves.
 */
'use strict';
const KEY='basic-rt-pro-waygate-xray-local-v1';
const SCHEMA='basic-rt-pro-waygate-xray-v1';
const $=id=>document.getElementById(id);
const decimal=value=>{
 const raw=String(value??'').trim().replace(',','.');
 return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)?Number(raw):NaN;
};
function validate(raw){
 if(!raw||typeof raw!=='object'||raw.schema!==SCHEMA||
  raw.kind!=='waygate_software_output'||!raw.conditions||!Array.isArray(raw.points)||
  raw.points.length<1||raw.points.length>50)
  return {ok:false,error:'Onjuist formaat voor Waygate-softwarepunten.'};
 const c=raw.conditions;
 const vals=['energyKv','currentMa','thicknessMm','sourceDetectorMm'].map(k=>decimal(c[k]));
 if(vals.some(n=>!Number.isFinite(n)||n<=0)||
  vals[0]>1000||vals[1]>1000||vals[2]>1000||vals[3]>100000)
  return {ok:false,error:'Ongeldige kV, mA, dikte of afstand.'};
 if(c.film!=='D4'&&c.film!=='D5'&&c.film!=='D7')
  return {ok:false,error:'Filmtype niet ondersteund.'};
 if(c.material!=='Fe')return {ok:false,error:'Alleen de ingevoerde Fe-softwarevergelijking wordt ondersteund.'};
 const points=raw.points.map(p=>({density:decimal(p?.density),timeSeconds:decimal(p?.timeSeconds)}));
 if(points.some(p=>!Number.isFinite(p.density)||p.density<=0||p.density>6||
   !Number.isFinite(p.timeSeconds)||p.timeSeconds<=0||p.timeSeconds>2592000))
  return {ok:false,error:'Ongeldige D-meting of softwaretijd.'};
 const unique=new Set(points.map(p=>p.density));
 if(unique.size!==points.length)return {ok:false,error:'Dubbele doelzwarting in het bestand.'};
 const data={
  schema:SCHEMA,kind:'waygate_software_output',status:'user_supplied_software_screenshot_unverified',
  sourceLabel:'Waygate Technologies – overgenomen uit softwarescreenshots',
  conditions:{energyKv:vals[0],currentMa:vals[1],thicknessMm:vals[2],
   sourceDetectorMm:vals[3],film:c.film,material:'Fe',
   equipmentModel:(typeof c.equipmentModel==='string'?c.equipmentModel.trim().slice(0,90):'')},
  points:points.sort((a,b)=>a.density-b.density)
 };
 return {ok:true,data};
}
function message(text,error=false){
 const el=$('rtWaygateStatus');if(!el)return;el.textContent=text;el.classList.toggle('rt-waygate-error',error);
}
const fmt=n=>Number(n).toLocaleString('nl-NL',{maximumFractionDigits:2});
const hms=sec=>{
 const n=Math.round(sec);
 return [Math.floor(n/3600),Math.floor((n%3600)/60),n%60]
  .map(x=>String(x).padStart(2,'0')).join(':');
};
let current=null;
function read(){
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return {ok:true,data:null};
  return validate(JSON.parse(raw));
 }catch(_){return {ok:false,error:'Lokale gegevens konden niet worden gelezen. Er is niets verwijderd.'};}
}
function save(data){
 try{localStorage.setItem(KEY,JSON.stringify(data));current=data;return true;}
 catch(_){message('Browseropslag is niet beschikbaar. Bewaar het originele JSON-bestand.',true);return false;}
}
function tableCell(value,header=false){
 const el=document.createElement(header?'th':'td');el.textContent=String(value);return el;
}
// Exact screenshot-point lookup only. No interpolation, scaling or new exposure model.
function exactMatch(reference,values){
 if(!reference||!reference.conditions)return {ok:false,reason:'missing'};
 const c=reference.conditions,missing=[];
 const same=(a,b)=>Number.isFinite(a)&&Math.abs(a-Number(b))<0.000001;
 if(!same(values.kv,c.energyKv))missing.push('kV');
 if(!same(values.ma,c.currentMa))missing.push('mA');
 if(!same(values.thickness,c.thicknessMm))missing.push('staaldikte');
 if(values.film!==c.film)missing.push('filmtype');
 if(!same(values.distance,c.sourceDetectorMm))missing.push('afstand');
 if(values.material!=='Fe')missing.push('materiaal');
 if(values.pipe)missing.push('buis-/dubbelwandige geometrie');
 if(missing.length)return {ok:false,reason:'conditions',missing};
 const pt=reference.points.find(p=>same(values.density,p.density));
 return pt?{ok:true,seconds:pt.timeSeconds}:{ok:false,reason:'density'};
}
function liveInputs(){
 return {
  kv:decimal($('rtCompactKv')?.value),
  ma:decimal($('rtCompactActivity')?.value),
  thickness:decimal($('rtCompactThickness')?.value),
  film:$('rtCompactFilm')?.value,
  distance:decimal($('rtCompactDistance')?.value),
  density:decimal($('rtCompactDensity')?.value),
  material:$('material')?.value,
  pipe:$('rtCompactPipe')?.getAttribute('aria-pressed')==='true'
 };
}
function compare(){
 const box=$('rtWaygateMatch'),live=$('rtWaygateLiveTime'),messageEl=$('rtWaygateLiveMessage');
 if(!box||!live||!messageEl)return;
 if($('modeXray')?.getAttribute('aria-pressed')!=='true')return;
 live.textContent='—';
 if(!current){
  const messageText='Nog geen Waygate-softwarepunten op dit toestel. Importeer eerst het JSON-bestand uit je eigen screenshots.';
  box.textContent=messageText;messageEl.textContent=messageText;return;
 }
 const status=exactMatch(current,liveInputs());
 if(status.ok){
  live.textContent=hms(status.seconds);
  const msg='Exact overgenomen Waygate-softwarepunt bij deze ingevoerde waarden (geen interpolatie). '+
   'Het toesteltype en de opnametechniek zijn niet onafhankelijk bevestigd; NIET gebruiken als belichtingsadvies.';
  messageEl.textContent=msg;
  box.textContent='Invoer komt numeriek overeen met het screenshot. De vergelijking is onafhankelijk van de fabrikantkeuze in Basic RT PRO. '+
   '“Source to Detector” en FFD zijn niet automatisch dezelfde meetdefinitie.';
 }else if(status.reason==='conditions'){
  const msg='Geen passende Waygate-softwaretijd. Afwijkende gegevens: '+status.missing.join(', ')+'. '+
    'Voeg voor deze combinatie een eigen Waygate-screenshot toe; geen tijd berekend.';
  messageEl.textContent=msg;box.textContent=msg;
 }else{
  const available=current.points.map(p=>fmt(p.density)).join(' / ');
  const msg='Geen exact Waygate-punt voor deze doelzwarting. Beschikbaar D: '+available+'. '+
    'Er wordt niet geïnterpoleerd of een tijd verzonnen.';
  messageEl.textContent=msg;box.textContent=msg;
 }
}
function setProxy(id,value){
 const el=$(id);if(!el)return;
 el.value=String(value);
 el.dispatchEvent(new Event('input',{bubbles:true}));
 el.dispatchEvent(new Event('change',{bubbles:true}));
}
function useReference(){
 if(!current)return;
 const c=current.conditions;
 if($('modeXray')?.getAttribute('aria-pressed')!=='true')$('rtCompactXray')?.click();
 if($('rtCompactPipe')?.getAttribute('aria-pressed')==='true')$('rtCompactPlate')?.click();
 setProxy('rtCompactKv',c.energyKv);
 setProxy('rtCompactActivity',c.currentMa);
 setProxy('rtCompactThickness',c.thicknessMm);
 setProxy('rtCompactFilm',c.film);
 setProxy('rtCompactDistance',c.sourceDetectorMm);
 setProxy('rtCompactDensity',current.points[0].density);
 setProxy('material','Fe');
 setTimeout(compare,90);
 message('Waygate-softwaregegevens overgenomen voor vergelijking. Controleer zelf de geometrie en broncondities.');
}
function render(){
 const container=$('rtWaygateBody');if(!container)return;
 container.replaceChildren();
 const count=$('rtWaygateCount');
 if(!current){
  if(count)count.textContent='Nog geen privésoftwarepunten geïmporteerd';
  if($('rtWaygateUseReference'))$('rtWaygateUseReference').hidden=true;
  const note=document.createElement('p');note.className='small-muted';
  note.textContent='Importeer de JSON met de Waygate-screenshotpunten. Deze getallen staan niet in de openbare GitHub-code.';
  container.append(note);
  compare();
  return;
 }
 const c=current.conditions;
 if(count)count.textContent=current.points.length+' lokale softwarepunten';
 if($('rtWaygateUseReference'))$('rtWaygateUseReference').hidden=false;
 const context=document.createElement('p');context.className='small-muted';
 context.textContent='Waygate-software · '+fmt(c.energyKv)+' kV · '+fmt(c.currentMa)+' mA · '+
  fmt(c.thicknessMm)+' mm Fe · '+c.film+' · Source to Detector '+fmt(c.sourceDetectorMm)+
  ' mm'+(c.equipmentModel?' · '+c.equipmentModel:'');
 container.append(context);
 const scroll=document.createElement('div');scroll.className='rt-waygate-table-wrap';
 const table=document.createElement('table');table.className='rt-waygate-table';
 const thead=document.createElement('thead'),tr=document.createElement('tr');
 tr.append(tableCell('Doelzwarting D',true),tableCell('Waygate-softwaretijd',true));thead.append(tr);table.append(thead);
 const tbody=document.createElement('tbody');
 for(const p of current.points){const row=document.createElement('tr');row.append(tableCell(fmt(p.density)),tableCell(hms(p.timeSeconds)));tbody.append(row);}
 table.append(tbody);scroll.append(table);container.append(scroll);
 const caveat=document.createElement('p');caveat.className='rt-waygate-caveat';
 caveat.textContent='Alleen overgenomen software-uitkomsten. Geen gemeten filmzwarting, geen interpolatie, '+
  'geen vervanging van fabrikantgrafieken of gevalideerde RT-procedure.';
 container.append(caveat);
 compare();
}
async function importFile(event){
 const file=event.target.files?.[0];event.target.value='';
 if(!file)return;
 if(file.size>50000){message('JSON te groot (maximaal 50 KB).',true);return;}
 try{
  const input=JSON.parse(await file.text());
  const result=validate(input);
  if(!result.ok){message(result.error,true);return;}
  if(!confirm('Waygate-softwarepunten lokaal opslaan? Eventuele eerdere softwarepunten worden vervangen.'))return;
  if(save(result.data)){render();message(result.data.points.length+' softwarepunten lokaal opgeslagen. Geen wijziging aan de RT-berekening.');}
 }catch(_){message('Het JSON-bestand kon niet worden geïmporteerd.',true);}
}
function exportJson(){
 if(!current){message('Er zijn nog geen Waygate-softwarepunten opgeslagen.',true);return;}
 const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');
 a.href=url;a.download='basic-rt-pro-waygate-xray-softwarepunten.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);
 message('JSON-back-up aangeboden. Controleer je downloads.');
}
function forget(){
 if(!current||!confirm('Alle lokaal opgeslagen Waygate-softwarepunten wissen?'))return;
 try{localStorage.removeItem(KEY);current=null;render();message('Lokale Waygate-softwarepunten gewist.');}
 catch(_){message('Wissen in browseropslag mislukt.',true);}
}
/* One-tap import from the user's screenshot values in a URL fragment.
 * Fragments are not sent in the HTTP request to GitHub Pages. This is
 * not physical film calibration and no points are stored in the public repo.
 */
function parseShareFragment(fragment){
 if(typeof fragment!=='string'||!fragment.startsWith('#wgr=')||fragment.length>350)
  return {ok:false,error:'Geen Waygate-gegevens in deze link.'};
 const parts=fragment.slice(5).split('~');
 if(parts.length!==6)return {ok:false,error:'Waygate-link is onvolledig.'};
 const [kv,ma,thickness,film,distance,values]=parts;
 const pointStrings=values.split(',');
 if(pointStrings.length<1||pointStrings.length>50)return {ok:false,error:'Ongeldige softwarepunten.'};
 const points=[];
 for(const item of pointStrings){
  const pieces=item.split(':');
  if(pieces.length!==2)return {ok:false,error:'Ongeldig D/tijd-paar.'};
  points.push({density:pieces[0],timeSeconds:pieces[1]});
 }
 return validate({schema:SCHEMA,kind:'waygate_software_output',
  conditions:{energyKv:kv,currentMa:ma,thicknessMm:thickness,film,
   sourceDetectorMm:distance,material:'Fe'},points});
}
function receiveSharedSoftwarePoints(){
 const hash=window.location.hash;
 if(!hash.startsWith('#wgr='))return;
 let cleanUrl=window.location.pathname+window.location.search;
 try{
  const reference=parseShareFragment(hash);
  // The share fragment must not remain in browser history or on-screen links.
  history.replaceState(history.state,'',cleanUrl);
  if(!reference.ok){message('De Waygate-link is ongeldig: '+reference.error,true);return;}
  if(current){
   const a=current.conditions,b=reference.data.conditions;
   const same=['energyKv','currentMa','thicknessMm','sourceDetectorMm','film','material'].every(k=>a[k]===b[k])&&
    JSON.stringify(current.points)===JSON.stringify(reference.data.points);
   if(same){
    message('Dezelfde vijf Waygate-softwarepunten staan al op dit toestel. De waarden worden nu ingevuld.');
    setTimeout(useReference,150);
   }else message('Andere lokale Waygate-gegevens zijn al opgeslagen. Maak eerst een back-up en wis deze als je de vijf voorbeeldpunten wilt laden.');
   return;
  }
  if(save(reference.data)){
   render();
   message(reference.data.points.length+' softwarepunten uit de link lokaal geladen. Geen modelkeuze en geen wijzigingen aan RT-curves.');
   // Geometry and main calculator modules initialize after the viewer.
   setTimeout(useReference,150);
  }
 }catch(_){message('Automatisch laden van Waygate-softwarepunten is niet gelukt.',true);}
}

function init(){
 const panel=$('rtWaygateReference');if(!panel)return;
 const loaded=read();if(!loaded.ok)message(loaded.error,true);else current=loaded.data;
 $('rtWaygateImport')?.addEventListener('change',importFile);
 $('rtWaygateExport')?.addEventListener('click',exportJson);
 $('rtWaygateForget')?.addEventListener('click',forget);
 $('rtWaygateUseReference')?.addEventListener('click',useReference);
 for(const id of ['rtCompactKv','rtCompactActivity','rtCompactThickness','rtCompactFilm','rtCompactDistance','rtCompactDensity','material']){
  $(id)?.addEventListener('change',compare);
  $(id)?.addEventListener('input',compare);
 }
 for(const id of ['rtCompactPlate','rtCompactPipe','modeGamma','modeXray','rtCompactSe','rtCompactIr','rtCompactXray']){
  $(id)?.addEventListener('click',()=>setTimeout(compare,90));
 }
 window.addEventListener('rt-language-changed',compare);
 render();
 receiveSharedSoftwarePoints();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
