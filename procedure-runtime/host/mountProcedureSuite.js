import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProcedureSuite } from '../ui/ProcedureSuite.js';
/** Called from the existing vanilla-JS BASIC RT PRO application. */
export function mountProcedureSuite(element, options) {
    if (!element)
        throw new Error('mountProcedureSuite: mount element ontbreekt');
    if (typeof options?.calculateExposure !== 'function')
        throw new Error('Koppel eerst bestaande calculateExposure-functie als callback.');
    const root = createRoot(element);
    root.render(React.createElement(React.StrictMode, null,
        React.createElement(ProcedureSuite, { calculateExposure: options.calculateExposure })));
    return () => root.unmount();
}
export { parseProcedureDocument, parseProcedureText } from '../parser/parseProcedureDocument.js';
export { evaluateExposurePlan } from '../engine/evaluateExposurePlan.js';
export { calculateFilmPlan, evaluateSourceObjectGeometry } from '../planning/filmPlanning.js';
export { evaluateIqi, WIRE_MM } from '../planning/iqi.js';
export * from '../storage/procedureStorage.js';
