import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSupabaseConnection,SESSION_KEY} from './research/company-suite/supabase-rest.mjs';
import {trialCounter,TRIAL_MAX} from './research/company-suite/trial-50.mjs';

const src=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const html=src('index.html'),ui=src('mobile-shell.mjs'),css=src('mobile-shell.css');
const company=src('research/company-suite/index.html');
const companyUi=src('research/company-suite/company-app.mjs');
test('main has the first-use login, trial and encrypted offline entry',()=>{
 for(const id of ['ndtEntryGate','ndtEntryEmail','ndtEntryPassword','ndtEntrySubmit',
  'ndtEntryTrial','ndtEntryOffline','ndtAccountButton','ndtConnStatus'])
  assert.match(html,new RegExp('id="'+id+'"'),id);
 assert.match(html,/Start gratis proefversie \(50 berekeningen\)/);
 assert.match(ui,/ndt-ui-trial-choice-v1/);
 assert.match(ui,/ndt-offline-cache-ready-v1/);
 assert.match(ui,/ndt-offline-workspace-v1/);
});
test('compact header and all required iPhone safe areas are present',()=>{
 assert.match(css,/safe-area-inset-top/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.top-header/);
 const cssCompany=src('research/company-suite/mobile-company.css');
 assert.match(cssCompany,/safe-area-inset-top/);
 assert.match(company,/viewport-fit=cover/);
});
test('original calculator and original full reason are reused in the live footer',()=>{
 assert.match(ui,/\$\('calculate'\)\?\.click\(\)/);
 assert.match(ui,/\$\('resultReason'\)\.textContent/);
 assert.match(ui,/\$\('resultTime'\)\.textContent/);
 assert.match(ui,/\$\('resultCard'\)/);
 assert.match(ui,/card\.dataset\.feEquivalent/);
 assert.match(ui,/\$\('saveResult'\)\.click\(\)/);
 for(const id of ['stickyOutcome','ndtStickyReason','ndtStickyFe','ndtSaveToLog','ndtChooseAsset'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(ui,/calculateGamma\(|calculateXray\(|interpolateLog\(/);
 assert.match(html,/ONDERZOEKSVERSIE/);
 assert.match(html,/Niet vrijgegeven voor werkelijke RT-belichtingen/);
});
test('company workbench is hidden but legacy input IDs still exist for unmodified regressions',()=>{
 assert.match(company,/id="researchWorkbenchPanel" hidden aria-hidden="true"/);
 assert.match(company,/Open de hoofdcalculator/);
 assert.match(companyUi,/ndt-main-asset-selection-v1/);
 assert.match(companyUi,/approval_status==='approved'/);
 assert.match(companyUi,/openOfflineCache/);
});
test('company picker keeps server-side RLS and never treats admin approval as technical exposure approval',()=>{
 assert.match(ui,/api\(\)\.select\('company_members'/);
 assert.match(ui,/api\(\)\.select\('company_sources'/);
 assert.match(ui,/api\(\)\.select\('company_tubes'/);
 assert.match(ui,/approval_status==='approved'/);
 assert.match(ui,/if\(matched\)assign\('xrayModel'/);
 assert.match(ui,/Geen passende toestelcurve/);
 assert.match(ui,/Geen technische RT-vrijgave|geen RT-vrijgave|geen technische RT-vrijgave/i);
});
test('offline encrypted storage is not reimplemented or bypassed in the main UI',()=>{
 const cache=src('research/company-suite/offline-cache.mjs');
 assert.match(cache,/AES-GCM/);
 assert.match(cache,/250000/);
 assert.match(ui,/indexedDB\.deleteDatabase/);
 assert.match(html,/Offline Bunker-modus/);
 assert.doesNotMatch(ui,/sessionStorage\.setItem\([^,]+,[^)]*passphrase/);
 assert.doesNotMatch(ui,/localStorage\.setItem\([^,]+,[^)]*passphrase/);
});
test('AI sends current input only with consent and settings are moved out of AI view',()=>{
 const ai=src('ai-expert.mjs');
 assert.match(ai,/const context = \$\('aiSendContext'\)\.checked \? snapshot\(\) : null/);
 assert.match(html,/id="aiSendContext" checked/);
 assert.match(ui,/settings\.append\(configPanel\)/);
 assert.match(css,/#screen-ai #aiSettingsButton\{display:none/);
});
test('50-calculation trial uses the original local counter without altering engine',()=>{
 const storage=new Map();
 const mock={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
 const counter=trialCounter(mock);
 assert.equal(counter.status().remaining,TRIAL_MAX);
 for(let i=0;i<TRIAL_MAX;i++)assert.equal(counter.consume().allowed,true);
 assert.equal(counter.consume().allowed,false);
 assert.match(ui,/trial\.consume\(\)/);
 assert.match(ui,/state\.mode==='trial'&&\$\('resultCard'\)\.classList\.contains\('success'\)/);
});
test('persistent Supabase token survives new adapter instance; signout clears both stores',async()=>{
 const permanent=new Map(),temporary=new Map(),calls=[];
 const makeStorage=map=>({
  getItem:k=>map.get(k)??null,
  setItem:(k,v)=>map.set(k,v),
  removeItem:k=>map.delete(k)
 });
 const env={
  localStorage:makeStorage(permanent),sessionStorage:makeStorage(temporary),
  fetch:async(url,init)=>{
   calls.push({url,init});
   if(url.includes('grant_type=password'))return new Response(JSON.stringify({
    access_token:'access-123',refresh_token:'refresh-456',expires_in:3600,
    user:{id:'user-1',email:'demo@example.com'}
   }),{status:200});
   if(url.includes('/auth/v1/user'))return new Response(JSON.stringify({
    id:'user-1',email:'demo@example.com'
   }),{status:200});
   if(url.includes('/auth/v1/logout'))return new Response(null,{status:204});
   return new Response(JSON.stringify([]),{status:200});
  }
 };
 const cfg={url:'https://test-project.supabase.co',key:'sb_publishable_abcdefghijklmnopqrstuvwxyz'};
 const first=createSupabaseConnection(cfg,env);
 await first.signIn('demo@example.com','test-password');
 assert.equal(JSON.parse(permanent.get(SESSION_KEY)).access_token,'access-123');
 assert.equal(temporary.has(SESSION_KEY),false);
 const restored=createSupabaseConnection(cfg,env);
 assert.equal(restored.restore(),true);
 assert.equal((await restored.user()).id,'user-1');
 assert.equal(calls.at(-1).init.headers.Authorization,'Bearer access-123');
 await restored.signOut();
 assert.equal(permanent.has(SESSION_KEY),false);
 assert.equal(temporary.has(SESSION_KEY),false);
});
test('legacy sessionStorage login is migrated without losing login',()=>{
 const permanent=new Map(),temporary=new Map([[SESSION_KEY,JSON.stringify({
  access_token:'old-access',refresh_token:'old-refresh',expires_at:Math.floor(Date.now()/1000)+600
 })]]);
 const wrap=map=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
 const instance=createSupabaseConnection({
  url:'https://example.supabase.co',key:'sb_publishable_abcdefghijklmnopqrstuvwxyz'
 },{localStorage:wrap(permanent),sessionStorage:wrap(temporary),fetch:()=>{throw Error('not needed')}});
 assert.equal(instance.restore(),true);
 assert.equal(instance.token(),'old-access');
 assert.equal(temporary.has(SESSION_KEY),false);
 assert.equal(permanent.has(SESSION_KEY),true);
});
test('offline assets include both new mobile shells',()=>{
 const sw=src('sw.js'),sub=src('research/company-suite/sw.js');
 for(const name of ['mobile-shell.css','mobile-shell.mjs','mobile-company.css'])assert.ok(sw.includes(name),name);
 assert.ok(sub.includes('./mobile-company.css'));
});
