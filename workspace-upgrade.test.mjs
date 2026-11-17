import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeUsageClient} from './usage-tracker.mjs';
import {materialSteelEquivalent} from './material-equivalence.mjs';
import {compareMaterialEquivalence} from './research/live-material-preview.mjs';
import {calculateGamma} from './rt-core.mjs';
import {curves} from './rt-curves.mjs';
const source=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const html=source('index.html');
const css=source('desktop-workspace.css');
const company=source('company-charts.mjs');
const planner=source('planning-app.mjs');
test('desktop navigation reaches existing routes without a second calculator',()=>{
 const pages=['calc','planning','curves','refs','ai','records','help','settings'];
 for(const page of pages)
  assert.match(html,new RegExp('data-desk-nav="'+page+'"'),page);
 assert.match(html,/id="ndtDesktopNav"/);
 assert.match(html,/data-screen="help" id="screen-help"/);
 assert.match(html,/data-nav="help"/);
 assert.match(source('desktop-workspace.mjs'),/existing\.click\(\)/);
 assert.doesNotMatch(source('desktop-workspace.mjs'),/calculateGamma|calculateXray|materialSteelEquivalent/);
 assert.match(css,/@media\(min-width:940px\)/);
 assert.match(css,/max-width:1200px!important/);
 assert.match(css,/\.bottom-nav\{display:none!important\}/);
});
test('in-app help explains planner workflow and safety on phone and desktop',()=>{
 for(const id of ['helpStart','helpPlanner','helpResearch','helpCopper','helpCharts','helpSafety'])
  assert.match(html,new RegExp('id="'+id+'"'),id);
 const guide=source('HANDLEIDING-NDT-RADIOGRAPHY-PRO.md');
 for(const phrase of ['laptop','onderzoeker','Koper','1,12','1,50',
  'Privé-bedrijfsgrafieken','Gebruiksstatistieken','Naslag'])
  assert.ok(guide.includes(phrase),phrase);
});
test('planner and bon cards have easy-to-use researcher dropdowns',()=>{
 assert.match(html,/id="planningMemberPicker"/);
 assert.match(html,/id="planningAssignee"/);
 assert.match(planner,/plan-quick-assign/);
 assert.match(planner,/Snel onderzoeker toewijzen/);
 assert.match(planner,/state\.client\.saveBon\(\{id:bon\.id,values:bonData\(bon\),assignedTo:next,status:bon\.status\}\)/);
 assert.match(planner,/state\.assigneeFilter/);
 assert.match(planner,/\['Concept','Ingepland'\]\.includes\(bon\.status\)/);
});
test('copper uses unchanged gamma and X-ray ratios and the real RT calculator',()=>{
 const gamma=materialSteelEquivalent({material:'Cu',thicknessMm:10,mode:'gamma'});
 const xray=materialSteelEquivalent({material:'Cu',thicknessMm:10,mode:'xray'});
 assert.equal(gamma.ok,true);assert.equal(gamma.steelEquivalentMm,11.2);
 assert.equal(xray.ok,true);assert.equal(xray.steelEquivalentMm,15);
 const preview=compareMaterialEquivalence({material:'Cu',mode:'gamma',wallMm:10});
 assert.equal(preview.appliedToExposureEngine,false);
 assert.equal(preview.validatedForExposure,false);
 const app=source('rt-material-ui.mjs');
 assert.match(app,/id.*rtCopperFactorStatus|rtCopperFactorStatus/);
 assert.match(app,/material==='Cu'/);
 assert.match(app,/\$\('calculate'\)\?\.click\(\)/);
 assert.match(html,/id="rtCopperFactorStatus"/);
 assert.match(app,/Niet gevalideerd/);
 const copper=calculateGamma({isotope:'Se-75',film:'D4',density:2,
  thicknessMm:25,distanceMm:500,activityCi:36,material:'Cu'},curves);
 const steel=calculateGamma({isotope:'Se-75',film:'D4',density:2,
  thicknessMm:28,distanceMm:500,activityCi:36,material:'Fe'},curves);
 assert.equal(copper.ok,true);assert.equal(steel.ok,true);
 assert.ok(Math.abs(copper.minutes-steel.minutes)<1e-10);
 assert.equal(copper.materialFactor,1.12);
 assert.equal(copper.materialFactorApproximate,true);
});
test('usage counts unique signed-in accounts only, once per day in the client',async()=>{
 const calls=[];
 const connection={
  restore:()=>true,user:async()=>({id:'id-user-1',email:'staff@example.org'}),
  rpc:async name=>{
   calls.push(name);
   return name==='ndt_record_app_usage'?true:
    {registered:2,today:1,seven_days:1,thirty_days:2};
  }
 };
 const client=makeUsageClient({
  connection,environment:{navigator:{onLine:true},localStorage:{getItem:()=>null}},
  now:()=>new Date('2026-11-17T12:00:00Z')
 });
 assert.equal(await client.record(),true);
 assert.equal(await client.record(),true);
 assert.equal(calls.filter(x=>x==='ndt_record_app_usage').length,1);
 const result=await client.summary();
 assert.equal(result.registered,2);assert.equal(result.today,1);
 const offline=makeUsageClient({connection,environment:{navigator:{onLine:false},localStorage:{getItem:()=>null}}});
 assert.equal(await offline.record(),false);
});
test('usage dashboard shows grounded counts to the Planner only',()=>{
 assert.match(html,/id="planningUsage"[^>]*hidden/);
 for(const id of ['usageRegistered','usageToday','usageWeek','usageMonth','usageHelp'])
  assert.match(html,new RegExp('id="'+id+'"'),id);
 assert.match(planner,/\$\('planningUsage'\)\.hidden=!planning/);
 assert.match(planner,/makeUsageClient\(\)\.summary\(\)/);
 const tracker=source('usage-tracker.mjs');
 assert.match(tracker,/ndt_record_app_usage/);
 assert.match(tracker,/ndt_app_usage_summary/);
 assert.match(tracker,/mode==='signed-in'/);
 assert.doesNotMatch(tracker,/visitorId|navigator\.geolocation|getCurrentPosition|deviceFingerprint/);
});
test('company graphs are private reference documents and never feed RT curves',()=>{
 const adapter=source('research/company-suite/supabase-rest.mjs');
 assert.match(adapter,/ndt_company_charts/);
 assert.match(company,/BUCKET='ndt-company-chart-library'/);
 assert.match(company,/api\.select\('company_members'/);
 assert.match(company,/m\.active&&m\.role==='admin'/);
 assert.match(company,/role==='planning'/);
 assert.match(company,/state\.api\.insert\('ndt_company_charts'/);
 assert.match(company,/state\.api\.update\('ndt_company_charts'/);
 assert.match(company,/object\/'\+\(method==='GET'\?'authenticated\/':''\)/);
 assert.match(company,/'x-upsert':'false'/);
 assert.match(company,/file_status:'pending'/);
 assert.match(company,/file_status:'ready'/);
 assert.doesNotMatch(company,/calculateGamma|calculateXray|addCurve|curves\.xray|curveData|rt-core|rt-curves/);
 assert.match(html,/id="companyChartsPanel"/);
 assert.match(html,/id="companyChartsUploadPanel"[^>]*hidden/);
 assert.match(html,/id="companyChartPreview"/);
 assert.doesNotMatch(html,/id="companyChartScope" required/);
 assert.match(html,/nooit<\/strong> aan de rekenmachine gekoppeld/i);
});
test('original private Naslag remains owner-only and never appears in company reference assets',()=>{
 const original=source('private-naslag.mjs');
 assert.match(original,/can_view_private_naslag/);
 assert.match(source('mobile-shell.css'),/body:not\(\.ndt-naslag-authorized\) #ndtNaslagCharts/);
 assert.doesNotMatch(company,/ndt-admin-naslag|smart-225b\.webp|weld-details\.webp/);
 assert.match(source('sw.js'),/BLOCKED_PRIVATE_IMAGES/);
});
