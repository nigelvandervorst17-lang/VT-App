import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const p=rel=>readFileSync(new URL('../'+rel,import.meta.url));
const t=rel=>p(rel).toString('utf8');
const gitBlob=buf=>createHash('sha1')
 .update(Buffer.from('blob '+buf.length+'\0')).update(buf).digest('hex');
test('Actual uploaded images are the user-supplied compressed square and wide logo',()=>{
 const files={
  'brand/ndt-square-192.webp':'c783a22192a6731fc9e70c521050591ab98d845c',
  'brand/ndt-square-512.webp':'6a0732fac8522c426ec7e35a90e065913a6e2f73',
  'brand/ndt-banner-512.webp':'40657d94ddf5e8e4c85e8868a171cd2dec6a1203',
  'brand/ndt-apple-touch-180.png':'a875de9d6c724ca4caf3372aa43d5e1f7fbfb316'
 };
 for(const [name,sha] of Object.entries(files)){
  const b=p(name);
  assert.equal(gitBlob(b),sha,name);
  if(name.endsWith('.webp')){
   assert.equal(b.toString('ascii',0,4),'RIFF',name);
   assert.equal(b.toString('ascii',8,12),'WEBP',name);
  }else{
   assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a');
   assert.equal(b.readUInt32BE(16),180);
   assert.equal(b.readUInt32BE(20),180);
  }
 }
});
test('Page uses wide logo and a real 180px Apple PNG, without old header text markup',()=>{
 const html=t('index.html');
 assert.match(html,/<header class="top-header">[\s\S]*?brand\/ndt-banner-512\.webp/);
 assert.match(html,/rel="apple-touch-icon" sizes="180x180" href="\.\/brand\/ndt-apple-touch-180\.png"/);
 assert.match(html,/rel="icon" type="image\/webp" href="\.\/brand\/ndt-square-192\.webp"/);
 assert.doesNotMatch(html,/<div class="brand-icon" aria-hidden="true">/);
 assert.match(html,/styles\.css\?v=419/);
});
test('Android 192px and 512px manifest icons have matching user-logo files',()=>{
 const manifest=JSON.parse(t('manifest.webmanifest'));
 assert.equal(manifest.icons.length,2);
 assert.deepEqual(manifest.icons.map(i=>i.sizes),['192x192','512x512']);
 assert.deepEqual(manifest.icons.map(i=>i.src),
  ['./brand/ndt-square-192.webp','./brand/ndt-square-512.webp']);
 assert.ok(manifest.icons.every(i=>i.type==='image/webp'));
});
test('Service worker has a new cache revision and all the four icon/banner assets',()=>{
 const sw=t('sw.js');
 assert.match(sw,/ndt-radiography-pro-company-suite-20261116-v4/);
 assert.match(sw,/research\/company-suite\/index\.html/);
 for(const name of ['ndt-square-192.webp','ndt-square-512.webp',
  'ndt-banner-512.webp','ndt-apple-touch-180.png'])assert.ok(sw.includes(name));
 assert.match(sw,/Promise\.allSettled\(ASSETS/);
});
test('Reference curve datasets remain byte-identical in research branch',()=>{
 const sha={
  'rt-curves.mjs':'7438a25576539f79f89d562a70504ccf2cb42d7c',
  'film-response.mjs':'53dbe7aa23317dc55d06862ad82a08006a1daaab',
  'xray-extra-curves.mjs':'8c7182e0f5e1b6ff88feee11a506c6afa012fce9',
 };
 for(const [name,expected] of Object.entries(sha))
  assert.equal(gitBlob(p(name)),expected,name);
});
test('The six unverified Waygate points do not become executable X-ray curves',()=>{
 const reference=JSON.parse(t('research/waygate-six-user-points-unverified.json'));
 assert.equal(reference.points.length,6);
 assert.equal(reference.researchOnly,true);
 assert.equal(reference.sharedConditions.model,null);
 assert.equal(reference.sharedConditions.ma,null);
 assert.equal(reference.sharedConditions.sfdMm,null);
});
test('Material factor research integration preserves D2.5 comparison and warnings',()=>{
 const ui=t('rt-material-ui.mjs');
 assert.match(ui,/phrase\('ui\.materialComparison'/);
 assert.match(ui,/rt-locales-ready/);
 assert.match(t('rt-core.mjs'),/material_factor_research_unverified/);
 assert.match(t('material-equivalence.mjs'),/validatedForExposure:false/);
 assert.match(ui,/compareGammaDensityD25/);
 assert.doesNotMatch(ui,/resultTime'\)\.textContent\s*=/);
 const research=t('research/live-material-preview.mjs');
 assert.match(research,/appliedToExposureEngine:false/);
});
