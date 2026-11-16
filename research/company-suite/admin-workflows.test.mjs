import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 assertAdminContext,validateAdministrativeApproval,saveCompanyAsset,
 loadAdminInviteCode,setStaffActive,fetchCompanyLogs
} from './admin-workflows.mjs';

const admin={company_id:'11111111-1111-4111-8111-111111111111',role:'admin'};
const staff={company_id:admin.company_id,role:'staff'};
const userId='22222222-2222-4222-8222-222222222222';
const recordId='33333333-3333-4333-8333-333333333333';
const staffId='44444444-4444-4444-8444-444444444444';
const ctx=(api,role=admin)=>({api,member:role,userId,online:true});
const makeApi=()=>({
 calls:[],
 async insert(table,data){
  this.calls.push({method:'insert',table,data});
  return [{...data,id:recordId}];
 },
 async update(table,id,data){
  this.calls.push({method:'update',table,id,data});
  return [{...data,id,company_id:admin.company_id}];
 },
 async rpc(name,params){
  this.calls.push({method:'rpc',name,params});
  if(name==='get_company_invite_code')return 'a'.repeat(32);
  return null;
 },
 async select(table,options){
  this.calls.push({method:'select',table,options});
  return [{id:recordId,company_id:admin.company_id,created_by:userId,
   details:{workReference:'SYNTHETIC-WORK'},status:'draft'}];
 }
});
test('Beheerhandelingen vereisen online admin-lidmaatschap',()=>{
 const api=makeApi();
 assert.equal(assertAdminContext(ctx(api)),admin.company_id);
 for(const member of [staff,null]){
  assert.throws(()=>assertAdminContext(ctx(api,member)),/Hoofdgebruiker/);
 }
 assert.throws(()=>assertAdminContext({...ctx(api),online:false}),/online/);
});
test('Administratieve goedkeuring vereist dossierreferentie',()=>{
 for(const input of [
  {approval_status:'approved',approval_reference:''},
  {approval_status:'approved',approval_reference:'AB'},
  {approval_status:'invalid',approval_reference:'REF-123'}
 ])assert.throws(()=>validateAdministrativeApproval(input));
 for(const input of [
  {approval_status:'draft'}, {approval_status:'archived'},
  {approval_status:'approved',approval_reference:'REVIEW-001'}
 ])assert.equal(validateAdministrativeApproval(input),true);
});
test('Admin kan een toestel toevoegen, maar wijzigt geen niet-toegestane velden',async()=>{
 const api=makeApi();
 const rec=await saveCompanyAsset({...ctx(api),table:'company_tubes',
  data:{name:'TEST Comet',approval_status:'draft',max_kv:300}});
 assert.equal(rec.company_id,admin.company_id);
 const call=api.calls[0];
 assert.equal(call.method,'insert');
 assert.equal(call.data.created_by,userId);
 assert.equal(call.data.company_id,admin.company_id);
});
test('Admin kan een bestaand asset bijwerken zonder eigenaarschap te herschrijven',async()=>{
 const api=makeApi();
 await saveCompanyAsset({...ctx(api),table:'company_procedures',recordId,
  data:{name:'Procedure A',approval_status:'approved',approval_reference:'TEST-APPROVAL'}});
 const call=api.calls[0];
 assert.equal(call.method,'update');assert.equal(call.id,recordId);
 assert.equal(call.data.approval_status,'approved');
 assert.equal(call.data.created_by,undefined);
 assert.equal(call.data.company_id,undefined);
});
test('Admin mag eigenaarschap of bedrijfsidentiteit niet herschrijven',async()=>{
 const api=makeApi();
 for(const data of [
  {name:'Unsafe',approval_status:'draft',company_id:'OTHER'},
  {name:'Unsafe',approval_status:'draft',created_by:'OTHER'},
  {name:'Unsafe',approval_status:'draft',research_factor:2.5}
 ]){
  await assert.rejects(()=>saveCompanyAsset({...ctx(api),table:'company_tubes',
   recordId,data}),/niet-toegestane/);
 }
 assert.equal(api.calls.length,0);
});
test('Staff mag niet toevoegen of bijwerken, ook niet via directe module-aanroep',async()=>{
 const api=makeApi();
 await assert.rejects(()=>saveCompanyAsset({...ctx(api,staff),
  table:'company_tubes',data:{name:'Forbidden',approval_status:'draft'}}));
 await assert.rejects(()=>saveCompanyAsset({...ctx(api,staff),
  table:'company_tubes',recordId,data:{name:'Forbidden',approval_status:'draft'}}));
 assert.equal(api.calls.length,0);
});
test('Geen zelfbedachte resource of ongeldige record-id accepteren',async()=>{
 const api=makeApi();
 await assert.rejects(()=>saveCompanyAsset({...ctx(api),table:'companies',
  data:{name:'Forbidden',approval_status:'draft'}}));
 await assert.rejects(()=>saveCompanyAsset({...ctx(api),table:'company_tubes',
  recordId:'not-a-uuid',data:{name:'X',approval_status:'draft'}}));
});
test('Een update zonder RLS-bevestiging geldt niet als geslaagd',async()=>{
 const api=makeApi();api.update=async()=>[];
 await assert.rejects(()=>saveCompanyAsset({...ctx(api),table:'company_sources',recordId,
  data:{name:'Source',approval_status:'draft'}}),/Supabase heeft/);
});
test('Alleen admin vraagt privé-Bedrijfscode via beveiligde RPC op',async()=>{
 const api=makeApi();
 const code=await loadAdminInviteCode(ctx(api));
 assert.equal(code,'a'.repeat(32));
 assert.equal(api.calls[0].name,'get_company_invite_code');
 assert.equal(api.calls[0].params.p_company,admin.company_id);
 await assert.rejects(()=>loadAdminInviteCode(ctx(api,staff)));
 assert.equal(api.calls.length,1);
});
test('Admin kan staff deactiveren en heractiveren via gecontroleerde RPC',async()=>{
 const api=makeApi();
 await setStaffActive({...ctx(api),staffId,active:false});
 await setStaffActive({...ctx(api),staffId,active:true});
 assert.deepEqual(api.calls.map(x=>x.name),
  ['set_staff_membership_active','set_staff_membership_active']);
 assert.equal(api.calls[0].params.p_active,false);
 await assert.rejects(()=>setStaffActive({...ctx(api,staff),staffId,active:false}));
 assert.equal(api.calls.length,2);
});
test('Server RLS blijft leidend voor bedrijfslogboek (admin/staff)',async()=>{
 const api=makeApi(),rows=await fetchCompanyLogs(ctx(api,staff));
 assert.equal(rows.length,1);
 assert.equal(api.calls[0].table,'exposure_logs');
 assert.equal(api.calls[0].options.filters.company_id,admin.company_id);
 await assert.rejects(()=>fetchCompanyLogs({...ctx(api),online:false}));
});
test('Gemengde bedrijfsrecords in serverantwoord worden niet weergegeven',async()=>{
 const api=makeApi();
 api.select=async()=>[{company_id:'99999999-9999-4999-8999-999999999999'}];
 await assert.rejects(()=>fetchCompanyLogs(ctx(api)),/ander bedrijf/);
});
test('Hoofdscherm heeft echte admin-editors, Bedrijfscode en personeelsblokkade',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 for(const id of ['editTubeSelect','editSourceSelect','editProcedureSelect',
  'showCompanyCodeBtn','loadStaffBtn','staffList','loadLogsBtn','logsList'])
  assert.ok(html.includes('id="'+id+'"'),id);
 const app=readFileSync(new URL('./company-app.mjs',import.meta.url),'utf8');
 for(const name of ['saveCompanyAsset','loadAdminInviteCode','setStaffActive',
  'fetchCompanyLogs','refreshEditorChoices'])
  assert.ok(app.includes(name),name);
});
test('Starter-SQL bevat publiek-verborgen Bedrijfscode en rolintrekkings-RPC',()=>{
 const sql=readFileSync(new URL('./supabase-schema.sql',import.meta.url),'utf8');
 assert.match(sql,/revoke select on table public\.companies from authenticated/);
 assert.match(sql,/grant select\(id,name,created_by,created_at\)/);
 assert.match(sql,/create or replace function public\.get_company_invite_code/);
 assert.match(sql,/create or replace function public\.set_staff_membership_active/);
});
