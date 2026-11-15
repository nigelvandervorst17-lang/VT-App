/** Research-only browser page. No production engine changes, remote APIs, or uploads. */
import {researchDatabase} from './xray-core.mjs';
import {makeXrayTubeProfile,calibrateXrayTube,previewTubeExposure,assessTubeGeometry,listXrayTubeProfiles,saveXrayTubeProfile,PROFILE_STATUS,REFERENCE_WARNING,RESEARCH_WARNING} from './xray-tube-profiles.mjs';

const $=id=>document.getElementById(id);
const value=id=>$(id).value.trim();
const decimal=s=>{const v=String(s??'').trim().replace(',','.');return /^\+?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v)?Number(v):NaN;};
const num=id=>decimal(value(id));
const nullable=id=>value(id)===''?null:num(id);
const fmt=n=>Number.isFinite(n)?n.toLocaleString('nl-NL',{minimumFractionDigits:4,maximumFractionDigits:6}):'—';
const hms=minutes=>{if(!Number.isFinite(minutes)||minutes<=0)return '—';const n=Math.round(minutes*60);return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(':');};
function output(id,message,ok=null){const el=$(id);el.textContent=message;el.classList.toggle('error',ok===false);el.classList.toggle('ok',ok===true);}
function list(){
 const response=listXrayTubeProfiles(window.localStorage);
 if(!response.ok)throw new Error('Lokale opslag niet beschikbaar: '+response.error);
 return response.profiles;
}
function current(){return list().find(p=>p.id===value('tubeChoice'))??null;}
function showStatus(){
 const p=current(),el=$('currentStatus');
 if(!p){el.textContent='Nog geen toestel gekozen — alle berekeningen geblokkeerd.';return;}
 el.textContent=[
   p.manufacturer+' '+p.model,'Spanningsvorm: '+p.generatorType+' · '+p.beamType,
   'Maximaal: '+p.maxKv+' kV / '+p.maxMa+' mA · d='+p.focalSpotMm+' mm',
   'Status: '+p.calibrationStatus+(p.pendingCalibration?' · voorlopige ijking wacht op review':''),
   'Actieve k_tube: '+fmt(p.kTube),
   p.calibrationStatus===PROFILE_STATUS.CALIBRATED?RESEARCH_WARNING:REFERENCE_WARNING
 ].join('\n');
 el.style.whiteSpace='pre-line';
}
function render(selected=''){
 const select=$('tubeChoice'),old=selected||select.value;
 const entries=list();
 select.replaceChildren(new Option('Kies opgeslagen toestel',''));
 for(const p of entries)select.add(new Option(p.manufacturer+' '+p.model,p.id));
 if(entries.some(p=>p.id===old))select.value=old;
 else if(entries.length)select.value=entries[0].id;
 showStatus();
}
function save(profile){
 const r=saveXrayTubeProfile(profile,window.localStorage);
 if(!r.ok)throw new Error(r.error);
 render(profile.id);
}
function handle(id,fn){try{fn();}catch(e){output(id,'Fout: '+String(e.message??e),false);}}
for(const [name,ds] of Object.entries(researchDatabase().xray)){
 if(!Array.isArray(ds?.curves)||ds.curves.length===0||ds.enabled===false)continue;
 $('referenceModel').add(new Option(name+' · '+ds.film+' (onderzoeksreferentie)',name));
}
$('profileForm').addEventListener('submit',e=>{
 e.preventDefault();
 handle('profileOutput',()=>{
  const values={
   id:'research-'+(globalThis.crypto?.randomUUID?.()??(Date.now()+'-'+Math.random().toString(36).slice(2))),
   manufacturer:value('manufacturer'),model:value('tubeModel'),serialNumber:value('tubeSerial'),
   generatorType:value('generatorType'),beamType:value('beamType'),
   maxKv:num('maxKv'),maxMa:num('maxMa'),focalSpotMm:num('focalSpot'),
   maxPowerKw:nullable('maxKw'),referenceModel:value('referenceModel')||null,
   referenceEvidenceId:value('referenceEvidence')||null
  };
  const result=makeXrayTubeProfile(values);
  if(!result.ok)throw new Error(result.error);
  save(result.profile);$('profileForm').reset();
  output('profileOutput','Profiel lokaal bewaard: UNVERIFIED_REFERENCE, k_tube=1,00. '+REFERENCE_WARNING,true);
 });
});
$('tubeChoice').addEventListener('change',()=>{
 handle('profileOutput',showStatus);
 output('calibrationOutput','Nog geen nieuwe meting voor dit profiel.');
 output('previewOutput','Nog geen nieuwe berekening voor dit profiel.');
});
$('countShots').addEventListener('change',()=>{$('shot2Fieldset').hidden=value('countShots')!=='2';});
function sample(p){return{
 measurementId:value(p+'_id'),thicknessMm:num(p+'_thickness'),kv:num(p+'_kv'),
 ma:num(p+'_ma'),sfdMm:num(p+'_sfd'),film:value(p+'_film'),
 measuredDensity:num(p+'_density'),exposureTimeHms:value(p+'_time'),
 referenceScreens:value(p+'_screens')||undefined,qualityEvidenceId:value(p+'_quality'),
 qualityAccepted:$(p+'_passed').checked,material:'Fe'
};}
$('calibrationForm').addEventListener('submit',e=>{
 e.preventDefault();
 handle('calibrationOutput',()=>{
  const p=current();if(!p)throw new Error('Sla eerst een toestel op.');
  const points=[sample('s1')];
  if(value('countShots')==='2')points.push(sample('s2'));
  const result=calibrateXrayTube(p,points);
  if(!result.ok)throw new Error(result.error+(result.point?' bij meetpunt '+result.point:'')+
    (result.referenceError?' ('+result.referenceError+')':''));
  save(result.profile);
  output('calibrationOutput',[
   'VOORLOPIGE IJKING — REVIEW_REQUIRED','Meetpunten: '+result.pointCount,
   'Voorgestelde k_tube: '+fmt(result.candidateKTUbe),
   'Verschil tussen twee factoren: '+(result.profile.pendingCalibration.sampleFactorSpread===null?
     'n.v.t.':fmt(result.profile.pendingCalibration.sampleFactorSpread)),
   'Profielstatus blijft UNVERIFIED_REFERENCE. Actieve k_tube blijft 1,0000.',
   'Onafhankelijke validatie, beoordeelde meetscope en ondertekende review vereist voor CALIBRATED.',
   RESEARCH_WARNING
  ].join('\n'),true);
 });
});
$('previewForm').addEventListener('submit',e=>{
 e.preventDefault();
 handle('previewOutput',()=>{
  const p=current();if(!p)throw new Error('Kies een toestel.');
  const input={
   thicknessMm:num('p_thickness'),kv:num('p_kv'),ma:num('p_ma'),
   sfdMm:num('p_sfd'),film:value('p_film'),density:num('p_density'),
   referenceScreens:value('p_screens')||undefined,material:'Fe'
  };
  const result=previewTubeExposure(p,input,{includePendingResearchFactor:$('p_pending').checked});
  if(!result.ok){
   output('previewOutput','BEREKENING GEBLOKKEERD: '+result.error+
    (result.limit?' · toestelmaximum '+result.limit:'')+'\n'+RESEARCH_WARNING,false);
   return;
  }
  const lines=[
   'UITSLUITEND ONDERZOEK — geen belichtingstijd voor RT-opnamen',
   'Status: '+result.calibrationStatus+' / '+result.mode,
   'Referentiecurve: '+hms(result.referenceMinutes),
   'Onderzoeksvergelijking: '+hms(result.researchMinutes),
   'Toegepaste k_tube: '+fmt(result.kTubeApplied),result.warning
  ];
  const b=nullable('p_gap');
  if(b!==null){
   const f=nullable('p_fmin');
   const requirement=f===null?null:{
    fMinMm:f,documentId:value('p_doc'),revision:value('p_rev'),
    standardAndEdition:value('p_standard'),approvalReference:value('p_approval')
   };
   const geo=assessTubeGeometry(p,{
    sfdMm:input.sfdMm,objectFilmDistanceMm:b,fMinRequirement:requirement
   });
   if(!geo.ok)lines.push('Geometrie: '+(geo.error??geo.status));
   else lines.push(
    'Brandvlek d: '+p.focalSpotMm+' mm · f: '+fmt(geo.fActualMm)+' mm · Ug: '+fmt(geo.ugMm)+' mm',
    'f_min: '+(geo.fMinMm===null?'niet onderbouwd':fmt(geo.fMinMm)+' mm'),
    'Geometrie: '+geo.geometryCheck+' · '+geo.fMinStatus,
    'Geometrie is geen procedure-/stralingsbeschermingsvrijgave.'
   );
  }else lines.push('Geometrie niet beoordeeld: object-film-afstand ontbreekt.');
  lines.push(RESEARCH_WARNING);
  output('previewOutput',lines.join('\n'),true);
 });
});
try{render();}catch(e){output('profileOutput','Opslagfout: '+String(e.message??e),false);}
