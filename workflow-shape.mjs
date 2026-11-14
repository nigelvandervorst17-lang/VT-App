/* Basic RT PRO 3.8.5 — measured plate / pipe geometry assistant.
 * The exposure engine remains the same. Never claim RT procedure approval.
 * Physical beam path can differ from the nominal 2*t approximation.
 */
const $=id=>document.getElementById(id);
const num=s=>{const v=String(s??'').trim().replace(',','.');return v===''?NaN:Number(v);};
const fmt=n=>Number(n).toLocaleString('nl-NL',{maximumFractionDigits:3});
const texts={
 nl:{what:'Wat ga je schieten?',plate:'Plaat / Las (enkelwandig)',pipe:'Pijp / Buis (dubbelwandig)',outside:'Buitendiameter Ø (mm)',wall:'Gemeten wanddikte t (mm)',penetrated:'Doorstraalde dikte voor de curve, w (mm)',resetDouble:'Gebruik weer nominale 2 × t',applyTechnique:'Neem techniekvoorstel over',procedure:'Controleer IQI / procedure',caution:'Nominale 2 × t is niet altijd de werkelijke stralingsweg. Bevestig de techniek, IQI-positie, opnameklasse, aantal opnames en werkelijke doorstraalde dikte volgens de procedure. Dit is geen RT-vrijgave.',plateResult:t=>`Plaat / Las · enkelwandig voorstel (SWSI)\nDoorstraalde dikte voor de curve: w = t = ${fmt(t)} mm.`,pipeSmall:(od,t,w)=>`Buis Ø ${fmt(od)} mm · t ${fmt(t)} mm\nNominale dubbelwandige dikte: 2 × t = ${fmt(2*t)} mm\nVoor de curve ingesteld: w = ${fmt(w)} mm.\nDWDI (elliptisch) alleen als geometrie, lasbreedte en procedure dit toestaan. Aantal opnames en IQI niet automatisch vrijgegeven.`,pipeLarge:(od,t,w)=>`Buis Ø ${fmt(od)} mm · t ${fmt(t)} mm\nNominale dubbelwandige dikte: 2 × t = ${fmt(2*t)} mm\nVoor de curve ingesteld: w = ${fmt(w)} mm.\nKies DWDI/DWSI op basis van opstelling en procedure. Ø > 100 mm betekent NIET automatisch DWSI.`,pipeNonElliptic:(od,t,w)=>`Buis Ø ${fmt(od)} mm · t ${fmt(t)} mm · w ${fmt(w)} mm.\nBij wanddikte > 8 mm geen automatisch elliptisch voorstel. Controleer een andere techniek volgens de procedure.`,invalid:'Controleer Ø en wanddikte: 0 < t < Ø/2 en w > 0 mm. Er wordt geen tijd berekend zolang de geometrie ongeldig is.',manual:'Handmatig gewijzigde doorstraalde dikte. Controleer de werkelijke stralingsweg.'},
 en:{what:'What are you radiographing?',plate:'Plate / Weld (single wall)',pipe:'Pipe / Tube (double wall)',outside:'Outside diameter Ø (mm)',wall:'Measured wall thickness t (mm)',penetrated:'Penetrated thickness for the curve, w (mm)',resetDouble:'Restore nominal 2 × t',applyTechnique:'Apply suggested technique',procedure:'Check IQI / procedure',caution:'Nominal 2 × t is not always the actual beam path. Verify technique, IQI position, quality class, number of exposures and penetrated thickness against the procedure. No RT approval.',plateResult:t=>`Plate / weld · provisional SWSI\nPenetrated thickness for curve: w = t = ${fmt(t)} mm.`,pipeSmall:(od,t,w)=>`Pipe Ø ${fmt(od)} mm · t ${fmt(t)} mm\nNominal double wall: 2 × t = ${fmt(2*t)} mm\nCurve thickness: w = ${fmt(w)} mm.\nElliptical DWDI only if geometry, weld width and procedure allow it. Number of exposures and IQI are not approved automatically.`,pipeLarge:(od,t,w)=>`Pipe Ø ${fmt(od)} mm · t ${fmt(t)} mm\nNominal double wall: 2 × t = ${fmt(2*t)} mm\nCurve thickness: w = ${fmt(w)} mm.\nChoose DWDI/DWSI according to geometry and procedure. Ø > 100 mm does NOT automatically mean DWSI.`,pipeNonElliptic:(od,t,w)=>`Pipe Ø ${fmt(od)} mm · t ${fmt(t)} mm · w ${fmt(w)} mm.\nAt t > 8 mm no automatic elliptical proposal. Check alternative technique under the procedure.`,invalid:'Check Ø and wall thickness: 0 < t < Ø/2 and w > 0 mm. No time is calculated for invalid geometry.',manual:'Penetrated thickness manually overridden. Verify actual beam path.'},
 pl:{what:'Co będziesz prześwietlać?',plate:'Blacha / Spaw (jedna ścianka)',pipe:'Rura (dwie ścianki)',outside:'Średnica zewnętrzna Ø (mm)',wall:'Zmierzona grubość ścianki t (mm)',penetrated:'Grubość prześwietlana dla krzywej, w (mm)',resetDouble:'Przywróć nominalne 2 × t',applyTechnique:'Zastosuj propozycję techniki',procedure:'Sprawdź IQI / procedurę',caution:'Nominalne 2 × t nie zawsze oznacza rzeczywistą drogę wiązki. Sprawdź technikę, położenie IQI, klasę jakości, liczbę ekspozycji i grubość prześwietlaną zgodnie z procedurą. Brak zatwierdzenia RT.',plateResult:t=>`Blacha / spoina · wstępnie SWSI\nGrubość dla krzywej: w = t = ${fmt(t)} mm.`,pipeSmall:(od,t,w)=>`Rura Ø ${fmt(od)} mm · t ${fmt(t)} mm\nNominalnie dwie ścianki: 2 × t = ${fmt(2*t)} mm\nDla krzywej: w = ${fmt(w)} mm.\nEliptyczne DWDI tylko jeśli pozwalają geometria, szerokość spoiny i procedura. Liczba ekspozycji i IQI nie są zatwierdzane automatycznie.`,pipeLarge:(od,t,w)=>`Rura Ø ${fmt(od)} mm · t ${fmt(t)} mm\nNominalnie dwie ścianki: 2 × t = ${fmt(2*t)} mm\nDla krzywej: w = ${fmt(w)} mm.\nTechnikę DWDI/DWSI dobierz zgodnie z geometrią i procedurą. Ø > 100 mm NIE oznacza automatycznie DWSI.`,pipeNonElliptic:(od,t,w)=>`Rura Ø ${fmt(od)} mm · t ${fmt(t)} mm · w ${fmt(w)} mm.\nPrzy t > 8 mm brak automatycznej propozycji techniki eliptycznej. Sprawdź inne techniki.`,invalid:'Sprawdź Ø i grubość: 0 < t < Ø/2, w > 0 mm. Brak obliczenia przy nieprawidłowej geometrii.',manual:'Grubość prześwietlana zmieniona ręcznie. Sprawdź rzeczywistą drogę promieniowania.'}
};
export function geometryPreview({shape='plate',od,wall,penetrated}={}){
 const t=Number(wall),d=Number(od);if(!Number.isFinite(t)||t<=0||t>100)return {ok:false,reason:'wall'};
 if(shape==='plate')return {ok:true,shape:'plate',w:t,method:'SWSI-proposal'};
 if(shape!=='pipe'||!Number.isFinite(d)||d<=0||t>=d/2)return {ok:false,reason:'geometry'};
 const w=penetrated===undefined?2*t:Number(penetrated);
 if(!Number.isFinite(w)||w<=0)return {ok:false,reason:'penetrated'};
 return {ok:true,shape:'pipe',w,nominal:2*t,canSuggestElliptical:d<=100&&t<=8,method:'double-wall-estimate'};
}
function init(){
 const input=$('thickness'), wall=$('workWall'),out=$('workOutside'),penetrated=$('workPenetrated');if(!input||!wall||!out||!penetrated)return;
 let lastShape='plate',override=false,plateT=Number(input.value)||25,pipeT=6,pipeOD=114;
 try{const p=JSON.parse(localStorage.getItem('basic-rt-pro-geometry-v1')||'{}');if(['plate','pipe'].includes(p.shape))lastShape=p.shape;if(Number.isFinite(Number(p.pipeT))&&Number(p.pipeT)>0)pipeT=Number(p.pipeT);if(Number.isFinite(Number(p.pipeOD))&&Number(p.pipeOD)>0)pipeOD=Number(p.pipeOD);}catch{}
 const getLanguage=()=>['nl','en','pl'].includes($('language')?.value)?$('language').value:'nl';
 const t=()=>texts[getLanguage()];
 const store=()=>{try{localStorage.setItem('basic-rt-pro-geometry-v1',JSON.stringify({shape:lastShape,pipeT,pipeOD}));}catch{}};
 const evt=(el,type='input')=>el.dispatchEvent(new Event(type,{bubbles:true}));
 const setThickness=v=>{const val=Number.isFinite(v)?String(Number(v.toFixed(4))):'';if(input.value!==val){input.value=val;evt(input);} };
 const setTechnique=value=>{const el=$('iqiTechnique');if(el&&el.value!==value){el.value=value;evt(el,'change');}};
 const chips=()=>{const container=$('workWallChips');container.replaceChildren(...(lastShape==='plate'?[6,10,12,16,20]:[4,6,8,10,12]).map(n=>{const b=document.createElement('button');b.type='button';b.textContent=String(n);b.addEventListener('click',()=>{wall.value=String(n);evt(wall);});return b;}));};
 const translate=()=>{document.querySelectorAll('[data-work-t]').forEach(el=>{const val=t()[el.dataset.workT];if(typeof val==='string')el.textContent=val;});render(false);};
 const render=(sync=true)=>{
  const pipe=lastShape==='pipe';
  $('workPlate').classList.toggle('active',!pipe);$('workPipe').classList.toggle('active',pipe);
  $('workPlate').setAttribute('aria-pressed',String(!pipe));$('workPipe').setAttribute('aria-pressed',String(pipe));
  $('workOutsideWrap').hidden=!pipe;$('workPenetratedWrap').hidden=!pipe;
  const thickness=num(wall.value),diameter=num(out.value);
  const estimate=geometryPreview({shape:lastShape,od:diameter,wall:thickness,penetrated:pipe&&override?num(penetrated.value):undefined});
  const result=$('workGeometryResult');result.classList.toggle('invalid',!estimate.ok);
  if(!estimate.ok){result.textContent=t().invalid;if(sync)setThickness(NaN);$('workApplyTechnique').hidden=true;return;}
  if(!pipe){if(sync)setThickness(estimate.w);result.textContent=t().plateResult(thickness);$('workApplyTechnique').hidden=true;}
  else{
   if(!override)penetrated.value=String(estimate.w);
   if(sync)setThickness(estimate.w);
   result.textContent=(diameter>100?t().pipeLarge(diameter,thickness,estimate.w):thickness>8?t().pipeNonElliptic(diameter,thickness,estimate.w):t().pipeSmall(diameter,thickness,estimate.w))+(override?'\n'+t().manual:'');
   const apply=$('workApplyTechnique');apply.hidden=!estimate.canSuggestElliptical;apply.disabled=!estimate.canSuggestElliptical;
  }
 };
 const choose=shape=>{
  if(lastShape===shape)return;
  if(lastShape==='plate'&&Number.isFinite(num(wall.value))&&num(wall.value)>0)plateT=num(wall.value);
  if(lastShape==='pipe'){if(num(wall.value)>0)pipeT=num(wall.value);if(num(out.value)>0)pipeOD=num(out.value);}
  lastShape=shape;override=false;wall.value=String(shape==='plate'?plateT:pipeT);out.value=String(pipeOD);chips();
  if(shape==='plate')setTechnique('sw');else setTechnique('');
  render();store();
 };
 $('workPlate').addEventListener('click',()=>choose('plate'));
 $('workPipe').addEventListener('click',()=>choose('pipe'));
 wall.addEventListener('input',()=>{if(lastShape==='pipe'){pipeT=num(wall.value);override=false;}else plateT=num(wall.value);render();store();});
 out.addEventListener('input',()=>{pipeOD=num(out.value);render();store();});
 penetrated.addEventListener('input',()=>{override=true;render();});
 $('workResetDouble').addEventListener('click',()=>{override=false;render();});
 $('workOutsideChips').addEventListener('click',event=>{const button=event.target.closest('[data-work-od]');if(button){out.value=button.dataset.workOd;evt(out);}});
 $('workApplyTechnique').addEventListener('click',()=>{if(lastShape==='pipe'){const result=geometryPreview({shape:'pipe',od:num(out.value),wall:num(wall.value)});if(result.ok&&result.canSuggestElliptical){setTechnique('dwdi');const side=$('iqiSide');if(side&&!side.value){side.value='source';evt(side,'change');}$('iqiPanel')?.scrollIntoView({behavior:'smooth',block:'center'});}}});
 $('workOpenProcedure').addEventListener('click',()=>{const button=document.querySelector('[data-proc-open]');if(button){button.click();if(lastShape==='pipe'){const odField=$('procOD'),tField=$('procT');if(odField&&Number.isFinite(num(out.value))){odField.value=String(num(out.value));evt(odField,'change');}if(tField&&Number.isFinite(num(wall.value))){tField.value=String(num(wall.value));evt(tField,'change');}}}});
 $('language')?.addEventListener('change',translate);window.addEventListener('rt-language-changed',translate);
 // The existing app module has finished initializing before this module executes.
 const initialValue=String(input.value||'25');if(lastShape==='plate'){plateT=Number(initialValue)||25;wall.value=String(plateT);}else{wall.value=String(pipeT);out.value=String(pipeOD);}chips();render();translate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
