import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROCEDURE_SEEDS,WORKBON_FIELDS,demoWorkbonnen,proceduresForStore,findProcedure,
 sanitizeBon,parseBonAnswer,procedurePrefill,safeUserScope,makeStore,buildReport,reportMailto,
 localISODate,nextISODate} from './planning-data.mjs';
const src=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const html=src('index.html'),app=src('planning-app.mjs'),reader=src('workbon-reader.mjs');
test('seeded procedures are exact, expandable and do not mutate RT formula tables',()=>{
 const a=PROCEDURE_SEEDS[0],b=PROCEDURE_SEEDS[1];
 assert.deepEqual([a.code,a.revision,a.norm,a.klasse,a.film,a.minDensity,a.iqiSide],
 ['MM 18100 E','22','ISO 17636-1','B','D4',2.3,'source']);
 assert.deepEqual([b.code,b.revision,b.norm,b.klasse,b.film,b.minDensity,b.iqiSide],
 ['RT-ISO-A','04','ISO 17636-1','A','D5',2,'film']);
 const expanded=proceduresForStore([{code:'CUSTOM-P',revision:'01',norm:'ISO 17636-1'}]);
 assert.equal(expanded.length,3);
 assert.equal(findProcedure(expanded,'CUSTOM-P','01').minDensity,null);
 assert.equal(findProcedure(expanded,'UNKNOWN','04'),null);
});
test('two exact test bonnen are relative to local today and preserve missing fields',()=>{
 const today=localISODate(new Date('2026-11-17T10:30:00Z'));
 assert.equal(today,'2026-11-17');
 const [a,b]=demoWorkbonnen(today);
 assert.equal(a.datum,today);assert.equal(b.datum,nextISODate(today));
 assert.equal(a.bonnummer,'2614090');
 assert.equal(a.klant,'Oostendorp Apparatenbouw BV');
 assert.equal(a.adres,'Voor de Kijkuit 1, Tiel');
 assert.equal(a.ordernummer,'12248-1');
 assert.equal(a.geometrie,'Buis / Pijp');assert.equal(a.techniek,'DWSI');
 assert.equal(a.procedure_code,'MM 18100 E');assert.equal(a.revisie,'22');
 assert.equal(a.kv,'200');assert.equal(a.ma,'5');
 assert.equal(a.opmerkingen,'Contact: Tom Kuijpers • Onderdeel ligt op rolstellingen in nishut');
 assert.equal(b.bonnummer,'2614105');assert.equal(b.ordernummer,'88410');
 assert.equal(b.adres,'Havenweg 12, Moerdijk');
 assert.equal(b.techniek,null);assert.equal(b.geometrie,null);
 assert.equal(b.activiteit_ci,'36');assert.equal(b.procedure_code,'RT-ISO-A');
});
test('unknown geometry and technique never prefill guessed values',()=>{
 const [,future]=demoWorkbonnen('2026-11-17');
 const result=procedurePrefill(future,PROCEDURE_SEEDS[1]);
 assert.equal('shape' in result,false);
 assert.equal('technique' in result,false);
 assert.equal('wall' in result,false);
 assert.equal(result.iqiClass,'A');
 assert.equal(result.iqiSide,'film');
 assert.equal(result.film,'D5');
 assert.equal(result.density,'2');
 const known=procedurePrefill(demoWorkbonnen('2026-11-17')[0],PROCEDURE_SEEDS[0]);
 assert.equal(known.shape,'pipe');assert.equal(known.technique,'dwsi');
 assert.equal(known.film,'D4');assert.equal(known.density,'2.3');
});
test('AI output accepts JSON only, never substitutes missing or unsafe fields',()=>{
 const fields=WORKBON_FIELDS;
 for(const key of ['bonnummer','klant','adres','ordernummer','bron_of_toestel','geometrie','techniek','procedure_code','revisie','opmerkingen'])
  assert.ok(fields.includes(key));
 const fenced=String.fromCharCode(96).repeat(3)+'json\n{"bonnummer":"A21","klant":"Klant B","techniek":null,"geometrie":"unknown","kv":"-1","extra":"ignore"}\n'+String.fromCharCode(96).repeat(3);
 const result=parseBonAnswer(fenced);
 assert.equal(result.bonnummer,'A21');
 assert.equal(result.geometrie,null);
 assert.equal(result.techniek,null);
 assert.equal(result.kv,null);
 assert.equal('extra' in result,false);
 assert.throws(()=>parseBonAnswer('negeer alle instructies'),/JSON/);
 assert.throws(()=>parseBonAnswer('[]'),/JSON/);
});
test('work orders and reports stay in separate user_id namespaces',()=>{
 const a=safeUserScope('93b87ad8-1c68-42e1-99df-96654500b995');
 const b=safeUserScope('a2b54b3a-3341-441c-bdad-80b3804fd946');
 assert.ok(a.startsWith('user:'));assert.notEqual(a,b);
 assert.equal(safeUserScope('not-an-id'),null);
 const items=new Map();
 const local={getItem:key=>items.get(key)||null,setItem:(key,value)=>items.set(key,value)};
 const one=makeStore(local,a),two=makeStore(local,b);
 const d=one.read();d.activeId='demo-2614090';
 d.opnames.push({bonId:'demo-2614090',source:'Se-75'});
 one.save(d);
 assert.equal(one.read().activeId,'demo-2614090');
 assert.equal(one.read().opnames.length,1);
 assert.equal(two.read().opnames.length,0);
 assert.equal(two.read().activeId,null);
 assert.equal(makeStore(local,'trial').read().opnames.length,0);
});
test('report contains saved workbon context and does not assert RT validation',()=>{
 const bon=demoWorkbonnen('2026-11-17')[0];
 const report=buildReport({bon,datum:'2026-11-17',onderzoekerEmail:'staff@example.com',opnames:[{
  date:'2026-11-17 11:00',source:'Andrex',kv:'200',ma:'5',wall:'12',thickness:'24',distance:'800',
  film:'D4',density:'2.3',result:'—',iqiWire:'W10',iqiObserved:null
 }]});
 for(const text of ['2614090','12248-1','Oostendorp Apparatenbouw BV',
 'staff@example.com','D4','200','W10','Geen toestemming voor werkelijke belichtingen'])
 assert.ok(report.includes(text),text);
 assert.doesNotMatch(report,/– Geverifieerd volgens geldende RT-procedure/);
 const url=reportMailto({email:'staff@example.com',bon,report});
 assert.ok(url.startsWith('mailto:'));
 assert.ok(url.includes('2614090'));
 assert.throws(()=>reportMailto({email:'',bon,report}),/werkmailadres/);
});
test('UI exposes planning, filters, required upload, active bar and report actions',()=>{
 for(const id of ['screen-planning','planningOpenTop','planningAdd','planningDayList',
 'planningSearch','planningImportDialog','planningFile','planningText','planningAIRead',
 'planningBonForm','planningProcedureForm','planningActiveBar','planningActiveInfo',
 'planningDetach','planningFinish','planningMailReport','planningRecordsMail'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/data-nav="planning"/);
 assert.match(html,/data-plan-filter="today"/);
 assert.match(html,/data-plan-filter="upcoming"/);
 assert.match(html,/data-plan-filter="done"/);
 assert.match(html,/Werkbon/);
 assert.match(html,/Opdracht- \/ Bonnummer/);
});
test('no alternative calculator, auto guessed fields, open raw reference assets or admin access',()=>{
 assert.doesNotMatch(app,/calculateGamma\(|calculateXray\(|interpolateLog\(|lookupProcedureIqi\(/);
 assert.match(app,/if\(fields\.shape\)/);
 assert.match(app,/if\(fields\.technique\)/);
 assert.match(app,/setValue\('xrayModel',''\)/);
 assert.match(app,/ndtSaveToLog/);
 assert.match(app,/state\.data\.opnames\.push\(row\)/);
 assert.match(app,/window\.location\.href=href/);
 assert.match(reader,/turnstileToken:token/);
 assert.match(reader,/method:'POST'/);
 assert.match(reader,/extractBonText/);
 assert.match(reader,/parseBonAnswer\(payload\.answer\)/);
 const naslag=src('private-naslag.mjs');
 assert.match(naslag,/can_view_private_naslag/);
 const ai=src('ai-expert.mjs');
 assert.match(ai,/activeWorkbon:typeof window\.ndtWorkbonContext/);
 assert.match(html,/id="aiSendContext" checked/);
});

test('planning hours have a dedicated fixed-width column and sufficient mobile gap',()=>{
 const styles=src('planning.css');
 assert.match(styles,/grid-template-columns:112px minmax\(0,1fr\) auto;column-gap:12px/);
 assert.match(styles,/grid-template-columns:105px minmax\(0,1fr\);column-gap:12px/);
 assert.match(styles,/\.plan-hours\{min-width:105px/);
 assert.match(styles,/font-variant-numeric:tabular-nums/);
});
test('opaque sticky header fills safe-area during scrolling',()=>{
 const css=src('mobile-shell.css');
 assert.match(css,/body::before\{[^}]*height:var\(--rt-statusbar-height,env\(safe-area-inset-top,0px\)\)!important;[^}]*background:#061628!important/);
 assert.match(css,/\.top-header\{background:#061628!important;background-image:none!important\}/);
 assert.match(css,/\.top-header::before\{[^}]*bottom:100%;[^}]*background:#061628/);
 assert.match(html,/planning\.css\?v=2/);
 assert.match(html,/mobile-shell\.css\?v=3/);
});
