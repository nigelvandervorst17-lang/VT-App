/** Administrative navigation, not automatic location tracking. */
const key=(uid,bid)=>uid&&bid?'ndt-route-v1:'+uid+':'+bid:null;
export function navigationLinks(address){
 const q=encodeURIComponent(String(address||'').trim());if(!q)return null;
 return {googleMaps:'https://www.google.com/maps/dir/?api=1&destination='+q+'&travelmode=driving',
 waze:'https://waze.com/ul?q='+q+'&navigate=yes',flitsmeister:'https://www.flitsmeister.nl/'};
}
export function getTravel(store,userId,bonId){
 const k=key(userId,bonId);if(!k)return null;
 try{const t=JSON.parse(store?.getItem(k)||'null');return typeof t?.departed_at==='string'?t:null;}catch{return null}
}
export function markDeparture(store,userId,bonId,now=new Date()){
 const k=key(userId,bonId);if(!k)throw Error('Gebruiker en werkbon vereist.');
 const old=getTravel(store,userId,bonId);if(old&&!old.arrived_at)return old;
 const t={departed_at:now.toISOString(),arrived_at:null};store?.setItem(k,JSON.stringify(t));return t;
}
export function markArrival(store,userId,bonId,now=new Date()){
 const k=key(userId,bonId),old=getTravel(store,userId,bonId);
 if(!old)throw Error('Registreer eerst vertrek.');
 const arrived_at=now.toISOString();if(Date.parse(arrived_at)<Date.parse(old.departed_at))throw Error('Aankomst vóór vertrek.');
 const t={...old,arrived_at};store?.setItem(k,JSON.stringify(t));return t;
}
export function travelMinutes(t){
 if(!t?.departed_at||!t?.arrived_at)return null;
 const m=(Date.parse(t.arrived_at)-Date.parse(t.departed_at))/60000;
 return Number.isFinite(m)&&m>=0?Math.round(m):null;
}
