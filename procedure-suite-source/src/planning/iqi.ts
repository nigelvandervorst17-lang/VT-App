import type {ProcedureProfile, ExposureInput, IqiRequirement, Check, ApprovedIqiRule} from '../domain/types.js';

/** ISO 19232-1 wire nominal diameters (mm), W1...W19. */
export const WIRE_MM:Readonly<Record<number,number>>=Object.freeze({
 1:3.2,2:2.5,3:2.0,4:1.6,5:1.25,6:1,7:.8,8:.63,9:.5,10:.4,
 11:.32,12:.25,13:.2,14:.16,15:.125,16:.1,17:.08,18:.063,19:.05
});
export interface IqiAssessment {requirement:IqiRequirement; checks:Check[];}
export function evaluateIqi(input:ExposureInput,p:ProcedureProfile):IqiAssessment {
 const checks:Check[]=[];
 const requirement:IqiRequirement={wireNumber:null,wireDiameterMm:null,position:input.iqiSide,reference:null};
 if(p.iqi.side!=='either'&&p.iqi.side!==input.iqiSide){
  checks.push({code:'IQI_SIDE',status:'red',message:`IQI-positie ${input.iqiSide} is niet toegestaan (procedure: ${p.iqi.side}).`});
  return {requirement,checks};
 }
 if(input.iqiSide==='film'&&!p.iqi.filmSideComparisonVerified){
  checks.push({code:'IQI_FILM_COMPARE',status:'orange',message:'IQI aan filmzijde: overeenkomst/vergelijkingsopname voor deze techniek is nog niet als bevestigd geregistreerd.'});
 }
 const w=input.penetratedThicknessMm;
 const matches=p.iqi.approvedRules.filter((r:ApprovedIqiRule)=>{
  const thickness=r.basis==='nominal'?input.thicknessMm:w;
  return r.technique===input.technique && r.class===p.class&&r.side===input.iqiSide && thickness!==null && Number.isFinite(thickness)&&thickness>r.aboveMm&&thickness<=r.upToMm;
 });
 if(matches.length===0){
  checks.push({code:'IQI_TABLE',status:'orange',message:'Geen passende, expliciet goedgekeurde IQI-tabelregel (bijlage B) beschikbaar. W-eis niet automatisch vaststellen.'});
  return {requirement,checks};
 }
 if(matches.length>1){
  checks.push({code:'IQI_CONFLICT',status:'red',message:'Meerdere overlappende IQI-regels: procedure corrigeren.'});
  return {requirement,checks};
 }
 const row=matches[0];
 const wire=row.wireNumber+p.iqi.extraFinerWires;
 if(wire>19){
  checks.push({code:'IQI_OFFSET',status:'red',message:'Vereiste extra fijnere IQI-draden vallen buiten W19.'});
  return {requirement,checks};
 }
 requirement.wireNumber=wire;
 requirement.wireDiameterMm=WIRE_MM[wire];
 requirement.reference=row.reference;
 checks.push({code:'IQI_REQUIRED',status:'green',message:`Vereist minimaal W${wire} (${WIRE_MM[wire]} mm) zichtbaar, ${input.iqiSide==='film'?'filmzijde':'bronzijde'}, volgens vastgelegde tabel ${row.reference}.`});
 // No automatic gamma-specific IQI derogation or equivalent-source conversion.
 return {requirement,checks};
}
