/* Basic RT PRO 3.8.2 BETA — network first; COMET references and resilient install */
const CACHE='basic-rt-pro-v3.8.8-compact-no-xray-grid-20261114-i';
const ASSETS=['./','./index.html','./styles.css','./app.mjs','./field-tests.mjs','./ui-polish.mjs','./compact-layout.mjs','./workflow-shape.mjs','./reference-recovery.mjs',
'./ai-config.mjs','./ai-expert.mjs','./rt-core.mjs','./material-equivalence.mjs','./film-response.mjs','./iqi.mjs','./rt-procedure.mjs','./procedure-ui.mjs',
'./reference-tools.mjs','./reference-data.mjs','./rt-curves.mjs','./rt-curves.json',
'./xray-extra-curves.mjs','./xray-extra-curves.json','./pipe-schedules.json',
'./controle.html','./curveatlas.html','./curveatlas.pdf','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./brand-logo.png',
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
  await Promise.all(keys.filter(key=>key.startsWith('basic-rt-pro-')&&key!==CACHE).map(key=>caches.delete(key)));
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
