/* Basic RT PRO 3.8.3 — UI-only improvements. No changes to exposure mathematics. */
const $=id=>document.getElementById(id);
const labels={
 nl:{toolsNav:'Tools',pickDevice:'Kies bron of toestel',chooseFilm:'Film',chooseKv:'Spanning (kV)',tapCurve:'Tik op de curve om mm en Ci·h of mA·min af te lezen.',interactiveCurves:'Interactieve belichtingscurves',curvesIntro:'Se-75, Ir-192 en toestelcurves. Alleen softwarevergelijking; geen vrijgave voor RT-opnames.',openCurveAtlas:'Open interactieve curveatlas',openPdfAtlas:'Open curveatlas als PDF',extraTools:'Alle extra RT-tools openen →',workPrep:'WERKVOORBEREIDING',workCheck:'Controle van RT-instellingen',doubleWallApply:'Neem 2 × t als schatting',doubleWallCaution:'Controleer de werkelijke stralingsweg en hoek: 2 × t is niet altijd de werkelijk doorstraalde dikte.',moreInfo:'ⓘ Extra uitleg',pipeMore:'Pipe sizes',sourceCert:'Certificaatgegevens',sourceCertCi:'Activiteit bij certificaatdatum (Ci)',sourceCertDate:'Certificaatdatum',sourceReferenceDate:'Berekeningsdatum',sourceApply:'Gebruik deze bron in Rekenen',sourcesHint:'Gegevens worden lokaal overgenomen; controleer het originele broncertificaat.',documentSearch:'Fabrikantdocumenten en normen',generalInfo:'ⓘ Achtergrond en beperkingen',zoomChart:'Vergroot afbeelding',close:'Sluiten',readOnly:'Niet gevalideerd voor opnames.',sfdLinked:'Bron-objectafstand wordt voorgesteld als SFD − object-filmafstand; controleer de geometrie.',refInfo:'ⓘ Naslag en extra informatie'},
 en:{toolsNav:'Tools',pickDevice:'Select source or X-ray device',chooseFilm:'Film',chooseKv:'Voltage (kV)',tapCurve:'Tap the chart to read thickness and Ci·h or mA·min.',interactiveCurves:'Interactive exposure curves',curvesIntro:'Se-75, Ir-192 and X-ray device curves. Software comparison only; not approved for RT exposures.',openCurveAtlas:'Open interactive curve atlas',openPdfAtlas:'Open curve atlas (PDF)',extraTools:'Open additional RT tools →',workPrep:'WORK PREPARATION',workCheck:'Check RT settings',doubleWallApply:'Suggest 2 × wall thickness',doubleWallCaution:'Verify actual beam path and angle: 2 × wall thickness is not always the actual penetrated thickness.',moreInfo:'ⓘ More information',pipeMore:'Pipe sizes',sourceCert:'Source certificate details',sourceCertCi:'Activity at certificate date (Ci)',sourceCertDate:'Certificate date',sourceReferenceDate:'Calculation date',sourceApply:'Use source in Calculator',sourcesHint:'Values are copied locally; verify the original source certificate.',documentSearch:'Manufacturer documents and standards',generalInfo:'ⓘ Background and limitations',zoomChart:'Enlarge image',close:'Close',readOnly:'Not validated for exposures.',sfdLinked:'Source-object distance is suggested as SFD − object-film distance; check actual geometry.',refInfo:'ⓘ Reference information'},
 pl:{toolsNav:'Narzędzia',pickDevice:'Wybierz izotop lub urządzenie RTG',chooseFilm:'Film',chooseKv:'Napięcie (kV)',tapCurve:'Dotknij wykresu, aby odczytać grubość i Ci·h lub mA·min.',interactiveCurves:'Interaktywne krzywe ekspozycji',curvesIntro:'Se-75, Ir-192 oraz urządzenia RTG. Tylko porównanie oprogramowania; brak zgody na ekspozycje.',openCurveAtlas:'Otwórz interaktywny atlas krzywych',openPdfAtlas:'Otwórz atlas krzywych (PDF)',extraTools:'Otwórz dodatkowe narzędzia RT →',workPrep:'PRZYGOTOWANIE PRACY',workCheck:'Kontrola ustawień RT',doubleWallApply:'Zaproponuj 2 × grubość ścianki',doubleWallCaution:'Sprawdź rzeczywistą drogę promieniowania i kąt: 2 × grubość ścianki nie zawsze odpowiada rzeczywistej grubości prześwietlanej.',moreInfo:'ⓘ Więcej informacji',pipeMore:'Wymiary rur',sourceCert:'Dane certyfikatu źródła',sourceCertCi:'Aktywność w dniu certyfikatu (Ci)',sourceCertDate:'Data certyfikatu',sourceReferenceDate:'Data obliczenia',sourceApply:'Użyj źródła w obliczeniu',sourcesHint:'Dane są kopiowane lokalnie; sprawdź oryginalny certyfikat źródła.',documentSearch:'Dokumentacja producentów i normy',generalInfo:'ⓘ Tło i ograniczenia',zoomChart:'Powiększ obraz',close:'Zamknij',readOnly:'Niezweryfikowane do ekspozycji.',sfdLinked:'Odległość źródło–obiekt jest szacowana jako SFD − odległość obiekt–film; sprawdź geometrię.',refInfo:'ⓘ Informacje referencyjne'}
};

