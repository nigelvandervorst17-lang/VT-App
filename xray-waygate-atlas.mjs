/* Waygate software reference atlas (local-only, unvalidated).
 * Plots observed software points. No exposure extrapolation, fitting, or calibration.
 * No request to a server. The existing RT engine remains unchanged.
 */
'use strict';
const $=id=>document.getElementById(id);
const DB_KEY='basic-rt-pro-waygate-atlas-v1';
const ORIGINAL_KEY='basic-rt-pro-waygate-xray-local-v1';
const ns='http://www.w3.org/2000/svg';
const dec=v=>{
 const t=String(v??'').trim().replace(',','.');
 return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)?Number(t):NaN;
};
const equal=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<0.000001;
const format=v=>Number(v).toLocaleString('nl-NL',{maximumFractionDigits:2});
const timeLabel=v=>{
 const n=Math.round(v);
 return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(p=>String(p).padStart(2,'0')).join(':');
};
function isPoint(p){
 return !!p&&typeof p==='object'&&
  [p.energyKv,p.currentMa,p.thicknessMm,p.sourceDetectorMm,p.density,p.timeSeconds].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0)&&
  p.energyKv<=350&&p.currentMa<=1000&&p.thicknessMm<=100&&p.sourceDetectorMm<=100000&&
  p.density<=6&&p.timeSeconds<=2592000&&['D4','D5','D7'].includes(p.film)&&
  p.material==='Fe'&&p.kind==='waygate_software_output';
}
function records(){
 try{
  const value=JSON.parse(localStorage.getItem(DB_KEY)||'[]');
  return Array.isArray(value)?value.filter(isPoint).slice(0,600):[];
 }catch(_){return [];}
}
function builtInReference(){
 try{
  const set=JSON.parse(localStorage.getItem(ORIGINAL_KEY)||'null');
  if(!set||set.kind!=='waygate_software_output'||!set.conditions||!Array.isArray(set.points))return [];
  const c=set.conditions;
  return set.points.map(p=>({
    energyKv:Number(c.energyKv),currentMa:Number(c.currentMa),thicknessMm:Number(c.thicknessMm),
    sourceDetectorMm:Number(c.sourceDetectorMm),film:c.film,material:c.material,
    density:Number(p.density),timeSeconds:Number(p.timeSeconds),kind:'waygate_software_output',
    origin:'import'
  })).filter(isPoint);
 }catch(_){return [];}
}
function allPoints(){
 // Imported Waygate screenshots and locally transcribed software values remain separate.
 return [...builtInReference(),...records()];
}
function values(){
 return {
  energyKv:dec($('rtCompactKv')?.value),currentMa:dec($('rtCompactActivity')?.value),
  thicknessMm:dec($('rtCompactThickness')?.value),sourceDetectorMm:dec($('rtCompactDistance')?.value),
  film:$('rtCompactFilm')?.value,material:$('material')?.value,
  density:dec($('rtCompactDensity')?.value),
  pipe:$('rtCompactPipe')?.getAttribute('aria-pressed')==='true'
 };
}
function matching(points,context,axis){
 const keep=['energyKv','currentMa','thicknessMm','sourceDetectorMm','film','material','density']
  .filter(k=>k!==({density:'density',thickness:'thicknessMm',kv:'energyKv'}[axis]));
 return !context.pipe?points.filter(p=>keep.every(k=>typeof p[k]==='number'?equal(p[k],context[k]):p[k]===context[k]))
  .sort((a,b)=>a[{density:'density',thickness:'thicknessMm',kv:'energyKv'}[axis]]-b[{density:'density',thickness:'thicknessMm',kv:'energyKv'}[axis]]):[];
}
function svgNode(tag,attributes={},text){
 const el=document.createElementNS(ns,tag);
 for(const [key,val] of Object.entries(attributes))el.setAttribute(key,String(val));
 if(text!==undefined)el.textContent=String(text);
 return el;
}
function drawGraph(points,axis,root){
 const width=350,height=242,left=56,right=13,top=20,bottom=54;
 const axisKey={density:'density',thickness:'thicknessMm',kv:'energyKv'}[axis];
 const xVals=points.map(p=>p[axisKey]),ys=points.map(p=>p.timeSeconds);
 let minX=Math.min(...xVals),maxX=Math.max(...xVals);
 const delta=Math.max((maxX-minX)*0.09,axis==='density'?0.075:axis==='thickness'?0.8:4);
 minX=Math.max(0,minX-delta);maxX+=delta;
 const ymax=Math.max(...ys)*1.15;
 const mapX=n=>left+(n-minX)/(maxX-minX)*(width-left-right);
 const mapY=n=>height-bottom-n/ymax*(height-top-bottom);
 const svg=svgNode('svg',{viewBox:'0 0 350 242',role:'img',
  'aria-label':'Waygate-softwarepunten, geen gevalideerde belichtingscurve'});
 const grid=svgNode('g');
 for(let i=0;i<=4;i++){
  const time=ymax*i/4,y=mapY(time);
  grid.append(svgNode('line',{x1:left,y1:y,x2:width-right,y2:y,stroke:'#365b76','stroke-width':1}));
  grid.append(svgNode('text',{x:left-7,y:y+4,'text-anchor':'end',fill:'#c7dce9','font-size':10},format(time)));
 }
 const horizontal=[minX,(minX+maxX)/2,maxX];
 for(const tick of horizontal){
  const x=mapX(tick);
  grid.append(svgNode('line',{x1:x,y1:top,x2:x,y2:height-bottom,stroke:'#31516a','stroke-width':1}));
  grid.append(svgNode('text',{x,y:height-bottom+18,'text-anchor':'middle',fill:'#c7dce9','font-size':10},format(tick)));
 }
 svg.append(grid);
 const unique=Array.from(new Map(points.map(p=>[p[axisKey],p])).values());
 // The dashed join only makes the progression visible; no points or times are interpolated.
 if(unique.length>1){
  const line=svgNode('polyline',{points:unique.map(p=>mapX(p[axisKey])+','+mapY(p.timeSeconds)).join(' '),
   fill:'none',stroke:'#78b8ed','stroke-width':2,'stroke-dasharray':'4 5',
   'stroke-linejoin':'round'});
  svg.append(line);
 }
 points.forEach(p=>{
  const cx=mapX(p[axisKey]),cy=mapY(p.timeSeconds);
  const dot=svgNode('circle',{cx,cy,r:5,fill:'#94ffe1',stroke:'#10293d','stroke-width':2});
  const title=svgNode('title',{},format(p[axisKey])+' · '+timeLabel(p.timeSeconds)+' · overgenomen Waygate-softwarepunt');
  dot.append(title);svg.append(dot);
 });
 svg.append(svgNode('text',{x:(left+width-right)/2,y:height-10,'text-anchor':'middle',fill:'#d2eaf8','font-size':12},
  {density:'Doelzwarting D',thickness:'Staaldikte (mm)',kv:'Spanning (kV)'}[axis]));
 svg.append(svgNode('text',{transform:'translate(14 '+((top+height-bottom)/2)+') rotate(-90)',
  'text-anchor':'middle',fill:'#d2eaf8','font-size':11},'Softwaretijd (s)'));
 root.append(svg);
}
function graph(){
 const root=$('rtWaygateGraph'),note=$('rtWaygateGraphNote'),count=$('rtWaygateGraphCount');
 if(!root||!note)return;
 root.replaceChildren();
 const axis=$('rtWaygateGraphAxis')?.value||'density',context=values(),all=allPoints();
 if(count)count.textContent=all.length+' softwarepunt'+(all.length===1?'':'en');
 const selected=matching(all,context,axis);
 if(!selected.length){
  const placeholder=document.createElement('p');
  placeholder.className='rt-waygate-empty';
  placeholder.textContent='Geen geregistreerde Waygate-softwarepunten voor de huidige overige instellingen.';
  root.append(placeholder);
  note.textContent='Verander alleen de gekozen grafiekvariabele; alle overige instellingen moeten overeenkomen. '+
   'Gebruik eventueel de knop “Vul de beschikbare Waygate-voorbeeldgegevens in”.';
  return;
 }
 drawGraph(selected,axis,root);
 const label={density:'verschillende zwartingen',thickness:'verschillende diktes',kv:'verschillende spanningen'}[axis];
 const distinct=new Set(selected.map(p=>p[{density:'density',thickness:'thicknessMm',kv:'energyKv'}[axis]])).size;
 if(distinct<2){
  note.textContent=selected.length+' waargenomen softwarepunt bij de huidige voorwaarden. '+
   'Voor een grafiek over '+label+' zijn minimaal twee verschillende Waygate-punten nodig.';
 }else{
  note.textContent=selected.length+' Waygate-softwarepunten over '+label+'. '+
   'Gestreepte verbinding is alleen een visuele hulp: geen kalibratie, interpolatie of vrijgegeven belichtingstijd.';
 }
}
function display(text,error=false){
 const el=$('rtWaygatePointStatus');
 if(el){el.textContent=text;el.classList.toggle('rt-waygate-error',error);}
}
function parseTime(input){
 const match=/^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(String(input||'').trim());
 if(!match)return NaN;
 return Number(match[1])*3600+Number(match[2])*60+Number(match[3]);
}
function addPoint(){
 const c=values(),timeSeconds=parseTime($('rtWaygatePointTime')?.value);
 if(c.pipe){display('Voor buis-/dubbelwandige opnames ontbreken vergelijkbare referentievoorwaarden.',true);return;}
 const point={energyKv:c.energyKv,currentMa:c.currentMa,thicknessMm:c.thicknessMm,
  sourceDetectorMm:c.sourceDetectorMm,film:c.film,material:c.material,density:c.density,
  timeSeconds,kind:'waygate_software_output',origin:'handmatig overgenomen uit Waygate'};
 if(!isPoint(point)||point.energyKv<80){
  display('Controleer de X-ray-velden (80–350 kV), film, doelzwarting en tijd als uu:mm:ss. Alleen staal en plaat.',true);return;
 }
 const points=records();
 const conditions=['energyKv','currentMa','thicknessMm','sourceDetectorMm','film','material','density'];
 const same=x=>conditions.every(k=>typeof x[k]==='number'?equal(x[k],point[k]):x[k]===point[k]);
 const fromFile=builtInReference().find(same);
 if(fromFile&&equal(fromFile.timeSeconds,point.timeSeconds)){
  display('Dit exacte softwarepunt is al via je Waygate-import aanwezig.');return;
 }
 if(fromFile&&!equal(fromFile.timeSeconds,point.timeSeconds)){
  display('Deze instellingen hebben in de geïmporteerde screenshots een andere tijd. Punt niet toegevoegd.',true);return;
 }
 const index=points.findIndex(same);
 if(index>=0&&!equal(points[index].timeSeconds,point.timeSeconds)){
  if(!confirm('Voor deze instellingen bestaat al een andere handmatig ingevoerde softwaretijd. Vervangen?'))return;
 }
 if(index<0&&points.length>=500){display('Maximaal 500 extra Waygate-softwarepunten. Exporteer eerst je gegevens.',true);return;}
 if(index<0)points.push(point);else points[index]=point;
 try{localStorage.setItem(DB_KEY,JSON.stringify(points));}
 catch(_){display('Opslaan op dit toestel is niet gelukt. Maak een back-up.',true);return;}
 $('rtWaygatePointTime').value='';
 graph();window.dispatchEvent(new Event('rt-waygate-atlas-updated'));
 display('Waygate-softwarepunt lokaal opgeslagen. Niet in GitHub en niet voor echte belichtingen.');
}
function exportPoints(){
 const points=records();
 if(!points.length){display('Nog geen extra softwarepunten om te exporteren.',true);return;}
 const blob=new Blob([JSON.stringify({schema:'basic-rt-pro-waygate-atlas-v1',
  kind:'waygate_software_output_collection',points},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='basic-rt-pro-waygate-extra-softwarepunten.json';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),8000);
 display('Back-up aangeboden. Controleer de downloads op je toestel.');
}
function clearPoints(){
 const points=records();if(!points.length)return;
 if(!confirm('Alle '+points.length+' extra lokaal ingevoerde Waygate-softwarepunten wissen? De oorspronkelijke import blijft bewaard.'))return;
 try{localStorage.removeItem(DB_KEY);graph();window.dispatchEvent(new Event('rt-waygate-atlas-updated'));display('Extra softwarepunten gewist.');}
 catch(_){display('Wissen is niet gelukt.',true);}
}
function init(){
 if(!$('rtWaygateAtlas'))return;
 $('rtWaygateGraphAxis')?.addEventListener('change',graph);
 $('rtWaygatePointAdd')?.addEventListener('click',addPoint);
 $('rtWaygatePointExport')?.addEventListener('click',exportPoints);
 $('rtWaygatePointClear')?.addEventListener('click',clearPoints);
 for(const id of ['rtCompactKv','rtCompactActivity','rtCompactThickness','rtCompactFilm','rtCompactDistance','rtCompactDensity','material']){
  $(id)?.addEventListener('change',graph);$(id)?.addEventListener('input',graph);
 }
 for(const id of ['rtCompactPlate','rtCompactPipe','modeGamma','modeXray','rtCompactXray','rtWaygateUseReference']){
  $(id)?.addEventListener('click',()=>setTimeout(graph,210));
 }
 window.addEventListener('rt-waygate-reference-updated',graph);
 window.addEventListener('rt-language-changed',graph);
 graph();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
