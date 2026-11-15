import test from 'node:test';
import assert from 'node:assert/strict';
import {nineCases,reviewCase,reviewAll} from './gamma-nine-point-review.mjs';

const byNo=nr=>reviewCase(nineCases.find(t=>t.nr===nr));

test('Exact negen gevallen, alleen D4/D5/D7 en Se-75/Ir-192',()=>{
 assert.deepEqual(nineCases.map(t=>t.nr),[32,33,38,39,43,48,49,53,54]);
 assert.ok(nineCases.every(t=>['D4','D5','D7'].includes(t.film)));
});
test('Niet-gemodificeerde rekenmotor behoudt bestaande blokkades',()=>{
 for(const nr of [38,39,43,48,49])assert.match(byNo(nr).currentTime,/GEBLOKKEERD:/);
});
test('Voorstel Se-75 D5 x 0.60 verandert punt 32 van 00:07:24 naar 00:07:36',()=>{
 assert.equal(byNo(32).currentTime,'00:07:24');
 assert.equal(byNo(32).candidateTime,'00:07:36');
});
test('Punt 33 blijft rekenkundig 00:05:24 met bestaande D7-ratio',()=>{
 assert.equal(byNo(33).candidateTime,'00:05:24');
});
test('Voorgesteld bereik geeft numerieke uitkomsten, GEEN validatie',()=>{
 for(const nr of [38,39,43,48,49])assert.match(byNo(nr).candidateTime,/^\d{2}:\d{2}:\d{2}$/);
});
test('Bij 1.415 wordt punt 53 NIET 57 seconden',()=>{
 assert.equal(byNo(53).candidateTime,'00:01:03');
 assert.equal(byNo(53).matchesExpected,false);
});
test('Bij 1.415 wordt punt 54 NIET 01:26:04',()=>{
 assert.equal(byNo(54).candidateTime,'01:25:18');
 assert.equal(byNo(54).matchesExpected,false);
});
test('D=3.5 is een onbewezen interpolatie',()=>{
 assert.match(byNo(48).warning,/lineaire interpolatie/);
});
test('Geen van de 9 proeffactoren is gemarkeerd als opnamevrijgave',()=>{
 assert.ok(reviewAll().every(x=>x.warning.includes('NIET GEVALIDEERD')));
});
