/* Basic RT PRO 3.8.2 BETA — network first; COMET references and resilient install */
const CACHE='ndt-radiography-pro-company-suite-20261116-v1';
const ASSETS=['./','./index.html','./styles.css','./app.mjs','./field-tests.mjs','./ui-polish.mjs','./compact-layout.mjs','./workflow-shape.mjs','./reference-recovery.mjs','./rt-enhancements.mjs','./rt-enhancements.css','./locales/nl.json','./locales/en.json','./locales/de.json',
 './research/company-suite/index.html','./research/company-suite/styles.css',
 './research/company-suite/company-app.mjs','./research/company-suite/project-config.mjs',
 './research/company-suite/supabase-rest.mjs','./research/company-suite/offline-cache.mjs',
 './research/company-suite/admin-workflows.mjs','./research/company-suite/workbench-ui.mjs',
 './research/company-suite/trial-50.mjs','./research/company-suite/field-calculators.mjs',
 './research/company-suite/research-physics-preview.mjs','./research/company-suite/manifest.webmanifest',
 './research/company-suite/sw.js','./research/xray-core.mjs',
 './research/gamma-nine-point-review.mjs','./research/xray-tube-profiles.mjs',
 './research/xray-reference-points.json',
'./rt-material-ui.mjs','./research/live-material-preview.mjs','./research/material-factor-data.mjs',
'./ai-config.mjs','./ai-expert.mjs','./rt-core.mjs','./material-equivalence.mjs','./film-response.mjs','./iqi.mjs','./iqi-quick.mjs','./rt-procedure.mjs','./procedure-ui.mjs',
'./reference-tools.mjs','./reference-data.mjs','./rt-curves.mjs','./rt-curves.json',
'./xray-extra-curves.mjs','./xray-extra-curves.json','./pipe-schedules.json',
'./controle.html','./curveatlas.html','./curveatlas.pdf','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./brand-logo.png',
'./brand/ndt-square-192.webp','./brand/ndt-square-512.webp','./brand/ndt-apple-touch-180.png','./brand/ndt-banner-512.webp',
'./smart-225b.webp','./smart-225-d7.webp','./smart-200pc-d7.webp',
'./weld-details.webp','./smart-300pc-d7.webp','./smart-300hp-d7.webp',
'./smart-225-yxlon-d7.webp','./smart-200pc-new-d7.webp',
'./smart-200-d7.webp','./smart-160-d7.webp'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // A single missing reference image must not prevent the new service worker from installing.
    await Promise.allSettled(ASSETS.map(async file=>{
      const response=await fetch(file,{cache:'no-store'});
      if(response.ok)await cache.put(file,response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>(key.startsWith('basic-rt-pro-')||key.startsWith('ndt-radiography-pro-'))&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   // Always check for latest online source to avoid cross-version HTML / JS collisions.
   const response=await fetch(req,{cache:'no-store'});
   if(response.ok)await cache.put(req,response.clone());
   return response;
  }catch(_error){
   const found=await cache.match(req,{ignoreSearch:true});
   if(found)return found;
   if(req.mode==='navigate'){const page=await cache.match('./index.html');if(page)return page;}
   return Response.error();
  }
 })());
});
