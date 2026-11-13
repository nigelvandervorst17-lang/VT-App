/* Read-only reference helpers. No connection to automatic RT exposure engine. */
import {densityAchieved,densityRequired,densityFactors,filmSystems,exposureDiagrams,pipeSchedules,weldProcesses} from './reference-data.mjs';
const el=id=>document.getElementById(id);
let language=()=> 'nl';
const txt={
 nl:{over:'PRAKTIJKHULPMIDDELEN',heading:'Tabellen & naslag',sub:'Buismaten, filmgegevens, historische zwartingstabel en originele grafiekbeelden. Referentie — geen vrijgave van belichtingen.',pipe:'Buismaten · NPS / Schedule',nps:'Buismaten (NPS)',sch:'Schedule',od:'Buitendiameter',wall:'Wanddikte',id:'Binnendiameter (berekend)',useWall:'Wanddikte overnemen',pipeNote:'Bron: Van Leeuwen ASME B36.10 / B36.19 tabel, 2 pagina’s. Controleer de tekening en werkelijk gemeten wanddikte; de gegevens kunnen afwijken door toleranties.',density:'Zwartingsfactor · historische tabel',achieved:'Bereikte zwarting',target:'Vereiste zwarting',factor:'Factor in aangeleverde tabel',densityNote:'Alleen exact opgezochte tabelwaarden uit “Bereikte Zwarting”; geen interpolatie en geen automatische toepassing op belichting. De herkomst/validatie van de factor is niet aangetoond. Niet gebruiken voor echte belichtingsinstellingen.',film:'AGFA STRUCTURIX · filmklassen',filmNote:'Fabrikantbrochure, tabel automatische verwerking (G135/G335, 100 s, 28 °C). Classificatie geldt voor het filmsysteem inclusief chemie en verwerking; controleer actuele certificaten.',filmt:'Filmtype',filmc:'ISO-klasse',films:'Snelheidsindex S',diagrams:'Originele belichtingsgrafieken',diagramLabel:'Kies grafiek',diagramNote:'Beelden ter vergelijking, niet gedigitaliseerd voor automatische berekening. Filmmateriaal, schermen, afstand en doelzwarting zijn per grafiek verschillend.',weld:'Lasdetailschetsen',weldNote:'Lasgeometrie en XYZ-richtingen uit het aangeleverde schetsbestand. Schetsen vervangen geen werkstuktekening of opnametechniek.',process:'Lasprocessen (oude ISO 4063-lijst)',processLabel:'Procesnummer',processNote:'Bronverwijzing in deze oude tabel: ISO 4063:1998 (print 2008). Controleer codes tegen actuele projectdocumenten en geldende normeditie.',source:'Brongegevens en rechten',sourceNote:'Afgeleid uit door gebruiker aangeleverde bestanden. Controleer auteurs- en verspreidingsrechten voor het openbaar publiceren van fabrikantgrafieken en naslagbeelden.',caution:'Dit zijn hulpmiddelen voor controle en naslag, niet zelfstandig gevalideerd of goedgekeurd voor radiografische opnames.'},
 en:{over:'FIELD REFERENCE',heading:'Tables & references',sub:'Pipe dimensions, film classes, historical density table and original exposure diagrams. Reference only — no exposure approval.',pipe:'Pipe dimensions · NPS / Schedule',nps:'Nominal pipe size (NPS)',sch:'Schedule',od:'Outside diameter',wall:'Wall thickness',id:'Inside diameter (calculated)',useWall:'Copy wall thickness',pipeNote:'Source: Van Leeuwen ASME B36.10/B36.19 pipe table, 2 pages. Verify the drawing and measured wall thickness; tolerances can affect actual dimensions.',density:'Film density factor · historical table',achieved:'Achieved density',target:'Target density',factor:'Factor in supplied table',densityNote:'Exact source-table lookup only, without interpolation or automatic adjustment of exposure. The factor has not been independently validated. Do not use for actual exposure settings.',film:'AGFA STRUCTURIX · film classes',filmNote:'Manufacturer brochure, automatic processing (G135/G335, 100 s, 28 °C). Classification depends on film system including processing, and must be verified.',filmt:'Film',filmc:'ISO class',films:'Speed index S',diagrams:'Original exposure diagrams',diagramLabel:'Choose diagram',diagramNote:'For comparison only, not digitized for automatic calculations. Film, screens, distance and density vary between the three diagrams.',weld:'Weld detail sketches',weldNote:'Weld profiles and XYZ directions from user-provided sketches; does not replace project drawings.',process:'Welding processes (older ISO 4063 list)',processLabel:'Process number',processNote:'This old list cites ISO 4063:1998 (2008 printout). Check current project documents and applicable standards.',source:'Data source and rights',sourceNote:'Derived from user-supplied documents. Verify permission before publishing the manufacturer reference graphs or illustrations.',caution:'Research reference utilities only; not independently validated for radiographic exposures.'},
 pl:{over:'NARZĘDZIA REFERENCYJNE',heading:'Tabele i materiały',sub:'Wymiary rur, klasy filmów, historyczna tabela gęstości i oryginalne wykresy. Tylko do wglądu.',pipe:'Wymiary rur · NPS / Schedule',nps:'Rozmiar NPS',sch:'Schedule',od:'Średnica zewnętrzna',wall:'Grubość ścianki',id:'Średnica wewnętrzna (obliczona)',useWall:'Skopiuj grubość ścianki',pipeNote:'Źródło: tabela Van Leeuwen ASME B36.10/B36.19. Sprawdź rysunek i rzeczywistą grubość.',density:'Współczynnik gęstości · stara tabela',achieved:'Uzyskana gęstość',target:'Wymagana gęstość',factor:'Współczynnik w tabeli',densityNote:'Wyłącznie dokładne wartości z przesłanej tabeli. Bez interpolacji i bez stosowania do ekspozycji; współczynniki nie zostały niezależnie zweryfikowane.',film:'AGFA STRUCTURIX · klasy filmów',filmNote:'Broszura producenta, obróbka automatyczna (G135/G335, 100 s, 28 °C). Klasa zależy od całego systemu, także obróbki.',filmt:'Film',filmc:'Klasa ISO',films:'Indeks szybkości S',diagrams:'Oryginalne wykresy naświetlania',diagramLabel:'Wybierz wykres',diagramNote:'Tylko do porównania. Różne filmy, ekrany, odległości i gęstości; brak automatycznego obliczania.',weld:'Szkice spoin',weldNote:'Geometria spoin i kierunki XYZ, nie zastępują rysunku technicznego.',process:'Procesy spawania (starsza lista ISO 4063)',processLabel:'Numer procesu',processNote:'Starszy wykaz ISO 4063:1998 (wydruk 2008); sprawdź aktualne normy.',source:'Źródła i prawa',sourceNote:'Dane z dokumentów dostarczonych przez użytkownika. Sprawdź prawa autorskie przed publiczną publikacją.',caution:'Materiały do wglądu, niezweryfikowane do rzeczywistych ekspozycji.'}
};
const t=k=>(txt[language()]||txt.nl)[k]||txt.nl[k]||k;
const locNum=(x, digits=2)=>new Intl.NumberFormat(language()==='pl'?'pl-PL':language()==='en'?'en-GB':'nl-NL',{maximumFractionDigits:digits,minimumFractionDigits:0}).format(x);

