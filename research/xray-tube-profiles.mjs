/**
 * Mijn Röntgenbuizen — onderzoeksmodule, niet gekoppeld aan de live-app.
 * No automatic radiation-exposure authorisation or production calibration.
 * Single/two-point ratios are estimates, not physical validation.
 */
import {calculateResearchXray,assessGeometricUnsharpness,researchDatabase} from './xray-core.mjs';

export const PROFILE_STORAGE_KEY='ndt-xray-research-tube-profiles-v1';
export const PROFILE_STATUS=Object.freeze({
 UNVERIFIED_REFERENCE:'UNVERIFIED_REFERENCE',
 CALIBRATED:'CALIBRATED'
});
export const GENERATOR_TYPES=Object.freeze(['CONSTANT_POTENTIAL','HALF_WAVE']);
export const BEAM_TYPES=Object.freeze(['RICHTSTRALER','RON DSTRALER'.replace(' ','')]);
export const REFERENCE_WARNING='Standaard referentiecurve — nog niet geijkt op deze specifieke röntgenbuis';
export const RESEARCH_WARNING='Uitsluitend onderzoeksvergelijking; geen gevalideerde belichtingstijd of RT-vrijgave.';
const isNum=Number.isFinite;
const hasString=v=>typeof v==='string'&&v.trim().length>0;
const validPositive=v=>isNum(v)&&v>0;
const nowString=()=>new Date().toISOString();
const plainObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const softCopy=x=>JSON.parse(JSON.stringify(x));
function failure(error,extra={}){return {ok:false,error,...extra,warning:RESEARCH_WARNING};}
function validateMaximums(profile,input){
 if(!isNum(input.kv)||!Number.isInteger(input.kv)||input.kv<=0)
   return failure('KV_MISSING_OR_INVALID');
 if(!validPositive(input.ma))return failure('MA_MISSING_OR_INVALID');
 if(input.kv>profile.maxKv)return failure('MAX_KV_EXCEEDED',{limit:profile.maxKv});
 if(input.ma>profile.maxMa)return failure('MAX_MA_EXCEEDED',{limit:profile.maxMa});
 return {ok:true};
}
function validReferenceProfile(profile){
 if(!hasString(profile.referenceModel))return failure('REFERENCE_MODEL_MISSING');
 if(!hasString(profile.referenceEvidenceId))return failure('REFERENCE_MAPPING_EVIDENCE_MISSING');
 const ds=researchDatabase().xray[profile.referenceModel];
 if(!ds||ds.enabled===false||!Array.isArray(ds.curves)||ds.curves.length===0)
   return failure('REFERENCE_MODEL_UNSUPPORTED');
 return {ok:true,datasetId:ds.datasetId};
}
export function makeXrayTubeProfile(values,stamp=nowString()){
 if(!plainObject(values))return failure('PROFILE_MISSING');
 const id=values.id;
 if(!hasString(id)||id.length>100||!hasString(values.manufacturer)
   ||!hasString(values.model)||!hasString(values.serialNumber))
   return failure('PROFILE_IDENTITY_REQUIRED');
 if(!GENERATOR_TYPES.includes(values.generatorType))
   return failure('GENERATOR_TYPE_INVALID');
 if(!BEAM_TYPES.includes(values.beamType))return failure('BEAM_TYPE_INVALID');
 if(!validPositive(values.maxKv)||!validPositive(values.maxMa)
   ||!validPositive(values.focalSpotMm))return failure('DEVICE_LIMITS_INVALID');
 if(values.maxPowerKw!=null&&!validPositive(values.maxPowerKw))
   return failure('MAX_POWER_INVALID');
 if(!hasString(stamp)||!Number.isFinite(Date.parse(stamp)))
   return failure('PROFILE_DATE_INVALID');
 const result={
  id:id.trim(),manufacturer:values.manufacturer.trim(),model:values.model.trim(),
  serialNumber:values.serialNumber.trim(),generatorType:values.generatorType,
  beamType:values.beamType,maxKv:values.maxKv,maxMa:values.maxMa,
  maxPowerKw:values.maxPowerKw??null,focalSpotMm:values.focalSpotMm,
  referenceModel:hasString(values.referenceModel)?values.referenceModel.trim():null,
  referenceEvidenceId:hasString(values.referenceEvidenceId)?values.referenceEvidenceId.trim():null,
  calibrationStatus:PROFILE_STATUS.UNVERIFIED_REFERENCE,kTube:1,
  pendingCalibration:null,calibrationApproval:null,createdAt:stamp,updatedAt:stamp
 };
 return {ok:true,profile:result,warning:REFERENCE_WARNING};
}
export function parseExposureSeconds(value){
 if(typeof value!=='string'||! /^\d{2,}:[0-5]\d:[0-5]\d$/.test(value))return null;
 const [hours,min,sec]=value.split(':').map(Number);
 const seconds=hours*3600+min*60+sec;
 return Number.isSafeInteger(seconds)&&seconds>0?seconds:null;
}
/**
 * The only source of a base research exposure estimate: existing dataset
 * matches a documented reference model and exact kV/film/density.
 * This never changes the main engine or emits a released exposure.
 */
