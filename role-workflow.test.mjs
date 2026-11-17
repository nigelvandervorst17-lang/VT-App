import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPlanningInviteHash,buildPlanningInviteLink} from './planning-invite.mjs';
import {buildPlanningTeamInvite} from './planning-team-invite.mjs';
import {validateOfflineIdentity,WORKBON_OFFLINE_SCOPE,syncWorkbonOutbox} from './workbon-offline-sync.mjs';
import {planningRecord,dispatchStatus} from './planning-api.mjs';
import {sanitizeBon,parseBonAnswer} from './planning-data.mjs';
const source=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const html=source('index.html'),mobile=source('mobile-shell.mjs'),
 planning=source('planning-app.mjs'),ai=source('ai-expert.mjs');

test('login offers only two primary actions, with optional one-click registration',()=>{
 assert.match(html,/Welkom bij NDT Radiography Pro/);
 assert.match(html,/Start demomodus \(50 berekeningen\)/);
 assert.match(html,/id="ndtEntrySubmit"[^>]*>Inloggen<\/button>/);
 assert.match(html,/id="ndtEntryRegister"[^>]*hidden>Account registreren<\/button>/);
 assert.match(html,/id="ndtEntryRegisterLink"/);
 assert.match(mobile,/setRegisterView\(!registering\)/);
 assert.match(mobile,/await supabase\.auth\.signUp\(\{email:values\.email,password:values\.password\}\)/);
 assert.match(mobile,/await api\(\)\.signIn\(values\.email,values\.password\)/);
 assert.doesNotMatch(html,/kies.*rol.*inlog/i);
});
test('role is loaded from Supabase and never from user-supplied editable metadata',()=>{
 assert.match(planning,/await client\.authenticate\(\)/);
 assert.match(planning,/snapshot\.role/);
 assert.match(planning,/event\.detail\?\.mode==='signed-in'/);
 assert.match(planning,/planningTeam'\)\.hidden=!planning/);
 assert.match(planning,/planningAdd'\)\.hidden=!planning/);
 assert.match(planning,/planningProcedureForm'\)\.hidden=!planning/);
 assert.match(source('planning-api.mjs'),/api\.select\('planning_members'/);
 assert.doesNotMatch(source('planning-api.mjs'),/user_metadata\.role/);
});
test('invitation link is fragment only, random token is never copied to query or URL path',()=>{
 const token='abcdef0123456789'.repeat(4);
 const url=buildPlanningInviteLink('https://example.org','/VT-App/',token);
 assert.equal(url,'https://example.org/VT-App/#planning-uitnodiging='+token);
 assert.equal(readPlanningInviteHash('#planning-uitnodiging='+token),token);
 assert.equal(readPlanningInviteHash('#planning-uitnodiging='+token.slice(2)),null);
 assert.equal(readPlanningInviteHash('#wrong='+token),null);
 const invite=buildPlanningTeamInvite({email:'field@example.com',token,origin:'https://example.org',
  path:'/VT-App/',companyName:'NDT Testbedrijf'});
 assert.match(invite.mailto,/^mailto:/);
 assert.match(decodeURIComponent(invite.mailto),/field@example\.com/);
 assert.match(decodeURIComponent(invite.mailto),/NDT Testbedrijf/);
 assert.match(source('planning-invite.mjs'),/history\.replaceState/);
 assert.match(source('planning-invite.mjs'),/planning_accept_invitation/);
 assert.match(source('planning-api.mjs'),/planning_create_invitation/);
});
test('missing fields remain null; explicit values stay in the bon as unverified proposals',()=>{
 const given=sanitizeBon({bonnummer:'42',klant:'Klant',materiaal:'Koper',wanddikte_mm:'8',
  sfd_mm:null,film:'D4',doelzwarting:'2,5',geometrie:null,techniek:null});
 assert.equal(given.materiaal,'Cu');
 assert.equal(given.wanddikte_mm,'8');
 assert.equal(given.sfd_mm,null);
 assert.equal(given.film,'D4');
 assert.equal(given.doelzwarting,'2,5');
 const record=planningRecord(given);
 assert.equal(record.geometrie,undefined);
 assert.equal(record.techniek,undefined);
 assert.equal(record.materiaal,'Cu');
 assert.equal(record.wanddikte_mm,'8');
 assert.equal(dispatchStatus({data:record,assigned_to:'researcher'}),'Ingepland');
 assert.equal(dispatchStatus({data:record,assigned_to:null}),'Concept');
 const parsed=parseBonAnswer('{"bonnummer":"99","klant":"K","wanddikte_mm":null,"film":"D7"}');
 assert.equal(parsed.wanddikte_mm,null);
 assert.equal(parsed.film,'D7');
 assert.match(planning,/markMissingCalculatorInputs\(bon\)/);
 assert.match(planning,/showResearchSuggestions\(bon\)/);
 assert.match(planning,/currentSetup\(\)/);
});
test('only valid user-scoped AES-GCM workbon cache and idempotent UUID outbox',async()=>{
 assert.equal(validateOfflineIdentity('067767a3-f5ca-4258-8b5f-4087644a26d2'),
  '067767a3-f5ca-4258-8b5f-4087644a26d2');
 assert.throws(()=>validateOfflineIdentity('attacker'),/geldig/);
 assert.match(WORKBON_OFFLINE_SCOPE,/^[0-9a-f-]{36}$/);
 const user='067767a3-f5ca-4258-8b5f-4087644a26d2';
 const p1='11111111-1111-4111-8111-111111111111',p2='22222222-2222-4222-8222-222222222222';
 let entries=[{client_id:p1,bon_id:p2,created_by:user,company_id:WORKBON_OFFLINE_SCOPE,
  details:{result:'ONDERZOEK',material:'Fe'}}];
 const cache={userId:user,draftLogs:async()=>entries,
  markSynced:async id=>{entries=entries.filter(x=>x.client_id!==id);}};
 const sent=[];
 const client={addOpname:async(bon,row)=>{sent.push({bon,row});return {id:row.client_id};}};
 const bon={id:p2,assigned_to:user,status:'In behandeling'};
 const result=await syncWorkbonOutbox({cache,client,bons:[bon],userId:user});
 assert.equal(result.success,1);assert.equal(result.remaining,0);
 assert.equal(sent[0].row.client_id,p1);
 assert.match(source('workbon-offline-sync.mjs'),/openOfflineCache/);
 assert.match(source('research/company-suite/offline-cache.mjs'),/AES-GCM/);
 assert.match(source('research/company-suite/offline-cache.mjs'),/PBKDF2/);
 assert.doesNotMatch(source('workbon-offline-sync.mjs'),/localStorage\.setItem.*details/);
});
test('no in-app mail reporting, only ready after synced central results',()=>{
 assert.doesNotMatch(html,/id="planningMailReport"|id="planningRecordsMail"/);
 assert.doesNotMatch(planning,/window\.location\.href=href|mailto:/);
 assert.match(html,/Metingen afronden &amp; terugsturen/);
 assert.match(planning,/await state\.client\.changeResearchStatus\(bon\.id,'Gereed'\)/);
 assert.match(planning,/draftLogs\(\)/);
 assert.match(planning,/if\(pending\.some\(x=>x\.bon_id===bon\.id\)\)/);
 assert.match(source('planning-api.mjs'),/planning_save_opname/);
});
test('verified account hides top demo strip, but calculator and result non-release notices remain',()=>{
 assert.match(source('mobile-shell.css'),/body\.ndt-verified-session #ndtResearchSafetyStrip\{display:none!important\}/);
 assert.match(html,/id="ndtResearchCompactDisclaimer"/);
 assert.match(html,/Niet vrijgegeven voor werkelijke RT-belichtingen/);
 assert.match(mobile,/mode==='signed-in'/);
 assert.match(source('private-naslag.mjs'),/can_view_private_naslag/);
});
test('AI interaction-only challenge for verified users, normal trial challenge, Worker still checks token',()=>{
 assert.match(ai,/appearance:signedIn\?'interaction-only':'always'/);
 assert.match(ai,/turnstileToken:token/);
 assert.match(ai,/window\.turnstile\?\.getResponse\(widgetId\)/);
 assert.doesNotMatch(ai,/Authorization.*service_role/);
});
