/** Nominal thickness for procedure / IQI lookup; not an actual measured ray path. */
export function nominalPenetratedThickness(wallMm, technique) {
    if (!Number.isFinite(wallMm) || wallMm <= 0)
        return null;
    const derived = wallMm * (technique === 'SWSI' ? 1 : 2);
    return Number.isFinite(derived) ? derived : null;
}
export function applyPlannerInputs(previous, patch) {
    const next = { ...previous, ...patch };
    return { ...next, penetratedThicknessMm: nominalPenetratedThickness(next.thicknessMm, next.technique) };
}
/** Hidden gamma/X-ray fields are wiped on source changes to prevent stale values in records. */
export function applySourceSelection(previous, source) {
    return applyPlannerInputs(previous, source === 'X-ray'
        ? { source, activityCi: undefined }
        : { source, model: '', kv: undefined, ma: undefined });
}
/** Flat plate never inherits stale pipe coverage data, so pipe film calculations are inapplicable. */
export function applyPlannerShape(previous, shape) {
    return { ...previous, geometry: shape === 'plate'
            ? { ...previous.geometry, shape, diameterMm: null, sourcePlacement: null, filmUsableLengthMm: null, filmWrapped: false }
            : { ...previous.geometry, shape } };
}
