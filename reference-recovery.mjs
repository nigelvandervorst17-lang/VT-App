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
    const check=()=>{if(img.complete && img.naturalWidth===0)warn('Afbeeldingen niet gevonden: '+name+'. Upload ook de .webp-afbeeldingen uit het volledige herstelpakket in de hoofdmap.');};
    img.addEventListener('error',check);
    if(img.complete)check();
    else img.addEventListener('load',check,{once:true});
  }
  if(!$('refDiagram')?.options.length)warn('De grafiekkeuzelijst is leeg. Controleer of alle .mjs-bestanden op GitHub zijn bijgewerkt.');
};
// Wait for main app modules to run first, then recover from stale or incomplete cached code.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(recovery,250),{once:true});
else setTimeout(recovery,250);

/* Snelle naslagfilter: alleen weergave; verandert geen tabellen of normwaarden. */
function initReferenceQuickSearch(){
  const input=$('refQuickSearch'),output=$('refSearchStatus');
  if(!input||!output)return;
  const normalized=v=>String(v||'').toLocaleLowerCase('nl-NL').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const update=()=>{
    const terms=normalized(input.value.trim()).split(/\s+/).filter(Boolean);
    const panels=[...document.querySelectorAll('#screen-refs > .ref-panel')].filter(p=>p.id!=='refHealth');
    let visible=0;
    for(const panel of panels){
      const match=!terms.length||terms.every(term=>normalized(panel.textContent).includes(term));
      panel.classList.toggle('ref-search-hidden',!match);
      if(match&&!panel.hidden)visible++;
    }
    output.textContent=terms.length?(visible?visible+' onderdelen gevonden.':'Geen naslagonderdelen gevonden. Pas je zoekterm aan.'):'';
  };
  input.addEventListener('input',update);
  update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initReferenceQuickSearch,{once:true});
else initReferenceQuickSearch();
