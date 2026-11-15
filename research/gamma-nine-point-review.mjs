/**
 * 9-punts-regressie: uitsluitend onderzoeksvergelijking, GEEN productiewijziging.
 * Run: node research/gamma-nine-point-review.mjs
 * Bedient geen radiografieapparatuur en autoriseert geen belichtingen.
 */
import {calculateGamma,hms} from '../rt-core.mjs';
import {curves} from '../rt-curves.mjs';

// Uitsluitend voor deze proef; nooit schrijven naar geimporteerde curves.
export const researchDensityFactors=Object.freeze({D4:1.4278,D5:1.3085});

export const nineCases=Object.freeze([
 {nr:32,isotope:'Se-75',film:'D5',mm:8,ci:40,sfd:800,density:2.0,expected:'00:07:24'},
 {nr:33,isotope:'Se-75',film:'D7',mm:8,ci:40,sfd:800,density:2.0,expected:'00:05:24'},
 {nr:38,isotope:'Ir-192',film:'D5',mm:15,ci:40,sfd:800,density:2.0,expected:null},
 {nr:39,isotope:'Ir-192',film:'D7',mm:15,ci:40,sfd:800,density:2.0,expected:null},
 {nr:43,isotope:'Se-75',film:'D4',mm:10,ci:40,sfd:800,density:1.2,expected:null},
 {nr:48,isotope:'Se-75',film:'D7',mm:20,ci:40,sfd:800,density:3.5,expected:null},
 {nr:49,isotope:'Ir-192',film:'D4',mm:40,ci:40,sfd:800,density:3.9,expected:null},
 {nr:53,isotope:'Se-75',film:'D5',mm:12,ci:52,sfd:250,density:2.5,expected:'00:00:57'},
 {nr:54,isotope:'Se-75',film:'D4',mm:10,ci:15,sfd:1000,density:2.5,expected:'01:26:04'}
]);

const seconds=minutes=>Math.round(minutes*60);
const caution='NIET GEVALIDEERD — rekenkundige hypothese, geen RT-belichtingsinstructie';

export function reviewCase(t){
 const input={
   isotope:t.isotope,film:t.film,density:t.density,
   thicknessMm:t.mm,distanceMm:t.sfd,activityCi:t.ci,
   material:'Fe',screens:'Pb'
 };
 const original=calculateGamma(input,curves);
 // Harde afwijzingen van de bestaande motor blijven harde afwijzingen:
 // geen extrapolatie van D5/D7 en geen uitrekking van het zwartingsbereik.
 if(!original.ok)return {
   nr:t.nr,isotope:t.isotope,film:t.film,
   currentTime:'Geblokkeerd',candidateTime:'Geblokkeerd',
   differenceSeconds:null,status:'Geblokkeerd',error:original.error,
   expected:t.expected,warning:caution
 };
 let candidateMinutes=original.minutes;
 let researchFactor=null;
 if(t.density===2.5&&Object.prototype.hasOwnProperty.call(researchDensityFactors,t.film)){
   // Vraag de originele curve op bij D=2,0. Daardoor blijven de originele
   // D5/D4-filmverhouding (ca. 0,584514) en alle D7-factoren intact.
   const base=calculateGamma({...input,density:2.0},curves);
   if(!base.ok)throw new Error('Onverwachte D=2,0-blokkade bij test '+t.nr+': '+base.error);
   researchFactor=researchDensityFactors[t.film];
   candidateMinutes=base.minutes*researchFactor;
 }
 const currentTime=hms(original.minutes),candidateTime=hms(candidateMinutes);
 const differenceSeconds=seconds(candidateMinutes)-seconds(original.minutes);
 const status=candidateTime===(t.expected??currentTime)?'Overeenkomst':'Afwijking';
 return {
   nr:t.nr,isotope:t.isotope,film:t.film,currentTime,candidateTime,
   differenceSeconds,status,error:null,
   expected:t.expected,researchFactor,warning:caution
 };
}

export function reviewAll(){return nineCases.map(reviewCase);}
if(typeof process!=='undefined'&&process.argv?.[1]?.endsWith('gamma-nine-point-review.mjs')){
 console.table(reviewAll().map(r=>({
   'Testnr':r.nr,'Oorspronkelijke tijd':r.currentTime,
   'Nieuwe tijd':r.candidateTime,
   'Verschil (sec)':r.differenceSeconds??'—','Status':r.status
 })));
}
