import assert from 'node:assert/strict';
import {calculateGamma,hms,interpolateLog,calculateXray} from './rt-core.mjs';
import {curves} from './rt-curves.mjs';
const gamma=(iso,film,mm,d=2,ci=40,sfd=800,material='Fe')=>calculateGamma({isotope:iso,film,thicknessMm:mm,density:d,activityCi:ci,distanceMm:sfd,material,screens:'Pb'},curves);
const seconds=r=>Math.round(r.minutes*60);
let checks=0;const eq=(got,want,why)=>{assert.equal(got,want,why);checks++}; const ok=(condition,why)=>{assert.ok(condition,why);checks++};
const refs={
'Se-75':[[1,476],[2,509],[4,582],[5,622],[8,760],[10,868],[12,992],[15,1211],[17,1384],[20,1691],[25,2359],[30,3292],[35,4594],[40,6411]],
'Ir-192':[[4,312],[5,327],[10,415],[15,526],[20,667],[25,846],[30,1073],[40,1724],[50,2772],[60,4456],[70,7174],[80,11516],[90,18512],[100,29757]]};
for(const [iso,points] of Object.entries(refs))for(const [mm,sec] of points)eq(seconds(gamma(iso,'D4',mm)),sec,`${iso}/D4 ${mm}`);
const filmRefs={
'Se-75':{D5:[[4,340],[10,507],[15,708],[25,1379],[30,1924]],D7:[[4,248],[10,370],[15,517],[25,1007],[30,1405]]},
'Ir-192':{D5:[[20,428],[50,1778]],D7:[[20,273],[50,1136]]}};
for(const [iso,films] of Object.entries(filmRefs))for(const [film,points] of Object.entries(films))for(const [mm,sec] of points)eq(seconds(gamma(iso,film,mm)),sec,`${iso}/${film}/${mm}`);
const densityRefs={
'Se-75':{D4:[[1.4,530],[1.5,586],[2,868],[2.5,1150],[3,1432],[3.5,1714],[3.9,1939]],D5:[[1.5,341],[2,507],[3,839],[3.9,1138]],D7:[[1.5,242],[2,370],[3,627],[3.9,858]]},
'Ir-192':{D4:[[1.5,450],[2,667],[3,1100],[3.9,1491]],D5:[[1.5,288],[2,428],[3.9,959]],D7:[[1.5,178],[2,273],[3.9,633]]}};
for(const [iso,films] of Object.entries(densityRefs))for(const [film,points] of Object.entries(films))for(const [d,sec] of points){const r=gamma(iso,film,iso==='Se-75'?10:20,d);eq(seconds(r),sec,`${iso}/${film}/D=${d}: ${hms(r.minutes)} wanted ${sec}`);}
const extra=[['Se-75','D4',25,3,3891],['Se-75','D7',25,3,1704]];
for(const [iso,f,mm,d,sec] of extra)ok(Math.abs(seconds(gamma(iso,f,mm,d))-sec)<=1,`holdout ${iso}/${f}/${mm}/${d}`);
const boundaries={ 'Se-75':{D4:[1,40,1.4],D5:[4,30,1.5],D7:[4,30,1.5]}, 'Ir-192':{D4:[4,100,1.5],D5:[20,50,1.5],D7:[20,50,1.5]}};
for(const [iso,films] of Object.entries(boundaries))for(const [f,[low,hi,dLow]] of Object.entries(films)){
 ok(!gamma(iso,f,low-.01,2).ok,`${iso}/${f} low range`); ok(!gamma(iso,f,hi+.01,2).ok,`${iso}/${f} high range`);
 ok(!gamma(iso,f,low,dLow-.01).ok,`${iso}/${f} low density`); ok(!gamma(iso,f,low,3.91).ok,`${iso}/${f} high density`);
 ok(gamma(iso,f,low,dLow).ok,`${iso}/${f} low accepted`);ok(gamma(iso,f,hi,3.9).ok,`${iso}/${f} high accepted`);
}
for(const iso of ['Se-75','Ir-192'])for(const film of ['D2','D3','D8'])eq(gamma(iso,film,20).error,'film',`${iso} no ${film}`);
const baseline=gamma('Se-75','D4',10);
eq(seconds(gamma('Se-75','D4',10,2,80)),434,'80Ci');
eq(seconds(gamma('Se-75','D4',10,2,20)),1736,'20Ci scaling idealized');
eq(seconds(gamma('Se-75','D4',10,2,40,500)),339,'500mm');
eq(seconds(gamma('Se-75','D4',10,2,40,1200)),1953,'1200mm');
ok(gamma('Se-75','D4',10,2,40,875.5).ok,'distance with decimals');
ok(gamma('Ir-192','D4',36.5,2.6,17.5,909.3).ok,'continuous decimal inputs');
ok(!gamma('Se-75','D4',10,2,0).ok,'activity zero blocked');
ok(!gamma('Se-75','D4',10,2,40,0).ok,'distance zero blocked');
ok(!gamma('Se-75','D4',10,2,40,800,'Al').ok,'non-steel blocked');
console.log(`PASS ${checks} Basic RT PRO 3.8 Waygate comparison tests. Model fit is not RT exposure validation.`);
