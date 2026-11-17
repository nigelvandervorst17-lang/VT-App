/* Work administration only. NO RT exposure formulas, curves, IQI tables or authorization. */
export const PROCEDURE_SEEDS=Object.freeze([
 Object.freeze({code:'MM 18100 E',revision:'22',norm:'ISO 17636-1',klasse:'B',film:'D4',minDensity:2.3,iqiSide:'source'}),
 Object.freeze({code:'RT-ISO-A',revision:'04',norm:'ISO 17636-1',klasse:'A',film:'D5',minDensity:2.0,iqiSide:'film'})
]);
export const WORKBON_FIELDS=Object.freeze(['bonnummer','klant','adres','ordernummer','bron_of_toestel','geometrie','techniek','procedure_code','revisie','opmerkingen','datum','starttijd','eindtijd','kv','ma','activiteit_ci','wanddikte_mm','sfd_mm','materiaal','film']);
export const NO_RT_RELEASE='Onderzoek / niet gevalideerd / geen RT-vrijgave';
const text=(v,max=260)=>typeof v==='string'?v.trim().slice(0,max):v==null?'':String(v).trim().slice(0,max);
const maybe=(v,max=260)=>v==null||String(v).trim()===''?null:text(v,max);
export const localISODate=(date=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function nextISODate(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
export const normalizeStatus=value=>['Ingepland','In behandeling','Afgerond'].includes(value)?value:'Ingepland';
export function proceduresForStore(raw){
 const custom=Array.isArray(raw)?raw:[];
 const map=new Map(PROCEDURE_SEEDS.map(x=>[x.code+'|'+x.revision,{...x}]));
 for(const row of custom){
  if(!row||!text(row.code,70)||!text(row.revision,20))continue;
  const normalized={
   code:text(row.code,70),revision:text(row.revision,20),
   norm:text(row.norm,90),klasse:['A','B'].includes(row.klasse)?row.klasse:null,
   film:['D4','D5','D7'].includes(row.film)?row.film:null,
   minDensity:row.minDensity!==null&&row.minDensity!==undefined&&String(row.minDensity).trim()!==''&&Number.isFinite(Number(row.minDensity))&&Number(row.minDensity)>=0?Number(row.minDensity):null,
   iqiSide:['source','film'].includes(row.iqiSide)?row.iqiSide:null
  };
  map.set(normalized.code+'|'+normalized.revision,normalized);
 }
 return [...map.values()];
}
export function findProcedure(procedures,code,revision){
 if(!code)return null;
 const candidates=procedures.filter(p=>p.code.toLowerCase()===text(code).toLowerCase());
 return (revision?candidates.find(p=>p.revision===text(revision)):candidates.length===1?candidates[0]:null)||null;
}
export function sanitizeBon(input){
 const src=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const values={};
 for(const key of WORKBON_FIELDS)values[key]=maybe(src[key],key==='opmerkingen'?2000:260);
 values.geometrie=['Buis / Pijp','Plaat / Las'].includes(values.geometrie)?values.geometrie:null;
 values.techniek=['SWSI','DWSI','DWDI'].includes(values.techniek)?values.techniek:null;
 for(const key of ['kv','ma','activiteit_ci','wanddikte_mm','sfd_mm']){
  const v=values[key];
  values[key]=v!==null&&/^\d+(?:[.,]\d+)?$/.test(v)&&Number(v.replace(',','.'))>0?v:null;
 }
 if(values.datum&&!/^\d{4}-\d\d-\d\d$/.test(values.datum))values.datum=null;
 for(const key of ['starttijd','eindtijd'])if(values[key]&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(values[key]))values[key]=null;
 return values;
}
export function parseBonAnswer(answer){
 // Gemini is untrusted: demand a JSON object, never invent missing fields or execute markup.
 if(typeof answer!=='string'||answer.length>16000)throw Error('Geen geldig gestructureerd AI-antwoord.');
 const raw=answer.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let parsed;
 try{parsed=JSON.parse(raw);}catch{throw Error('AI-antwoord is geen geldig JSON-object. Controleer de gegevens handmatig.');}
 if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error('AI moet een JSON-object teruggeven.');
 return sanitizeBon(parsed);
}
export function demoWorkbonnen(today=localISODate()){
 return [
  {...sanitizeBon({bonnummer:'2614090',klant:'Oostendorp Apparatenbouw BV',adres:'Voor de Kijkuit 1, Tiel',ordernummer:'12248-1',bron_of_toestel:'X-ray (Smart EVO 300D, 200 kV, 5 mA)',geometrie:'Buis / Pijp',techniek:'DWSI',procedure_code:'MM 18100 E',revisie:'22',opmerkingen:'Contact: Tom Kuijpers • Onderdeel ligt op rolstellingen in nishut',datum:today,starttijd:'10:00',eindtijd:'18:00',kv:'200',ma:'5'}),id:'demo-2614090',status:'Ingepland',demo:true},
  {...sanitizeBon({bonnummer:'2614105',klant:'Petrochemie Zuid',adres:'Havenweg 12, Moerdijk',ordernummer:'88410',bron_of_toestel:'Ir-192 (36 Ci)',geometrie:null,techniek:null,procedure_code:'RT-ISO-A',revisie:'04',opmerkingen:'Leidingbrug sectie 4',datum:nextISODate(today),starttijd:'08:30',eindtijd:'16:30',activiteit_ci:'36'}),id:'demo-2614105',status:'Ingepland',demo:true}
 ];
}
export function safeUserScope(userId){
 if(typeof userId!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(userId))return null;
 return 'user:'+userId.toLowerCase();
}
export function storageKey(scope){return 'ndt-planning-work-v1:'+scope;}
export function makeStore(storage,scope){
 if(!scope||!(scope==='trial'||/^user:[0-9a-f-]+$/.test(scope)))throw Error('Geen geldige persoonlijke opslagscope');
 const key=storageKey(scope);
 function read(){
  let raw=null;
  try{raw=JSON.parse(storage.getItem(key)||'null');}catch{}
  if(raw&&raw.scope===scope&&Array.isArray(raw.workbonnen)&&Array.isArray(raw.procedures)&&Array.isArray(raw.opnames))
   return {scope,activeId:typeof raw.activeId==='string'?raw.activeId:null,workbonnen:raw.workbonnen,procedures:proceduresForStore(raw.procedures),opnames:raw.opnames};
  return {scope,activeId:null,workbonnen:demoWorkbonnen(),procedures:proceduresForStore([]),opnames:[]};
 }
 function save(payload){
  const next={scope,activeId:payload.activeId||null,workbonnen:payload.workbonnen,procedures:payload.procedures,opnames:payload.opnames};
  storage.setItem(key,JSON.stringify(next));
  return next;
 }
 return {key,read,save};
}
export function procedurePrefill(bon,procedure){
 const updates={};
 // Null never changes current technique or geometry; procedures do not invent them.
 if(bon.geometrie==='Buis / Pijp')updates.shape='pipe';
 if(bon.geometrie==='Plaat / Las')updates.shape='plate';
 if(bon.techniek)updates.technique={SWSI:'sw',DWSI:'dwsi',DWDI:'dwdi'}[bon.techniek];
 if(procedure){
  if(procedure.klasse)updates.iqiClass=procedure.klasse;
  if(procedure.iqiSide)updates.iqiSide=procedure.iqiSide;
  if(procedure.film)updates.film=procedure.film;
  if(procedure.minDensity!==null)updates.density=String(procedure.minDensity);
 }
 if(bon.film&&['D4','D5','D7'].includes(bon.film))updates.film=bon.film;
 if(bon.wanddikte_mm)updates.wall=bon.wanddikte_mm;
 if(bon.sfd_mm)updates.sfd=bon.sfd_mm;
 if(bon.kv)updates.kv=bon.kv;
 if(bon.ma)updates.ma=bon.ma;
 if(bon.activiteit_ci)updates.ci=bon.activiteit_ci;
 return updates;
}
export function buildReport({bon,opnames,onderzoekerEmail,datum=localISODate()}){
 if(!bon||!Array.isArray(opnames))throw Error('Geen werkbon of opnames');
 const line=(label,value)=>label+': '+(value===null||value===undefined||value===''?'Niet vastgelegd':String(value));
 const lines=['NDT RADIOGRAPHY PRO - WERKRAPPORT (ONDERZOEKSVERSIE)',
 line('Bonnummer',bon.bonnummer),line('Ordernummer',bon.ordernummer),
 line('Klant',bon.klant),line('Datum',datum),line('Onderzoeker e-mail',onderzoekerEmail||'Niet ingelogd'),
 line('Procedure',bon.procedure_code?(bon.procedure_code+' Rev. '+(bon.revisie||'?')):'Niet vastgelegd'),
 '', 'OPNAMES ('+opnames.length+')'];
 if(!opnames.length)lines.push('Geen opgeslagen onderzoeksopnames voor deze werkbon.');
 for(const [i,row] of opnames.entries()){
  lines.push('', 'Opname '+(i+1)+' · '+(row.date||''), 
   line('Bron/toestel',row.source),line('kV',row.kv),line('mA',row.ma),
   line('Activiteit (Ci)',row.activityCi),line('Materiaal',row.material),
   line('Wanddikte (mm)',row.wall),line('Doorstraalde dikte (mm)',row.thickness),
   line('SFD/FFD (mm)',row.distance),line('Film',row.film),line('Doelzwarting',row.density),
   line('Indicatieve tijd',row.result),line('IQI-draad (rekenkundige eis, niet film-gecontroleerd)',row.iqiWire),
   line('Waargenomen IQI-draad (handmatig)',row.iqiObserved),line('Resultaatstatus',row.status||NO_RT_RELEASE));
 }
 lines.push('','Gegenereerd met NDT Radiography Pro (Onderzoeksversie) – Niet onafhankelijk geverifieerd of vrijgegeven volgens een geldende RT-procedure. Geen toestemming voor werkelijke belichtingen.');
 return lines.join('\n');
}
export function reportMailto({email,bon,report}){
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||''))throw Error('Meld je aan met je werkmailadres om het rapport te mailen.');
 const subject='NDT onderzoeksrapport · Bon '+(bon.bonnummer||'zonder nummer');
 const href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(report);
 if(href.length>16000)throw Error('Rapport te groot voor een e-maillink; exporteer het rapport als tekst.');
 return href;
}
