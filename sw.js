/* Basic RT PRO offline cache. Network-first HTML; versioned cache for safe updates. */
const CACHE='basic-rt-pro-v2.0.1-20261113-mobile';
const ASSETS=['./','./index.html','./styles.css','./app.mjs','./rt-core.mjs','./rt-curves.mjs','./rt-curves.json','./PROVENANCE.md','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
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
