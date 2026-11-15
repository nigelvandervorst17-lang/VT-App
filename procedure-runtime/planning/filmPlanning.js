/** Separate circumferential film-coverage calculation from Annex A exposure-count selection. */
export function calculateFilmPlan(input, p) {
    const checks = [];
    const diameter = input.geometry.diameterMm;
    const wall = input.thicknessMm;
    const plan = { circumferenceMm: null, filmSegments: null, minimumExposures: null, maxThicknessIncreasePercent: null, maxAllowedPercent: p.class === 'B' ? 10 : 20 };
    if (input.geometry.shape === 'plate') {
        checks.push({ code: 'PLATE_COVERAGE', status: 'orange', message: 'Vlakke plaat: opnamedekking, overlap en minimaal aantal opnamen vereisen een apart goedgekeurd opnameplan. Buisomtrek- en bijlage-A-opnameaantallen zijn hier niet toegepast.' });
        return { plan, checks };
    }
    if (!Number.isFinite(diameter) || diameter === null || diameter <= 0) {
        checks.push({ code: 'PIPE_DIAMETER', status: 'orange', message: 'Pijpdiameter ontbreekt: filmdekking rondlas niet te berekenen.' });
        return { plan, checks };
    }
    if (!Number.isFinite(wall) || wall <= 0 || wall >= diameter / 2) {
        checks.push({ code: 'PIPE_GEOMETRY', status: 'red', message: 'Ongeldige verhouding pijpdiameter/wanddikte.' });
        return { plan, checks };
    }
    plan.circumferenceMm = Math.PI * diameter;
    const usable = input.geometry.filmUsableLengthMm;
    const overlap = p.planning.minimumFilmOverlapMm;
    if (input.geometry.filmWrapped && usable !== null && Number.isFinite(usable) && overlap !== null && usable > overlap && overlap > 0) {
        plan.filmSegments = Math.ceil(plan.circumferenceMm / (usable - overlap));
        checks.push({ code: 'FILM_SEGMENTS', status: 'green', message: `Minimaal ${plan.filmSegments} omgelegde filmsegment(en) voor volledige omtrek bij ${overlap} mm overlap. Controleer effectieve WAE-dekking en zichtbare overlapmarkeringen.` });
    }
    else {
        checks.push({ code: 'FILM_SEGMENTS', status: 'orange', message: 'Aantal filmsegmenten onbekend: omgelegde film, bruikbare lengte en vastgestelde overlap ontbreken.' });
    }
    const g = input.geometry;
    const rows = p.planning.approvedExposureRules.filter(r => r.class === p.class && r.technique === input.technique && r.sourcePlacement === g.sourcePlacement &&
        diameter >= r.minDiameterMm && diameter <= r.maxDiameterMm &&
        wall >= r.minWallMm && wall <= r.maxWallMm &&
        input.sfdMm >= r.minSfdMm && input.sfdMm <= r.maxSfdMm);
    if (rows.length === 1) {
        plan.minimumExposures = rows[0].minimumExposures;
        checks.push({ code: 'EXPOSURES', status: 'green', message: `Minimaal ${plan.minimumExposures} opnamen volgens bevestigde geometrische regel ${rows[0].reference}.` });
    }
    else if (rows.length === 0) {
        checks.push({ code: 'EXPOSURES', status: 'orange', message: 'Geen passende, goedgekeurde bijlage-A/geometrie-regel. Minimaal aantal belichtingen onbekend (10%/20% is hiervoor niet voldoende).' });
    }
    else {
        checks.push({ code: 'EXPOSURES_CONFLICT', status: 'red', message: 'Overlappende opnameregels: inconsistentie in procedure.' });
    }
    const maxW = input.maximumPathThicknessMm;
    const centralW = input.penetratedThicknessMm;
    if (maxW === null || centralW === null || !Number.isFinite(maxW) || !Number.isFinite(centralW) || centralW <= 0 || maxW < centralW) {
        checks.push({ code: 'PATH_VARIATION', status: 'orange', message: 'Doorstraalde dikte aan rand en in midden ontbreekt of is ongeldig: 10%/20%-controle kan niet slagen.' });
    }
    else {
        plan.maxThicknessIncreasePercent = (maxW / centralW - 1) * 100;
        const ok = plan.maxThicknessIncreasePercent <= plan.maxAllowedPercent + 1e-8;
        checks.push({ code: 'PATH_VARIATION', status: ok ? 'green' : 'red', message: `Berekende diktetoename ${plan.maxThicknessIncreasePercent.toFixed(2)}% (grens klasse ${p.class}: ${plan.maxAllowedPercent}%).` });
    }
    return { plan, checks };
}
/** ISO 17636-1:2022 section 7.6 (general configuration; not a full norm-compliance verdict). */
export function evaluateSourceObjectGeometry(input, p) {
    const d = input.geometry.sourceSizeMm;
    const measuredB = input.geometry.objectToFilmMm;
    const inferredB = measuredB === null;
    const b = inferredB ? input.penetratedThicknessMm : measuredB;
    if (d === null || b === null || !Number.isFinite(d) || !Number.isFinite(b) || d <= 0 || b < 0) {
        return [{ code: 'SOD_GEOMETRY', status: 'orange', message: 'Bepalende bron-/focusgrootte d en object-film-afstand b vereist voor ISO 7.6.' }];
    }
    const f = input.sfdMm - b;
    if (!(f > 0))
        return [{ code: 'SOD_GEOMETRY', status: 'red', message: 'SFD moet groter zijn dan object-film-afstand b (f = SFD − b).' }];
    const classForGeom = p.class === 'B' || p.planarDefectsRequired ? 'B' : 'A';
    const effectiveB = b < 1.2 * input.thicknessMm ? input.thicknessMm : b;
    const fMin = (classForGeom === 'B' ? 15 : 7.5) * d * Math.pow(effectiveB, 2 / 3);
    const satisfies = f >= fMin - 1e-8;
    const status = satisfies ? (inferredB ? 'orange' : 'green') : 'red';
    return [{ code: 'SOD_GEOMETRY', status, message: `ISO 7.6: f=${f.toFixed(1)} mm; vereist ≥ ${fMin.toFixed(1)} mm voor geometrieklasse ${classForGeom}${p.class === 'A' && p.planarDefectsRequired ? ' (vlakke defecten)' : ''}. d=${d} mm, b effectief=${effectiveB.toFixed(1)} mm.${inferredB ? ' b = w voorlopig aangenomen bij film tegen het object; bevestig de werkelijke afstand vóór vrijgave.' : ''} Controleer eventuele toepasselijke speciale geometrieën/uitzonderingen.` }];
}
