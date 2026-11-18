/**
 * Field aids only; never changes actual RT calculations, safety checks or device controls.
 * The main calculator remains Ci-based. Unit toggle changes DISPLAY only.
 */
export const ciToGbq=ci=>Number.isFinite(ci)&&ci>=0?ci*37:null;
export const gbqToCi=gbq=>Number.isFinite(gbq)&&gbq>=0?gbq/37:null;
export const elapsedSeconds=(startedAt,now,already=0)=>
 Math.max(0,Math.floor((Math.max(0,now-startedAt)+already)/1000));
export function installRtFieldExtras(root=document){
 const activity=root.getElementById('rtCompactActivity');
 if(activity&&!root.getElementById('rtActivityConverted')){
  const wrap=root.createElement('div');wrap.className='ndt-activity-conversion';
  const change=root.createElement('button');change.type='button';change.textContent='Ci / GBq';
  change.setAttribute('aria-label','Wissel de activiteitweergave tussen Ci en GBq');
  const value=root.createElement('output');value.id='rtActivityConverted';
  let gbq=true;
  const refresh=()=>{
   const raw=String(activity.value||'').trim().replace(',','.'),ci=Number(raw);
   value.textContent=raw&&Number.isFinite(ci)&&ci>=0?
    (gbq?ciToGbq(ci).toLocaleString('nl-NL',{maximumFractionDigits:5})+' GBq':
    ci.toLocaleString('nl-NL',{maximumFractionDigits:5})+' Ci'):'Vul eerst activiteit in Ci in';
  };
  change.addEventListener('click',()=>{gbq=!gbq;refresh();});
  activity.addEventListener('input',refresh);
  activity.addEventListener('change',refresh);
  wrap.append(change,value);
  activity.closest('.rt-compact-field')?.append(wrap);
  refresh();
 }
 const host=root.getElementById('rtCompactModeNote')?.parentElement||
 root.querySelector('.rt-compact-calculator');
 if(!host||root.getElementById('ndtExposureTimer'))return;
 const section=root.createElement('section');section.id='ndtExposureTimer';section.className='ndt-exposure-timer';
 const title=root.createElement('strong');title.textContent='Belichtingstimer · handmatige tijdregistratie';
 const display=root.createElement('output');display.id='ndtExposureElapsed';display.textContent='00:00:00';
 const start=root.createElement('button');start.type='button';start.textContent='Start';
 const pause=root.createElement('button');pause.type='button';pause.textContent='Pauze';
 const reset=root.createElement('button');reset.type='button';reset.textContent='Reset';
 const note=root.createElement('small');note.textContent='Meet alleen verstreken tijd. Geen automatische bron-/buisbediening en geen RT-vrijgave.';
 const actions=root.createElement('div');actions.append(start,pause,reset);
 section.append(title,display,actions,note);
 let began=0,elapsed=0,running=false,interval=null;
 const now=()=>performance.now();
 const duration=()=>running?elapsed+Math.max(0,now()-began):elapsed;
 const refresh=()=>{
  const seconds=Math.floor(duration()/1000),h=String(Math.floor(seconds/3600)).padStart(2,'0');
  const m=String(Math.floor(seconds%3600/60)).padStart(2,'0');
  const s=String(seconds%60).padStart(2,'0');display.textContent=h+':'+m+':'+s;
  start.disabled=running;pause.disabled=!running;
 };
 start.addEventListener('click',()=>{
  if(running)return;began=now();running=true;
  if(interval!==null)clearInterval(interval);
  interval=setInterval(refresh,250);refresh();
 });
 pause.addEventListener('click',()=>{
  if(!running)return;elapsed=duration();running=false;
  if(interval!==null)clearInterval(interval);interval=null;refresh();
 });
 reset.addEventListener('click',()=>{
  running=false;elapsed=0;if(interval!==null)clearInterval(interval);interval=null;refresh();
 });
 root.addEventListener('visibilitychange',refresh);
 host.append(section);refresh();
 const info=root.createElement('p');info.id='ndtNonblockingFilmAdvice';info.className='ndt-film-advice';
 info.textContent='Pijp-/filmadvies is indicatief. Controleer filmverdeling, overlap, IQI en de goedgekeurde procedure.';
 const link=root.createElement('a');link.href='./procedure-suite.html';link.textContent='Open niet-blokkerend filmplan';
 info.append(' ',link);section.after(info);
}
