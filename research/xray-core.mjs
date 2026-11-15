/**
 * NDT Radiography Pro — isolated X-ray research engine.
 * NEVER an authorised radiographic exposure instruction.
 * Independent numerical implementation for testing against, not replacing,
 * the unmodified calculateXray() in ../rt-core.mjs.
 * Dataset curve coefficients are pre-existing, unvalidated research references.
 */
import {curves} from '../rt-curves.mjs';
import {xrayExtraCurves} from '../xray-extra-curves.mjs';
import {densityCorrectionFactor} from '../film-response.mjs';

export const RESEARCH_ONLY='RESEARCH_ONLY_NOT_CALIBRATED_NOT_FOR_EXPOSURES';
export const XRAY_MODEL_NAMES=Object.freeze({
 '160':'YXLON SMART 160E / 160W',
 '200':'YXLON SMART 200 / 200W',
 '200PC':'YXLON SMART 200PC',
 '225':'YXLON SMART 225 / 225X / 225W',
 '300HP':'YXLON SMART 300HP / 300HPW',
 '300PC':'YXLON SMART 300PC'
});

export function researchDatabase(){
 // Mirrors only the model-name associations in basicRTProBridge.mjs.
 // No existing curve or gamma object is mutated.
 const extra=Object.fromEntries(Object.entries(XRAY_MODEL_NAMES)
   .map(([id,name])=>[name,xrayExtraCurves[id]]));
 return {xray:{...curves.xray,...extra}};
}

function blocked(code,details={}){
 return {ok:false,error:code,calibrationStatus:RESEARCH_ONLY,...details};
}
const number=Number.isFinite;
const present=s=>typeof s==='string'&&s.trim().length>0;

/**
 * Independent evaluation of the existing X-ray fit, at ONE exact recorded kV.
 * mA.min = 10**(slope[kV]*t + intercept[kV]);
 * time_min = mA.min/mA * (SFD/referenceSFD)**2 * existing density model.
 *
 * No interpolation between kV lines; no fitted equipment factor; no derived
 * D4 curve from another film. The old 200-kV film-density response is itself
 * unvalidated for other equipment and is only repeated for comparison.
 */
