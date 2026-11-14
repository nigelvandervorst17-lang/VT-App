/* Basic RT PRO — separate physical film measurements.
   User-entered densitometer readings only: no simulated measurements, no exposure calculations.
   The data remain in this browser until explicitly exported or imported. */
'use strict';
const KEY='basic-rt-pro-physical-film-tests-v1';
const SCHEMA='basic-rt-pro-physical-film-tests-v1';
const LIMIT=500;
const $=id=>document.getElementById(id);
const OPTIONS={
  source:['Se-75','Ir-192','Co-60','X-ray','other'],
  material:['Fe','RVS','Al','other'],
  film:['D4','D5','D7','other'],
  geometry:['','SWSI','DWDI','DWSI','other'],
  screens:['','Pb','none','other'],
  processing:['','manual','automatic','other'],
  filmCheck:['not-reviewed','looks-good','anomaly'],
  iqi:['not-reviewed','visible','not-visible']
};
const FIELDS={
  testId:'ftTestId',date:'ftDate',source:'ftSource',sourceRef:'ftSourceRef',
  material:'ftMaterial',thicknessMm:'ftThickness',film:'ftFilm',filmBatch:'ftFilmBatch',
  actualExposure:'ftExposure',distanceMm:'ftDistance',activityCi:'ftActivity',
  kv:'ftKv',ma:'ftMa',geometry:'ftGeometry',screens:'ftScreens',
  d1:'ftD1',d2:'ftD2',d3:'ftD3',readingPosition:'ftReadPosition',
  densitometerId:'ftDensitometer',processing:'ftProcessing',developerTempC:'ftTemp',
  developMinutes:'ftDevelopMin',iqi:'ftIqi',filmCheck:'ftFilmCheck',notes:'ftNotes'
};
const fmt=n=>Number(n).toLocaleString('nl-NL',{maximumFractionDigits:3});
const cap=(value,max=140)=>String(value??'').trim().slice(0,max);
const decimal=v=>{
  const s=String(v??'').trim().replace(',','.');
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)?Number(s):NaN;
};
const validDate=s=>{
  if(!/^(?:19|20|21)\d{2}-\d\d-\d\d$/.test(String(s)))return false;
  const date=new Date(s+'T00:00:00.000Z');
  return Number.isFinite(+date)&&date.toISOString().slice(0,10)===s;
};
const exposureSeconds=input=>{
  const s=String(input??'').trim();
  if(/^\d+(?::\d{1,2}){1,2}$/.test(s)){
    const parts=s.split(':').map(Number);
    if(parts.slice(1).some(n=>n>=60))return NaN;
    return parts.reduce((sum,x)=>sum*60+x,0);
  }
  return decimal(s);
};
const numberOrNull=(value,min,max,name,errors,required=false)=>{
  if(value===null||value===undefined||String(value).trim()===''){
    if(required)errors.push(name+' ontbreekt.');
    return null;
  }
  const n=decimal(value);
  if(!Number.isFinite(n)||n<min||n>max){errors.push(name+' is ongeldig.');return null;}
  return n;
};
const htmlValue=id=>$(id)?.value??'';
let records=[],editId=null;
function status(text,problem=false){
  const el=$('ftStatus');if(!el)return;
  el.textContent=text;el.classList.toggle('ft-error',problem);
}
function normalise(raw){
  const errors=[];
  const row={id:cap(raw.id,90),kind:'physical_film_densitometer',
    evidenceStatus:'user_recorded_unverified',schema:SCHEMA,
    testId:cap(raw.testId,72),date:cap(raw.date,20),
    source:cap(raw.source,30),sourceRef:cap(raw.sourceRef,80),
    film:cap(raw.film,20),filmBatch:cap(raw.filmBatch,90),
    material:cap(raw.material,20),geometry:cap(raw.geometry,20),
    screens:cap(raw.screens,20),processing:cap(raw.processing,20),
    readingPosition:cap(raw.readingPosition,120),densitometerId:cap(raw.densitometerId,80),
    filmCheck:cap(raw.filmCheck,25),iqi:cap(raw.iqi,25),notes:cap(raw.notes,800),
    actualExposure:cap(raw.actualExposure,40),
    createdAt:cap(raw.createdAt,35)||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  if(!row.testId)errors.push('Testnummer is verplicht.');
  if(!validDate(row.date))errors.push('Vul de echte opnamedatum in.');
  for(const key of Object.keys(OPTIONS)){
    if(!OPTIONS[key].includes(row[key]))errors.push('Ongeldige keuze bij '+key+'.');
  }
  row.thicknessMm=numberOrNull(raw.thicknessMm,0.001,2000,'Materiaaldikte',errors,true);
  const sec=exposureSeconds(row.actualExposure);
  if(!Number.isFinite(sec)||sec<=0||sec>2592000)errors.push('Werkelijke belichtingstijd is ongeldig (bijv. 14:28).');
  row.exposureSeconds=Number.isFinite(sec)?sec:null;
  row.distanceMm=numberOrNull(raw.distanceMm,0.01,1e6,'Bron-/focus-filmafstand',errors);
  row.activityCi=numberOrNull(raw.activityCi,0.00001,1e6,'Bronactiviteit',errors);
  row.kv=numberOrNull(raw.kv,1,1000,'kV',errors);
  row.ma=numberOrNull(raw.ma,0.001,1000,'mA',errors);
  row.developerTempC=numberOrNull(raw.developerTempC,0,80,'Ontwikkeltemperatuur',errors);
  row.developMinutes=numberOrNull(raw.developMinutes,0.01,240,'Ontwikkeltijd',errors);
  const densities=Array.isArray(raw.densityReadings)?raw.densityReadings:[raw.d1,raw.d2,raw.d3];
  if(densities.length<1||densities.length>3)errors.push('Gebruik één tot drie D-metingen.');
  row.densityReadings=densities.slice(0,3).map((d,i)=>numberOrNull(d,0,6,'D-meting '+(i+1),errors,i===0));
  if(row.densityReadings[0]===null)errors.push('De eerste gemeten filmzwarting (D) is verplicht.');
  if(errors.length)return {ok:false,errors};
  return {ok:true,row};
}
function formRecord(){
  const raw={};for(const [key,id]of Object.entries(FIELDS))raw[key]=htmlValue(id);
  raw.densityReadings=[raw.d1,raw.d2,raw.d3];
  raw.id=editId||'ft-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
  raw.createdAt=editId?records.find(x=>x.id===editId)?.createdAt:null;
  return normalise(raw);
}
function readAll(){
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return [];
    const a=JSON.parse(raw);
    if(!Array.isArray(a)||a.length>LIMIT)throw Error('Ongeldig lokaal formaat');
    const checked=a.map(normalise);
    if(checked.some(x=>!x.ok))throw Error('Ongeldige of verouderde records');
    return checked.map((x,i)=>({...x.row,createdAt:cap(a[i].createdAt,35)||x.row.createdAt,
      updatedAt:cap(a[i].updatedAt,35)||x.row.updatedAt}));
  }catch(error){
    status('Praktijkmetingen konden niet worden gelezen. Bewaar deze browsergegevens en vraag om hulp; er is niets verwijderd.',true);
    return null;
  }
}
function persist(next){
  try{localStorage.setItem(KEY,JSON.stringify(next));records=next;return true;}
  catch{status('Opslaan niet mogelijk. Controleer de browseropslag of exporteer eerst een back-up.',true);return false;}
}
function save(event){
  event.preventDefault();
  const result=formRecord();
  if(!result.ok){status(result.errors.join(' '),true);return;}
  if(records.some(x=>x.testId.toLocaleLowerCase('nl-NL')===result.row.testId.toLocaleLowerCase('nl-NL')&&x.id!==editId)){
    status('Dit testnummer bestaat al. Open het bestaande record met Bewerken.',true);return;
  }
  const old=editId?records.find(x=>x.id===editId):null;
  const row={...result.row,createdAt:old?.createdAt||new Date().toISOString()};
  const next=editId?records.map(x=>x.id===editId?row:x):[row,...records];
  if(next.length>LIMIT){status('Het lokale register bevat maximaal '+LIMIT+' tests. Exporteer eerst een back-up.',true);return;}
  if(!persist(next))return;
  editId=null;$('ftForm').reset();$('ftSave').textContent='Praktijktest opslaan';
  status('Fysieke filmmeting lokaal opgeslagen als ONGEVERIFIEERD. Geen aanpassing aan belichtingscurves.');
  render();
}
function putInForm(row){
  for(const [key,id]of Object.entries(FIELDS)){
    const el=$(id);
    if(!el)continue;
    let value=row[key]??'';
    if(['d1','d2','d3'].includes(key))value=row.densityReadings[Number(key[1])-1]??'';
    if(['actualExposure'].includes(key))value=row.actualExposure;
    el.value=String(value);
  }
  editId=row.id;
  $('ftSave').textContent='Wijzigingen opslaan';
  $('ftFormDetails').open=true;
  $('ftForm').scrollIntoView({behavior:'smooth',block:'start'});
  status('Je bewerkt een bestaande test. Opslaan vervangt alleen dit lokale record.');
}
function newForm(){
  editId=null;$('ftForm').reset();$('ftSave').textContent='Praktijktest opslaan';
  status('Nieuwe test. Vul uitsluitend waarden in die werkelijk zijn gemeten of geregistreerd.');
}
function element(tag,text,cls){
  const e=document.createElement(tag);
  if(text!==undefined)e.textContent=String(text);
  if(cls)e.className=cls;
  return e;
}
function render(){
  const list=$('ftList');if(!list)return;
  list.replaceChildren();
  $('ftCount').textContent=records.length+' fysieke filmtest'+(records.length===1?'':'en')+' lokaal bewaard';
  if(!records.length){
    list.append(element('p','Nog geen praktijkmetingen opgeslagen. Waygate-softwarepunten zijn hier bewust niet opgenomen.','small-muted'));
    return;
  }
  for(const row of records.slice(0,LIMIT)){
    const block=element('article',undefined,'ft-record');
    block.append(element('strong',row.testId+' · '+row.date+' · '+row.source+' / '+row.film));
    block.append(element('p',fmt(row.thicknessMm)+' mm '+row.material+' · '+row.actualExposure+' (werkelijk) · D '+row.densityReadings.filter(d=>d!==null).map(fmt).join(' / ')));
    const extras=[];
    if(row.distanceMm!==null)extras.push('SFD/FFD '+fmt(row.distanceMm)+' mm');
    if(row.activityCi!==null)extras.push(fmt(row.activityCi)+' Ci');
    if(row.kv!==null)extras.push(fmt(row.kv)+' kV');
    if(row.ma!==null)extras.push(fmt(row.ma)+' mA');
    if(row.filmBatch)extras.push('Film/batch '+row.filmBatch);
    if(extras.length)block.append(element('p',extras.join(' · ')));
    const filmLabels={'not-reviewed':'niet beoordeeld','looks-good':'visueel goed','anomaly':'afwijking gemeld'};
    const iqiLabels={'not-reviewed':'niet beoordeeld','visible':'zichtbaar genoteerd','not-visible':'niet zichtbaar'};
    block.append(element('p','Film: '+filmLabels[row.filmCheck]+' · IQI: '+iqiLabels[row.iqi]));
    const missing=[];
    if(row.distanceMm===null)missing.push('SFD/FFD');
    if(row.source==='X-ray'&&(row.kv===null||row.ma===null))missing.push('kV/mA');
    if(row.source!=='X-ray'&&row.activityCi===null)missing.push('bronactiviteit');
    if(row.geometry==='')missing.push('opnametechniek');
    if(row.screens==='')missing.push('schermen');
    if(row.processing==='')missing.push('ontwikkelmethode');
    block.append(element('p',missing.length?'Aan te vullen voor vergelijkingsanalyse: '+missing.join(', '):'Invoer compleet voor voorbereidende vergelijking; nog niet gevalideerd.','ft-muted'));
    block.append(element('p','Fysieke film • Densitometer • Door gebruiker geregistreerd • NIET onafhankelijk geverifieerd','ft-unverified'));
    const controls=element('div',undefined,'ft-record-actions');
    const edit=element('button','Bewerken');edit.type='button';edit.addEventListener('click',()=>putInForm(row));
    const remove=element('button','Verwijderen');remove.type='button';
    remove.addEventListener('click',()=>{
      if(!confirm('Praktijkmeting '+row.testId+' definitief uit dit toestel verwijderen? Exporteer eerst een back-up.'))return;
      if(persist(records.filter(x=>x.id!==row.id))){if(editId===row.id)newForm();render();status('Praktijkmeting lokaal verwijderd.');}
    });
    controls.append(edit,remove);block.append(controls);list.append(block);
  }
}
function download(name,body,type){
  const url=URL.createObjectURL(new Blob([body],{type}));
  const link=document.createElement('a');link.href=url;link.download=name;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function exportJson(){
  if(!records.length){status('Nog geen fysieke filmmetingen om te exporteren.',true);return;}
  download('basic-rt-pro-fysieke-filmtesten.json',
    JSON.stringify({schema:SCHEMA,exportedAt:new Date().toISOString(),
      note:'Uitsluitend door gebruiker geregistreerde fysieke filmmetingen; niet onafhankelijk gevalideerd. Geen softwarepunten of belichtingsadvies.',
      tests:records},null,2),'application/json');
  status('JSON-back-up aangeboden. Controleer in Bestanden of het downloaden is gelukt.');
}
function csvCell(value){
  let s=String(value??'');
  if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
function exportCsv(){
  if(!records.length){status('Nog geen fysieke filmmetingen om te exporteren.',true);return;}
  const columns=['testId','date','source','sourceRef','film','filmBatch','material',
    'thicknessMm','actualExposure','exposureSeconds','distanceMm','activityCi','kv','ma',
    'geometry','screens','D1','D2','D3','readingPosition','densitometerId',
    'processing','developerTempC','developMinutes','filmCheck','iqi','notes','evidenceStatus'];
  const rows=records.map(r=>({...r,D1:r.densityReadings[0],D2:r.densityReadings[1],D3:r.densityReadings[2]}));
  const content='\uFEFF'+columns.join(';')+'\r\n'+rows.map(r=>columns.map(k=>csvCell(r[k])).join(';')).join('\r\n');
  download('basic-rt-pro-fysieke-filmtesten.csv',content,'text/csv;charset=utf-8');
  status('CSV-export aangeboden. CSV is alleen een kopie; de originele gegevens blijven lokaal.');
}
async function importJson(event){
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(file.size>2000000){status('Importbestand te groot (maximaal 2 MB).',true);return;}
  try{
    const data=JSON.parse(await file.text());
    if(data?.schema!==SCHEMA||!Array.isArray(data.tests)||data.tests.length>LIMIT)
      throw Error('Ongeldig formaat of te veel records.');
    const checked=data.tests.map(normalise);
    if(checked.some(x=>!x.ok))throw Error('Bestand bevat ongeldige meetwaarden of ontbrekende verplichte gegevens.');
    const ids=new Set(),keys=new Set();
    const rows=checked.map((x,i)=>{
      const row={...x.row,createdAt:cap(data.tests[i].createdAt,35)||x.row.createdAt};
      const key=row.testId.toLocaleLowerCase('nl-NL');
      if(keys.has(key))throw Error('Dubbele testnummers in importbestand.');
      keys.add(key);
      if(ids.has(row.id)||!row.id){row.id='import-'+i+'-'+Date.now();}
      ids.add(row.id);
      return row;
    });
    if(!confirm('De '+records.length+' huidige lokale praktijkmeting(en) VERVANGEN door '+rows.length+' uit dit bestand? Exporteer eerst een back-up.'))return;
    if(!persist(rows))return;
    newForm();render();status(rows.length+' fysieke filmtesten geïmporteerd; allemaal ONGEVERIFIEERD.');
  }catch(error){status('Import mislukt: '+String(error?.message||'ongeldig JSON-bestand'),true);}
}
function init(){
  if(!$('ftForm'))return;
  const data=readAll();
  if(data===null){$('ftSave').disabled=true;return;}
  records=data;
  $('ftForm').addEventListener('submit',save);
  $('ftNew').addEventListener('click',newForm);
  $('ftExportJson').addEventListener('click',exportJson);
  $('ftExportCsv').addEventListener('click',exportCsv);
  $('ftImport').addEventListener('change',importJson);
  render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
