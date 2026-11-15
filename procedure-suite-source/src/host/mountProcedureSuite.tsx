import React from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {ProcedureSuite} from '../ui/ProcedureSuite.js';
import type {CalculateExposure} from '../domain/types.js';
export interface MountOptions{calculateExposure:CalculateExposure}
/** Called from the existing vanilla-JS BASIC RT PRO application. */
export function mountProcedureSuite(element:HTMLElement,options:MountOptions):()=>void{
 if(!element)throw new Error('mountProcedureSuite: mount element ontbreekt');
 if(typeof options?.calculateExposure!=='function')throw new Error('Koppel eerst bestaande calculateExposure-functie als callback.');
 const root:Root=createRoot(element);
 root.render(<React.StrictMode><ProcedureSuite calculateExposure={options.calculateExposure}/></React.StrictMode>);
 return ()=>root.unmount();
}
export {parseProcedureDocument,parseProcedureText} from '../parser/parseProcedureDocument.js';
export {evaluateExposurePlan} from '../engine/evaluateExposurePlan.js';
export {calculateFilmPlan,evaluateSourceObjectGeometry} from '../planning/filmPlanning.js';
export {evaluateIqi,WIRE_MM} from '../planning/iqi.js';
export * from '../storage/procedureStorage.js';
export type * from '../domain/types.js';
