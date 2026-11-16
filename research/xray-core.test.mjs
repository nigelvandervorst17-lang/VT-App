import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {calculateXray,hms} from '../rt-core.mjs';
import {calculateResearchXray,assessGeometricUnsharpness,researchDatabase,RESEARCH_ONLY} from './xray-core.mjs';
import {loadReferencePoints,buildXrayReportRows,createXrayReport,parseReferenceTime} from './xray-report.mjs';

const fixture=loadReferencePoints();
const manifest=JSON.parse(readFileSync(new URL('./xray-baseline-shas.json',import.meta.url),'utf8'));
const database=researchDatabase();
const andrex={model:'Andrex SMART 225',film:'D5',density:2.5,kv:225,ma:5,
 thicknessMm:20,distanceMm:800,material:'Fe'};
const yxlon={model:'YXLON SMART 200 / 200W',film:'D7',density:2.0,kv:200,ma:5,
 thicknessMm:25,distanceMm:700,material:'Fe'};

test('Hoofdmotor, curves, filmresponse, gamma en UI zijn byte-voor-byte gelijk aan de main-baseline',()=>{
 assert.match(manifest.mainCommit,/^[0-9a-f]{40}$/);
 assert.ok(Object.keys(manifest.protectedFiles).length>=10);
 for(const [path,expectedSha] of Object.entries(manifest.protectedFiles)){
  const bytes=readFileSync(new URL('../'+path,import.meta.url));
  const sha=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0'))
    .update(bytes).digest('hex');
  assert.equal(sha,expectedSha,path+' is gewijzigd ten opzichte van main');
 }
});

test('Exact 10 oningevulde D4-punten: nooit fictieve kV of tijden',()=>{
 assert.deepEqual(fixture.conditions,{
  material:'Fe',sfdMm:800,ma:5,film:'D4',density:2.0
 });
 assert.deepEqual(fixture.points.map(p=>p.steelThicknessMm),
  [2,4,6,8,10,12,15,20,25,30]);
 assert.deepEqual(fixture.points.map(p=>p.nr),[1,2,3,4,5,6,7,8,9,10]);
 assert.ok(fixture.points.every(p=>p.kv==='Referentie ontbreekt'
  &&p.referenceTime==='Referentie ontbreekt'));
});

test('Rapport geeft 10 regels met juiste kolommen zonder uitkomsten te verzinnen',()=>{
 const rows=buildXrayReportRows(fixture);
 assert.equal(rows.length,10);
 assert.ok(rows.every(r=>r.status==='Referentie ontbreekt'
  &&r.existingTime==='Niet berekend'
  &&r.researchTime==='Niet berekend'&&r.differenceSeconds===null));
 const text=createXrayReport(fixture);
 assert.ok(text.startsWith('| Nr | Staal | kV | Referentietijd | Huidige motor | Onderzoeksmotor | Verschil (sec) | Status |'));
 assert.equal(text.split('\n').length,12);
});

