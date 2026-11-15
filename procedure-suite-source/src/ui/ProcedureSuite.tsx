import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {CalculateExposure,ProcedureProfile,ProcedureDraft,DraftCandidate,ApprovedIqiRule,ApprovedExposureCountRule,ExposureInput,EvaluatedPlan,SourceType,FilmType,Technique,IqiSide,Status,SavedPlan} from '../domain/types.js';
import {ALL_SOURCES,ALL_FILMS,ALL_TECHNIQUES,newId,validateProfile} from '../domain/validation.js';
import {parseProcedureDocument} from '../parser/parseProcedureDocument.js';
import {evaluateExposurePlan} from '../engine/evaluateExposurePlan.js';
import {applyPlannerInputs,applyPlannerShape,applySourceSelection} from '../planning/plannerInput.js';
import {listProcedures,loadActiveProcedure,saveProcedure,deleteProcedure,setActiveProcedure,exportBackup,downloadBackup,importBackup,createSavedPlan,savePlan,listPlans,deletePlan} from '../storage/procedureStorage.js';
import './procedureSuite.css';

type Tab='read'|'library'|'planner'|'history';
const blankDraft=():Partial<DraftCandidate>=>({code:'',customer:'',revision:'',norm:'ISO 17636-1:2022',class:'B',planarDefectsRequired:false,
 sources:[],films:[],techniques:[],thickness:{minMm:Number.NaN,maxMm:Number.NaN},density:{min:Number.NaN,max:Number.NaN},
 iqi:{side:'source',extraFinerWires:0,filmSideComparisonVerified:false,approvedRules:[]},
 planning:{minimumFilmOverlapMm:null,approvedExposureRules:[]},source:{kind:'text'}});
const baseInput=():ExposureInput=>({source:'Se-75',film:'D4',technique:'SWSI',thicknessMm:Number.NaN,penetratedThicknessMm:null,maximumPathThicknessMm:null,density:Number.NaN,sfdMm:Number.NaN,activityCi:undefined,model:'',kv:undefined,ma:undefined,material:'Fe',iqiSide:'source',
 geometry:{shape:'plate',diameterMm:null,sourcePlacement:null,sourceSizeMm:null,objectToFilmMm:null,filmUsableLengthMm:null,filmWrapped:false}});
