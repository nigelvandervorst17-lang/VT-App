/* Research-only offline shell. No offline Supabase authorization or released exposures. */
const CACHE='ndt-company-suite-shell-v6';
const SHELL=['./','./index.html','./styles.css','./mobile-company.css','./company-app.mjs',
 './supabase-rest.mjs','./admin-workflows.mjs','./project-config.mjs','./offline-cache.mjs','./research-physics-preview.mjs',
 './manifest.webmanifest',
 './workbench-ui.mjs','./trial-50.mjs','./field-calculators.mjs',
 '../xray-core.mjs','../gamma-nine-point-review.mjs','../material-factor-data.mjs',
 '../../rt-core.mjs','../../rt-curves.mjs','../../film-response.mjs',
 '../../material-equivalence.mjs','../../xray-extra-curves.mjs',
 '../../iqi.mjs','../../company-domain.mjs','../../procedure-runtime/planning/filmPlanning.js',
 '../../brand/ndt-square-192.webp','../../brand/ndt-banner-512.webp','../../brand/ndt-apple-touch-180.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(async keys=>{
  await Promise.all(keys.filter(k=>k.startsWith('ndt-company-suite-shell-')&&k!==CACHE)
    .map(k=>caches.delete(k)));
  await self.clients.claim();
 }));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 // NEVER cache requests to Supabase/Auth or any other remote host.
 if(url.origin!==self.location.origin||url.pathname.includes('/auth/v1')||
    url.pathname.includes('/rest/v1'))return;
 const isAppFile=SHELL.some(path=>{
  const p=new URL(path,self.registration.scope);
  return p.pathname===url.pathname;
 });
 if(!isAppFile)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  return await cache.match(req,{ignoreSearch:true})||fetch(req);
 })());
});
