/**
 * DROP-IN HOST ADAPTER for the existing BASIC RT PRO 3.8.5 JS implementation.
 * Copy this file NEXT TO rt-core.mjs and rt-curves.mjs in a TEST COPY of the app.
 * Physics is delegated unchanged to calculateGamma/calculateXray.
 * Does NOT edit or rename vendor-origin curves, does NOT imply rights to them.
 */
import {calculateGamma,calculateXray} from './rt-core.mjs';
import {curves} from './rt-curves.mjs';
import {xrayExtraCurves} from './xray-extra-curves.mjs';

const xray={...curves.xray,
  'YXLON SMART 160E / 160W':xrayExtraCurves['160'],
  'YXLON SMART 200 / 200W':xrayExtraCurves['200'],
  'YXLON SMART 200PC':xrayExtraCurves['200PC'],
  'YXLON SMART 225 / 225X / 225W':xrayExtraCurves['225'],
  'YXLON SMART 300HP / 300HPW':xrayExtraCurves['300HP'],
  'YXLON SMART 300PC':xrayExtraCurves['300PC']};
const db={...curves,xray}; // shallow clone: do not mutate imported calibration data
export function existingCalculateExposure(input){
 const result=input.source==='X-ray'
  ?calculateXray({model:input.model,film:input.film,density:input.density,
     kv:input.kv,ma:input.ma,thicknessMm:input.thicknessMm,distanceMm:input.sfdMm,material:input.material??'Fe'},db)
  :calculateGamma({isotope:input.source,film:input.film,density:input.density,
     activityCi:input.activityCi,thicknessMm:input.thicknessMm,distanceMm:input.sfdMm,
     material:input.material??'Fe'},db);
 // Preserve original minutes EXACTLY. No remapping or adjusted coefficients.
 return result.ok?{ok:true,minutes:result.minutes,datasetId:result.datasetId,
  calibrationStatus:'unverified'}:{ok:false,error:String(result.error)};
}
