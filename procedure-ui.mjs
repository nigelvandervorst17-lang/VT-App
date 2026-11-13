/** App-only procedure screen; calculation core in rt-procedure.mjs. */
import {lookupProcedureIqi,planFilmPlacement} from './rt-procedure.mjs';
const e=id=>document.getElementById(id);
const fmt=(v,d=2)=>new Intl.NumberFormat('nl-NL',{maximumFractionDigits:d}).format(v);
const num=id=>Number(String(e(id).value).replace(',','.'));
const text=(parent,content)=>{const p=document.createElement('p');p.className='procedure-line';p.textContent=content;parent.appendChild(p);return p};
const f=(id,msg)=>{e(id).textContent=msg};
let lastPlan=null;
function update(){
 const standard=e('procNorm').value;
 const iso=standard==='iso';
 e('procClassWrap').hidden=!iso;
 e('procMaterialWrap').hidden=!iso;
 e('procMetalScope').textContent=iso?'ISO: uitsluitend lassen in staal, nikkel, titanium en legeringen t/m 75 mm doorstraalde dikte.':'ASME: uitsluitend stalen gietstukken t/m 76 mm — NIET toepassen als ASME-lasprocedure.';
 e('procTechnique').disabled=!iso;
 e('procTechnique').value=iso?e('procTechnique').value:'sw';
 e('procTechniqueWrap').hidden=!iso;
 e('procW').closest('.field-card').hidden=!iso||e('procTechnique').value==='sw';
 const side=e('procSide').value,mme=e('procMme').value;
 const args={standard,qualityClass:e('procClass').value,technique:e('procTechnique').value,mme,iqiSide:side,tMm:num('procT'),wMm:num('procW'),material:iso?e('procMaterial').value:'steel'};
 const result=lookupProcedureIqi(args);
 const area=e('procIqiOutput');area.replaceChildren();
 if(!result.ok){area.className='procedure-answer invalid';const h=document.createElement('strong');h.textContent='Nog geen geldige IQI-uitkomst';area.append(h);text(area,result.error);}
 else{
  area.className='procedure-answer';const h=document.createElement('h3');h.textContent=`${result.wire} · Ø ${fmt(result.diameterMm,3)} mm`;area.append(h);
  text(area,`Kies: ${result.wireGroup} · Materiaalgroep: ${result.materialGroup}`);
  text(area,`Benodigde IQI's: ${result.minimumCount} minimaal ${standard==='iso'?'per exposure':'voor de opgegeven opnameconfiguratie'} (speciale gevallen in bron controleren).`);
  text(area,result.note); for(const w of result.warnings)text(area,'• '+w);
  const s=document.createElement('small');s.textContent='Bron: '+result.source;area.append(s);
 }
 const film={standard,shape:e('procShape').value,mme,technique:e('procTechnique').value,
  outerDiameterMm:num('procOD'),examinedLengthMm:num('procLength'),usableFilmLengthMm:num('procFilmLen'),
  overlapMm:num('procOverlap'),sourceFilmDistanceMm:num('procSfd')};
 e('procODWrap').hidden=film.shape!=='ring'; e('procLengthWrap').hidden=film.shape!=='straight';
 e('procSfdWrap').hidden=!(standard==='iso'&&['1','5'].includes(String(mme)));
 const p=planFilmPlacement(film),output=e('procFilmOutput');output.replaceChildren();lastPlan=p.ok?p:null;e('procExport').disabled=!p.ok;
 if(!p.ok){output.className='procedure-answer invalid';const h=document.createElement('strong');h.textContent='Filmplan nog niet beschikbaar';output.append(h);text(output,p.error);e('procSketch').replaceChildren();return;}
 output.className='procedure-answer';const h=document.createElement('h3');h.textContent=`${p.filmCount} film${p.filmCount>1?'s':''} · ${fmt(p.spacingCm)} cm h.o.h.`;output.append(h);
 text(output,film.shape==='ring'?'Afstand gemeten langs buitenomtrek tussen film-middenpunten vanaf 0°; niet in rechte lijn.':'Afstand tussen de film-middenpunten langs de te beoordelen las.');
 text(output,`Bruikbare film-/opnamelengte: ${fmt(p.usefulLengthMm/10)} cm · geplande effectieve overlap: ${fmt(p.actualPlanningOverlapMm/10)} cm`);
 const mid=document.createElement('div');mid.className='proc-midpoint-highlight';
 const midTitle=document.createElement('strong');midTitle.textContent=`Midden van ingevoerde filmstrook (${fmt(p.enteredFilmLengthMm/10)} cm): ${fmt(p.selectedStripMidpointMm/10)} cm vanaf begin van de strook`;mid.append(midTitle);
 const midHelp=document.createElement('p');midHelp.textContent=`Per film hieronder staat het te markeren MIDDELPUNT in cm, gemeten vanaf het 0-punt ${p.shape==='ring'?'over de buisomtrek':'langs de rechte las'}.`;mid.append(midHelp);output.append(mid);
 const ol=document.createElement('ol');ol.className='proc-positions';
 p.placement.slice(0,30).forEach(x=>{
   const li=document.createElement('li');li.className='proc-film-position';
   const title=document.createElement('strong');title.textContent=`Film ${x.film} — MIDDELPUNT: ${fmt(x.positionMm/10)} cm`;li.append(title);
   const sub=document.createElement('span');sub.textContent=`Begin bruikbaar: ${fmt(x.startMm/10)} cm · Einde bruikbaar: ${fmt(x.endMm/10)} cm${x.wrapsPastZeroMm>0?' · '+fmt(x.wrapsPastZeroMm/10)+' cm voorbij 0-punt':''}`;li.append(sub);
   ol.append(li);
 });output.append(ol);
 if(p.filmCount>30)text(output,`...en nog ${p.filmCount-30} films; exporteer het volledige plan als CSV.`);
 text(output,p.exposureGuide);p.notes.forEach(n=>text(output,n));
 const caut=document.createElement('p');caut.className='proc-red';caut.textContent='LET OP: dit is een theoretisch filmverdeelplan. Verifieer marker-overlap, vrije beeldlengte, stralingshoek, IQI en minimum aantal belichtingen volgens procedure.';output.append(caut);
 const s=document.createElement('small');s.textContent='Bron: '+p.source;output.append(s);
 e('procExport').disabled=false;draw(p);
}
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
function setOverlap(){e('procOverlap').value=e('procNorm').value==='asme'?'40':'10';}
export function initProcedureUi(nav){
 for(const id of ['procNorm','procClass','procTechnique','procMme','procSide','procMaterial','procT','procW','procShape','procOD','procLength','procFilmLen','procOverlap','procSfd']){
  e(id).addEventListener('input',update); e(id).addEventListener('change',update);
 }
 e('procNorm').addEventListener('change',()=>{
   if(e('procNorm').value==='asme'&&!['1','2','3','4','6','7'].includes(e('procMme').value))e('procMme').value='1';
   if(e('procNorm').value==='iso'&&e('procMme').value==='6')e('procMme').value='6A';
   e('procSide').value='source';setOverlap();update()});
 e('procMme').addEventListener('change',()=>{
   const m=e('procMme').value;
   if(e('procNorm').value==='iso'){
    e('procTechnique').value=['6A','6B'].includes(m)?'dwdi':['4','5','12'].includes(m)?'dwsi':'sw';
    if(['6A','6B'].includes(m))e('procSide').value='source';
   }else if(m==='6')e('procSide').value='source';
   update();
 });
 e('procShape').addEventListener('change',()=>{if(e('procNorm').value==='iso'){if(e('procShape').value==='straight'&&e('procMme').value==='2')e('procMme').value='1';if(e('procShape').value==='ring'&&e('procMme').value==='1')e('procMme').value='2';}update()});
 e('procExport').addEventListener('click',csv);
 document.querySelectorAll('[data-proc-open]').forEach(x=>x.addEventListener('click',()=>nav('procedure')));
 e('procBack').addEventListener('click',()=>nav('calc'));
 e('procExport').disabled=true;setOverlap();update();
}
