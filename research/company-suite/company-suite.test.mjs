import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {equivalentSteelPreview,gammaDecayPreview,isoFMinResearch} from './research-physics-preview.mjs';
import {createSupabaseConnection} from './supabase-rest.mjs';
import {openOfflineCache} from './offline-cache.mjs';
import {reviewAll as gammaReview} from '../gamma-nine-point-review.mjs';

const baseline=JSON.parse(readFileSync(new URL('../xray-baseline-shas.json',import.meta.url),'utf8'));
test('main motor and gamma/film/ui hashes are untouched',()=>{
 for(const [p,expected] of Object.entries(baseline.protectedFiles)){
  const b=readFileSync(new URL('../../'+p,import.meta.url));
  const sha=createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
  assert.equal(sha,expected,p);
 }
});
test('gamma research PR6 retains candidate factors and five blocks',()=>{
 const res=Object.fromEntries(gammaReview().map(x=>[x.nr,x]));
 assert.equal(res[53].candidateTime,'00:00:57');
 assert.equal(res[54].candidateTime,'01:26:04');
 for(const n of [38,39,43,48,49])assert.equal(res[n].status,'Geblokkeerd');
});
test('all proposed gamma/xray equivalence factors are exact research values',()=>{
 const wants={Fe:[1,1],RVS:[1.02,1.08],Al:[0.35,0.30],Cu:[1.12,1.50],Ti:[0.58,0.75]};
 for(const [m,[g,x]] of Object.entries(wants)){
  assert.equal(equivalentSteelPreview({material:m,mode:'gamma',thicknessMm:10}).factor,g);
  assert.equal(equivalentSteelPreview({material:m,mode:'xray',thicknessMm:10}).factor,x);
  assert.equal(equivalentSteelPreview({material:m,mode:'xray',thicknessMm:10}).validatedForExposure,m==='Fe');
 }
});
test('unverified equivalent steel ratios are NOT engine authorization',()=>{
 const r=equivalentSteelPreview({material:'Al',mode:'xray',thicknessMm:10});
 assert.equal(r.equivalentSteelMm,3);
 assert.equal(r.validatedForExposure,false);
 assert.match(r.warning,/NIET GEVALIDEERD/);
});
test('gamma decay decreases for Se75 and Ir192 without changing core',()=>{
 for(const isotope of ['Se-75','Ir-192']){
  const r=gammaDecayPreview({isotope,activityCi:40,referenceAt:'2026-01-01T00:00:00Z',asOf:'2026-02-01T00:00:00Z'});
  assert.equal(r.ok,true);assert.ok(r.activityCi<40&&r.activityCi>0);
 }
});
test('geometry f_min uses 7.5*A / 15*B and b substitution per ISO2022',()=>{
 const base={dMm:2,bMm:20,tMm:10,sfdMm:800};
 const a=isoFMinResearch({...base,classification:'A'});
 const b=isoFMinResearch({...base,classification:'B'});
 assert.ok(Math.abs(b.fMinMm-2*a.fMinMm)<1e-10);
 assert.equal(a.validatedForExposure,false);
 const replaced=isoFMinResearch({...base,bMm:5,classification:'A'});
 assert.equal(replaced.effectiveBmm,10);
 const planar=isoFMinResearch({...base,classification:'A',planarDefects:true});
 assert.equal(planar.effectiveClass,'B');
});
test('Supabase REST rejects secret keys and non-HTTPS projects',()=>{
 assert.throws(()=>createSupabaseConnection({url:'http://bad.local',key:'sb_publishable_1234567890123456'}));
 assert.throws(()=>createSupabaseConnection({url:'https://project.supabase.co',key:'sb_secret_123456789012345678901234'}));
});
test('personal Auth JWT, not company code, is used for PostgREST and RPC',async()=>{
 const calls=[];
 const store=new Map();
 const env={
  sessionStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  fetch:async(url,init)=>{
   calls.push({url,init});
   if(url.endsWith('grant_type=password'))return new Response(JSON.stringify({
    access_token:'test.jwt',refresh_token:'refresh',expires_in:3600,user:{id:'user-1'}
   }),{status:200});
   if(url.includes('/rpc/register_company'))return new Response(JSON.stringify([{
    company_id:'company-1',company_code:'private-join-code'
   }]),{status:200});
   return new Response(JSON.stringify([]),{status:200});
  }
 };
 const api=createSupabaseConnection({
  url:'https://project.supabase.co',key:'sb_publishable_abcdefghijklmnopqrstuvwxyz'
 },env);
 await api.signIn('test@example.com','sample-password');
 await api.rpc('register_company',{p_name:'Test',p_admin_name:'Admin'});
 const post=calls.at(-1);
 assert.equal(post.init.headers.Authorization,'Bearer test.jwt');
 assert.equal(JSON.parse(post.init.body).p_name,'Test');
 assert.equal(JSON.parse(store.get('ndt-supabase-session-v1')).access_token,'test.jwt');
});
test('SQL schema enables company RLS and forbids staff modifying assets',()=>{
 const sql=readFileSync(new URL('./supabase-schema.sql',import.meta.url),'utf8');
 for(const table of ['companies','company_members','join_requests','company_tubes',
  'company_sources','company_procedures','exposure_logs']){
  assert.ok(sql.includes('alter table public.'+table+' enable row level security'));
 }
 assert.match(sql,/security definer set search_path=''/);
 assert.match(sql,/create policy tubes_insert[\s\S]*?is_company_admin/);
 assert.match(sql,/create policy sources_insert[\s\S]*?is_company_admin/);
 assert.match(sql,/create policy procedures_insert[\s\S]*?is_company_admin/);
 assert.match(sql,/create policy logs_staff_insert[\s\S]*?created_by=.*auth\.uid/);
 assert.match(sql,/request_company_join/);
 assert.match(sql,/approve_company_join/);
});
test('all static iPhone assets required for offline start exist',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 assert.match(html,/bedrijfscode/i);
 assert.match(html,/Opnameplan/);
 const sw=readFileSync(new URL('./sw.js',import.meta.url),'utf8');
 for(const p of ['index.html','styles.css','company-app.mjs','supabase-rest.mjs',
  'offline-cache.mjs','research-physics-preview.mjs'])assert.ok(sw.includes(p));
 assert.match(sw,/url\.origin!==self\.location\.origin/);
});