function pipeUpdate(resetSchedule=false){
 const row=pipeSchedules.find(x=>x.nps===el('refNps').value)||pipeSchedules[0];
 const schedules=Object.keys(row.wall);
 const current=el('refSch').value;
 if(resetSchedule||!schedules.includes(current)){
  el('refSch').replaceChildren(...schedules.map(k=>{const o=document.createElement('option');o.value=k;o.textContent=k;return o}));
  el('refSch').value=schedules.includes(current)&&!resetSchedule?current:(schedules.includes('40')?'40':(schedules.includes('40S/STD')?'40S/STD':schedules[0]));
 }
 const thick=row.wall[el('refSch').value];
 if(typeof thick!=='number'){el('refPipeResult').textContent='—';return;}
 el('refPipeResult').textContent=`${t('od')}: ${locNum(row.od)} mm  ·  ${t('wall')}: ${locNum(thick)} mm  ·  ${t('id')}: ${locNum(row.od-2*thick)} mm`;
 el('refApply').disabled=false;
}
function densityUpdate(){
 const achieved=Number(el('refAchieved').value),target=Number(el('refTarget').value);
 const i=densityAchieved.indexOf(achieved),j=densityRequired.indexOf(target);
 const f=i>=0&&j>=0?densityFactors[i][j]:null;
 el('refDensityResult').textContent=f==null?'—':`${t('factor')}: ${locNum(f)}×`;
}
function diagramUpdate(){
 const d=exposureDiagrams.find(x=>x.id===el('refDiagram').value)||exposureDiagrams[0];
 el('refDiagramTitle').textContent=d.name;
 el('refDiagramConditions').textContent=`${t('filmt')}: ${d.film} · ${d.screen} · FFD: ${d.distance} · D: ${d.density} · ${d.note}`;
 el('refDiagramImage').src=d.file;
 el('refDiagramImage').alt=`${d.name} — ${d.film}, ${d.screen}, ${d.distance}, density ${d.density}`;
 el('refDiagramOpen').href=d.file;
}
function processUpdate(){
 const p=weldProcesses.find(x=>x.number===el('refProcess').value)||weldProcesses[0];
 el('refProcessResult').textContent=`ISO 4063:1998 · ${p.number} — ${language()==='nl'?p.nl:p.en}`;
}
function filmUpdate(){
 const table=el('refFilmTable');
 table.querySelector('thead').innerHTML=`<tr><th>${t('filmt')}</th><th>${t('filmc')}</th><th>${t('films')}</th></tr>`;
 table.querySelector('tbody').innerHTML=filmSystems.map(f=>`<tr><td>${f.type}</td><td>${f.iso}</td><td>${f.speed}</td></tr>`).join('');
}
export function updateReferenceLanguage(){
 document.querySelectorAll('[data-ref-key]').forEach(x=>x.textContent=t(x.getAttribute('data-ref-key')));
 filmUpdate();pipeUpdate();densityUpdate();processUpdate();
}
export function initReferenceTools(getLanguage){
 language=getLanguage;
 const nps=el('refNps');
 nps.replaceChildren(...pipeSchedules.map(p=>{const op=document.createElement('option');op.value=p.nps;op.textContent=`${p.nps}″ · Ø ${locNum(p.od)} mm`;return op;}));
 nps.value='4';
 el('refAchieved').replaceChildren(...densityAchieved.map(v=>{const op=document.createElement('option');op.value=String(v);op.textContent=locNum(v);return op;}));
 el('refAchieved').value='2';
 el('refTarget').replaceChildren(...densityRequired.map(v=>{const op=document.createElement('option');op.value=String(v);op.textContent=locNum(v);return op;}));
 el('refTarget').value='3';
 el('refDiagram').replaceChildren(...exposureDiagrams.map(d=>{const op=document.createElement('option');op.value=d.id;op.textContent=d.name;return op;}));
 el('refProcess').replaceChildren(...weldProcesses.map(p=>{const op=document.createElement('option');op.value=p.number;op.textContent=`${p.number} · ${p.nl}`;return op;}));
 nps.addEventListener('change',()=>pipeUpdate(true));
 el('refSch').addEventListener('change',()=>pipeUpdate());
 el('refAchieved').addEventListener('change',densityUpdate);
 el('refTarget').addEventListener('change',densityUpdate);
 el('refDiagram').addEventListener('change',diagramUpdate);
 el('refProcess').addEventListener('change',processUpdate);
 el('refApply').addEventListener('click',()=>{
  const row=pipeSchedules.find(x=>x.nps===nps.value);if(!row)return;
  const thick=row.wall[el('refSch').value];if(!(thick>0))return;
  const input=el('thickness');input.value=String(thick);input.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('[data-nav="calc"]').click();input.focus();
 });
 el('refApplyProc').addEventListener('click',()=>{
  const row=pipeSchedules.find(x=>x.nps===nps.value);if(!row)return;
  const thick=row.wall[el('refSch').value];if(!(thick>0))return;
  el('procOD').value=String(row.od);el('procT').value=String(thick);
  el('procShape').value='ring';el('procOD').dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('[data-proc-open]').click();
 });
 pipeUpdate(true);densityUpdate();diagramUpdate();processUpdate();updateReferenceLanguage();
}
