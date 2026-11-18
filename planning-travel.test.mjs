import test from 'node:test';import assert from 'node:assert/strict';
import {navigationLinks,getTravel,markDeparture,markArrival,travelMinutes} from './planning-travel.mjs';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
test('opens confirmed navigation providers',()=>{
 const u=navigationLinks('Marktstraat 7, Tilburg');assert.match(u.googleMaps,/destination=Marktstraat%207%2C%20Tilburg/);
 assert.match(u.waze,/navigate=yes/);assert.equal(u.flitsmeister,'https://www.flitsmeister.nl/');
});
test('per-user workbon departure once and arrival',()=>{
 const s=store(),a=new Date('2026-11-18T08:00:00Z'),b=new Date('2026-11-18T08:42:00Z');
 assert.equal(markDeparture(s,'u1','b1',a).departed_at,a.toISOString());
 assert.equal(markDeparture(s,'u1','b1',b).departed_at,a.toISOString());
 assert.equal(markArrival(s,'u1','b1',b).arrived_at,b.toISOString());
 assert.equal(travelMinutes(getTravel(s,'u1','b1')),42);assert.equal(getTravel(s,'u2','b1'),null);
});