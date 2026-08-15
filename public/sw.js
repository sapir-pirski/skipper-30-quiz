const CACHE="sea-quiz-v13";
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(["/","/manifest.webmanifest","/favicon.svg"]))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>event.request.mode==="navigate"?caches.match("/"):Response.error())))});
self.addEventListener("message",event=>{if(event.data?.type!=="CACHE_QUESTION_IMAGES"||!Array.isArray(event.data.urls))return;event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(event.data.urls.map(url=>cache.add(url)))))});
