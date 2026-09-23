const CACHE='aora-shell-v2';
const ASSETS=['./','./index.html','./css/styles.css','./js/app.js','./js/gps.js','./js/activities.js','./js/activity-elite.js','./js/elite-os.js','./js/supabase.js','./js/affiliates.js','./js/groq.js','./js/i18n.js','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(x=>x.put(e.request,copy));return r}).catch(()=>caches.match('./index.html'))));});