const num=(v:string)=>v.trim()===''?null:Number(v.replace(',','.'));
const value=(n:number|null|undefined)=>n===null||n===undefined||!Number.isFinite(n)?'':String(n);
const fmt=(n:number|null)=>n===null?'onbekend':new Intl.NumberFormat('nl-NL',{maximumFractionDigits:2}).format(n);
const friendlyStatus:Record<Status,string>={green:'CONTROLE OK',orange:'NOG TE CONTROLEREN',red:'GEBLOKKEERD'};
const RESEARCHER_STORAGE_KEY='ndt-procedure-suite-confirming-researcher-v1';
const getSavedResearcher=():string=>{
 try{return typeof window==='undefined'?'':(window.localStorage.getItem(RESEARCHER_STORAGE_KEY)??'');}catch{return '';}
};
const optionLabel=(item:string):string=>({
 source:'Bronzijde (Source)',film:'Filmzijde (Film)',either:'Beide zijden',
 plate:'Vlakke plaat',pipe:'Pijp / Rondlas',
 nominal:'Nominale dikte',penetrated:'Doorstraalde dikte',
 'DWDI-ELLIPSE':'DWDI ellips','internal-central':'Centraal binnen',
 external:'Buitenzijde','internal-offset':'Excentrisch binnen',
 onbekend:'Onbekend'
} as Record<string,string>)[item]??item;
/** Grote selecteerknoppen; selectiewaarde blijft de ongewijzigde interne code. */
function CheckGroup<T extends string>({label,items,selected,onChange}:{label:string;items:readonly T[];selected:T[];onChange:(values:T[])=>void}){
 return <fieldset className="ndt-choice-group ndt-multi"><legend>{label} <small>(meerdere mogelijk)</small></legend>
  <div className={`ndt-option-grid ${items.length===6?'ndt-options-film':''}`}>
  {items.map(item=><button key={item} type="button" className="ndt-option-button" aria-pressed={selected.includes(item)} onClick={()=>onChange(selected.includes(item)?selected.filter(x=>x!==item):[...selected,item])}>{optionLabel(item)}</button>)}
  </div>
 </fieldset>;
}
function ChoiceGroup<T extends string>({label,items,selected,onChange}:{label:string;items:readonly T[];selected:T;onChange:(v:T)=>void}){
 return <fieldset className="ndt-choice-group ndt-wide"><legend>{label}</legend>
  <div className={`ndt-option-grid ${items.length===6?'ndt-options-film':''} ${items.length===2?'ndt-options-two':''}`}>
  {items.map(item=><button key={item} type="button" className="ndt-option-button" aria-pressed={selected===item} onClick={()=>onChange(item)}>{optionLabel(item)}</button>)}
  </div>
 </fieldset>;
}
/** Bewaart het getypte decimaalteken tijdens invoer op iPhone, bijvoorbeeld '2,' of '3.'. */
function FloatField({label,value:current,onChange,allowEmpty=false,placeholder}:{label:string;value:number|null|undefined;onChange:(v:number|null)=>void;allowEmpty?:boolean;placeholder?:string}){
 const [display,setDisplay]=useState(()=>value(current));
 const lastEmitted=useRef<number|null|undefined>(current);
 useEffect(()=>{
  if(Object.is(lastEmitted.current,current))return;
  lastEmitted.current=current;
  setDisplay(value(current));
 },[current]);
 return <label className="ndt-field"><span>{label}</span><input type="text" inputMode="decimal" autoComplete="off" placeholder={placeholder??'Bijv. 2.0'} value={display} onChange={e=>{
   const next=e.target.value;setDisplay(next);
   const parsed=num(next);const normalized=parsed===null?(allowEmpty?null:Number.NaN):parsed;
   lastEmitted.current=normalized;onChange(normalized);
  }}/></label>;
}
function SelectField<T extends string>({label,options,selected,onChange}:{label:string;options:readonly T[];selected:T;onChange:(v:T)=>void}){
 return <label className="ndt-field"><span>{label}</span><select value={selected} onChange={e=>onChange(e.target.value as T)}>{options.map(o=><option key={o} value={o}>{optionLabel(o)}</option>)}</select></label>;
}
function IqiRulesEditor({rows,onChange}:{rows:ApprovedIqiRule[];onChange:(rows:ApprovedIqiRule[])=>void}){
 const patch=(idx:number,p:Partial<ApprovedIqiRule>)=>onChange(rows.map((r,i)=>i===idx?{...r,...p}:r));
 return <details className="ndt-detail"><summary>IQI-regels — door Level 3 gecontroleerde normtabellen ({rows.length})</summary>
   <p className="ndt-help">Leg per techniek, klasse, zijde en diktegebied de vereiste W-draad vast. Geen standaardwaarden worden gegokt. Bij dubbelwandige opnamen is de doorstraalde dikte doorgaans bepalend; kies de juiste tabel.</p>
   {rows.map((r,i)=><div className="ndt-rule" key={r.id}>
    <div className="ndt-grid">
     <SelectField label="Techniek" options={ALL_TECHNIQUES} selected={r.technique} onChange={v=>patch(i,{technique:v})}/>
     <SelectField label="Klasse" options={['A','B'] as const} selected={r.class} onChange={v=>patch(i,{class:v})}/>
     <SelectField label="IQI-zijde" options={['source','film'] as const} selected={r.side} onChange={v=>patch(i,{side:v})}/>
     <SelectField label="Diktebasis" options={['nominal','penetrated'] as const} selected={r.basis} onChange={v=>patch(i,{basis:v})}/>
     <FloatField label="Boven (mm), exclusief" value={r.aboveMm} onChange={v=>patch(i,{aboveMm:v??0})}/>
     <FloatField label="Tot en met (mm)" value={r.upToMm} onChange={v=>patch(i,{upToMm:v??0})}/>
     <FloatField label="Vereist draadnummer W" value={r.wireNumber} onChange={v=>patch(i,{wireNumber:v??0})}/>
     <label className="ndt-field"><span>Bron, tabel en revisie</span><input value={r.reference} onChange={e=>patch(i,{reference:e.target.value})}/></label>
    </div><button type="button" className="ndt-secondary" onClick={()=>onChange(rows.filter((_,j)=>j!==i))}>Regel verwijderen</button>
   </div>)}
   <button type="button" className="ndt-secondary" onClick={()=>onChange([...rows,{id:newId(),technique:'SWSI',side:'source',class:'B',basis:'nominal',aboveMm:0,upToMm:0,wireNumber:0,reference:''}])}>+ IQI-regel toevoegen</button>
 </details>;
}
function ShotRulesEditor({rows,onChange}:{rows:ApprovedExposureCountRule[];onChange:(rows:ApprovedExposureCountRule[])=>void}){
 const patch=(idx:number,p:Partial<ApprovedExposureCountRule>)=>onChange(rows.map((r,i)=>i===idx?{...r,...p}:r));
 return <details className="ndt-detail"><summary>Goedgekeurde opnameaantallen (bijlage A / geometrie) ({rows.length})</summary>
  <p className="ndt-help">Vul uitsluitend een door jou geverifieerde minimumwaarde met bijbehorende geldigheidsgrenzen in. De 10%/20%-regel levert niet zelfstandig een opnameaantal op.</p>
  {rows.map((r,i)=><div className="ndt-rule" key={r.id}><div className="ndt-grid">
   <SelectField label="Techniek" options={ALL_TECHNIQUES} selected={r.technique} onChange={v=>patch(i,{technique:v})}/>
   <SelectField label="Klasse" options={['A','B'] as const} selected={r.class} onChange={v=>patch(i,{class:v})}/>
   <SelectField label="Bronpositie" options={['internal-central','external','internal-offset'] as const} selected={r.sourcePlacement} onChange={v=>patch(i,{sourcePlacement:v})}/>
   {([['minDiameterMm','Ø vanaf mm'],['maxDiameterMm','Ø tot mm'],['minWallMm','t vanaf mm'],['maxWallMm','t tot mm'],['minSfdMm','SFD vanaf mm'],['maxSfdMm','SFD tot mm'],['minimumExposures','Minimaal aantal opnamen']] as const).map(([k,label])=><FloatField key={k} label={label} value={r[k]} onChange={v=>patch(i,{[k]:v??0})}/>)}
   <label className="ndt-field"><span>Herkomst (bijlage A / goedgekeurde tabel)</span><input value={r.reference} onChange={e=>patch(i,{reference:e.target.value})}/></label>
  </div><button type="button" className="ndt-secondary" onClick={()=>onChange(rows.filter((_,j)=>j!==i))}>Regel verwijderen</button></div>)}
  <button type="button" className="ndt-secondary" onClick={()=>onChange([...rows,{id:newId(),technique:'SWSI',class:'B',minDiameterMm:0,maxDiameterMm:0,minWallMm:0,maxWallMm:0,minSfdMm:0,maxSfdMm:0,minimumExposures:0,sourcePlacement:'external',reference:''}])}>+ Opnameregel toevoegen</button>
 </details>;
}
export interface ProcedureSuiteProps {calculateExposure:CalculateExposure;}
export function ProcedureSuite({calculateExposure}:ProcedureSuiteProps){
 const [tab,setTab]=useState<Tab>('read');
 const [draft,setDraft]=useState<Partial<DraftCandidate>>(blankDraft);
 const [parsing,setParsing]=useState<ProcedureDraft|null>(null);
 const [paste,setPaste]=useState('');
 const [who,setWho]=useState(getSavedResearcher);
 const [ack,setAck]=useState(false);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [sourceFile,setSourceFile]=useState<File|null>(null);
 const [procedures,setProcedures]=useState<ProcedureProfile[]>([]);
 const [active,setActive]=useState<ProcedureProfile|null>(null);
 const [plans,setPlans]=useState<SavedPlan[]>([]);
 const [planName,setPlanName]=useState('');
 const [input,setInput]=useState<ExposureInput>(baseInput);
 const [result,setResult]=useState<EvaluatedPlan|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [readyToPlan,setReadyToPlan]=useState(false);
 const savedBanner=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{if(readyToPlan&&tab==='library')savedBanner.current?.scrollIntoView({behavior:'smooth',block:'start'});},[readyToPlan,tab]);
 const patch=(data:Partial<DraftCandidate>)=>setDraft(old=>({...old,...data}));
 const changeInput=(data:Partial<ExposureInput>)=>{setResult(null);setInput(old=>applyPlannerInputs(old,data));};
 const changeSource=(source:SourceType)=>{setResult(null);setInput(old=>applySourceSelection(old,source));};
 const changeShape=(shape:'plate'|'pipe')=>{setResult(null);setInput(old=>applyPlannerShape(old,shape));};
 const changeGeometry=(data:Partial<ExposureInput['geometry']>)=>{setResult(null);setInput(old=>({...old,geometry:{...old.geometry,...data}}));};
 const refresh=async()=>{const [all,act,hist]=await Promise.all([listProcedures(),loadActiveProcedure(),listPlans()]);setProcedures(all);setActive(act);setPlans(hist);};
 useEffect(()=>{refresh().catch(err=>setError(String(err)));},[]);
 useEffect(()=>{if(active){changeInput({source:active.sources[0]??'Se-75',film:active.films[0]??'D4',technique:active.techniques[0]??'SWSI',iqiSide:active.iqi.side==='either'?'source':active.iqi.side});}},[active?.id]);
 const currentValidations=useMemo(()=>{
  if(!draft)return[];
  return validateProfile({...draft,id:editingId??'temporary',schemaVersion:1,confirmedBy:who||'onderzoeker',confirmedAt:new Date().toISOString(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()} as ProcedureProfile);
 },[draft,who,editingId]);
 const parse=async()=>{
  setBusy(true);setError('');setMessage('');setReadyToPlan(false);try{
   if(!sourceFile&&!paste.trim())throw Error('Kies eerst een bestand of plak proceduretekst.');
   const p=await parseProcedureDocument(sourceFile??paste);
   setParsing(p);setDraft({...blankDraft(),...p.candidate,source:p.source});setEditingId(null);setAck(false);
   setMessage('Tekst geanalyseerd. Controleer ALLE velden en bevestig handmatig.');
  }catch(e){setError(String(e));}finally{setBusy(false);}
 };
 const save=async()=>{
  setError('');setMessage('');setReadyToPlan(false);try{
   if(!ack)throw Error('Vink eerst aan dat je alle procedurevelden met het originele document hebt vergeleken.');
   if(!who.trim())throw Error('Naam van de bevestigende onderzoeker ontbreekt.');
   const old=editingId?procedures.find(p=>p.id===editingId):null;
   const now=new Date().toISOString();
   const profile:ProcedureProfile={...draft,schemaVersion:1,id:editingId??newId(),confirmedBy:who.trim(),confirmedAt:now,
     createdAt:old?.createdAt??now,updatedAt:now,source:draft.source??{kind:'text'}} as ProcedureProfile;
   await saveProcedure(profile);
   // De zojuist bevestigde procedure moet ook degene zijn die het opnameplan controleert.
   await setActiveProcedure(profile.id);
   await refresh();setEditingId(null);setTab('library');
   try{window.localStorage.setItem(RESEARCHER_STORAGE_KEY,who.trim());}catch{/* Browser kan opslag blokkeren. */}
   setReadyToPlan(true);
   setMessage('Procedure bevestigd en lokaal opgeslagen. Ontbrekende IQI-/opnametabellen blijven onbekend totdat ze gecontroleerd zijn toegevoegd.');
  }catch(e){setError(String(e));}
 };
 const edit=(p:ProcedureProfile)=>{
  const {id,schemaVersion,confirmedBy,confirmedAt,createdAt,updatedAt,...rest}=p;
  setDraft(structuredClone(rest));setWho(confirmedBy);setEditingId(id);setAck(false);setParsing(null);setReadyToPlan(false);setTab('read');setMessage('Bewerk en bevestig opnieuw.');setError('');
 };
 const importJson=async(file:File)=>{
  setError('');try{const counts=await importBackup(await file.text());await refresh();setMessage(`${counts.procedures} procedures en ${counts.plans} logboekrecords geïmporteerd. De actieve procedure is niet omgeschakeld.`);}catch(e){setError(String(e));}
 };
 const evaluate=async()=>{
  setError('');setMessage('');setResult(null);if(!active){setError('Selecteer eerst een bevestigde procedure.');return;}
  setBusy(true);try{setResult(await evaluateExposurePlan(input,active,calculateExposure));}catch(e){setError(String(e));}finally{setBusy(false);}
 };
 const confirmDelete=async(id:string,kind:'profile'|'plan')=>{
  if(!window.confirm(`Weet je zeker dat je dit ${kind==='plan'?'opnameplan':'procedureprofiel'} wilt verwijderen?`))return;
  try{if(kind==='plan')await deletePlan(id);else await deleteProcedure(id);await refresh();setResult(null);}catch(e){setError(String(e));}
 };
 return <div className="ndt-suite">
  <header className="ndt-suite-header"><div><p className="ndt-overline">NDT RADIOGRAPHY PRO</p><h2>Procedure Suite</h2><p className="ndt-help">Procedurecontroles · rekenmotor ongewijzigd</p></div><span className="ndt-chip">Onderzoeksversie</span></header>
  <nav className="ndt-tabs" aria-label="Procedure-suite modules">
   {([['read','Uitlezer'],['library','Bibliotheek'],['planner','Opnameplan'],['history','Logboek']] as [Tab,string][]).map(([k,label])=><button key={k} className={tab===k?'is-active':''} type="button" onClick={()=>{setTab(k);setReadyToPlan(false);setError('');setMessage('');}}>{label}</button>)}
  </nav>
  {error&&<div role="alert" className="ndt-alert ndt-red">{error}</div>}
  {message&&<div ref={savedBanner} role="status" className={`ndt-alert ndt-green ${readyToPlan?'ndt-save-success':''}`}>
   <span>{message}</span>
   {readyToPlan&&<button className="ndt-continue" type="button" onClick={()=>{setTab('planner');setReadyToPlan(false);setMessage('');setResult(null);}}>Verder naar Opnameplan →</button>}
  </div>}
  {tab==='read'&&<section className="ndt-card" aria-label="Procedure-uitlezer en bevestiging">
   <h3>1. Procedure uitlezen</h3>
   <label className="ndt-field"><span>PDF, DOCX of TXT</span><input type="file" accept=".pdf,.docx,.txt,application/pdf" onChange={e=>{setSourceFile(e.target.files?.[0]??null);}}/></label>
   <label className="ndt-field"><span>Of plak de volledige proceduretekst</span><textarea rows={5} value={paste} onChange={e=>{setPaste(e.target.value);if(e.target.value)setSourceFile(null);}} placeholder="Procedurecode: RT-001&#10;Klant: ...&#10;Revisie: ..."/></label>
   <button type="button" disabled={busy} onClick={parse}>{busy?'Uitlezen…':'Procedure automatisch uitlezen'}</button>
   {parsing&&<details className="ndt-detail" open><summary>Uitgelezen gegevens en ontbrekende velden</summary>
    <div className="ndt-alert ndt-orange">Automatische tekstherkenning is niet voldoende voor normvrijgave. Verifieer alle waarden in het originele document.</div>
    {parsing.warnings.map((w,i)=><p key={i} className="ndt-help">⚠ {w}</p>)}
    {Object.entries(parsing.evidence).map(([k,ev])=><details key={k}><summary>Bronfragment: {k} ({ev.length})</summary>{ev.map((e,i)=><p key={i} className="ndt-help">Regel {e.line}: {e.quote}</p>)}</details>)}
   </details>}
   <h3>2. Verplicht controlescherm — alle velden corrigeerbaar</h3>
   <div className="ndt-grid">
    {([['code','Procedurecode / documentnummer'],['customer','Klantnaam'],['revision','Revisie']] as const).map(([k,label])=><label key={k} className="ndt-field"><span>{label}</span><input value={String(draft[k]??'')} onChange={e=>patch({[k]:e.target.value})}/></label>)}
    <label className="ndt-field"><span>Norm</span><input readOnly value="ISO 17636-1:2022" title="Deze versie ondersteunt alleen ISO filmradiografie"/></label>
    <ChoiceGroup label="Testklasse" items={['A','B'] as const} selected={draft.class??'B'} onChange={v=>patch({class:v})}/>
    <label className="ndt-check ndt-wide"><input type="checkbox" checked={draft.planarDefectsRequired??false} onChange={e=>patch({planarDefectsRequired:e.target.checked})}/>Vlakke defecten relevant: geometrie van klasse B verplicht, ook bij testklasse A</label>
   </div>
   <CheckGroup label="Toegestane stralingsbronnen" items={ALL_SOURCES} selected={draft.sources??[]} onChange={v=>patch({sources:v})}/>
   <CheckGroup label="Toegestane filmtypes" items={ALL_FILMS} selected={draft.films??[]} onChange={v=>patch({films:v})}/>
   <CheckGroup label="Toegestane technieken" items={ALL_TECHNIQUES} selected={draft.techniques??[]} onChange={v=>patch({techniques:v})}/>
   <div className="ndt-grid">
    <FloatField label="Minimale wanddikte (mm)" value={draft.thickness?.minMm} placeholder="Bijv. 2.0" onChange={v=>patch({thickness:{...draft.thickness!,minMm:v??Number.NaN}})}/>
    <FloatField label="Maximale wanddikte (mm)" value={draft.thickness?.maxMm} placeholder="Bijv. 35.0" onChange={v=>patch({thickness:{...draft.thickness!,maxMm:v??Number.NaN}})}/>
    <FloatField label="Minimale zwarting D" value={draft.density?.min} placeholder="Bijv. 2.0" onChange={v=>patch({density:{...draft.density!,min:v??Number.NaN}})}/>
    <FloatField label="Maximale zwarting D" value={draft.density?.max} placeholder="Bijv. 3.5" onChange={v=>patch({density:{...draft.density!,max:v??Number.NaN}})}/>
    <ChoiceGroup label="IQI-zijde" items={['source','film','either'] as const} selected={draft.iqi?.side??'source'} onChange={v=>patch({iqi:{...draft.iqi!,side:v}})}/>
    <FloatField label="Extra fijnere draden t.o.v. tabel" value={draft.iqi?.extraFinerWires} onChange={v=>patch({iqi:{...draft.iqi!,extraFinerWires:v??0}})}/>
    <FloatField label="Minimale filmoverlap (mm), indien bekend" value={draft.planning?.minimumFilmOverlapMm} onChange={v=>patch({planning:{...draft.planning!,minimumFilmOverlapMm:v}})} allowEmpty/>
    <label className="ndt-check"><input type="checkbox" checked={draft.iqi?.filmSideComparisonVerified??false} onChange={e=>patch({iqi:{...draft.iqi!,filmSideComparisonVerified:e.target.checked}})}/>Filmzijde-IQI vergelijkingsopname/afspraak gecontroleerd</label>
   </div>
   <IqiRulesEditor rows={draft.iqi?.approvedRules??[]} onChange={rows=>patch({iqi:{...draft.iqi!,approvedRules:rows}})}/>
   <ShotRulesEditor rows={draft.planning?.approvedExposureRules??[]} onChange={rows=>patch({planning:{...draft.planning!,approvedExposureRules:rows}})}/>
   {currentValidations.length>0&&<div className="ndt-alert ndt-orange"><strong>Controleer voor opslag:</strong>{currentValidations.map((e,i)=><p key={i}>{e}</p>)}</div>}
   <label className="ndt-field"><span>Naam / personeelscode bevestigende onderzoeker</span><input value={who} onChange={e=>setWho(e.target.value)} placeholder="Naam of personeelscode" autoComplete="name"/></label><p className="ndt-help ndt-stored-note">Wordt na succesvolle bevestiging onthouden op dit apparaat. Niet automatisch gedeeld.</p>
   <label className="ndt-check ndt-ack"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>Ik heb alle velden en proceduregrenzen met het originele document vergeleken. Deze opslag is geen automatische normgoedkeuring.</label>
   <button type="button" disabled={busy||!ack||currentValidations.length>0} onClick={save}>Procedure bevestigen & opslaan</button>
  </section>}
  {tab==='library'&&<section className="ndt-card"><h3>Procedure-Bibliotheek</h3>
   <div className="ndt-actions"><button type="button" onClick={()=>{setDraft(blankDraft());setEditingId(null);setParsing(null);setAck(false);setReadyToPlan(false);setTab('read');}}>+ Nieuwe procedure</button>
    <button className="ndt-secondary" type="button" onClick={()=>{exportBackup().then(downloadBackup).catch(e=>setError(String(e)));}}>Export JSON-back-up</button>
    <label className="ndt-file-import">Import JSON<input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];if(file)void importJson(file);e.target.value='';}}/></label>
   </div>
   {procedures.length===0?<p className="ndt-help">Nog geen bevestigde procedures opgeslagen.</p>:procedures.map(p=><article className="ndt-library-item" key={p.id}>
    <div><strong>{p.customer} · {p.code}</strong><p>Rev. {p.revision} · ISO klasse {p.class} · bevestigd door {p.confirmedBy}</p><small>{p.sources.join(' / ')} · {p.techniques.join(' / ')}</small></div>
    {active?.id===p.id&&<span className="ndt-chip">Actieve procedure</span>}
    <div className="ndt-actions">
     <button type="button" className="ndt-secondary" disabled={active?.id===p.id} onClick={async()=>{await setActiveProcedure(p.id);await refresh();setResult(null);}}>Activeren</button>
     <button type="button" className="ndt-secondary" onClick={()=>edit(p)}>Bewerken</button>
     <button type="button" className="ndt-secondary ndt-danger" onClick={()=>void confirmDelete(p.id,'profile')}>Verwijderen</button>
    </div>
   </article>)}
  </section>}
  {tab==='planner'&&<section className="ndt-card ndt-planner-card"><h3>Opnameplan + bestaande belichtingsmotor</h3>
   <p className="ndt-help">Actief: <strong>{active?`${active.customer} / ${active.code} rev. ${active.revision}`:'geen procedure gekozen'}</strong>. De bestaande motor berekent de belichtingstijd ongewijzigd.</p>
   <div className="ndt-grid ndt-planner-grid">
    <ChoiceGroup label="Bron / toestel" items={ALL_SOURCES} selected={input.source} onChange={changeSource}/>
    <ChoiceGroup label="Werkstuk" items={['plate','pipe'] as const} selected={input.geometry.shape??'pipe'} onChange={changeShape}/>
    <ChoiceGroup label="Filmtype" items={ALL_FILMS} selected={input.film} onChange={v=>changeInput({film:v})}/>
    <ChoiceGroup label="Opnametechniek" items={ALL_TECHNIQUES} selected={input.technique} onChange={v=>changeInput({technique:v})}/>
    <ChoiceGroup label="IQI-positie" items={['source','film'] as const} selected={input.iqiSide} onChange={v=>changeInput({iqiSide:v})}/>
    <FloatField label="Wanddikte t (mm)" value={input.thicknessMm} placeholder="Bijv. 10.0" onChange={v=>changeInput({thicknessMm:v??Number.NaN})}/>
    <div className="ndt-field ndt-derived-field" role="group" aria-label="Automatisch berekende nominale doorstraalde dikte">
     <span>Doorstraalde dikte w (mm) · automatisch</span>
     <output aria-live="polite" className="ndt-derived-value">{value(input.penetratedThicknessMm)?`${value(input.penetratedThicknessMm)} mm`:'Vul wanddikte t in'}</output>
     <small>{input.technique==='SWSI'?'SWSI: 1 × t':'DWSI / DWDI: 2 × t'} · nominale benadering</small>
    </div>
    <FloatField label="Zwarting D" value={input.density} placeholder="Bijv. 2.5" onChange={v=>changeInput({density:v??Number.NaN})}/>
    <FloatField label="Bron-film-afstand SFD (mm)" value={input.sfdMm} placeholder="Bijv. 800" onChange={v=>changeInput({sfdMm:v??Number.NaN})}/>
    {input.source==='X-ray'?<>
      <label className="ndt-field"><span>Röntgenapparaat / model</span><input value={input.model??''} placeholder="Bijv. toestelmodel" onChange={e=>changeInput({model:e.target.value})}/></label>
      <FloatField label="Röntgenspanning (kV)" value={input.kv} placeholder="Bijv. 160" onChange={v=>changeInput({kv:v??undefined})} allowEmpty/>
      <FloatField label="Buisstroom (mA)" value={input.ma} placeholder="Bijv. 5.0" onChange={v=>changeInput({ma:v??undefined})} allowEmpty/>
    </>:<FloatField label="Bronactiviteit (Ci)" value={input.activityCi} placeholder="Bijv. 40.0" onChange={v=>changeInput({activityCi:v??undefined})} allowEmpty/>}
    <FloatField label="Maximale doorstraalde dikte aan rand (mm)" value={input.maximumPathThicknessMm} placeholder="Bijv. 22.0" onChange={v=>changeInput({maximumPathThicknessMm:v})} allowEmpty/>
    {input.geometry.shape==='pipe'&&<>
      <FloatField label="Pijpbuitendiameter Ø (mm)" value={input.geometry.diameterMm} placeholder="Bijv. 114.3" onChange={v=>changeGeometry({diameterMm:v})} allowEmpty/>
      <SelectField label="Bronpositie" options={['onbekend','internal-central','external','internal-offset'] as const} selected={input.geometry.sourcePlacement??'onbekend'} onChange={v=>changeGeometry({sourcePlacement:v==='onbekend'?null:v})}/>
      <FloatField label="Bruikbare filmlengte langs omtrek (mm)" value={input.geometry.filmUsableLengthMm} placeholder="Bijv. 300" onChange={v=>changeGeometry({filmUsableLengthMm:v})} allowEmpty/>
      <label className="ndt-check ndt-wide"><input type="checkbox" checked={input.geometry.filmWrapped} onChange={e=>changeGeometry({filmWrapped:e.target.checked})}/>Film volgt de buisomtrek (omgelegde film)</label>
    </>}
    <FloatField label="Bron-/focusgrootte d, grootste afmeting (mm)" value={input.geometry.sourceSizeMm} placeholder="Bijv. 2.5" onChange={v=>changeGeometry({sourceSizeMm:v})} allowEmpty/>
    <FloatField label="Object-film-afstand b (mm)" value={input.geometry.objectToFilmMm} placeholder="Bijv. 10.0" onChange={v=>changeGeometry({objectToFilmMm:v})} allowEmpty/>
   </div>
   <p className="ndt-help ndt-w-caution">Let op: w = t of 2 × t is alleen een <strong>nominale schatting</strong> voor de procedure-/IQI-controles. Bij schuine, excentrische en elliptische opnamen kan de werkelijke stralingsweg afwijken. Controleer deze afzonderlijk. De belichtingsmotor blijft de oorspronkelijke wanddikte t gebruiken.</p>
   {result&&<div className="ndt-output" aria-live="polite">
    <div className={`ndt-bigstatus ndt-${result.status}`}>{friendlyStatus[result.status]} <small>(alleen procedurecontroles)</small></div>
    <div className="ndt-kpis"><p><small>Belichtingstijd</small><strong>{result.exposure?.ok&&Number.isFinite(result.exposure.minutes)?`${Math.round(result.exposure.minutes!*60)} s`:'Niet beschikbaar'}</strong></p>
     <p><small>Filmsegmenten</small><strong>{input.geometry.shape==='plate'?'n.v.t. (plaat)':fmt(result.filmPlan.filmSegments)}</strong></p>
     <p><small>Min. opnamen</small><strong>{fmt(result.filmPlan.minimumExposures)}</strong></p>
     <p><small>Vereiste IQI</small><strong>{result.iqi.wireNumber?`W${result.iqi.wireNumber} (${result.iqi.wireDiameterMm} mm)`:'Onbekend'}</strong></p></div>
    <p className="ndt-help">IQI-positie: {result.iqi.position==='film'?'filmzijde':'bronzijde'} · Gemeten zichtbaarheid en daadwerkelijke filmdekking moeten apart worden beoordeeld.</p>
    <ul className="ndt-checklist">{result.checks.map((c,i)=><li key={`${c.code}-${i}`} className={`ndt-${c.status}`}><strong>{c.status==='red'?'STOP':c.status==='orange'?'CONTROLE':'OK'}</strong> {c.message}</li>)}</ul>
    <label className="ndt-field"><span>Logboeknaam</span><input value={planName} onChange={e=>setPlanName(e.target.value)} placeholder="Project / lasnummer / opname-ID"/></label>
    <button type="button" disabled={!planName.trim()} onClick={async()=>{try{if(!active)return;await savePlan(createSavedPlan(planName,active,result));setPlanName('');await refresh();setMessage('Opnameplan inclusief status en snapshot opgeslagen in het lokale logboek.');}catch(e){setError(String(e));}}}>Bewaar opnameplan in logboek</button>
   </div>}
   <div className="ndt-planner-sticky" role="group" aria-label="Berekening en procedurecontrole">
    <button className="ndt-primary-calculate" type="button" disabled={!active||busy} onClick={()=>void evaluate()}>{busy?'Controleren…':'Bereken met bestaande motor'}</button>
    <small>Met procedurecontrole · geen automatische RT-vrijgave</small>
   </div>
  </section>}
  {tab==='history'&&<section className="ndt-card"><h3>Opnamelogboek / historie</h3>
    {plans.length===0?<p className="ndt-help">Nog geen opnameplannen opgeslagen.</p>:plans.map(x=><article className="ndt-library-item" key={x.id}>
      <div><strong>{x.name}</strong><p>{new Date(x.createdAt).toLocaleString('nl-NL')} · {x.procedureSnapshot.code} rev. {x.procedureSnapshot.revision}</p>
      <p className={`ndt-status-text ndt-${x.result.status}`}>{friendlyStatus[x.result.status]}</p>
      <p>{x.result.input.source} · {x.result.input.film} · t={x.result.input.thicknessMm} mm · D={x.result.input.density} · tijd={x.result.exposure?.ok&&x.result.exposure.minutes!==undefined?Math.round(x.result.exposure.minutes*60)+' s':'onbekend'}</p>
      <p>Films: {fmt(x.result.filmPlan.filmSegments)} · Belichtingen: {fmt(x.result.filmPlan.minimumExposures)} · IQI: {x.result.iqi.wireNumber?'W'+x.result.iqi.wireNumber:'onbekend'}</p></div>
      <button type="button" className="ndt-secondary ndt-danger" onClick={()=>void confirmDelete(x.id,'plan')}>Verwijderen</button>
    </article>)}
  </section>}
  <footer className="ndt-footer">Opgeslagen gegevens blijven in IndexedDB op dit apparaat. Maak regelmatig een JSON-back-up. Deze module geeft geen automatische RT-procedurevrijgave of toestemming voor een werkelijke opname.</footer>
 </div>;
}
