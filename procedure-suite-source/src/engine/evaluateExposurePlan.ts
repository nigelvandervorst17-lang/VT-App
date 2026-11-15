import type {ProcedureProfile,ExposureInput,CalculateExposure,EvaluatedPlan,Check,Status,ExposureResult} from '../domain/types.js';
import {validateProfile} from '../domain/validation.js';
import {calculateFilmPlan,evaluateSourceObjectGeometry} from '../planning/filmPlanning.js';
import {evaluateIqi} from '../planning/iqi.js';

const statusOf=(checks:Check[]):Status=>checks.some(x=>x.status==='red')?'red':checks.some(x=>x.status==='orange')?'orange':'green';
const c=(code:string, status:Status, message:string):Check=>({code,status,message});

/**
 * Procedure overlay: does NOT change input physics, curve files, exposure formulas or engine result.
 * If a hard procedure block occurs, the motor is not called. Status green means only
 * checks *in this control layer* were satisfied — not RT job or calibration approval.
 */
export async function evaluateExposurePlan(input:Readonly<ExposureInput>,profile:Readonly<ProcedureProfile>,calculateExposure:CalculateExposure):Promise<EvaluatedPlan>{
 const checks:Check[]=[];
 const errors=validateProfile(profile as ProcedureProfile);
 if(errors.length){
   return {status:'red',checks:[c('PROFILE_INVALID','red','Procedureprofiel ongeldig: '+errors.join('; '))],input:JSON.parse(JSON.stringify(input)),profileId:profile?.id??'?',profileRevision:profile?.revision??'?',exposure:null,filmPlan:{circumferenceMm:null,filmSegments:null,minimumExposures:null,maxThicknessIncreasePercent:null,maxAllowedPercent:10},iqi:{wireNumber:null,wireDiameterMm:null,position:input.iqiSide,reference:null},evaluatedAt:new Date().toISOString()};
 }
 if(!profile?.confirmedAt||!profile?.confirmedBy)checks.push(c('PROFILE_CONFIRM','red','Procedure is niet door een onderzoeker bevestigd.'));
 if(!profile.sources.includes(input.source))checks.push(c('SOURCE','red',`${input.source} niet toegestaan door deze procedure.`));
 else checks.push(c('SOURCE','green',`${input.source} toegestaan.`));
 if(!profile.films.includes(input.film))checks.push(c('FILM','red',`Filmtype ${input.film} niet toegestaan.`));
 else checks.push(c('FILM','green',`${input.film} toegestaan.`));
 if(!profile.techniques.includes(input.technique))checks.push(c('TECHNIQUE','red',`Opnametechniek ${input.technique} niet toegestaan.`));
 else checks.push(c('TECHNIQUE','green',`${input.technique} toegestaan.`));
 if(!Number.isFinite(input.thicknessMm)||input.thicknessMm<profile.thickness.minMm||input.thicknessMm>profile.thickness.maxMm)checks.push(c('THICKNESS','red',`Wanddikte buiten procedurebereik [${profile.thickness.minMm}, ${profile.thickness.maxMm}] mm.`));
 else checks.push(c('THICKNESS','green','Wanddikte binnen vastgelegde proceduregrenzen.'));
 if(!Number.isFinite(input.density)||input.density<profile.density.min||input.density>profile.density.max)checks.push(c('DENSITY','red',`Dichtheid buiten procedurebereik [${profile.density.min}, ${profile.density.max}].`));
 else checks.push(c('DENSITY','green','Zwarting binnen vastgelegde proceduregrenzen.'));
 if(!Number.isFinite(input.sfdMm)||input.sfdMm<=0)checks.push(c('DISTANCE','red','SFD moet positief en eindig zijn.'));
 const film=calculateFilmPlan(input,profile as ProcedureProfile),iqi=evaluateIqi(input,profile as ProcedureProfile);
 checks.push(...film.checks,...iqi.checks,...evaluateSourceObjectGeometry(input,profile as ProcedureProfile));
 let exposure:ExposureResult|null=null;
 // Always block before touching the unmodified host calculation.
 if(!checks.some(x=>x.status==='red')){
  try {
   exposure=await calculateExposure(input);
   if(!exposure||!exposure.ok||!Number.isFinite(exposure.minutes)||!(exposure.minutes!>0)){
    checks.push(c('ENGINE','red',`Bestaande rekenmotor gaf geen geldige uitkomst: ${exposure?.error??'onbekend'}.`));
   }else if(exposure.calibrationStatus!=='verified'){
    checks.push(c('ENGINE_UNVERIFIED','orange','Belichtingstijd is een onderzoeksresultaat. Geen aangetoonde bron-/filmkalibratie of vrijgave.'));
   }else{
    checks.push(c('ENGINE','green','Bestaande rekenmotor heeft een resultaat teruggegeven (geen wijziging door procedurelaag).'));
   }
  }catch(err){checks.push(c('ENGINE','red',`Rekenmotorfout: ${String(err)}`));}
 }else{
  checks.push(c('ENGINE_BLOCKED','red','Berekening niet aangeroepen wegens procedureblokkade.'));
 }
 const immutableInput:ExposureInput=JSON.parse(JSON.stringify(input));
 return {
  status:statusOf(checks),checks,input:immutableInput,profileId:profile.id,profileRevision:profile.revision,
  exposure:exposure?{...exposure}:null,filmPlan:film.plan,iqi:iqi.requirement,evaluatedAt:new Date().toISOString()
 };
}
