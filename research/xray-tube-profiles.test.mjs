import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILE_STATUS,REFERENCE_WARNING,RESEARCH_WARNING,PROFILE_STORAGE_KEY,makeXrayTubeProfile,calibrateXrayTube,approveTubeCalibration,evaluateTubeReference,previewTubeExposure,assessTubeGeometry,listXrayTubeProfiles,saveXrayTubeProfile,deleteXrayTubeProfile,parseExposureSeconds} from './xray-tube-profiles.mjs';

const stamp='2026-11-15T22:00:00Z';
const fields={id:'TEST-TUBE-01',manufacturer:'Andrex',model:'SMART 225',serialNumber:'TEST-NOT-REAL',generatorType:'CONSTANT_POTENTIAL',beamType:'RICHTSTRALER',maxKv:225,maxMa:10,maxPowerKw:2.25,focalSpotMm:2,referenceModel:'Andrex SMART 225',referenceEvidenceId:'SYNTHETIC-RESEARCH-MATCH'};
const input={film:'D5',density:2.5,kv:225,ma:5,thicknessMm:20,sfdMm:800,material:'Fe'};
const make=()=>makeXrayTubeProfile(fields,stamp).profile;
const sample=()=>({measurementId:'SYNTHETIC-1',qualityAccepted:true,qualityEvidenceId:'TEST-IQI-1',film:'D5',measuredDensity:2.5,kv:225,ma:5,thicknessMm:20,sfdMm:800,exposureTimeHms:'00:01:40',referenceScreens:'Pb 0.027 mm'});
const sample2=()=>({...sample(),measurementId:'SYNTHETIC-2',qualityEvidenceId:'TEST-IQI-2',thicknessMm:25,exposureTimeHms:'00:03:00'});
const scope={films:['D5'],kv:[225],thicknessMm:{min:19,max:26},density:{min:2.4,max:2.6},ma:{min:3,max:7},sfdMm:{min:700,max:900}};
const approval={measurementReportId:'TEST-REPORT',independentValidationId:'TEST-INDEPENDENT',approvedProcedureId:'TEST-PROC',approvedScopeId:'TEST-SCOPE',authorizedReviewerId:'TEST-REVIEWER',reviewDate:stamp,reviewSignatureReference:'TEST-SIGNATURE',independentReviewConfirmed:true,scopeValidated:true,approvedScope:scope};
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,'expected '+a+' ≈ '+b);

