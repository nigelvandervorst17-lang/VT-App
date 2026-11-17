import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const html=read('index.html'),ui=read('private-naslag.mjs'),
 data=read('reference-data.mjs'),tools=read('reference-tools.mjs'),
 sw=read('sw.js'),css=read('mobile-shell.css');

const originals=[
 'smart-225b.webp','smart-225-d7.webp','smart-200pc-d7.webp',
 'smart-160-d7.webp','smart-200-d7.webp','smart-200pc-new-d7.webp',
 'smart-225-yxlon-d7.webp','smart-300hp-d7.webp','smart-300pc-d7.webp',
 'weld-details.webp'
];
test('Original private image binaries must not exist in current public tree',()=>{
 for(const name of originals)assert.equal(existsSync(new URL('./'+name,import.meta.url)),false,name);
});
test('No raw private image references in public Naslag HTML',()=>{
 for(const name of originals)assert.equal(html.includes('./'+name),false,name);
 assert.match(html,/Bedrijfsgebonden referentiegrafieken zijn alleen toegankelijk voor geautoriseerde beheerders\./);
 for(const id of ['privateNaslagMessage','ndtNaslagCharts','ndtNaslagWeld',
 'refDiagramImage','ndtNaslagWeldImage','privateNaslagUploadForm'])
  assert.match(html,new RegExp('id="'+id+'"'),id);
});
test('Explicit admin verification, not client role, controls private GET and upload',()=>{
 assert.match(ui,/api\.rpc\('can_view_private_naslag',\{\}\)/);
 assert.match(ui,/return result===true/);
 assert.match(ui,/storage\/v1\/object\/authenticated/);
 assert.match(ui,/Authorization:'Bearer '\+auth\.token\(\)/);
 assert.match(ui,/await auth\.user\(\)/);
 assert.doesNotMatch(ui,/signedUrl|object\/public\/|company_members|localStorage\.getItem\('admin'/);
});
test('Image preview is hidden before JS and untrusted users never see drawings',()=>{
 for(const id of ['ndtNaslagCharts','ndtNaslagWeld','privateNaslagUpload'])
  assert.match(css,new RegExp('#'+id));
 assert.match(css,/body:not\(\.ndt-naslag-authorized\)/);
 assert.match(ui,/URL\.revokeObjectURL/);
 assert.match(ui,/ndt-private-naslag-logout/);
 assert.match(read('mobile-shell.mjs'),/new Event\('ndt-private-naslag-logout'\)/);
});
test('Service Worker must purge historical public visual assets',()=>{
 assert.match(sw,/private-naslag\.mjs/);
 assert.match(sw,/BLOCKED_PRIVATE_IMAGES/);
 for(const name of originals){
  assert.match(sw,new RegExp(name.replaceAll('.','\\.')),'blocked: '+name);
  assert.doesNotMatch(sw,new RegExp("'\\./"+name.replaceAll('.','\\.')+"'"),'not precached: '+name);
 }
});
test('Reference metadata keeps only asset names, never public URLs',()=>{
 for(const name of originals.slice(0,9))assert.match(data,new RegExp("file:['\"]"+name.replaceAll('.','\\.')+"['\"]"));
 assert.doesNotMatch(tools,/\.src=d\.file/);
 assert.doesNotMatch(tools,/\.href=d\.file/);
 assert.match(tools,/removeAttribute\('src'\)/);
});
test('Core research calculator still keeps original calculation imports and IQI',()=>{
 const app=read('app.mjs'),core=read('rt-core.mjs');
 assert.match(app,/calculateGamma\(/);
 assert.match(app,/calculateXray\(/);
 assert.match(app,/renderIQI\(\)/);
 assert.match(core,/export function calculateGamma/);
 assert.match(html,/id="calculate"/);
 assert.match(html,/id="ndtEntryTrial"/);
});