export function evaluateTubeReference(profile,input){
 if(!plainObject(profile)||!plainObject(input))return failure('INPUT_MISSING');
 const limit=validateMaximums(profile,input);
 if(!limit.ok)return limit;
 // Configured simultaneous operating envelope must be separately validated.
 if(profile.maxPowerKw!=null&&input.kv*input.ma/1000>profile.maxPowerKw)
   return failure('MAX_POWER_EXCEEDED',{limitKw:profile.maxPowerKw});
 const reference=validReferenceProfile(profile);
 if(!reference.ok)return reference;
 const evaluated=calculateResearchXray({
  model:profile.referenceModel,film:input.film,density:input.density,
  kv:input.kv,ma:input.ma,thicknessMm:input.thicknessMm,
  distanceMm:input.sfdMm,material:input.material??'Fe',
  referenceScreens:input.referenceScreens,deviceFactor:1
 });
 if(!evaluated.ok)return failure(evaluated.error,{referenceError:evaluated.error});
 return {ok:true,referenceMinutes:evaluated.minutes,referenceMam:evaluated.exposureMam,
  datasetId:evaluated.datasetId,requiredScreens:evaluated.requiredScreens,
  referenceModel:profile.referenceModel,calibrationStatus:profile.calibrationStatus,
  warning:profile.calibrationStatus===PROFILE_STATUS.CALIBRATED
   ?RESEARCH_WARNING:REFERENCE_WARNING,releaseAuthorized:false};
}
function observationToInput(record){
 return {material:record.material??'Fe',film:record.film,
  thicknessMm:record.thicknessMm,kv:record.kv,ma:record.ma,
  sfdMm:record.sfdMm,density:record.measuredDensity,
  referenceScreens:record.referenceScreens};
}
/**
 * Calculate 1- or 2-point factor from actual *reported* measurements.
 * k_i=reference minutes / actual measured minutes.
 * Candidate time=reference minutes/k_candidate.
 * Returns pending REVIEW_REQUIRED; never auto-promotes to CALIBRATED.
 */
export function calibrateXrayTube(profile,observations,{updatedAt=nowString()}={}){
 if(!plainObject(profile)||!plainObject(observations?.[0])
   ||!Array.isArray(observations)||!([1,2].includes(observations.length)))
   return failure('ONE_OR_TWO_MEASUREMENTS_REQUIRED');
 if(!hasString(profile.id))return failure('PROFILE_MISSING');
 const factors=[];
 const validated=[];
 for(const [index,o] of observations.entries()){
  const seconds=parseExposureSeconds(o.exposureTimeHms);
  if(seconds===null)return failure('MEASURED_TIME_INVALID',{point:index+1});
  if(!hasString(o.measurementId))return failure('MEASUREMENT_ID_REQUIRED',{point:index+1});
  if(!isNum(o.measuredDensity)||o.measuredDensity<=0)
    return failure('MEASURED_DENSITY_INVALID',{point:index+1});
  if(!validPositive(o.thicknessMm)||!Number.isInteger(o.kv)||!validPositive(o.ma)
    ||!validPositive(o.sfdMm)||!hasString(o.film))
    return failure('MEASUREMENT_INPUT_INVALID',{point:index+1});
  const base=evaluateTubeReference(profile,observationToInput(o));
  if(!base.ok)return failure('REFERENCE_BLOCKED',{point:index+1,referenceError:base.error});
  const measuredMinutes=seconds/60;
  const k=base.referenceMinutes/measuredMinutes;
  if(!isNum(k)||k<=0)return failure('CANDIDATE_FACTOR_INVALID',{point:index+1});
  factors.push(k);
  validated.push({
   measurementId:o.measurementId,
   film:o.film,thicknessMm:o.thicknessMm,kv:o.kv,ma:o.ma,sfdMm:o.sfdMm,
   measuredDensity:o.measuredDensity,exposureTimeHms:o.exposureTimeHms,
   referenceMinutes:base.referenceMinutes,measuredMinutes,kIndividual:k,
   datasetId:base.datasetId,
   referenceScreens:o.referenceScreens??null
  });
 }
 if(new Set(validated.map(p=>p.measurementId)).size!==validated.length)
   return failure('DUPLICATE_MEASUREMENT_ID');
 const candidateKTUbe=factors.reduce((a,b)=>a+b,0)/factors.length;
 const spread=factors.length===2?Math.abs(factors[0]-factors[1]):null;
 const pending={
  status:'REVIEW_REQUIRED',candidateKTUbe,pointCount:factors.length,
  sampleFactorSpread:spread,measurementPoints:validated,
  referenceModel:profile.referenceModel,referenceEvidenceId:profile.referenceEvidenceId,
  createdAt:updatedAt,
  caution:'Softwarematige factor op grond van 1–2 punten. Onafhankelijke metingen en beoordeling blijven verplicht.'
 };
 const updated={...softCopy(profile),calibrationStatus:PROFILE_STATUS.UNVERIFIED_REFERENCE,
  kTube:1,pendingCalibration:pending,calibrationApproval:null,updatedAt};
 return {ok:true,profile:updated,candidateKTUbe,pointCount:factors.length,
  status:'REVIEW_REQUIRED',warning:REFERENCE_WARNING,releaseAuthorized:false};
}
/** 
 * Explicit human approval gate. Presence of string references is not itself
 * proof of independent calibration: users must verify documents off-system.
 * Even CALIBRATED is a research-profile status, NEVER RT exposure approval.
 */
