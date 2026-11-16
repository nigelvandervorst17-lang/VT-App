import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const get=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const html=get('./index.html'),app=get('./company-app.mjs');
const ui=get('./workbench-ui.mjs'),sw=get('./sw.js'),styles=get('./styles.css');

test('Alle direct opgevraagde UI-elementen bestaan in de HTML',()=>{
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 for(const [source,label] of [[app,'company-app'],[ui,'workbench-ui']]){
  const refs=[...source.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
  assert.ok(refs.length>10,label);
  for(const ref of refs)assert.ok(ids.has(ref),label+' ontbrekend HTML-ID: '+ref);
 }
});
test('50 gratis berekeningen en alle vijf rekenmodules blijven bereikbaar',()=>{
 for(const id of ['trialCounterLabel','trialGate','trialStartBtn','trialLoginBtn',
 'gIsotope','xModel','pipeDiameter','qObserved','workbenchMaterials'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const type of ['gamma','xray','pipe','iqi','material'])
  assert.ok(html.includes('data-workbench="'+type+'"'),type);
 assert.ok(html.includes('Gratis proefversie: nog 50 van 50'));
});
test('Accountschermen en bediening voor hoofdgebruiker/personeel zijn aanwezig',()=>{
 for(const id of ['registerCompanyForm','joinCompanyForm','loadRequestsBtn','requestsList',
 'showCompanyCodeBtn','adminCompanyCode','loadStaffBtn','staffList',
 'editTubeSelect','editSourceSelect','editProcedureSelect','newTubeBtn',
 'newSourceBtn','newProcedureBtn','loadLogsBtn','logsList','offlineForm'])
  assert.ok(html.includes('id="'+id+'"'),id);
});
test('Offline Service Worker cachet alle kritieke nieuwe imports',()=>{
 const required=[
  './company-app.mjs','./supabase-rest.mjs','./admin-workflows.mjs',
  './project-config.mjs','./offline-cache.mjs',
  './research-physics-preview.mjs','./workbench-ui.mjs',
  './trial-50.mjs','./field-calculators.mjs',
  '../xray-core.mjs','../gamma-nine-point-review.mjs',
  '../../rt-core.mjs','../../rt-curves.mjs',
  '../../film-response.mjs','../../material-equivalence.mjs',
  '../../xray-extra-curves.mjs','../../iqi.mjs',
  '../../procedure-runtime/planning/filmPlanning.js'
 ];
 for(const name of required)assert.ok(sw.includes("'"+name+"'"),name);
 assert.ok(sw.includes("url.origin!==self.location.origin"),
  'Do not cache remote Supabase/Auth requests');
});
test('iPhone/small display retains responsive layout and tap targets',()=>{
 for(const fragment of ['@media(max-width:470px)','@media(max-width:660px)',
 '.module-buttons','.trial-gate'])assert.ok(styles.includes(fragment),fragment);
});
test('Configured Supabase key is publishable, never service-role/secret',()=>{
 const config=get('./project-config.mjs');
 assert.ok(config.includes('sb_publishable_'));
 assert.equal(/\bkey\s*:\s*["']sb_secret_/i.test(config),false);
 assert.equal(/['"]service_role['"]\s*[,}]/.test(config),false);
});
test('Supabase staged schema includes RLS, private code and revocation functions',()=>{
 const sql=get('./supabase-schema.sql');
 for(const table of ['companies','company_members','join_requests',
 'company_tubes','company_sources','company_procedures','exposure_logs'])
  assert.ok(sql.includes('alter table public.'+table+' enable row level security'));
 assert.ok(sql.includes('get_company_invite_code'));
 assert.ok(sql.includes('set_staff_membership_active'));
 assert.ok(sql.includes('revoke select on table public.companies'));
});
