/**
 * User/company-scoped AES-GCM encrypted IndexedDB cache.
 * Tokens/passwords are NEVER cached; the offline passphrase stays only in RAM.
 * Offline data may be stale after an online permission revocation.
 */
export const CACHE_NAME='ndt-company-offline-v1';
const encoder=new TextEncoder(),decoder=new TextDecoder();
const bytes=n=>crypto.getRandomValues(new Uint8Array(n));
const b64=u=>btoa([...u].map(v=>String.fromCharCode(v)).join(''));
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function request(r){return new Promise((ok,fail)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error)})}
function openDb(){
 return new Promise((ok,fail)=>{
  const r=indexedDB.open(CACHE_NAME,1);
  r.onupgradeneeded=()=>{
   if(!r.result.objectStoreNames.contains('records'))
     r.result.createObjectStore('records');
  };
  r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);
 });
}
function dbGet(db,key){return request(db.transaction('records').objectStore('records').get(key))}
function dbPut(db,key,val){
 return request(db.transaction('records','readwrite').objectStore('records').put(val,key));
}
async function derive(pass,salt){
 const material=await crypto.subtle.importKey('raw',encoder.encode(pass),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},
  material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encrypt(key,value,aad){
 const iv=bytes(12),raw=encoder.encode(JSON.stringify(value));
 const result=await crypto.subtle.encrypt({name:'AES-GCM',iv,
  additionalData:encoder.encode(aad)},key,raw);
 return {iv:b64(iv),data:b64(new Uint8Array(result))};
}
async function decrypt(key,blob,aad){
 const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(blob.iv),
  additionalData:encoder.encode(aad)},key,un64(blob.data));
 return JSON.parse(decoder.decode(data));
}
export async function openOfflineCache({userId,companyId,passphrase,allowCreate=false}){
 if(!/^[a-f0-9-]{36}$/i.test(userId)||!/^[a-f0-9-]{36}$/i.test(companyId))
   throw Error('Geldige gebruiker en bedrijf nodig');
 if(typeof passphrase!=='string'||passphrase.length<8)
   throw Error('Offline wachtzin moet minstens 8 tekens hebben');
 if(!globalThis.isSecureContext||!globalThis.indexedDB||!globalThis.crypto?.subtle)
   throw Error('HTTPS, IndexedDB en WebCrypto zijn vereist');
 const db=await openDb(),prefix='ndt:'+userId+':'+companyId+':';
 let meta=await dbGet(db,prefix+'meta');
 if(!meta){
  if(!allowCreate)throw Error('Maak de offline cache eerst online aan');
  const salt=bytes(16),key=await derive(passphrase,salt);
  meta={salt:b64(salt),check:await encrypt(key,{v:1},prefix+'verifier')};
  await dbPut(db,prefix+'meta',meta);
 }
 const key=await derive(passphrase,un64(meta.salt));
 try{const result=await decrypt(key,meta.check,prefix+'verifier');if(result.v!==1)throw Error('invalid')}
 catch{db.close();throw Error('Offline wachtzin onjuist of cache beschadigd')}
 async function get(name,fallback){
  const blob=await dbGet(db,prefix+name);
  return blob?decrypt(key,blob,prefix+name):fallback;
 }
 async function set(name,data){await dbPut(db,prefix+name,await encrypt(key,data,prefix+name))}
 return {
  userId,companyId,
  async snapshot(){return get('snapshot',null)},
  async saveSnapshot(data){
   if(data?.companyId!==companyId)throw Error('Bedrijfscontext komt niet overeen');
   await set('snapshot',{...data,lastSync:new Date().toISOString()});
  },
  async draftLogs(){return get('outbox',[])},
  async queueDraftLog(row){
   if(row?.company_id!==companyId||row?.created_by!==userId||!row.client_id)
     throw Error('Onjuiste log-identiteit');
   const items=await get('outbox',[]);
   if(!items.some(x=>x.client_id===row.client_id))items.push(row);
   await set('outbox',items);return items.length;
  },
  async markSynced(clientId){
   const items=await get('outbox',[]);
   await set('outbox',items.filter(x=>x.client_id!==clientId));
  },
  close(){db.close()}
 };
}
