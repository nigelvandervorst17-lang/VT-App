import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROCEDURE_SEEDS,WORKBON_FIELDS,demoWorkbonnen,proceduresForStore,
 findProcedure,parseBonAnswer,procedurePrefill,NO_RT_RELEASE,buildReport,reportMailto} from './planning-data.mjs';
import {planningRecord,dispatchStatus,makePlanningAPI} from './planning-api.mjs';
const src=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const html=src('index.html'),ui=src('planning-app.mjs'),reader=src('workbon-reader.mjs');
const apiSource=src('planning-api.mjs');

test('original procedure seeds remain unchanged and library can grow',()=>{
 assert.deepEqual(PROCEDURE_SEEDS.map(x=>[x.code,x.revision,x.norm,x.klasse,x.film,x.minDensity,x.iqiSide]),[
  ['MM 18100 E','22','ISO 17636-1','B','D4',2.3,'source'],
  ['RT-ISO-A','04','ISO 17636-1','A','D5',2,'film']
 ]);
 const list=proceduresForStore([{code:'TEST',revision:'01'}]);
 assert.equal(list.length,3);
 assert.equal(findProcedure(list,'TEST','01').minDensity,null);
});
test('demo bonnen are still intact as trial examples',()=>{
 const [a,b]=demoWorkbonnen('2026-11-17');
 assert.equal(a.bonnummer,'2614090');assert.equal(a.klant,'Oostendorp Apparatenbouw BV');
 assert.equal(a.datum,'2026-11-17');assert.equal(a.starttijd,'10:00');
 assert.equal(b.bonnummer,'2614105');assert.equal(b.datum,'2026-11-18');
 assert.equal(b.geometrie,null);assert.equal(b.techniek,null);
});
test('planner stores neutral metadata only, never the five technical fields',()=>{
 const values={
  bonnummer:' BON 01 ',klant:'Klant A',adres:'Straat 1',ordernummer:'123',
  procedure_code:'MM 18100 E',revisie:'22',bron_of_toestel:'Ir-192',
  geometrie:'Buis / Pijp',techniek:'DWDI',wanddikte_mm:'15',sfd_mm:'750',
  activiteit_ci:'36',kv:'200',ma:'5'
 };
 const record=planningRecord(values);
 assert.equal(record.bonnummer,'BON 01');assert.equal(record.klant,'Klant A');
 for(const key of ['geometrie','techniek','wanddikte_mm','sfd_mm','activiteit_ci','kv','ma'])
  assert.equal(key in record,false,key);
 assert.equal(dispatchStatus({data:record,assigned_to:null}), 'Concept');
 assert.equal(dispatchStatus({data:{...record,datum:'2026-11-18'},assigned_to:'researcher-1'}),'Ingepland');
 assert.equal(dispatchStatus({data:{...record,klant:null,datum:'2026-11-18'},assigned_to:'researcher-1'}),'Concept');
});
test('AI returns only known fields; missing source settings stay null',()=>{
 const data=parseBonAnswer('{"bonnummer":"001","klant":"ABC","techniek":null,"geometrie":null,"wanddikte_mm":null,"extra":"untrusted"}');
 assert.equal(data.bonnummer,'001');
 assert.equal(data.techniek,null);assert.equal(data.geometrie,null);
 assert.equal(data.wanddikte_mm,null);assert.equal('extra' in data,false);
 assert.throws(()=>parseBonAnswer('no'),/JSON/);
 for(const key of ['bonnummer','klant','adres','ordernummer','bron_of_toestel','geometrie','techniek','procedure_code','revisie','opmerkingen'])
  assert.ok(WORKBON_FIELDS.includes(key));
 const missing=procedurePrefill(demoWorkbonnen('2026-11-17')[1],PROCEDURE_SEEDS[1]);
 assert.equal('shape' in missing,false);assert.equal('technique' in missing,false);
});
test('central API: planner creates concepts, assignments and lists remote rows',async()=>{
 const created=[],members=[{user_id:'planner-1',email:'planner@example.com',role:'planning'},{user_id:'researcher-1',email:'tech@example.com',role:'researcher'}];
 const connection={
  root:'https://test.supabase.co',restore:()=>true,
  user:async()=>({id:'planner-1',email:'planner@example.com'}),
  select:async table=>table==='planning_members'?members:[],
  insert:async(table,row)=>{created.push({table,row});return [{id:'bon-1',...row}]},
  update:async()=>[{id:'bon-1',status:'Ingepland'}],
  rpc:async()=>true,token:()=> 'token'
 };
 const client=makePlanningAPI({connection,environment:{navigator:{onLine:true},localStorage:{getItem:()=>null},fetch:async()=>new Response(null,{status:200})}});
 const auth=await client.authenticate();assert.equal(auth.role,'planning');
 const first=await client.saveBon({values:{bonnummer:'12',klant:'A'},assignedTo:null});
 assert.equal(first.status,'Concept');assert.equal(created.at(-1).row.created_by,'planner-1');
 await client.saveBon({values:{bonnummer:'12',klant:'A',datum:'2026-11-17'},assignedTo:'researcher-1'});
 assert.equal(created.at(-1).row.status,'Ingepland');
 assert.equal(created.at(-1).row.assigned_to,'researcher-1');
});
test('central API: researcher cannot create workbon or save to unassigned bon',async()=>{
 const user={id:'researcher-1',email:'tech@example.com'};
 const connection={
  root:'https://test.supabase.co',restore:()=>true,user:async()=>user,
  select:async table=>table==='planning_members'?[{user_id:user.id,role:'researcher'}]:[],
  insert:async()=>[{id:'shot-1'}],rpc:async()=>true,token:()=> 'token'
 };
 const client=makePlanningAPI({connection,environment:{navigator:{onLine:true},localStorage:{getItem:()=>null},fetch:async()=>new Response(null,{status:200})}});
 await client.authenticate();
 await assert.rejects(()=>client.saveBon({values:{klant:'A'}}),/Alleen Planning/);
 await assert.rejects(()=>client.addOpname({id:'1',assigned_to:'other',status:'In behandeling'},{}),/toegewezen/);
 await assert.rejects(()=>client.addOpname({id:'1',assigned_to:user.id,status:'Concept'},{}),/Start onderzoek/);
 assert.equal((await client.addOpname({id:'1',assigned_to:user.id,status:'In behandeling'},{result:'onderzoek'})).id,'shot-1');
});
test('original PDF is transferred with JWT into private storage, never public URL',async()=>{
 const calls=[],user={id:'planner-1',email:'planner@example.com'};
 const connection={
  root:'https://test.supabase.co',restore:()=>true,user:async()=>user,
  select:async table=>table==='planning_members'?[{user_id:user.id,role:'planning'}]:[],
  update:async(id,unused)=>[{id:'bon-a',original_path:'bon-a/file.pdf'}],
  token:()=> 'jwt-verified'
 };
 const env={navigator:{onLine:true},localStorage:{getItem:()=>null},
  crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},
  fetch:async(url,init)=>{calls.push({url,init});return new Response('{}',{status:200})}
 };
 const client=makePlanningAPI({environment:env,connection});
 await client.authenticate();
 const file=new Blob(['test'],{type:'application/pdf'});
 const path=await client.uploadOriginal({id:'bon-a'},file);
 assert.equal(path,'bon-a/00000000-0000-4000-8000-000000000001.pdf');
 assert.match(calls[0].url,/\/storage\/v1\/object\/planning-werkbonnen\/bon-a\//);
 assert.equal(calls[0].init.headers.Authorization,'Bearer jwt-verified');
 assert.equal(calls[0].init.headers['x-upsert'],'false');
 assert.doesNotMatch(apiSource,/service_role|sb_secret_/);
});
test('auto OCR begins on upload; no separate read buttons and no Gemini technical guesses',()=>{
 assert.match(ui,/planningFile'\)\?\.addEventListener\('change',\(\)=>void autoReadFile\(\)\)/);
 assert.match(ui,/parseBonViaGemini\(state.pendingText/);
 assert.match(reader,/Ontbrekende of onzekere velden zijn null/);
 assert.match(reader,/geen RT-vrijgave|geen RT-vrijgave/i);
 assert.doesNotMatch(html,/id="planningReadFile"/);
 assert.doesNotMatch(html,/id="planningAIRead"/);
 assert.match(html,/id="planningTurnstile"/);
 assert.match(html,/id="planningImportSummary"/);
});
test('technical setup belongs only to researcher and is reset on different workbon',()=>{
 const start=html.indexOf('id="planningBonForm"');
 const end=html.indexOf('</form>',start);
 const planningForm=html.slice(start,end);
 for(const key of ['geometrie','techniek','wanddikte_mm','sfd_mm','activiteit_ci','kv','ma'])
  assert.ok(!planningForm.includes('name="'+key+'"'),key);
 assert.match(html,/id="planningResearchForm"/);
 for(const key of ['geometry','technique','wall','distance','ci','kv','ma'])
  assert.ok(html.includes('name="'+key+'"'),key);
 assert.match(ui,/if\(switching\)clearResearchInputs\(\)/);
 assert.match(ui,/if\(switching\|\|!state.setupReady\)openResearchDialog/);
 assert.match(ui,/changeInput\('workWall',setup.wall\)/);
 assert.match(ui,/changeInput\('distance',setup.distance\)/);
 assert.match(ui,/changeInput\('iqiTechnique',setup.technique\)/);
 assert.match(ui,/state.setupReady=true;state.setupBonId=bon.id/);
});
test('existing calculate is never reimplemented; save shot uses existing result and Auth+RLS',()=>{
 assert.doesNotMatch(ui,/calculateGamma\(|calculateXray\(|interpolateLog\(|lookupProcedureIqi\(/);
 assert.match(ui,/resultCard'\)\?\.classList\.contains\('success'\)/);
 assert.match(ui,/state.client.addOpname\(bon,details\)/);
 assert.match(ui,/event.stopImmediatePropagation\(\)/);
 assert.match(ui,/Opslaan bij werkbon/);
 assert.match(ui,/planningNextShot/);
 const naslag=src('private-naslag.mjs');
 assert.match(naslag,/can_view_private_naslag/);
});
test('report shows original non-release footnote',()=>{
 const bon=demoWorkbonnen('2026-11-17')[0];
 const report=buildReport({bon,onderzoekerEmail:'planner@example.com',
  opnames:[{source:'Ir-192',result:'Indicatief',wall:'5',distance:'500',iqiWire:'W10'}]});
 assert.match(report,/2614090/);
 assert.match(report,/W10/);
 assert.match(report,/Niet onafhankelijk geverifieerd/);
 assert.ok(reportMailto({email:'planner@example.com',bon,report}).startsWith('mailto:'));
});
test('mobile dark header, plan nav and six research actions are clearly visible',()=>{
 for(const id of ['screen-planning','planningAdd','planningDraftFilter','planningRefresh',
  'planningAddResearcherForm','planningImportDialog','planningResearchDialog',
  'planningStartResearch','planningNextShot','planningFinish','planningResearchConfirm',
  'planningResearchError','planningResearchModality','planningRecordsMail'])
 assert.match(html,new RegExp('id="'+id+'"'),id);
 assert.match(html,/data-nav="planning"/);
 assert.match(src('mobile-shell.css'),/Compact mobile top bar/);
 assert.match(src('planning.css'),/plan-card-actions/);
});
