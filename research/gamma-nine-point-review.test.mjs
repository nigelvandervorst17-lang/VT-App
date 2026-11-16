import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateGamma,interpolateLog} from '../rt-core.mjs';
import {curves} from '../rt-curves.mjs';
import {nineCases,researchDensityFactors,reviewCase,reviewAll} from './gamma-nine-point-review.mjs';

const expectations=[
 [32,'00:07:24','00:07:24',0,'Overeenkomst'],
 [33,'00:05:24','00:05:24',0,'Overeenkomst'],
 [38,'Geblokkeerd','Geblokkeerd',null,'Geblokkeerd'],
 [39,'Geblokkeerd','Geblokkeerd',null,'Geblokkeerd'],
 [43,'Geblokkeerd','Geblokkeerd',null,'Geblokkeerd'],
 [48,'Geblokkeerd','Geblokkeerd',null,'Geblokkeerd'],
 [49,'Geblokkeerd','Geblokkeerd',null,'Geblokkeerd'],
 [53,'00:00:54','00:00:57',3,'Overeenkomst'],
 [54,'01:15:30','01:26:04',634,'Overeenkomst']
];

const byNo=nr=>reviewCase(nineCases.find(t=>t.nr===nr));
for(const [nr,oldTime,newTime,diff,status] of expectations){
 test('Regressie '+nr+' — '+status,()=>{
   const r=byNo(nr);
   assert.equal(r.currentTime,oldTime);
   assert.equal(r.candidateTime,newTime);
   assert.equal(r.differenceSeconds,diff);
   assert.equal(r.status,status);
   assert.match(r.warning,/NIET GEVALIDEERD/);
 });
}

test('Exact negen cases, uitsluitend D4/D5/D7',()=>{
 assert.deepEqual(reviewAll().map(r=>r.nr),expectations.map(r=>r[0]));
 assert.ok(nineCases.every(t=>['D4','D5','D7'].includes(t.film)));
});
test('De onderzoeksfactoren gelden alleen voor D4 en D5 bij D=2,5',()=>{
 assert.deepEqual(researchDensityFactors,{D4:1.4278,D5:1.3085});
 assert.equal(byNo(53).researchFactor,1.3085);
 assert.equal(byNo(54).researchFactor,1.4278);
 assert.equal(byNo(32).researchFactor,null);
 assert.equal(byNo(33).researchFactor,null);
});
test('Se-75 D5/D4 behoudt huidige curveratio ~0,584514',()=>{
 const gamma=curves.gamma['Se-75'];
 for(const mm of [8,12,20]){
   const f=interpolateLog(gamma.curves.D5,mm)/interpolateLog(gamma.curves.D4,mm);
   assert.ok(Math.abs(f-0.584514)<0.000001,'filmratio bij '+mm+' mm');
 }
});
test('Harde blokkades blijven die van de ongewijzigde motor',()=>{
 for(const nr of [38,39,43,48,49]){
   const t=nineCases.find(x=>x.nr===nr);
   const r=calculateGamma({isotope:t.isotope,film:t.film,density:t.density,
     thicknessMm:t.mm,distanceMm:t.sfd,activityCi:t.ci,
     material:'Fe',screens:'Pb'},curves);
   assert.equal(r.ok,false);
   assert.equal(byNo(nr).status,'Geblokkeerd');
 }
});
test('Geen productievrijgave in rapport',()=>{
 assert.ok(reviewAll().every(r=>r.warning.includes('geen RT-belichtingsinstructie')));
});
