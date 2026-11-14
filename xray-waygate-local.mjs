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
function compare(){
 const box=$('rtWaygateMatch');if(!box||!current)return;
 const c=current.conditions;
 const checks=[
  ['kV',$('kv')?.value,c.energyKv],
  ['mA',$('ma')?.value,c.currentMa],
  ['staaldikte',$('thickness')?.value,c.thicknessMm],
  ['film',$('film')?.value,c.film],
  ['afstand',$('distance')?.value,c.sourceDetectorMm]
 ];
 const mismatch=checks.filter(([name,a,b])=>a===undefined||a===null||a===''||
  (name==='film'?a!==b:Math.abs(decimal(a)-Number(b))>0.000001)).map(([name])=>name);
 const model=$('xrayModel')?.value||'onbekend';
 if(mismatch.length){
  box.textContent='Niet dezelfde invoer: '+mismatch.join(', ')+'. Basic RT PRO gebruikt '+model+
   '. De Waygate-softwaretijden mogen niet op dit model worden toegepast.';
 }else{
  box.textContent='De ingevoerde getallen komen overeen met de Waygate-screenshots. '+
   'Het buismodel is niet vastgelegd in de referentie en “Source to Detector” is nog niet onafhankelijk gelijkgesteld aan FFD. '+
   'Dit is geen kalibratie of vrijgegeven belichtingstijd.';
 }
}
function render(){
 const container=$('rtWaygateBody');if(!container)return;
 container.replaceChildren();
 const count=$('rtWaygateCount');
 if(!current){
  if(count)count.textContent='Nog geen privésoftwarepunten geïmporteerd';
  const note=document.createElement('p');note.className='small-muted';
  note.textContent='Importeer de JSON met de Waygate-screenshotpunten. Deze getallen staan niet in de openbare GitHub-code.';
  container.append(note);
  if($('rtWaygateMatch'))$('rtWaygateMatch').textContent='';
  return;
 }
 const c=current.conditions;
 if(count)count.textContent=current.points.length+' lokale softwarepunten';
 const context=document.createElement('p');context.className='small-muted';
 context.textContent='Waygate-software · '+fmt(c.energyKv)+' kV · '+fmt(c.currentMa)+' mA · '+
  fmt(c.thicknessMm)+' mm Fe · '+c.film+' · Source to Detector '+fmt(c.sourceDetectorMm)+
  ' mm'+(c.equipmentModel?' · '+c.equipmentModel:' · buismodel onbekend');
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
function init(){
 const panel=$('rtWaygateReference');if(!panel)return;
 const loaded=read();if(!loaded.ok)message(loaded.error,true);else current=loaded.data;
 $('rtWaygateImport')?.addEventListener('change',importFile);
 $('rtWaygateExport')?.addEventListener('click',exportJson);
 $('rtWaygateForget')?.addEventListener('click',forget);
 for(const id of ['kv','ma','thickness','film','distance','xrayModel']){
  $(id)?.addEventListener('change',compare);
  $(id)?.addEventListener('input',compare);
 }
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