export function approveTubeCalibration(profile,approval,{updatedAt=nowString()}={}){
 if(!plainObject(profile)||profile.pendingCalibration?.status!=='REVIEW_REQUIRED')
   return failure('NO_PENDING_CALIBRATION');
 if(!plainObject(approval)||![
  approval.measurementReportId,approval.independentValidationId,
  approval.approvedProcedureId,approval.approvedScopeId,
  approval.authorizedReviewerId,approval.reviewDate,approval.reviewSignatureReference
 ].every(hasString))return failure('INDEPENDENT_REVIEW_DOCUMENTATION_REQUIRED');
 if(!approval.independentReviewConfirmed||!approval.scopeValidated)
   return failure('INDEPENDENT_REVIEW_NOT_CONFIRMED');
 if(!Number.isFinite(Date.parse(approval.reviewDate)))
   return failure('REVIEW_DATE_INVALID');
 const kTube=profile.pendingCalibration.candidateKTUbe;
 if(!validPositive(kTube))return failure('CANDIDATE_FACTOR_INVALID');
 const updated={...softCopy(profile),calibrationStatus:PROFILE_STATUS.CALIBRATED,
   kTube,calibrationApproval:{...softCopy(approval),kTube,
    researchOnly:true},pendingCalibration:null,updatedAt};
 return {ok:true,profile:updated,status:PROFILE_STATUS.CALIBRATED,
   warning:RESEARCH_WARNING,releaseAuthorized:false};
}
/**
 * Research-only adjusted time; always return explicit warnings and never
 * write the factor into rt-core / film-response. Pending preview is opt-in.
 */
export function previewTubeExposure(profile,input,{includePendingResearchFactor=false}={}){
 const baseline=evaluateTubeReference(profile,input);
 if(!baseline.ok)return baseline;
 let kTube=1,mode='UNVERIFIED_REFERENCE';
 if(profile.calibrationStatus===PROFILE_STATUS.CALIBRATED){
   if(!validPositive(profile.kTube)||!plainObject(profile.calibrationApproval))
     return failure('CALIBRATED_EVIDENCE_MISSING');
   kTube=profile.kTube;mode='CALIBRATED_RESEARCH_ONLY';
 }else if(includePendingResearchFactor&&validPositive(profile.pendingCalibration?.candidateKTUbe)){
   kTube=profile.pendingCalibration.candidateKTUbe;mode='PENDING_RESEARCH_SIMULATION';
 }
 const researchMinutes=baseline.referenceMinutes/kTube;
 if(!isNum(researchMinutes)||researchMinutes<=0)
   return failure('INVALID_FACTOR_RESULT');
 return {ok:true,referenceMinutes:baseline.referenceMinutes,
   researchMinutes,kTubeApplied:kTube,mode,calibrationStatus:profile.calibrationStatus,
   warning:profile.calibrationStatus===PROFILE_STATUS.UNVERIFIED_REFERENCE
     ?REFERENCE_WARNING:RESEARCH_WARNING,
   caution:RESEARCH_WARNING,releaseAuthorized:false,
   datasetId:baseline.datasetId};
}
/**
 * Profile spot d is injected automatically. f = SFD - b.
 * f_min MUST come from an identified, approved standard/procedure.
 * We do not fabricate the ISO 17636-1 f_min formula or limit.
 */
