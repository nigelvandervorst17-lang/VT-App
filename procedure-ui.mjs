/** BASIC RT PRO · separate IQI and filmverdeling. No proprietary procedures. */
import {lookupProcedureIqi,planFilmPlacement} from './rt-procedure.mjs';
const e=id=>document.getElementById(id);
const fmt=(v,d=2)=>new Intl.NumberFormat('nl-NL',{maximumFractionDigits:d}).format(v);
const num=id=>Number(String(e(id)?.value??'').trim().replace(',','.'));
const text=(parent,content)=>{const p=document.createElement('p');p.className='procedure-line';p.textContent=content;parent.appendChild(p);return p;};
let lastPlan=null;

const filmFormatLengthMm=value=>{
 const match=/^(?:(?:D4|D5):)?\d{1,2}x(\d{1,2})$/.exec(String(value||''));
 return match?Number(match[1])*10:null;
};
function updateFilmFormatHelp(){
 const format=e('procFilmFormat'),length=e('procFilmLen'),note=e('procFilmFormatHelp');
 if(!format||!length||!note)return;
 const nominal=filmFormatLengthMm(format.value);
 if(nominal===null){
  note.textContent='Ander formaat / D7 / Rollpack: vul de werkelijk bruikbare filmlengte in mm in.';
  return;
 }
 const usable=Number(String(length.value).trim().replace(',','.'));
 const label=format.options[format.selectedIndex]?.textContent||format.value;
 if(Number.isFinite(usable)&&usable>nominal+1e-6){
  note.textContent='Bruikbare lengte groter dan de nominale filmlengte ('+nominal+' mm). Controleer de richting of kies een eigen formaat.';
  return;
 }
 note.textContent=label+' · nominale lengte '+nominal+' mm. Pas de bruikbare lengte zelf aan voor randen en markeringen. Overlap wordt apart ingesteld.';
}
function updateIQI(){
 const result=lookupProcedureIqi({
  standard:'iso',qualityClass:e('procClass').value,material:'steel',
  technique:e('procTechnique').value,iqiSide:e('procSide').value,
  tMm:num('procT'),wMm:num('procW')
 });
 const area=e('procIqiOutput');area.replaceChildren();
 e('procW').closest('.field-card').hidden=e('procTechnique').value==='sw';
 if(!result.ok){
  area.className='procedure-answer invalid';
  const title=document.createElement('strong');title.textContent='IQI-uitkomst niet beschikbaar';area.append(title);
  text(area,result.error);
 }else{
  area.className='procedure-answer';
  const heading=document.createElement('h3');heading.textContent=result.wire+' · Ø '+fmt(result.diameterMm,3)+' mm';area.append(heading);
  text(area,'IQI-draadgroep: '+result.wireGroup+' · Materiaal: staal');
  text(area,'Vereiste draad volgens de aangehaalde tabel; daadwerkelijke zichtbaarheid moet op de film worden beoordeeld.');
  text(area,result.note);
  for(const warning of result.warnings)text(area,'• '+warning);
  const src=document.createElement('small');src.textContent='Normreferentie: '+result.source;area.append(src);
 }
}
function updateFilm(){
 const shape=e('procShape').value;
 e('procODWrap').hidden=shape!=='ring';
 e('procLengthWrap').hidden=shape!=='straight';
 const useful=num('procFilmLen');
 const max=filmFormatLengthMm(e('procFilmFormat').value);
 const p=max!==null&&useful>max+0.000001
  ?{ok:false,error:'De ingevoerde bruikbare lengte is langer dan de gekozen filmstrook.'}
  :planFilmPlacement({
    shape,outerDiameterMm:num('procOD'),examinedLengthMm:num('procLength'),
    usableFilmLengthMm:useful,overlapMm:num('procOverlap')
  });
 const output=e('procFilmOutput');output.replaceChildren();
 lastPlan=p.ok?p:null;e('procExport').disabled=!p.ok;
 if(!p.ok){
  output.className='procedure-answer invalid';
  const title=document.createElement('strong');title.textContent='Filmplan niet beschikbaar';output.append(title);
  text(output,p.error);e('procSketch').replaceChildren();return;
 }
 output.className='procedure-answer';
 const title=document.createElement('h3');title.textContent=p.filmCount+' film'+(p.filmCount===1?'':'s')+' · '+fmt(p.spacingCm)+' cm h.o.h.';
 output.append(title);
 text(output,shape==='ring'?'Afstand langs de buitenomtrek, vanaf het 0-punt.':'Afstand langs de rechte las, vanaf het 0-punt.');
 text(output,'Bruikbare filmlengte: '+fmt(p.usefulLengthMm/10)+' cm · berekende overlap tussen stroken: '+fmt(p.actualPlanningOverlapMm/10)+' cm');
 const centre=document.createElement('div');centre.className='proc-midpoint-highlight';
 const mid=document.createElement('strong');mid.textContent='Midden van één filmstrook: '+fmt(p.selectedStripMidpointMm/10)+' cm vanaf het begin';
 centre.append(mid);output.append(centre);
 const list=document.createElement('ol');list.className='proc-positions';
 for(const x of p.placement.slice(0,30)){
  const li=document.createElement('li');li.className='proc-film-position';
  const line=document.createElement('strong');line.textContent='Film '+x.film+' — MIDDELPUNT: '+fmt(x.positionMm/10)+' cm';
  const detail=document.createElement('span');detail.textContent='Begin: '+fmt(x.startMm/10)+' cm · Einde: '+fmt(x.endMm/10)+' cm'+(x.wrapsPastZeroMm>0?' · '+fmt(x.wrapsPastZeroMm/10)+' cm voorbij 0-punt':'');
  li.append(line,detail);list.append(li);
 }
 output.append(list);
 if(p.filmCount>30)text(output,'Meer films beschikbaar in de volledige CSV-export.');
 text(output,p.exposureGuide);
 for(const note of p.notes)text(output,note);
 const src=document.createElement('small');src.textContent=p.source;output.append(src);
 draw(p);
}
function update(){updateIQI();updateFilm();}
function draw(p){
 const container=e('procSketch');container.replaceChildren();
 const ns='http://www.w3.org/2000/svg';const make=(tag,a,parent)=>{const x=document.createElementNS(ns,tag);Object.entries(a||{}).forEach(([k,v])=>x.setAttribute(k,String(v)));(parent||svg).appendChild(x);return x};
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 420 230');svg.setAttribute('role','img');svg.setAttribute('aria-label',p.shape==='ring'?'Schets van buisomtrek met filmmiddenpunten':'Schets van rechte las met filmmiddenpunten');container.append(svg);
 make('rect',{x:0,y:0,width:420,height:230,rx:15,fill:'#0d2539'});
 if(p.shape==='ring'){
  make('circle',{cx:185,cy:115,r:83,fill:'none',stroke:'#b1d3e7','stroke-width':16});
  make('circle',{cx:185,cy:115,r:66,fill:'none',stroke:'#30546b','stroke-width':1.5,'stroke-dasharray':'4 4'});
  make('line',{x1:185,y1:22,x2:185,y2:35,stroke:'#ffdf8e','stroke-width':3});
  const zero=make('text',{x:185,y:14,'text-anchor':'middle','font-size':11,fill:'#ffdf8e'});zero.textContent='0 cm';
  const n=p.filmCount;for(let i=0;i<Math.min(n,32);i++){const rad=2*Math.PI*(p.placement[i].angleDeg/360)-Math.PI/2,x=185+83*Math.cos(rad),y=115+83*Math.sin(rad);
   make('circle',{cx:x,cy:y,r:4.5,fill:i===0?'#ffd47e':'#6aead3',stroke:'#07344b','stroke-width':1});
   if(n<=8) {const l=make('text',{x:185+112*Math.cos(rad),y:118+111*Math.sin(rad),'text-anchor':'middle','font-size':10,fill:'#f5f9ff'});l.textContent=`${fmt(p.placement[i].positionMm/10)} cm`;}
  }
  let label=make('text',{x:185,y:113,'text-anchor':'middle','font-size':13,fill:'#edf8ff'});label.textContent=`${fmt(p.totalMm/Math.PI)} mm Ø`;
  let sub=make('text',{x:185,y:133,'text-anchor':'middle','font-size':11,fill:'#bed9e9'});sub.textContent=`${p.filmCount} films`;
  let axis=make('text',{x:185,y:217,'text-anchor':'middle','font-size':11,fill:'#a6cce3'});axis.textContent='Filmmiddens vanaf 0 cm · schematisch';
 }else{
  make('rect',{x:28,y:91,width:364,height:43,rx:8,fill:'#23435b',stroke:'#afd3e7'});
  make('line',{x1:28,y1:113,x2:392,y2:113,stroke:'#f9d692','stroke-width':3,'stroke-dasharray':'6 5'});
  const n=p.filmCount;
  for(let i=0;i<Math.min(n,26);i++){
    const x=28+364*(p.placement[i].positionMm/p.totalMm);
    make('line',{x1:x,y1:78,x2:x,y2:145,stroke:i===0?'#ffdb81':'#61e6cb','stroke-width':2});
    if(n<=8){const tx=make('text',{x:x,y:65,'font-size':10,'text-anchor':'middle',fill:'#eaf5ff'});tx.textContent=`${fmt(p.placement[i].positionMm/10)} cm`;}
  }
  const tx=make('text',{x:210,y:195,'text-anchor':'middle','font-size':11,fill:'#bed9e9'});tx.textContent=`Laslengte ${fmt(p.totalMm/10)} cm`;
 }
}
function csv(){if(!lastPlan)return;
 const round2=n=>Math.round(n*100)/100;
 const cell=(n)=>String(round2(n/10)).replace('.',',');
 const rows=['Film;Begin (cm vanaf 0);MIDDELPUNT (cm vanaf 0);Einde (cm vanaf 0);Einde voorbij 0 (cm);Hoek midden (graden)',
 ...lastPlan.placement.map(p=>`${p.film};${cell(p.startMm)};${cell(p.positionMm)};${cell(p.endMm)};${cell(p.wrapsPastZeroMm)};${p.angleDeg===null?'':String(p.angleDeg).replace('.',',')}`)];
 rows.unshift('CONCEPT FILMINDELING - NIET VRIJGEGEVEN VOOR RT-OPNAMES');
 const blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Basic-RT-PRO-filmplan-CONCEPT.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),800);
}