const toolTitles={
 nl:['🎯 Snelkeuze schiettechniek 6A / 6B (ISO)','📚 IQI- en schiettabellen: welke norm geldt?','📐 Geometrische onscherpte en minimale FFD','🎞️ Filmposities / IQI / opnametechniek','🔁 Belichting overzetten naar andere afstand of activiteit','🧪 Zwartingscorrectie met twee gemeten filmwaarden','🔎 Waygate-vergelijking van Se-75','☢️ Bronverval en activiteit op datum','📅 Bronwisselplanner / activiteitsgrens','🗂️ Broninventaris (alleen lokaal)','📋 Opnameregister (bestaande records)','📝 Handmatige dosisregistratie','🔄 Activiteit, dosis en lengte omrekenen','📉 Halfwaardelaag (ideaal rekenmodel)','📏 Omgekeerde-kwadratenwet (dosistempo)','🔬 Ruimtelijke resolutie / duplexdraad (hulp)','🚧 Vaste zonering — veiligheidscheck','🚧 Mobiele zonering — veiligheidscheck'],
 en:['🎯 Exposure technique 6A / 6B (ISO)','📚 IQI and exposure tables: which standard applies?','📐 Geometric unsharpness and minimum FFD','🎞️ Film positions / IQI / technique','🔁 Scale exposure for distance or activity','🧪 Density correction from two measured film values','🔎 Se-75 Waygate comparison','☢️ Source decay and activity at date','📅 Source exchange planner / activity threshold','🗂️ Local source inventory','📋 Exposure register (saved records)','📝 Manual dose notes','🔄 Convert activity, dose and length','📉 Half-value layer (ideal model)','📏 Inverse-square law (dose rate)','🔬 Spatial resolution / duplex wire (guide)','🚧 Fixed-area safety checklist','🚧 Mobile-area safety checklist'],
 pl:['🎯 Szybki wybór techniki 6A / 6B (ISO)','📚 Tabele IQI i technik: która norma?','📐 Nieostrość geometryczna i minimalna FFD','🎞️ Pozycje błon / IQI / technika','🔁 Przelicz ekspozycję na inną odległość lub aktywność','🧪 Korekta gęstości z dwóch pomiarów błony','🔎 Porównanie Se-75 z Waygate','☢️ Rozpad źródła i aktywność na dzień','📅 Plan wymiany źródła / próg aktywności','🗂️ Lokalny rejestr źródeł','📋 Rejestr ekspozycji (zapisane wyniki)','📝 Ręczna ewidencja dawek','🔄 Przeliczanie aktywności, dawki i długości','📉 Warstwa połowiąca (model idealny)','📏 Prawo odwrotności kwadratu (moc dawki)','🔬 Rozdzielczość / drut podwójny (pomoc)','🚧 Stała strefa — lista bezpieczeństwa','🚧 Mobilna strefa — lista bezpieczeństwa']
};
const toolCategories={
 nl:['Belichting & geometrie','Bronnen & administratie','Fysica & conversies','Stralingsveiligheid · voorbereiding'],
 en:['Exposure & geometry','Sources & administration','Physics & conversions','Radiation safety · preparation'],
 pl:['Ekspozycja i geometria','Źródła i administracja','Fizyka i przeliczenia','Ochrona radiologiczna · przygotowanie']
};
let lang=()=>['nl','en','pl'].includes($('language')?.value)?$('language').value:'nl';
const tr=k=>labels[lang()]?.[k]||labels.nl[k]||k;
const compact=(el,key)=>{if(!el||el.closest('details'))return;const details=document.createElement('details');details.className='inline-compact-info';const summary=document.createElement('summary');summary.dataset.uiI18n=key;summary.textContent=tr(key);el.replaceWith(details);details.append(summary,el);};
function accordionise(){
 for(const panel of document.querySelectorAll('#screen-refs > .ref-panel')){
  const heading=panel.querySelector(':scope > h2')||panel.querySelector(':scope > .comet-ref-card > h2');if(!heading)continue;
  const details=document.createElement('details');details.className='panel ref-panel rt-ref-accordion';
  if(panel.id)details.id=panel.id;
  const summary=document.createElement('summary');summary.textContent=heading.textContent;
  if(heading.hasAttribute('data-ref-key'))summary.dataset.refKey=heading.dataset.refKey;
  const body=document.createElement('div');body.className='rt-ref-body';
  if(heading.parentElement===panel)heading.remove();
  while(panel.firstChild)body.append(panel.firstChild);
  details.append(summary,body);panel.replaceWith(details);
 }
 const docs=$('rt30Sources');if(docs){
  const heading=docs.querySelector('h2');if(heading){
   const summary=document.createElement('summary');summary.dataset.uiI18n='documentSearch';summary.textContent=tr('documentSearch');
   const details=document.createElement('details');details.className='rt-ref-accordion';details.style.border='1px solid #416a85';details.style.borderRadius='13px';
   const body=document.createElement('div');body.className='rt-ref-body';
   heading.remove();while(docs.firstChild)body.append(docs.firstChild);details.append(summary,body);docs.append(details);
   // COMET product selector and the searchable manufacturer catalogue now live in one accordion.
   const comet=$('cometPanel');if(comet)body.insertBefore(comet,body.firstChild);
  }
 }
 for(const el of document.querySelectorAll('#screen-tools details'))el.open=false;
 compact($('densityHelp'),'moreInfo');
 const assist=$('rt30Assistant');if(assist){
  const paragraphs=assist.querySelectorAll(':scope > p');for(const p of paragraphs)compact(p,'generalInfo');
 }
}
function translations(){
 document.querySelectorAll('[data-ui-i18n]').forEach(el=>{const value=tr(el.dataset.uiI18n);if(value)el.textContent=value;});
 document.querySelectorAll('#screen-tools .rt31-tool>summary').forEach((el,i)=>{if(toolTitles[lang()]?.[i])el.textContent=toolTitles[lang()][i];});
 document.querySelectorAll('#screen-tools .rt31-category').forEach((el,i)=>{if(toolCategories[lang()]?.[i])el.textContent=toolCategories[lang()][i];});
 document.querySelectorAll('#screen-refs .rt-ref-accordion>summary[data-ref-key]').forEach(el=>{
  // Reference module owns data-ref-key translations and updates these on language switches.
 });
}
function buildSourceCert(){
 const panel=$('screen-sources')?.querySelector('.panel');if(!panel)return;
 const box=document.createElement('div');box.className='source-cert-box';
 box.innerHTML=`<h2 data-ui-i18n="sourceCert">${tr('sourceCert')}</h2><div class="cert-grid">
 <div class="inner-field"><label data-ui-i18n="sourceCertCi" for="sourceCertCi">${tr('sourceCertCi')}</label><input id="sourceCertCi" inputmode="decimal" type="text" value="36"/></div>
 <div class="inner-field"><label data-ui-i18n="sourceCertDate" for="sourceCertDate">${tr('sourceCertDate')}</label><input id="sourceCertDate" type="date"/></div>
 <div class="inner-field"><label data-ui-i18n="sourceReferenceDate" for="sourceReferenceDate">${tr('sourceReferenceDate')}</label><input id="sourceReferenceDate" type="date"/></div></div>
 <button id="sourceCertApply" type="button" class="outline-button" data-ui-i18n="sourceApply">${tr('sourceApply')}</button>
 <p class="small-muted" data-ui-i18n="sourcesHint">${tr('sourcesHint')}</p>`;
 panel.append(box);
 const copy=()=>{for(const [a,b] of [['certCi','sourceCertCi'],['certDate','sourceCertDate'],['referenceDate','sourceReferenceDate']]){const src=$(a),dest=$(b);if(src&&dest)dest.value=src.value;}};
 copy();
 $('sourceCertApply').addEventListener('click',()=>{
  const ci=$('sourceCertCi')?.value, date=$('sourceCertDate')?.value,reference=$('sourceReferenceDate')?.value;
  const isPositive=Number(String(ci||'').replace(',','.'))>0;
  if(!isPositive||!date||!reference||date>reference){alert(lang()==='en'?'Enter a valid certificate activity and dates.':lang()==='pl'?'Wprowadź poprawną aktywność i daty certyfikatu.':'Vul een geldige certificaatactiviteit en datums in.');return;}
  for(const [id,val] of [['certCi',ci],['certDate',date],['referenceDate',reference]]){const input=$(id);input.value=val;input.dispatchEvent(new Event('input',{bubbles:true}));}
  const gamma=$('modeGamma');gamma.click();
  const cert=document.querySelector('input[name="activityMode"][value="certificate"]');cert.checked=true;cert.dispatchEvent(new Event('change',{bubbles:true}));
  document.querySelector('.nav[data-nav="calc"]')?.click();
 });
}
function setupGeometryLink(){
 const sfd=$('distance'),ofd=$('geoOFD'),sod=$('geoSOD');if(!sfd||!ofd||!sod)return;
 let manuallyEdited=false;
 sod.addEventListener('input',e=>{if(e.isTrusted)manuallyEdited=true;});
 const sync=()=>{if(manuallyEdited)return;const d=Number(sfd.value.replace(',','.')),o=Number(ofd.value.replace(',','.'));if(!Number.isFinite(d)||!Number.isFinite(o)||d<=o||o<0)return;sod.value=(d-o).toFixed(2).replace(/\.00$/,'');sod.dispatchEvent(new Event('input',{bubbles:true}));};
 sfd.addEventListener('input',sync);ofd.addEventListener('input',sync);sync();
 const note=document.createElement('p');note.className='small-muted';note.dataset.uiI18n='sfdLinked';note.textContent=tr('sfdLinked');$('geometryPanel')?.append(note);
}
function setupDoubleWall(){
 const input=$('iqiPenetrated'),thickness=$('thickness'),tech=$('iqiTechnique');if(!input||!thickness||!tech)return;
 let manual=false;
 input.addEventListener('input',event=>{if(event.isTrusted)manual=true;});
 const setNominal=()=>{if(!['dwsi','dwdi'].includes(tech.value)||manual)return;const t=Number(thickness.value.trim().replace(',','.'));if(!Number.isFinite(t)||t<=0)return;input.value=String(Number((2*t).toFixed(3)));input.dispatchEvent(new Event('change',{bubbles:true}));};
 tech.addEventListener('change',()=>{manual=false;setNominal();});thickness.addEventListener('change',setNominal);$('iqiUseDouble')?.addEventListener('click',()=>{manual=false;setNominal();});
}
function setupQuickDensity(){
 document.querySelectorAll('.rt-density-quick button').forEach(btn=>btn.addEventListener('click',()=>{const field=$('density');field.value=btn.dataset.value;field.dispatchEvent(new Event('input',{bubbles:true}));}));
}
function setupZoom(){
 const dialog=document.createElement('dialog');dialog.className='rt-lightbox';dialog.id='rtChartDialog';
 const close=document.createElement('button');close.className='outline-button';close.type='button';close.dataset.uiI18n='close';close.textContent=tr('close');
 const image=document.createElement('img');image.alt='Exposure chart enlarged';dialog.append(close,image);document.body.append(dialog);
 close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 document.querySelectorAll('#refDiagramOpen').forEach(a=>a.addEventListener('click',e=>{if(!dialog.showModal)return;e.preventDefault();image.src=$('refDiagramImage').src;image.alt=$('refDiagramImage').alt;dialog.showModal();}));
}
function setupMenus(){
 document.addEventListener('pointerdown',e=>{const menu=$('moreMenu'),toggle=$('moreToggle');if(!menu||menu.hidden)return;if(e.target.closest('#moreMenu,#moreToggle'))return;menu.hidden=true;toggle.setAttribute('aria-expanded','false');});
}
function init(){accordionise();buildSourceCert();setupGeometryLink();setupDoubleWall();setupQuickDensity();setupZoom();setupMenus();translations();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('rt-language-changed',translations);