export function assessTubeGeometry(profile,{sfdMm,objectFilmDistanceMm,fMinRequirement=null}={}){
 if(!plainObject(profile)||!validPositive(profile.focalSpotMm))
   return failure('FOCAL_SPOT_UNDEFINED');
 const result=assessGeometricUnsharpness({
  focalSpotMm:profile.focalSpotMm,sfdMm,objectFilmDistanceMm
 });
 if(!result.ok)return {...result,releaseAuthorized:false};
 const fActualMm=result.sourceObjectDistanceMm;
 if(!fMinRequirement)
   return {...result,fActualMm,fMinMm:null,fMinStatus:'F_MIN_NOT_DOCUMENTED',
     geometryCheck:'NIET BEOORDEELD',releaseAuthorized:false};
 const {fMinMm,documentId,revision,standardAndEdition,approvalReference}=fMinRequirement;
 if(!isNum(fMinMm)||fMinMm<0||
   ![documentId,revision,standardAndEdition,approvalReference].every(hasString))
   return {...result,fActualMm,fMinMm:null,fMinStatus:'F_MIN_SOURCE_NOT_VERIFIED',
     geometryCheck:'NIET BEOORDEELD',releaseAuthorized:false};
 return {...result,fActualMm,fMinMm,fMinStatus:'DOCUMENTED_LIMIT_COMPARISON',
   geometryCheck:fActualMm>=fMinMm?'VOLDOET AAN OPGEGEVEN GRENS':'OVERSCHRIJDT OPGEGEVEN GRENS',
   releaseAuthorized:false};
}
/**
 * Browser-local-only profile storage. The caller supplies localStorage or
 * a compatible storage adapter. Avoid real customer/serial data in Git.
 */
export function listXrayTubeProfiles(storage=globalThis?.localStorage){
 if(!storage||typeof storage.getItem!=='function')
   return failure('LOCAL_STORAGE_UNAVAILABLE');
 const data=storage.getItem(PROFILE_STORAGE_KEY);
 if(data===null)return {ok:true,profiles:[]};
 let parsed;
 try{parsed=JSON.parse(data)}catch{return failure('PROFILE_STORAGE_CORRUPTED');}
 if(!plainObject(parsed)||parsed.schemaVersion!==1||!Array.isArray(parsed.profiles))
   return failure('PROFILE_STORAGE_SCHEMA_INVALID');
 return {ok:true,profiles:softCopy(parsed.profiles)};
}
export function saveXrayTubeProfile(profile,storage=globalThis?.localStorage){
 if(!plainObject(profile)||!hasString(profile.id)||!hasString(profile.serialNumber)
   ||!Object.values(PROFILE_STATUS).includes(profile.calibrationStatus)
   ||!validPositive(profile.kTube))
   return failure('INVALID_PROFILE');
 const list=listXrayTubeProfiles(storage);
 if(!list.ok)return list;
 const existing=list.profiles.findIndex(p=>p.id===profile.id);
 if(existing>=0)list.profiles[existing]=softCopy(profile);
 else list.profiles.push(softCopy(profile));
 try{
   storage.setItem(PROFILE_STORAGE_KEY,JSON.stringify({
     schemaVersion:1,profiles:list.profiles
   }));
 }catch(e){return failure('PROFILE_STORAGE_WRITE_FAILED',{reason:String(e)});}
 return {ok:true,count:list.profiles.length};
}
export function deleteXrayTubeProfile(id,storage=globalThis?.localStorage){
 if(!hasString(id))return failure('PROFILE_ID_MISSING');
 const list=listXrayTubeProfiles(storage);
 if(!list.ok)return list;
 const remaining=list.profiles.filter(p=>p.id!==id);
 if(remaining.length===list.profiles.length)return failure('PROFILE_NOT_FOUND');
 try{storage.setItem(PROFILE_STORAGE_KEY,JSON.stringify({
   schemaVersion:1,profiles:remaining
 }));}catch{return failure('PROFILE_STORAGE_WRITE_FAILED');}
 return {ok:true,count:remaining.length};
}
