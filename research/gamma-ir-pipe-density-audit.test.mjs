/**
 * READ-ONLY RESEARCH AUDIT, not a RT exposure instruction.
 * Runs the actual immutable production calculateGamma(), film-response,
 * reference curves and geometryPreview(). Does not change any formula.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateGamma, hms, certificateActivity} from '../rt-core.mjs';
import {curves} from '../rt-curves.mjs';
import {densityCorrectionFactor, FILM_RESPONSE} from '../film-response.mjs';
// Geometry also owns a browser UI entrypoint; keep it inert during this Node-only audit.
globalThis.document ??= {readyState:'loading',addEventListener(){}};
const {geometryPreview}=await import('../workflow-shape.mjs');

const BASE={film:'D4',activityCi:70,distanceMm:800,material:'Fe',screens:'Pb'};
const DENSITIES=[2,2.5,2.8,3];
const waygateSeSeconds=new Map([[2,567],[2.5,751],[2.8,861],[3,935]]);
const sec=r=>r.ok?Math.round(r.minutes*60):null;
const run=(isotope,density,mm)=>calculateGamma({
 ...BASE,isotope,density,thicknessMm:mm
},curves);
function fmt(r){return r.ok?hms(r.minutes):'BLOKKADE '+r.error;}
const plate12={shape:'plate',wall:12},pipe6={shape:'pipe',wall:6,od:114},pipe12={shape:'pipe',wall:12,od:114};
const plate=geometryPreview(plate12),pipeSameThickness=geometryPreview(pipe6),pipeDouble=geometryPreview(pipe12);

test('Buisgeometrie: 6 mm t = 12 mm w; 12 mm t = 24 mm w (nominale benadering)',()=>{
 assert.equal(plate.ok,true);assert.equal(plate.w,12);
 assert.equal(pipeSameThickness.ok,true);assert.equal(pipeSameThickness.w,12);
 assert.equal(pipeDouble.ok,true);assert.equal(pipeDouble.w,24);
 assert.equal(pipeDouble.nominal,24);
});
test('Se-75 and Ir-192 use the same D4 film correction, not distinct isotope-specific density curves',()=>{
 const factors=DENSITIES.map(d=>densityCorrectionFactor({film:'D4',isotope:'Se-75',density:d,baseDensity:2}));
 const irFactors=DENSITIES.map(d=>densityCorrectionFactor({film:'D4',isotope:'Ir-192',density:d,baseDensity:2}));
 for(const [i,d] of DENSITIES.entries()){
  assert.equal(factors[i].ok,true);assert.equal(irFactors[i].ok,true);
  assert.equal(factors[i].factor,irFactors[i].factor,'factor D '+d);
  const se=run('Se-75',d,12),ir=run('Ir-192',d,12);
  assert.ok(se.ok,'Se-75 '+d);assert.ok(ir.ok,'Ir-192 '+d);
  assert.equal(se.densityFactor,ir.densityFactor);
 }
 assert.equal(FILM_RESPONSE.minDensity,1.5);
 assert.equal(FILM_RESPONSE.maxDensity,3.2);
});
test('The same penetrated thickness always yields the same gamma estimate, irrespective of geometry UI',()=>{
 for(const iso of ['Se-75','Ir-192'])for(const d of DENSITIES){
  const samePipe=run(iso,d,pipeSameThickness.w),samePlate=run(iso,d,plate.w);
  assert.equal(samePlate.ok,true);
  assert.equal(samePipe.ok,true);
  assert.equal(samePipe.minutes,samePlate.minutes);
 }
});
test('Recalculating with larger penetrated thickness changes the actual exposure curve, not the density factor',()=>{
 for(const iso of ['Se-75','Ir-192'])for(const d of DENSITIES){
  const thin=run(iso,d,12),thick=run(iso,d,24);
  assert.ok(thick.ok);
  assert.ok(thick.minutes>thin.minutes,iso+' D '+d+' thickness changes time');
  assert.equal(thick.densityFactor,thin.densityFactor);
 }
});
test('Exposure time scales by Ci^-1 and SFD squared without bypassing validation',()=>{
 for(const iso of ['Se-75','Ir-192']){
  const orig=run(iso,2.5,12),half=calculateGamma({...BASE,isotope:iso,density:2.5,thicknessMm:12,activityCi:35},curves),
   distant=calculateGamma({...BASE,isotope:iso,density:2.5,thicknessMm:12,distanceMm:1000},curves);
  assert.ok(orig.ok&&half.ok&&distant.ok);
  assert.ok(Math.abs(half.minutes/orig.minutes-2)<1e-12);
  assert.ok(Math.abs(distant.minutes/orig.minutes-(1000/800)**2)<1e-12);
 }
});
test('Bad inputs stay blocked: zero source, out-of-curve Se thickness, density outside model, invalid tube geometry',()=>{
 const zero=calculateGamma({...BASE,isotope:'Se-75',density:2,thicknessMm:12,activityCi:0},curves);
 assert.equal(zero.ok,false);
 const thick=run('Se-75',2,45);
 assert.equal(thick.ok,false);assert.equal(thick.error,'range');
 const dark=run('Se-75',3.5,12);
 assert.equal(dark.ok,false);assert.equal(dark.error,'density');
 const tooSmallTube=geometryPreview({shape:'pipe',od:20,wall:12});
 assert.equal(tooSmallTube.ok,false);
});
test('Se-75 production code baseline is consistent with user comparison at D=2.0; other Waygate readings are differences, not target calibrations',()=>{
 const base=run('Se-75',2,12);
 assert.ok(base.ok);
 assert.ok(Math.abs(sec(base)-567)<=1,'Expected 09:27 from actual app engine');
});
test('Audit: print original calculation output matrix without changing RT source',()=>{
 const factors=DENSITIES.map(d=>densityCorrectionFactor({film:'D4',density:d,baseDensity:2}).factor);
 const seBase=run('Se-75',2,12),irBase=run('Ir-192',2,12);
 console.log('AUDIT_SOURCE: unchanged main RT core / film-response / gamma curves / workshape geometry; research-only, NOT exposure authorization.');
 console.log('AUDIT_INPUTS: 70 Ci, 800 mm SFD, Fe, D4, reference D=2.0, Se-75 and Ir-192; plate w=12mm, pipe OD=114mm t=6mm -> w=12mm, pipe OD=114mm t=12mm -> w=24mm.');
 console.log('AUDIT_FILM_SOURCE: '+FILM_RESPONSE.sourceTitle+'; dataset='+FILM_RESPONSE.version);
 console.log('AUDIT_HEADER: zwarting | D4 factor | Se-75 plaat 12mm | Se-75 buis t12/w24 | Ir-192 plaat 12mm | Ir-192 buis t12/w24 | Waygate Se-75 plaat 12mm | verschil Waygate-App (sec)');
 for(const [i,d] of DENSITIES.entries()){
  const se=run('Se-75',d,12),sePipe=run('Se-75',d,24),
    ir=run('Ir-192',d,12),irPipe=run('Ir-192',d,24);
  const wg=waygateSeSeconds.get(d);
  const dif=wg-sec(se);
  const hhss=seconds=>{
   const hours=Math.floor(seconds/3600),mins=Math.floor((seconds%3600)/60),secs=seconds%60;
   return [hours,mins,secs].map(x=>String(x).padStart(2,'0')).join(':');
  };
  console.log('AUDIT_ROW: '+[
   d.toFixed(1),factors[i].toFixed(6),fmt(se),fmt(sePipe),fmt(ir),fmt(irPipe),hhss(wg),dif
  ].join(' | '));
 }
 console.log('AUDIT_THICKNESS_TEST: 6mm buiswand -> 12mm penetratie = exact dezelfde RT-uitkomst als 12mm plaat; handmatig w overriden wordt direct als penetratiedikte gebruikt.');
 console.log('AUDIT_RELATIVE_D4_FACTOR: Ir-192 D4 bij dezelfde D gebruikt exact dezelfde factor als Se-75 D4; Waygate Ir-192 referentie ontbreekt.');
 console.log('AUDIT_BLOCKS: density=3.5 rejected; Se-75 45mm rejected; activity=0 rejected; pipe diameter <= 2*wall rejected in geometry.');
 assert.ok(seBase.ok&&irBase.ok);
});