function showProcedureView(view){
 const selected=view==='film'?'film':'iqi';
 for(const element of document.querySelectorAll('#screen-procedure [data-proc-pane]'))
  element.hidden=element.dataset.procPane!==selected;
 for(const btn of document.querySelectorAll('#screen-procedure [data-proc-tab]')){
  const active=btn.dataset.procTab===selected;
  btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
 }
 const title=e('procViewTitle'),subtitle=e('procViewIntro');
 if(title)title.textContent=selected==='film'?'Filmverdeling':'IQI-controle';
 if(subtitle)subtitle.textContent=selected==='film'
  ?'Kies een filmformaat, afmeting en overlap voor een theoretische verdeling. Geen opnameschema.'
  :'Controle van ISO-draad-IQI bij staal op basis van de gekozen opnamegeometrie.';
}
export function initProcedureUi(nav){
 for(const id of ['procClass','procTechnique','procSide','procT','procW']){
  e(id).addEventListener('input',updateIQI);
  e(id).addEventListener('change',updateIQI);
 }
 for(const id of ['procShape','procOD','procLength','procFilmLen','procOverlap']){
  e(id).addEventListener('input',updateFilm);
  e(id).addEventListener('change',updateFilm);
 }
 e('procFilmFormat').addEventListener('change',()=>{
  const nominal=filmFormatLengthMm(e('procFilmFormat').value);
  if(nominal!==null)e('procFilmLen').value=String(nominal);
  updateFilmFormatHelp();updateFilm();
 });
 e('procFilmLen').addEventListener('input',updateFilmFormatHelp);
 e('procFilmLen').addEventListener('change',updateFilmFormatHelp);
 e('procTabIqi').addEventListener('click',()=>showProcedureView('iqi'));
 e('procTabFilm').addEventListener('click',()=>showProcedureView('film'));
 document.querySelectorAll('[data-proc-open]').forEach(button=>button.addEventListener('click',()=>{
  showProcedureView(button.dataset.procView);nav('procedure');
 }));
 e('procBack').addEventListener('click',()=>nav('calc'));
 e('procExport').addEventListener('click',csv);
 e('procExport').disabled=true;
 updateFilmFormatHelp();update();showProcedureView('iqi');
}
