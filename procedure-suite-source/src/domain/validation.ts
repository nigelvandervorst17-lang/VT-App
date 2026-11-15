import type {ProcedureProfile, ApprovedIqiRule, ApprovedExposureCountRule, Technique, FilmType, SourceType} from './types.js';

export const ALL_SOURCES: SourceType[] = ['Se-75','Ir-192','X-ray'];
export const ALL_FILMS: FilmType[] = ['D2','D3','D4','D5','D7','D8'];
export const ALL_TECHNIQUES: Technique[] = ['SWSI','DWSI','DWDI-ELLIPSE'];
const finite = (x:unknown):x is number => typeof x === 'number' && Number.isFinite(x);
const nonempty = (x:unknown):x is string => typeof x === 'string' && x.trim().length > 0;
const validDate = (x:unknown) => nonempty(x) && !Number.isNaN(Date.parse(x));
const arrWithin = <T>(v:unknown, valid: readonly T[]):v is T[] => Array.isArray(v) && v.length > 0 && v.every(x => valid.includes(x));

export function validateIqiRule(r:ApprovedIqiRule):string[] {
  const e:string[]=[];
  if(!nonempty(r.id) || !nonempty(r.reference))e.push('IQI: regel-ID en normreferentie zijn verplicht');
  if(!ALL_TECHNIQUES.includes(r.technique)||!['source','film'].includes(r.side)||!['A','B'].includes(r.class)||!['nominal','penetrated'].includes(r.basis))e.push('IQI: ongeldige techniek/zijde/klasse/basis');
  if(!finite(r.aboveMm)||!finite(r.upToMm)||r.aboveMm<0||r.upToMm<=r.aboveMm)e.push('IQI: ongeldig diktebereik');
  if(!Number.isInteger(r.wireNumber)||r.wireNumber<1||r.wireNumber>19)e.push('IQI: draad moet W1 t/m W19 zijn');
  return e;
}
export function validateShotRule(r:ApprovedExposureCountRule):string[] {
 const e:string[]=[];
 if(!nonempty(r.id)||!nonempty(r.reference))e.push('Opnameregel: ID en herkomstverwijzing zijn verplicht');
 if(!ALL_TECHNIQUES.includes(r.technique)||!['A','B'].includes(r.class)||!['internal-central','external','internal-offset'].includes(r.sourcePlacement))e.push('Opnameregel: techniek/klasse/bronpositie ongeldig');
 for(const [lo,hi,name] of [[r.minDiameterMm,r.maxDiameterMm,'diameter'],[r.minWallMm,r.maxWallMm,'wanddikte'],[r.minSfdMm,r.maxSfdMm,'SFD']] as const){
  if(!finite(lo)||!finite(hi)||lo<=0||hi<lo)e.push('Opnameregel: ongeldig '+name+'-bereik');
 }
 if(!Number.isInteger(r.minimumExposures)||r.minimumExposures<1||r.minimumExposures>500)e.push('Opnameregel: ongeldig aantal');
 return e;
}
/** Always validate imported JSON: TypeScript types do not protect runtime. */
export function validateProfile(profile:ProcedureProfile):string[]{
 const e:string[]=[];
 if(profile?.schemaVersion!==1)e.push('Onbekende schema-versie');
 if(!nonempty(profile?.id)||!nonempty(profile?.code)||!nonempty(profile?.customer)||!nonempty(profile?.revision))e.push('Code, klant, revisie en ID zijn verplicht');
 if(profile?.norm!=='ISO 17636-1:2022'||!['A','B'].includes(profile?.class))e.push('Alleen expliciet bevestigde ISO 17636-1:2022 klasse A/B is ondersteund');
 if(typeof profile?.planarDefectsRequired!=='boolean')e.push('Vlakke-defect-eis ontbreekt');
 if(!arrWithin(profile?.sources,ALL_SOURCES)||!arrWithin(profile?.films,ALL_FILMS)||!arrWithin(profile?.techniques,ALL_TECHNIQUES))e.push('Ten minste één geldige bron, film en techniek is verplicht');
 if(!finite(profile?.thickness?.minMm)||!finite(profile?.thickness?.maxMm)||profile.thickness.minMm<=0||profile.thickness.maxMm<profile.thickness.minMm)e.push('Ongeldig wanddiktebereik');
 if(!finite(profile?.density?.min)||!finite(profile?.density?.max)||profile.density.min<=0||profile.density.max<profile.density.min)e.push('Ongeldig zwartingsvenster');
 if(!['source','film','either'].includes(profile?.iqi?.side))e.push('IQI-zijde moet bron, film of beide zijn');
 if(!Number.isInteger(profile?.iqi?.extraFinerWires)||profile.iqi.extraFinerWires<0||profile.iqi.extraFinerWires>5)e.push('IQI: extra draadcompensatie 0–5');
 if(typeof profile?.iqi?.filmSideComparisonVerified!=='boolean')e.push('IQI: vergelijkingsstatus ontbreekt');
 if(!Array.isArray(profile?.iqi?.approvedRules))e.push('IQI-tabel moet lijst zijn');
 else profile.iqi.approvedRules.forEach(r=>e.push(...validateIqiRule(r)));
 const overlap=profile?.planning?.minimumFilmOverlapMm;
 if(overlap!==null&&(!finite(overlap)||overlap<=0||overlap>1000))e.push('Overlap moet positief zijn of onbekend (leeg)');
 if(!Array.isArray(profile?.planning?.approvedExposureRules))e.push('Opnametabel moet lijst zijn');
 else profile.planning.approvedExposureRules.forEach(r=>e.push(...validateShotRule(r)));
 if(!nonempty(profile?.confirmedBy)||!validDate(profile?.confirmedAt)||!validDate(profile?.createdAt)||!validDate(profile?.updatedAt))e.push('Bevestiger en geldige datums vereist');
 if(!['pdf','docx','text'].includes(profile?.source?.kind))e.push('Herkomsttype ontbreekt');
 return e;
}
export const newId = () => {
 if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
 return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`;
};
