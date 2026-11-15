/** UI-only values; never adjusts exposure physics or gamma/X-ray calibration. */
import type {ExposureInput,SourceType,Technique} from '../domain/types.js';

/** Nominal thickness for procedure / IQI lookup; not an actual measured ray path. */
export function nominalPenetratedThickness(wallMm:number,technique:Technique):number|null {
 if(!Number.isFinite(wallMm)||wallMm<=0)return null;
 const derived=wallMm*(technique==='SWSI'?1:2);
 return Number.isFinite(derived)?derived:null;
}
export function applyPlannerInputs(previous:ExposureInput,patch:Partial<ExposureInput>):ExposureInput {
 const next={...previous,...patch};
 return {...next,penetratedThicknessMm:nominalPenetratedThickness(next.thicknessMm,next.technique)};
}
/** Hidden gamma/X-ray fields are wiped on source changes to prevent stale values in records. */
export function applySourceSelection(previous:ExposureInput,source:SourceType):ExposureInput {
 return applyPlannerInputs(previous,source==='X-ray'
  ?{source,activityCi:undefined}
  :{source,model:'',kv:undefined,ma:undefined});
}
/** Flat plate never inherits stale pipe coverage data, so pipe film calculations are inapplicable. */
export function applyPlannerShape(previous:ExposureInput,shape:'plate'|'pipe'):ExposureInput {
 return {...previous,geometry:shape==='plate'
  ?{...previous.geometry,shape,diameterMm:null,sourcePlacement:null,filmUsableLengthMm:null,filmWrapped:false}
  :{...previous.geometry,shape}};
}