for(const input of [andrex,yxlon]){
 test('Onafhankelijke X-ray berekening reproduceert bestaande '+input.model+'-curve',()=>{
  const original=calculateXray(input,database);
  const experimental=calculateResearchXray(input);
  assert.equal(original.ok,true);
  assert.equal(experimental.ok,true);
  assert.ok(Math.abs(original.minutes-experimental.minutes)<1e-12);
  assert.equal(hms(original.minutes),hms(experimental.minutes));
  assert.equal(experimental.exposureMam,original.exposure);
  assert.equal(experimental.calibrationStatus,RESEARCH_ONLY);
 });
}
test('mA-schaal: 10 mA geeft halve tijd tov 5 mA',()=>{
 const five=calculateResearchXray(andrex);
 const ten=calculateResearchXray({...andrex,ma:10});
 assert.equal(five.ok,true);assert.equal(ten.ok,true);
 assert.ok(Math.abs(five.minutes/2-ten.minutes)<1e-12);
});
test('Kwadratische afstand: dubbele SFD geeft 4x tijd',()=>{
 const base=calculateResearchXray(andrex);
 const double=calculateResearchXray({...andrex,distanceMm:1600});
 assert.equal(base.ok,true);assert.equal(double.ok,true);
 assert.ok(Math.abs(double.minutes-4*base.minutes)<1e-12);
});
test('kV-curves worden niet gemengd of geïnterpoleerd',()=>{
 assert.equal(calculateResearchXray({...andrex,kv:224}).error,'KV_NO_REFERENCE_CURVE');
 assert.equal(calculateResearchXray({...andrex,kv:225.5}).error,'KV_MISSING_OR_INVALID');
 assert.equal(calculateResearchXray({...andrex,kv:null}).error,'KV_MISSING_OR_INVALID');
});
test('D4 kan niet uit bestaande D5/D7 X-ray-datasets worden geconstrueerd',()=>{
 assert.equal(calculateResearchXray({...andrex,film:'D4',density:2}).error,'FILM_NOT_SUPPORTED_BY_MODEL');
 assert.equal(calculateXray({...andrex,film:'D4',density:2},database).error,'film');
 assert.equal(calculateResearchXray({...yxlon,film:'D4'}).error,'FILM_NOT_SUPPORTED_BY_MODEL');
});
test('Onbekende/uitgeschakelde toestellen blijven geblokkeerd',()=>{
 assert.equal(calculateResearchXray({...andrex,model:null}).error,'MODEL_MISSING');
 assert.equal(calculateResearchXray({...andrex,model:'onbekend'}).error,'MODEL_UNSUPPORTED');
 assert.equal(calculateResearchXray({...andrex,model:'YXLON SMART 200PC',film:'D7'}).error,
  'MODEL_NO_USABLE_CURVE');
});
test('Onvoldoende onderbouwde diktes en zwartingen worden geweigerd',()=>{
 assert.equal(calculateResearchXray({...andrex,thicknessMm:80}).error,
  'THICKNESS_OUTSIDE_KV_CURVE');
 assert.equal(calculateResearchXray({...andrex,density:3.9}).error,
  'DENSITY_OUT_OF_REFERENCE_RANGE');
 assert.equal(calculateResearchXray({...andrex,material:'Al'}).error,
  'MATERIAL_REQUIRES_VALIDATED_EQUIVALENCE');
});
test('Geen verborgen toestelfactoren, scherm- of broncorrecties',()=>{
 assert.equal(calculateResearchXray({...andrex,deviceFactor:1.2}).error,
  'DEVICE_FACTOR_UNVERIFIED');
 assert.equal(calculateResearchXray({...andrex,referenceScreens:'Niet gelijk aan curve'}).error,
  'SCREEN_CONDITIONS_NOT_REFERENCED');
 const r=calculateResearchXray({...andrex,focalSpotMm:2});
 assert.equal(r.ok,true);
 assert.equal(r.deviceFactorApplied,1);
 assert.equal(r.screenConditionsRequireIndependentVerification,true);
});
test('Brandvlek/geometrie: geen verzonnen ISO-grens of automatische vrijgave',()=>{
 const result=assessGeometricUnsharpness({
  focalSpotMm:2,objectFilmDistanceMm:10,sfdMm:800
 });
 assert.equal(result.ok,true);
 assert.ok(Math.abs(result.ugMm-(2*10/790))<1e-12);
 assert.equal(result.status,'LIMIT_NOT_SPECIFIED');
 assert.equal(result.approved,false);
 const incomplete=assessGeometricUnsharpness({
  focalSpotMm:2,objectFilmDistanceMm:10,sfdMm:800,approvedLimit:{limitMm:0.5}
 });
 assert.equal(incomplete.status,'LIMIT_SOURCE_NOT_DOCUMENTED');
 assert.equal(incomplete.meetsDocumentedLimit,null);
 assert.equal(incomplete.approved,false);
});
test('Foutieve geometrie wordt afgewezen',()=>{
 assert.equal(assessGeometricUnsharpness({
  focalSpotMm:0,objectFilmDistanceMm:10,sfdMm:800
 }).status,'GEOMETRY_INPUT_MISSING_OR_INVALID');
 assert.equal(assessGeometricUnsharpness({
  focalSpotMm:2,objectFilmDistanceMm:800,sfdMm:800
 }).status,'GEOMETRY_INPUT_MISSING_OR_INVALID');
});
test('Rapport markeert ingevuld model/D4-kV als geblokkeerd (geen curve)',()=>{
 const doc=structuredClone(fixture);
 doc.equipment.model='Andrex SMART 225';
 doc.points[4].kv=225;
 doc.points[4].referenceTime='00:01:00'; // synthetische eenheidstestinput; NIET in JSON op GitHub
 const row=buildXrayReportRows(doc)[4];
 assert.equal(row.status,'Geblokkeerd');
 assert.equal(row.existingTime,'Geblokkeerd (film)');
 assert.match(row.researchTime,/^Geblokkeerd/);
 assert.equal(row.differenceSeconds,null);
});
test('Tijdparser accepteert alleen gecontroleerde uu:mm:ss-formaten',()=>{
 assert.equal(parseReferenceTime('01:23:45'),5025);
 assert.equal(parseReferenceTime('00:00:00'),null);
 assert.equal(parseReferenceTime('02:61:10'),null);
 assert.equal(parseReferenceTime('Referentie ontbreekt'),null);
});
test('Rapport mag niet stilzwijgend andere materiaal-/filminstellingen accepteren',()=>{
 const doc=structuredClone(fixture);
 doc.conditions.film='D5';
 assert.throws(()=>buildXrayReportRows(doc),/conditions changed/i);
});