export function calculateResearchXray(input){
 if(!input||typeof input!=='object')return blocked('INVALID_INPUT');
 const {model,film,density,kv,ma,thicknessMm,distanceMm,material='Fe'}=input;
 if(!number(thicknessMm)||thicknessMm<=0||thicknessMm>100
   ||!number(distanceMm)||distanceMm<=thicknessMm||distanceMm>100000
   ||!number(ma)||ma<=0||ma>1000)return blocked('INVALID_INPUT');
 if(material!=='Fe')return blocked('MATERIAL_REQUIRES_VALIDATED_EQUIVALENCE');
 if(!present(model))return blocked('MODEL_MISSING');
 const ds=researchDatabase().xray[model];
 if(!ds)return blocked('MODEL_UNSUPPORTED',{model});
 if(ds.enabled===false||!Array.isArray(ds.curves)||ds.curves.length===0)
   return blocked('MODEL_NO_USABLE_CURVE',{model});
 if(!present(film))return blocked('FILM_MISSING');
 if(film!==ds.film)return blocked('FILM_NOT_SUPPORTED_BY_MODEL',{
   requestedFilm:film,referenceFilm:ds.film
 });
 if(!number(density))return blocked('DENSITY_MISSING');
 const response=densityCorrectionFactor({film,density,baseDensity:ds.density});
 if(!response.ok)return blocked('DENSITY_OUT_OF_REFERENCE_RANGE');
 if(!number(kv)||!Number.isInteger(kv))return blocked('KV_MISSING_OR_INVALID');
 const kvLine=ds.curves.find(c=>c.kv===kv);
 if(!kvLine)return blocked('KV_NO_REFERENCE_CURVE',{availableKv:ds.curves.map(c=>c.kv)});
 if(!number(kvLine.minThicknessMm)||!number(kvLine.maxThicknessMm)
   ||thicknessMm<kvLine.minThicknessMm||thicknessMm>kvLine.maxThicknessMm)
   return blocked('THICKNESS_OUTSIDE_KV_CURVE',{
     minMm:kvLine.minThicknessMm,maxMm:kvLine.maxThicknessMm
   });
 if(input.deviceFactor!=null&&input.deviceFactor!==1)
   return blocked('DEVICE_FACTOR_UNVERIFIED');
 if(input.referenceScreens!=null&&input.referenceScreens!==ds.screens)
   return blocked('SCREEN_CONDITIONS_NOT_REFERENCED');
 const mam=Math.pow(10,thicknessMm*kvLine.log10MamPerMm+kvLine.log10MamIntercept);
 if(!number(mam)||mam<kvLine.minMam-1e-7||mam>kvLine.maxMam+1e-7)
   return blocked('EXPOSURE_OUTSIDE_CHART_LIMIT');
 if(!number(ds.referenceDistanceMm)||ds.referenceDistanceMm<=0)
   return blocked('INVALID_REFERENCE_DISTANCE');
 const minutes=(mam/ma)*(distanceMm/ds.referenceDistanceMm)**2*response.factor;
 if(!number(minutes)||minutes<=0||minutes>1e9)return blocked('INVALID_CALCULATION');
 return {
   ok:true,minutes,exposureMam:mam,unit:'mA·min',model,
   manufacturer:input.manufacturer??null,film,kv,ma,physicalThicknessMm:thicknessMm,
   sfdMm:distanceMm,referenceSfdMm:ds.referenceDistanceMm,
   referenceDensity:ds.density,densityFactor:response.factor,
   datasetId:ds.datasetId,requiredScreens:ds.screens,
   focalSpotMm:input.focalSpotMm??null,
   deviceFactorApplied:1,deviceFactorSupported:false,
   screenConditionsRequireIndependentVerification:true,
   calibrationStatus:RESEARCH_ONLY
 };
}

/**
 * Separate geometrical unsharpness calculation, not part of exposure time.
 * Ug=d*b/(SFD-b), where b is the actual object-to-film gap, d effective spot.
 * No ISO threshold is supplied or inferred. Optional, documented local
 * limit only supports comparison, NEVER radiographic approval.
 */
export function assessGeometricUnsharpness({
 focalSpotMm,objectFilmDistanceMm,sfdMm,approvedLimit=null
}={}){
 if(!number(focalSpotMm)||focalSpotMm<=0
   ||!number(objectFilmDistanceMm)||objectFilmDistanceMm<0
   ||!number(sfdMm)||sfdMm<=objectFilmDistanceMm)
   return {ok:false,status:'GEOMETRY_INPUT_MISSING_OR_INVALID',approved:false};
 const sodMm=sfdMm-objectFilmDistanceMm;
 const ugMm=focalSpotMm*objectFilmDistanceMm/sodMm;
 if(!approvedLimit){
   return {ok:true,ugMm,sourceObjectDistanceMm:sodMm,status:'LIMIT_NOT_SPECIFIED',
     meetsDocumentedLimit:null,approved:false};
 }
 const {limitMm,documentId,revision,approvalReference,standardAndEdition}=approvedLimit;
 if(!number(limitMm)||limitMm<0
   ||![documentId,revision,approvalReference,standardAndEdition].every(present)){
   return {ok:true,ugMm,sourceObjectDistanceMm:sodMm,status:'LIMIT_SOURCE_NOT_DOCUMENTED',
     meetsDocumentedLimit:null,approved:false};
 }
 const meetsDocumentedLimit=ugMm<=limitMm;
 return {ok:true,ugMm,sourceObjectDistanceMm:sodMm,
   status:meetsDocumentedLimit?'WITHIN_DOCUMENTED_LIMIT':'EXCEEDS_DOCUMENTED_LIMIT',
   meetsDocumentedLimit,limitMm,documentId,revision,approvalReference,
   standardAndEdition,approved:false};
}
