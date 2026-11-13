/* Basic RT PRO offline cache. Network-first HTML; versioned cache for safe updates. */
const CACHE='basic-rt-pro-v2.5.1-20261113-centre-markers';
const ASSETS=['./','./index.html','./styles.css','./app.mjs','./rt-core.mjs','./iqi.mjs','./rt-procedure.mjs','./procedure-ui.mjs','./RT_IQI_Filmverdeling_Concept_Procedure.pdf','./reference-tools.mjs','./reference-data.mjs','./rt-curves.mjs','./rt-curves.json','./PROVENANCE.md','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./brand-logo.png','./assets/smart-225b.webp','./assets/smart-225-d7.webp','./assets/smart-200pc-d7.webp','./assets/weld-details.webp',"./xray-extra-curves.mjs","./xray-extra-curves.json","./DIGITIZATION-2.4.md","./assets/smart-300pc-d7.webp","./assets/smart-300hp-d7.webp","./assets/smart-225-yxlon-d7.webp","./assets/smart-200pc-new-d7.webp","./assets/smart-200-d7.webp","./assets/smart-160-d7.webp"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('basic-rt-pro-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const req=event.request; if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==='navigate'){
   event.respondWith(fetch(req).then(async response=>{if(response.ok){const c=await caches.open(CACHE);c.put(req,response.clone())}return response}).catch(async()=>await caches.match(req)||await caches.match('./index.html')));
 }else{
   event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(async response=>{if(response.ok){const c=await caches.open(CACHE);c.put(req,response.clone())}return response})));
 }
});
