/* Reference tab consistency checks. Does not change any exposure-calculation logic. */
const $=id=>document.getElementById(id);
function warn(message){
  const box=$('refHealth'), msg=$('refHealthText');
  if(!box||!msg)return;
  box.hidden=false;
  const current=msg.textContent;
  if(!current.includes(message))msg.textContent=current?current+' | '+message:message;
}
const recovery=async()=>{
  if(!$('refAchieved'))return;
  if(!$('refAchieved').options.length || !$('refFilmTable')?.querySelectorAll('tbody tr').length){
    try{
      const mod=await import('./reference-tools.mjs?v=252');
      mod.initReferenceTools(()=>($('language')?.value||'nl'));
    }catch(error){
      warn('Naslaggegevens ontbreken of werken niet. Upload ALLE bestanden uit ZIP 2.5.2 naar GitHub, inclusief reference-tools.mjs en reference-data.mjs.');
      console.error('Naslag laadfout:',error);
    }
  }
  for(const [selector,name] of [
    ['#refDiagramImage','belichtingsgrafieken'],
    ['.ref-illustration','lasdetailschetsen']
  ]){
    const img=document.querySelector(selector);
    if(!img)continue;
    const check=()=>{if(img.complete && img.naturalWidth===0)warn('Afbeeldingen niet gevonden: '+name+'. Upload ook de map assets/ met alle .webp-bestanden.');};
    img.addEventListener('error',check);
    if(img.complete)check();
    else img.addEventListener('load',check,{once:true});
  }
  if(!$('refDiagram')?.options.length)warn('De grafiekkeuzelijst is leeg. Controleer of alle .mjs-bestanden op GitHub zijn bijgewerkt.');
};
// Wait for main app modules to run first, then recover from stale or incomplete cached code.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(recovery,250),{once:true});
else setTimeout(recovery,250);