test('Standaardprofiel bevat identity, bronvorm, maxima, d, UNVERIFIED_REFERENCE en k=1',()=>{
 const r=makeXrayTubeProfile(fields,stamp);assert.equal(r.ok,true);
 const p=r.profile;
 for(const k of ['manufacturer','model','serialNumber','generatorType','beamType','maxKv','maxMa','focalSpotMm'])assert.equal(p[k],fields[k]);
 assert.equal(p.kTube,1);assert.equal(p.calibrationStatus,'UNVERIFIED_REFERENCE');
 assert.equal(p.maxPowerKw,2.25);assert.equal(p.pendingCalibration,null);
});
test('HALF_WAVE en RONDSTRALER worden ondersteund',()=>assert.equal(makeXrayTubeProfile({...fields,generatorType:'HALF_WAVE',beamType:'RONDSTRALER'},stamp).ok,true));
test('Ongeijkt: oranje waarschuwing en actieve factor 1',()=>{
 const r=previewTubeExposure(make(),input);assert.equal(r.ok,true);
 assert.equal(r.warning,REFERENCE_WARNING);assert.equal(r.kTubeApplied,1);
 assert.equal(r.releaseAuthorized,false);
});
test('Zonder onderbouwde referentiemapping wordt geen tijd geproduceerd',()=>{
 const p=makeXrayTubeProfile({...fields,referenceModel:null,referenceEvidenceId:null},stamp).profile;
 assert.equal(evaluateTubeReference(p,input).error,'REFERENCE_MODEL_MISSING');
 const q=makeXrayTubeProfile({...fields,referenceEvidenceId:null},stamp).profile;
 assert.equal(evaluateTubeReference(q,input).error,'REFERENCE_MAPPING_EVIDENCE_MISSING');
});
test('Overschrijding max kV en max mA wordt direct geblokkeerd',()=>{
 assert.equal(previewTubeExposure(make(),{...input,kv:226}).error,'MAX_KV_EXCEEDED');
 assert.equal(previewTubeExposure(make(),{...input,ma:11}).error,'MAX_MA_EXCEEDED');
});
test('Optionele geregistreerde vermogensgrens wordt gecontroleerd',()=>{
 const p=makeXrayTubeProfile({...fields,maxPowerKw:1},stamp).profile;
 assert.equal(previewTubeExposure(p,input).error,'MAX_POWER_EXCEEDED');
});
test('Kiezen van kV buiten discrete curve of film D4 blijft geblokkeerd',()=>{
 assert.equal(previewTubeExposure(make(),{...input,kv:224}).error,'KV_NO_REFERENCE_CURVE');
 assert.equal(previewTubeExposure(make(),{...input,film:'D4',density:2}).error,'FILM_NOT_SUPPORTED_BY_MODEL');
});
test('Tijdformaat uu:mm:ss heeft strikte parser',()=>{
 assert.equal(parseExposureSeconds('00:01:40'),100);
 assert.equal(parseExposureSeconds('00:00:00'),null);
 assert.equal(parseExposureSeconds('00:90:00'),null);
 assert.equal(parseExposureSeconds('Referentie ontbreekt'),null);
});
test('Eén meting bepaalt k = referentietijd / werkelijk gemeten tijd',()=>{
 const p=make(),r=calibrateXrayTube(p,[sample()],{updatedAt:stamp});
 assert.equal(r.ok,true);assert.equal(r.status,'REVIEW_REQUIRED');
 approx(r.candidateKTUbe,evaluateTubeReference(p,input).referenceMinutes/(100/60));
 assert.equal(r.profile.calibrationStatus,PROFILE_STATUS.UNVERIFIED_REFERENCE);
 assert.equal(r.profile.kTube,1);assert.equal(r.profile.pendingCalibration.pointCount,1);
 assert.equal(r.releaseAuthorized,false);
});
test('Voorlopige 1-puntsfactor kan optioneel exact worden gesimuleerd',()=>{
 const r=calibrateXrayTube(make(),[sample()],{updatedAt:stamp});
 const baseline=previewTubeExposure(r.profile,input);
 const simulated=previewTubeExposure(r.profile,input,{includePendingResearchFactor:true});
 assert.equal(baseline.kTubeApplied,1);
 approx(simulated.kTubeApplied,r.candidateKTUbe);
 approx(simulated.researchMinutes,100/60);
 assert.equal(simulated.mode,'PENDING_RESEARCH_SIMULATION');
 assert.equal(simulated.releaseAuthorized,false);
});
test('Twee meetpunten geven rekenkundig gemiddelde van afzonderlijke k-ratios',()=>{
 const p=make(),r=calibrateXrayTube(p,[sample(),sample2()],{updatedAt:stamp});
 assert.equal(r.ok,true);assert.equal(r.pointCount,2);
 const k1=evaluateTubeReference(p,input).referenceMinutes/(100/60);
 const k2=evaluateTubeReference(p,{...input,thicknessMm:25}).referenceMinutes/(180/60);
 approx(r.candidateKTUbe,(k1+k2)/2);
 approx(r.profile.pendingCalibration.sampleFactorSpread,Math.abs(k1-k2));
});
test('Alleen succesvolle, gedocumenteerde proefopnames tellen mee',()=>{
 assert.equal(calibrateXrayTube(make(),[{...sample(),qualityAccepted:false}]).error,'SUCCESSFUL_SHOT_EVIDENCE_REQUIRED');
 assert.equal(calibrateXrayTube(make(),[{...sample(),qualityEvidenceId:''}]).error,'SUCCESSFUL_SHOT_EVIDENCE_REQUIRED');
});
test('Meer dan twee meetpunten of dubbele meet-ID is verboden',()=>{
 assert.equal(calibrateXrayTube(make(),[sample(),sample2(),sample()]).error,'ONE_OR_TWO_MEASUREMENTS_REQUIRED');
 assert.equal(calibrateXrayTube(make(),[sample(),sample()]).error,'DUPLICATE_MEASUREMENT_ID');
});
test('D4-meting zonder passende filmcurve mag geen ijkfactor opleveren',()=>{
 const r=calibrateXrayTube(make(),[{...sample(),film:'D4'}]);
 assert.equal(r.error,'REFERENCE_BLOCKED');
 assert.equal(r.referenceError,'FILM_NOT_SUPPORTED_BY_MODEL');
});
test('CALIBRATED is niet automatisch, maar vraagt afzonderlijke beoordeling en scope',()=>{
 const pending=calibrateXrayTube(make(),[sample(),sample2()],{updatedAt:stamp});
 assert.equal(approveTubeCalibration(pending.profile,{}).error,'INDEPENDENT_REVIEW_DOCUMENTATION_REQUIRED');
 assert.equal(approveTubeCalibration(pending.profile,{...approval,approvedScope:null}).error,'CALIBRATION_SCOPE_MISSING');
 assert.equal(approveTubeCalibration(pending.profile,{...approval,independentReviewConfirmed:false}).error,'INDEPENDENT_REVIEW_NOT_CONFIRMED');
 const result=approveTubeCalibration(pending.profile,approval,{updatedAt:stamp});
 assert.equal(result.ok,true);
 assert.equal(result.profile.calibrationStatus,PROFILE_STATUS.CALIBRATED);
 approx(result.profile.kTube,pending.candidateKTUbe);
 assert.equal(result.releaseAuthorized,false);
});
test('Berekende k_tube wordt alleen binnen de apart goedgekeurde onderzoeks-scope toegepast',()=>{
 const pending=calibrateXrayTube(make(),[sample(),sample2()],{updatedAt:stamp});
 const p=approveTubeCalibration(pending.profile,approval,{updatedAt:stamp}).profile;
 const r=previewTubeExposure(p,input);
 approx(r.kTubeApplied,pending.candidateKTUbe);
 approx(r.researchMinutes,r.referenceMinutes/pending.candidateKTUbe);
 assert.equal(r.releaseAuthorized,false);assert.equal(r.caution,RESEARCH_WARNING);
 assert.equal(previewTubeExposure(p,{...input,thicknessMm:30}).error,'OUTSIDE_DOCUMENTED_CALIBRATION_SCOPE');
});
test('Brandvlek d wordt uit profiel gebruikt, zonder fictieve ISO f_min',()=>{
 const p=make(),g=assessTubeGeometry(p,{sfdMm:800,objectFilmDistanceMm:10});
 assert.equal(g.ok,true);approx(g.ugMm,2*10/790);
 assert.equal(g.fActualMm,790);
 assert.equal(g.fMinStatus,'F_MIN_NOT_DOCUMENTED');
 assert.equal(g.releaseAuthorized,false);
 const missing=assessTubeGeometry(p,{sfdMm:800,objectFilmDistanceMm:10,fMinRequirement:{fMinMm:500}});
 assert.equal(missing.fMinStatus,'F_MIN_SOURCE_NOT_VERIFIED');
 const withDocument=assessTubeGeometry(p,{sfdMm:800,objectFilmDistanceMm:10,fMinRequirement:{
 fMinMm:500,documentId:'TEST-STANDARD',revision:'A',standardAndEdition:'TESTED PROCEDURE EDITION',approvalReference:'TEST-APPROVAL'
 }});
 assert.equal(withDocument.geometryCheck,'VOLDOET AAN OPGEGEVEN GRENS');
 assert.equal(withDocument.releaseAuthorized,false);
});
test('Profielen kunnen browser-lokaal worden bewaard en later weer gelezen',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const p=make();
 assert.equal(saveXrayTubeProfile(p,storage).ok,true);
 assert.equal(listXrayTubeProfiles(storage).profiles[0].serialNumber,p.serialNumber);
 assert.equal(JSON.parse(map.get(PROFILE_STORAGE_KEY)).schemaVersion,1);
 assert.equal(saveXrayTubeProfile({...p,model:'UPDATED'},storage).count,1);
 assert.equal(listXrayTubeProfiles(storage).profiles[0].model,'UPDATED');
 assert.equal(deleteXrayTubeProfile(p.id,storage).count,0);
});
test('Beschadigde browseropslag wordt niet overschreven',()=>{
 const storage={getItem:()=>'{bad',setItem:()=>{throw Error('unexpected overwrite')}};
 assert.equal(listXrayTubeProfiles(storage).error,'PROFILE_STORAGE_CORRUPTED');
 assert.equal(saveXrayTubeProfile(make(),storage).error,'PROFILE_STORAGE_CORRUPTED');
});
