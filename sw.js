const CACHE='tingxie-v5';
const ASSETS=['./','index.html','app.js','style.css','hanzi-writer.min.js','hanzi-writer-license.txt','handwriting-data-license.txt','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-180.png','dictionary-license.txt'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tingxie-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin)return;
const name=url.pathname.split('/').pop();
if(name==='dictionary.json'){e.respondWith(caches.open(CACHE).then(async c=>{const cached=await c.match(e.request);if(cached)return cached;const r=await fetch(e.request);if(r.ok&&r.headers.get('content-type')?.includes('json'))c.put(e.request,r.clone());return r;}));return;}
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('index.html')));return;}
if(ASSETS.includes(name)){e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>caches.match(e.request)));}
});
