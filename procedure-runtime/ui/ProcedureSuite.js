import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_SOURCES, ALL_FILMS, ALL_TECHNIQUES, newId, validateProfile } from '../domain/validation.js';
import { parseProcedureDocument } from '../parser/parseProcedureDocument.js';
import { evaluateExposurePlan } from '../engine/evaluateExposurePlan.js';
import { applyPlannerInputs, applyPlannerShape, applySourceSelection } from '../planning/plannerInput.js';
import { listProcedures, loadActiveProcedure, saveProcedure, deleteProcedure, setActiveProcedure, exportBackup, downloadBackup, importBackup, createSavedPlan, savePlan, listPlans, deletePlan } from '../storage/procedureStorage.js';
const blankDraft = () => ({ code: '', customer: '', revision: '', norm: 'ISO 17636-1:2022', class: 'B', planarDefectsRequired: false,
    sources: [], films: [], techniques: [], thickness: { minMm: Number.NaN, maxMm: Number.NaN }, density: { min: Number.NaN, max: Number.NaN },
    iqi: { side: 'source', extraFinerWires: 0, filmSideComparisonVerified: false, approvedRules: [] },
    planning: { minimumFilmOverlapMm: null, approvedExposureRules: [] }, source: { kind: 'text' } });
const baseInput = () => ({ source: 'Se-75', film: 'D4', technique: 'SWSI', thicknessMm: Number.NaN, penetratedThicknessMm: null, maximumPathThicknessMm: null, density: Number.NaN, sfdMm: Number.NaN, activityCi: undefined, model: '', kv: undefined, ma: undefined, material: 'Fe', iqiSide: 'source',
    geometry: { shape: 'plate', diameterMm: null, sourcePlacement: null, sourceSizeMm: null, objectToFilmMm: null, filmUsableLengthMm: null, filmWrapped: false } });
const num = (v) => v.trim() === '' ? null : Number(v.replace(',', '.'));
const value = (n) => n === null || n === undefined || !Number.isFinite(n) ? '' : String(n);
const fmt = (n) => n === null ? 'onbekend' : new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 }).format(n);
const friendlyStatus = { green: 'CONTROLE OK', orange: 'NOG TE CONTROLEREN', red: 'GEBLOKKEERD' };
const RESEARCHER_STORAGE_KEY = 'ndt-procedure-suite-confirming-researcher-v1';
const getSavedResearcher = () => {
    try {
        return typeof window === 'undefined' ? '' : (window.localStorage.getItem(RESEARCHER_STORAGE_KEY) ?? '');
    }
    catch {
        return '';
    }
};
const optionLabel = (item) => ({
    source: 'Bronzijde (Source)', film: 'Filmzijde (Film)', either: 'Beide zijden',
    plate: 'Vlakke plaat', pipe: 'Pijp / Rondlas',
    nominal: 'Nominale dikte', penetrated: 'Doorstraalde dikte',
    'DWDI-ELLIPSE': 'DWDI ellips', 'internal-central': 'Centraal binnen',
    external: 'Buitenzijde', 'internal-offset': 'Excentrisch binnen',
    onbekend: 'Onbekend'
}[item] ?? item);
/** Grote selecteerknoppen; selectiewaarde blijft de ongewijzigde interne code. */
function CheckGroup({ label, items, selected, onChange }) {
    return React.createElement("fieldset", { className: "ndt-choice-group ndt-multi" },
        React.createElement("legend", null,
            label,
            " ",
            React.createElement("small", null, "(meerdere mogelijk)")),
        React.createElement("div", { className: `ndt-option-grid ${items.length === 6 ? 'ndt-options-film' : ''}` }, items.map(item => React.createElement("button", { key: item, type: "button", className: "ndt-option-button", "aria-pressed": selected.includes(item), onClick: () => onChange(selected.includes(item) ? selected.filter(x => x !== item) : [...selected, item]) }, optionLabel(item)))));
}
function ChoiceGroup({ label, items, selected, onChange }) {
    return React.createElement("fieldset", { className: "ndt-choice-group ndt-wide" },
        React.createElement("legend", null, label),
        React.createElement("div", { className: `ndt-option-grid ${items.length === 6 ? 'ndt-options-film' : ''} ${items.length === 2 ? 'ndt-options-two' : ''}` }, items.map(item => React.createElement("button", { key: item, type: "button", className: "ndt-option-button", "aria-pressed": selected === item, onClick: () => onChange(item) }, optionLabel(item)))));
}
/** Bewaart het getypte decimaalteken tijdens invoer op iPhone, bijvoorbeeld '2,' of '3.'. */
function FloatField({ label, value: current, onChange, allowEmpty = false, placeholder }) {
    const [display, setDisplay] = useState(() => value(current));
    const lastEmitted = useRef(current);
    useEffect(() => {
        if (Object.is(lastEmitted.current, current))
            return;
        lastEmitted.current = current;
        setDisplay(value(current));
    }, [current]);
    return React.createElement("label", { className: "ndt-field" },
        React.createElement("span", null, label),
        React.createElement("input", { type: "text", inputMode: "decimal", autoComplete: "off", placeholder: placeholder ?? 'Bijv. 2.0', value: display, onChange: e => {
                const next = e.target.value;
                setDisplay(next);
                const parsed = num(next);
                const normalized = parsed === null ? (allowEmpty ? null : Number.NaN) : parsed;
                lastEmitted.current = normalized;
                onChange(normalized);
            } }));
}
function SelectField({ label, options, selected, onChange }) {
    return React.createElement("label", { className: "ndt-field" },
        React.createElement("span", null, label),
        React.createElement("select", { value: selected, onChange: e => onChange(e.target.value) }, options.map(o => React.createElement("option", { key: o, value: o }, optionLabel(o)))));
}
function IqiRulesEditor({ rows, onChange }) {
    const patch = (idx, p) => onChange(rows.map((r, i) => i === idx ? { ...r, ...p } : r));
    return React.createElement("details", { className: "ndt-detail" },
        React.createElement("summary", null,
            "IQI-regels \u2014 door Level 3 gecontroleerde normtabellen (",
            rows.length,
            ")"),
        React.createElement("p", { className: "ndt-help" }, "Leg per techniek, klasse, zijde en diktegebied de vereiste W-draad vast. Geen standaardwaarden worden gegokt. Bij dubbelwandige opnamen is de doorstraalde dikte doorgaans bepalend; kies de juiste tabel."),
        rows.map((r, i) => React.createElement("div", { className: "ndt-rule", key: r.id },
            React.createElement("div", { className: "ndt-grid" },
                React.createElement(SelectField, { label: "Techniek", options: ALL_TECHNIQUES, selected: r.technique, onChange: v => patch(i, { technique: v }) }),
                React.createElement(SelectField, { label: "Klasse", options: ['A', 'B'], selected: r.class, onChange: v => patch(i, { class: v }) }),
                React.createElement(SelectField, { label: "IQI-zijde", options: ['source', 'film'], selected: r.side, onChange: v => patch(i, { side: v }) }),
                React.createElement(SelectField, { label: "Diktebasis", options: ['nominal', 'penetrated'], selected: r.basis, onChange: v => patch(i, { basis: v }) }),
                React.createElement(FloatField, { label: "Boven (mm), exclusief", value: r.aboveMm, onChange: v => patch(i, { aboveMm: v ?? 0 }) }),
                React.createElement(FloatField, { label: "Tot en met (mm)", value: r.upToMm, onChange: v => patch(i, { upToMm: v ?? 0 }) }),
                React.createElement(FloatField, { label: "Vereist draadnummer W", value: r.wireNumber, onChange: v => patch(i, { wireNumber: v ?? 0 }) }),
                React.createElement("label", { className: "ndt-field" },
                    React.createElement("span", null, "Bron, tabel en revisie"),
                    React.createElement("input", { value: r.reference, onChange: e => patch(i, { reference: e.target.value }) }))),
            React.createElement("button", { type: "button", className: "ndt-secondary", onClick: () => onChange(rows.filter((_, j) => j !== i)) }, "Regel verwijderen"))),
        React.createElement("button", { type: "button", className: "ndt-secondary", onClick: () => onChange([...rows, { id: newId(), technique: 'SWSI', side: 'source', class: 'B', basis: 'nominal', aboveMm: 0, upToMm: 0, wireNumber: 0, reference: '' }]) }, "+ IQI-regel toevoegen"));
}
function ShotRulesEditor({ rows, onChange }) {
    const patch = (idx, p) => onChange(rows.map((r, i) => i === idx ? { ...r, ...p } : r));
    return React.createElement("details", { className: "ndt-detail" },
        React.createElement("summary", null,
            "Goedgekeurde opnameaantallen (bijlage A / geometrie) (",
            rows.length,
            ")"),
        React.createElement("p", { className: "ndt-help" }, "Vul uitsluitend een door jou geverifieerde minimumwaarde met bijbehorende geldigheidsgrenzen in. De 10%/20%-regel levert niet zelfstandig een opnameaantal op."),
        rows.map((r, i) => React.createElement("div", { className: "ndt-rule", key: r.id },
            React.createElement("div", { className: "ndt-grid" },
                React.createElement(SelectField, { label: "Techniek", options: ALL_TECHNIQUES, selected: r.technique, onChange: v => patch(i, { technique: v }) }),
                React.createElement(SelectField, { label: "Klasse", options: ['A', 'B'], selected: r.class, onChange: v => patch(i, { class: v }) }),
                React.createElement(SelectField, { label: "Bronpositie", options: ['internal-central', 'external', 'internal-offset'], selected: r.sourcePlacement, onChange: v => patch(i, { sourcePlacement: v }) }),
                [['minDiameterMm', 'Ø vanaf mm'], ['maxDiameterMm', 'Ø tot mm'], ['minWallMm', 't vanaf mm'], ['maxWallMm', 't tot mm'], ['minSfdMm', 'SFD vanaf mm'], ['maxSfdMm', 'SFD tot mm'], ['minimumExposures', 'Minimaal aantal opnamen']].map(([k, label]) => React.createElement(FloatField, { key: k, label: label, value: r[k], onChange: v => patch(i, { [k]: v ?? 0 }) })),
                React.createElement("label", { className: "ndt-field" },
                    React.createElement("span", null, "Herkomst (bijlage A / goedgekeurde tabel)"),
                    React.createElement("input", { value: r.reference, onChange: e => patch(i, { reference: e.target.value }) }))),
            React.createElement("button", { type: "button", className: "ndt-secondary", onClick: () => onChange(rows.filter((_, j) => j !== i)) }, "Regel verwijderen"))),
        React.createElement("button", { type: "button", className: "ndt-secondary", onClick: () => onChange([...rows, { id: newId(), technique: 'SWSI', class: 'B', minDiameterMm: 0, maxDiameterMm: 0, minWallMm: 0, maxWallMm: 0, minSfdMm: 0, maxSfdMm: 0, minimumExposures: 0, sourcePlacement: 'external', reference: '' }]) }, "+ Opnameregel toevoegen"));
}
export function ProcedureSuite({ calculateExposure }) {
    const [tab, setTab] = useState('read');
    const [draft, setDraft] = useState(blankDraft);
    const [parsing, setParsing] = useState(null);
    const [paste, setPaste] = useState('');
    const [who, setWho] = useState(getSavedResearcher);
    const [ack, setAck] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [sourceFile, setSourceFile] = useState(null);
    const [procedures, setProcedures] = useState([]);
    const [active, setActive] = useState(null);
    const [plans, setPlans] = useState([]);
    const [planName, setPlanName] = useState('');
    const [input, setInput] = useState(baseInput);
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [readyToPlan, setReadyToPlan] = useState(false);
    const savedBanner = useRef(null);
    useEffect(() => { if (readyToPlan && tab === 'library')
        savedBanner.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [readyToPlan, tab]);
    const patch = (data) => setDraft(old => ({ ...old, ...data }));
    const changeInput = (data) => { setResult(null); setInput(old => applyPlannerInputs(old, data)); };
    const changeSource = (source) => { setResult(null); setInput(old => applySourceSelection(old, source)); };
    const changeShape = (shape) => { setResult(null); setInput(old => applyPlannerShape(old, shape)); };
    const changeGeometry = (data) => { setResult(null); setInput(old => ({ ...old, geometry: { ...old.geometry, ...data } })); };
    const refresh = async () => { const [all, act, hist] = await Promise.all([listProcedures(), loadActiveProcedure(), listPlans()]); setProcedures(all); setActive(act); setPlans(hist); };
    useEffect(() => { refresh().catch(err => setError(String(err))); }, []);
    useEffect(() => { if (active) {
        changeInput({ source: active.sources[0] ?? 'Se-75', film: active.films[0] ?? 'D4', technique: active.techniques[0] ?? 'SWSI', iqiSide: active.iqi.side === 'either' ? 'source' : active.iqi.side });
    } }, [active?.id]);
    const currentValidations = useMemo(() => {
        if (!draft)
            return [];
        return validateProfile({ ...draft, id: editingId ?? 'temporary', schemaVersion: 1, confirmedBy: who || 'onderzoeker', confirmedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }, [draft, who, editingId]);
    const parse = async () => {
        setBusy(true);
        setError('');
        setMessage('');
        setReadyToPlan(false);
        try {
            if (!sourceFile && !paste.trim())
                throw Error('Kies eerst een bestand of plak proceduretekst.');
            const p = await parseProcedureDocument(sourceFile ?? paste);
            setParsing(p);
            setDraft({ ...blankDraft(), ...p.candidate, source: p.source });
            setEditingId(null);
            setAck(false);
            setMessage('Tekst geanalyseerd. Controleer ALLE velden en bevestig handmatig.');
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setBusy(false);
        }
    };
    const save = async () => {
        setError('');
        setMessage('');
        setReadyToPlan(false);
        try {
            if (!ack)
                throw Error('Vink eerst aan dat je alle procedurevelden met het originele document hebt vergeleken.');
            if (!who.trim())
                throw Error('Naam van de bevestigende onderzoeker ontbreekt.');
            const old = editingId ? procedures.find(p => p.id === editingId) : null;
            const now = new Date().toISOString();
            const profile = { ...draft, schemaVersion: 1, id: editingId ?? newId(), confirmedBy: who.trim(), confirmedAt: now,
                createdAt: old?.createdAt ?? now, updatedAt: now, source: draft.source ?? { kind: 'text' } };
            await saveProcedure(profile);
            // De zojuist bevestigde procedure moet ook degene zijn die het opnameplan controleert.
            await setActiveProcedure(profile.id);
            await refresh();
            setEditingId(null);
            setTab('library');
            try {
                window.localStorage.setItem(RESEARCHER_STORAGE_KEY, who.trim());
            }
            catch { /* Browser kan opslag blokkeren. */ }
            setReadyToPlan(true);
            setMessage('Procedure bevestigd en lokaal opgeslagen. Ontbrekende IQI-/opnametabellen blijven onbekend totdat ze gecontroleerd zijn toegevoegd.');
        }
        catch (e) {
            setError(String(e));
        }
    };
    const edit = (p) => {
        const { id, schemaVersion, confirmedBy, confirmedAt, createdAt, updatedAt, ...rest } = p;
        setDraft(structuredClone(rest));
        setWho(confirmedBy);
        setEditingId(id);
        setAck(false);
        setParsing(null);
        setReadyToPlan(false);
        setTab('read');
        setMessage('Bewerk en bevestig opnieuw.');
        setError('');
    };
    const importJson = async (file) => {
        setError('');
        try {
            const counts = await importBackup(await file.text());
            await refresh();
            setMessage(`${counts.procedures} procedures en ${counts.plans} logboekrecords geïmporteerd. De actieve procedure is niet omgeschakeld.`);
        }
        catch (e) {
            setError(String(e));
        }
    };
    const evaluate = async () => {
        setError('');
        setMessage('');
        setResult(null);
        if (!active) {
            setError('Selecteer eerst een bevestigde procedure.');
            return;
        }
        setBusy(true);
        try {
            setResult(await evaluateExposurePlan(input, active, calculateExposure));
        }
        catch (e) {
            setError(String(e));
        }
        finally {
            setBusy(false);
        }
    };
    const confirmDelete = async (id, kind) => {
        if (!window.confirm(`Weet je zeker dat je dit ${kind === 'plan' ? 'opnameplan' : 'procedureprofiel'} wilt verwijderen?`))
            return;
        try {
            if (kind === 'plan')
                await deletePlan(id);
            else
                await deleteProcedure(id);
            await refresh();
            setResult(null);
        }
        catch (e) {
            setError(String(e));
        }
    };
    return React.createElement("div", { className: "ndt-suite" },
        React.createElement("header", { className: "ndt-suite-header" },
            React.createElement("div", null,
                React.createElement("p", { className: "ndt-overline" }, "NDT RADIOGRAPHY PRO"),
                React.createElement("h2", null, "Procedure Suite"),
                React.createElement("p", { className: "ndt-help" }, "Procedurecontroles \u00B7 rekenmotor ongewijzigd")),
            React.createElement("span", { className: "ndt-chip" }, "Onderzoeksversie")),
        React.createElement("nav", { className: "ndt-tabs", "aria-label": "Procedure-suite modules" }, [['read', 'Uitlezer'], ['library', 'Bibliotheek'], ['planner', 'Opnameplan'], ['history', 'Logboek']].map(([k, label]) => React.createElement("button", { key: k, className: tab === k ? 'is-active' : '', type: "button", onClick: () => { setTab(k); setReadyToPlan(false); setError(''); setMessage(''); } }, label))),
        error && React.createElement("div", { role: "alert", className: "ndt-alert ndt-red" }, error),
        message && React.createElement("div", { ref: savedBanner, role: "status", className: `ndt-alert ndt-green ${readyToPlan ? 'ndt-save-success' : ''}` },
            React.createElement("span", null, message),
            readyToPlan && React.createElement("button", { className: "ndt-continue", type: "button", onClick: () => { setTab('planner'); setReadyToPlan(false); setMessage(''); setResult(null); } }, "Verder naar Opnameplan \u2192")),
        tab === 'read' && React.createElement("section", { className: "ndt-card", "aria-label": "Procedure-uitlezer en bevestiging" },
            React.createElement("h3", null, "1. Procedure uitlezen"),
            React.createElement("label", { className: "ndt-field" },
                React.createElement("span", null, "PDF, DOCX of TXT"),
                React.createElement("input", { type: "file", accept: ".pdf,.docx,.txt,application/pdf", onChange: e => { setSourceFile(e.target.files?.[0] ?? null); } })),
            React.createElement("label", { className: "ndt-field" },
                React.createElement("span", null, "Of plak de volledige proceduretekst"),
                React.createElement("textarea", { rows: 5, value: paste, onChange: e => { setPaste(e.target.value); if (e.target.value)
                        setSourceFile(null); }, placeholder: "Procedurecode: RT-001\nKlant: ...\nRevisie: ..." })),
            React.createElement("button", { type: "button", disabled: busy, onClick: parse }, busy ? 'Uitlezen…' : 'Procedure automatisch uitlezen'),
            parsing && React.createElement("details", { className: "ndt-detail", open: true },
                React.createElement("summary", null, "Uitgelezen gegevens en ontbrekende velden"),
                React.createElement("div", { className: "ndt-alert ndt-orange" }, "Automatische tekstherkenning is niet voldoende voor normvrijgave. Verifieer alle waarden in het originele document."),
                parsing.warnings.map((w, i) => React.createElement("p", { key: i, className: "ndt-help" },
                    "\u26A0 ",
                    w)),
                Object.entries(parsing.evidence).map(([k, ev]) => React.createElement("details", { key: k },
                    React.createElement("summary", null,
                        "Bronfragment: ",
                        k,
                        " (",
                        ev.length,
                        ")"),
                    ev.map((e, i) => React.createElement("p", { key: i, className: "ndt-help" },
                        "Regel ",
                        e.line,
                        ": ",
                        e.quote))))),
            React.createElement("h3", null, "2. Verplicht controlescherm \u2014 alle velden corrigeerbaar"),
            React.createElement("div", { className: "ndt-grid" },
                [['code', 'Procedurecode / documentnummer'], ['customer', 'Klantnaam'], ['revision', 'Revisie']].map(([k, label]) => React.createElement("label", { key: k, className: "ndt-field" },
                    React.createElement("span", null, label),
                    React.createElement("input", { value: String(draft[k] ?? ''), onChange: e => patch({ [k]: e.target.value }) }))),
                React.createElement("label", { className: "ndt-field" },
                    React.createElement("span", null, "Norm"),
                    React.createElement("input", { readOnly: true, value: "ISO 17636-1:2022", title: "Deze versie ondersteunt alleen ISO filmradiografie" })),
                React.createElement(ChoiceGroup, { label: "Testklasse", items: ['A', 'B'], selected: draft.class ?? 'B', onChange: v => patch({ class: v }) }),
                React.createElement("label", { className: "ndt-check ndt-wide" },
                    React.createElement("input", { type: "checkbox", checked: draft.planarDefectsRequired ?? false, onChange: e => patch({ planarDefectsRequired: e.target.checked }) }),
                    "Vlakke defecten relevant: geometrie van klasse B verplicht, ook bij testklasse A")),
            React.createElement(CheckGroup, { label: "Toegestane stralingsbronnen", items: ALL_SOURCES, selected: draft.sources ?? [], onChange: v => patch({ sources: v }) }),
            React.createElement(CheckGroup, { label: "Toegestane filmtypes", items: ALL_FILMS, selected: draft.films ?? [], onChange: v => patch({ films: v }) }),
            React.createElement(CheckGroup, { label: "Toegestane technieken", items: ALL_TECHNIQUES, selected: draft.techniques ?? [], onChange: v => patch({ techniques: v }) }),
            React.createElement("div", { className: "ndt-grid" },
                React.createElement(FloatField, { label: "Minimale wanddikte (mm)", value: draft.thickness?.minMm, placeholder: "Bijv. 2.0", onChange: v => patch({ thickness: { ...draft.thickness, minMm: v ?? Number.NaN } }) }),
                React.createElement(FloatField, { label: "Maximale wanddikte (mm)", value: draft.thickness?.maxMm, placeholder: "Bijv. 35.0", onChange: v => patch({ thickness: { ...draft.thickness, maxMm: v ?? Number.NaN } }) }),
                React.createElement(FloatField, { label: "Minimale zwarting D", value: draft.density?.min, placeholder: "Bijv. 2.0", onChange: v => patch({ density: { ...draft.density, min: v ?? Number.NaN } }) }),
                React.createElement(FloatField, { label: "Maximale zwarting D", value: draft.density?.max, placeholder: "Bijv. 3.5", onChange: v => patch({ density: { ...draft.density, max: v ?? Number.NaN } }) }),
                React.createElement(ChoiceGroup, { label: "IQI-zijde", items: ['source', 'film', 'either'], selected: draft.iqi?.side ?? 'source', onChange: v => patch({ iqi: { ...draft.iqi, side: v } }) }),
                React.createElement(FloatField, { label: "Extra fijnere draden t.o.v. tabel", value: draft.iqi?.extraFinerWires, onChange: v => patch({ iqi: { ...draft.iqi, extraFinerWires: v ?? 0 } }) }),
                React.createElement(FloatField, { label: "Minimale filmoverlap (mm), indien bekend", value: draft.planning?.minimumFilmOverlapMm, onChange: v => patch({ planning: { ...draft.planning, minimumFilmOverlapMm: v } }), allowEmpty: true }),
                React.createElement("label", { className: "ndt-check" },
                    React.createElement("input", { type: "checkbox", checked: draft.iqi?.filmSideComparisonVerified ?? false, onChange: e => patch({ iqi: { ...draft.iqi, filmSideComparisonVerified: e.target.checked } }) }),
                    "Filmzijde-IQI vergelijkingsopname/afspraak gecontroleerd")),
            React.createElement(IqiRulesEditor, { rows: draft.iqi?.approvedRules ?? [], onChange: rows => patch({ iqi: { ...draft.iqi, approvedRules: rows } }) }),
            React.createElement(ShotRulesEditor, { rows: draft.planning?.approvedExposureRules ?? [], onChange: rows => patch({ planning: { ...draft.planning, approvedExposureRules: rows } }) }),
            currentValidations.length > 0 && React.createElement("div", { className: "ndt-alert ndt-orange" },
                React.createElement("strong", null, "Controleer voor opslag:"),
                currentValidations.map((e, i) => React.createElement("p", { key: i }, e))),
            React.createElement("label", { className: "ndt-field" },
                React.createElement("span", null, "Naam / personeelscode bevestigende onderzoeker"),
                React.createElement("input", { value: who, onChange: e => setWho(e.target.value), placeholder: "Naam of personeelscode", autoComplete: "name" })),
            React.createElement("p", { className: "ndt-help ndt-stored-note" }, "Wordt na succesvolle bevestiging onthouden op dit apparaat. Niet automatisch gedeeld."),
            React.createElement("label", { className: "ndt-check ndt-ack" },
                React.createElement("input", { type: "checkbox", checked: ack, onChange: e => setAck(e.target.checked) }),
                "Ik heb alle velden en proceduregrenzen met het originele document vergeleken. Deze opslag is geen automatische normgoedkeuring."),
            React.createElement("button", { type: "button", disabled: busy || !ack || currentValidations.length > 0, onClick: save }, "Procedure bevestigen & opslaan")),
        tab === 'library' && React.createElement("section", { className: "ndt-card" },
            React.createElement("h3", null, "Procedure-Bibliotheek"),
            React.createElement("div", { className: "ndt-actions" },
                React.createElement("button", { type: "button", onClick: () => { setDraft(blankDraft()); setEditingId(null); setParsing(null); setAck(false); setReadyToPlan(false); setTab('read'); } }, "+ Nieuwe procedure"),
                React.createElement("button", { className: "ndt-secondary", type: "button", onClick: () => { exportBackup().then(downloadBackup).catch(e => setError(String(e))); } }, "Export JSON-back-up"),
                React.createElement("label", { className: "ndt-file-import" },
                    "Import JSON",
                    React.createElement("input", { type: "file", accept: ".json,application/json", onChange: e => { const file = e.target.files?.[0]; if (file)
                            void importJson(file); e.target.value = ''; } }))),
            procedures.length === 0 ? React.createElement("p", { className: "ndt-help" }, "Nog geen bevestigde procedures opgeslagen.") : procedures.map(p => React.createElement("article", { className: "ndt-library-item", key: p.id },
                React.createElement("div", null,
                    React.createElement("strong", null,
                        p.customer,
                        " \u00B7 ",
                        p.code),
                    React.createElement("p", null,
                        "Rev. ",
                        p.revision,
                        " \u00B7 ISO klasse ",
                        p.class,
                        " \u00B7 bevestigd door ",
                        p.confirmedBy),
                    React.createElement("small", null,
                        p.sources.join(' / '),
                        " \u00B7 ",
                        p.techniques.join(' / '))),
                active?.id === p.id && React.createElement("span", { className: "ndt-chip" }, "Actieve procedure"),
                React.createElement("div", { className: "ndt-actions" },
                    React.createElement("button", { type: "button", className: "ndt-secondary", disabled: active?.id === p.id, onClick: async () => { await setActiveProcedure(p.id); await refresh(); setResult(null); } }, "Activeren"),
                    React.createElement("button", { type: "button", className: "ndt-secondary", onClick: () => edit(p) }, "Bewerken"),
                    React.createElement("button", { type: "button", className: "ndt-secondary ndt-danger", onClick: () => void confirmDelete(p.id, 'profile') }, "Verwijderen"))))),
        tab === 'planner' && React.createElement("section", { className: "ndt-card ndt-planner-card" },
            React.createElement("h3", null, "Opnameplan + bestaande belichtingsmotor"),
            React.createElement("p", { className: "ndt-help" },
                "Actief: ",
                React.createElement("strong", null, active ? `${active.customer} / ${active.code} rev. ${active.revision}` : 'geen procedure gekozen'),
                ". De bestaande motor berekent de belichtingstijd ongewijzigd."),
            React.createElement("div", { className: "ndt-grid ndt-planner-grid" },
                React.createElement(ChoiceGroup, { label: "Bron / toestel", items: ALL_SOURCES, selected: input.source, onChange: changeSource }),
                React.createElement(ChoiceGroup, { label: "Werkstuk", items: ['plate', 'pipe'], selected: input.geometry.shape ?? 'pipe', onChange: changeShape }),
                React.createElement(ChoiceGroup, { label: "Filmtype", items: ALL_FILMS, selected: input.film, onChange: v => changeInput({ film: v }) }),
                React.createElement(ChoiceGroup, { label: "Opnametechniek", items: ALL_TECHNIQUES, selected: input.technique, onChange: v => changeInput({ technique: v }) }),
                React.createElement(ChoiceGroup, { label: "IQI-positie", items: ['source', 'film'], selected: input.iqiSide, onChange: v => changeInput({ iqiSide: v }) }),
                React.createElement(FloatField, { label: "Wanddikte t (mm)", value: input.thicknessMm, placeholder: "Bijv. 10.0", onChange: v => changeInput({ thicknessMm: v ?? Number.NaN }) }),
                React.createElement("div", { className: "ndt-field ndt-derived-field", role: "group", "aria-label": "Automatisch berekende nominale doorstraalde dikte" },
                    React.createElement("span", null, "Doorstraalde dikte w (mm) \u00B7 automatisch"),
                    React.createElement("output", { "aria-live": "polite", className: "ndt-derived-value" }, value(input.penetratedThicknessMm) ? `${value(input.penetratedThicknessMm)} mm` : 'Vul wanddikte t in'),
                    React.createElement("small", null,
                        input.technique === 'SWSI' ? 'SWSI: 1 × t' : 'DWSI / DWDI: 2 × t',
                        " \u00B7 nominale benadering")),
                React.createElement(FloatField, { label: "Zwarting D", value: input.density, placeholder: "Bijv. 2.5", onChange: v => changeInput({ density: v ?? Number.NaN }) }),
                React.createElement(FloatField, { label: "Bron-film-afstand SFD (mm)", value: input.sfdMm, placeholder: "Bijv. 800", onChange: v => changeInput({ sfdMm: v ?? Number.NaN }) }),
                input.source === 'X-ray' ? React.createElement(React.Fragment, null,
                    React.createElement("label", { className: "ndt-field" },
                        React.createElement("span", null, "R\u00F6ntgenapparaat / model"),
                        React.createElement("input", { value: input.model ?? '', placeholder: "Bijv. toestelmodel", onChange: e => changeInput({ model: e.target.value }) })),
                    React.createElement(FloatField, { label: "R\u00F6ntgenspanning (kV)", value: input.kv, placeholder: "Bijv. 160", onChange: v => changeInput({ kv: v ?? undefined }), allowEmpty: true }),
                    React.createElement(FloatField, { label: "Buisstroom (mA)", value: input.ma, placeholder: "Bijv. 5.0", onChange: v => changeInput({ ma: v ?? undefined }), allowEmpty: true })) : React.createElement(FloatField, { label: "Bronactiviteit (Ci)", value: input.activityCi, placeholder: "Bijv. 40.0", onChange: v => changeInput({ activityCi: v ?? undefined }), allowEmpty: true }),
                React.createElement(FloatField, { label: "Maximale doorstraalde dikte aan rand (mm)", value: input.maximumPathThicknessMm, placeholder: "Bijv. 22.0", onChange: v => changeInput({ maximumPathThicknessMm: v }), allowEmpty: true }),
                input.geometry.shape === 'pipe' && React.createElement(React.Fragment, null,
                    React.createElement(FloatField, { label: "Pijpbuitendiameter \u00D8 (mm)", value: input.geometry.diameterMm, placeholder: "Bijv. 114.3", onChange: v => changeGeometry({ diameterMm: v }), allowEmpty: true }),
                    React.createElement(SelectField, { label: "Bronpositie", options: ['onbekend', 'internal-central', 'external', 'internal-offset'], selected: input.geometry.sourcePlacement ?? 'onbekend', onChange: v => changeGeometry({ sourcePlacement: v === 'onbekend' ? null : v }) }),
                    React.createElement(FloatField, { label: "Bruikbare filmlengte langs omtrek (mm)", value: input.geometry.filmUsableLengthMm, placeholder: "Bijv. 300", onChange: v => changeGeometry({ filmUsableLengthMm: v }), allowEmpty: true }),
                    React.createElement("label", { className: "ndt-check ndt-wide" },
                        React.createElement("input", { type: "checkbox", checked: input.geometry.filmWrapped, onChange: e => changeGeometry({ filmWrapped: e.target.checked }) }),
                        "Film volgt de buisomtrek (omgelegde film)")),
                React.createElement(FloatField, { label: "Bron-/focusgrootte d, grootste afmeting (mm)", value: input.geometry.sourceSizeMm, placeholder: "Bijv. 2.5", onChange: v => changeGeometry({ sourceSizeMm: v }), allowEmpty: true }),
                React.createElement(FloatField, { label: "Object-film-afstand b (mm)", value: input.geometry.objectToFilmMm, placeholder: "Bijv. 10.0", onChange: v => changeGeometry({ objectToFilmMm: v }), allowEmpty: true })),
            React.createElement("p", { className: "ndt-help ndt-w-caution" },
                "Let op: w = t of 2 \u00D7 t is alleen een ",
                React.createElement("strong", null, "nominale schatting"),
                " voor de procedure-/IQI-controles. Bij schuine, excentrische en elliptische opnamen kan de werkelijke stralingsweg afwijken. Controleer deze afzonderlijk. De belichtingsmotor blijft de oorspronkelijke wanddikte t gebruiken."),
            result && React.createElement("div", { className: "ndt-output", "aria-live": "polite" },
                React.createElement("div", { className: `ndt-bigstatus ndt-${result.status}` },
                    friendlyStatus[result.status],
                    " ",
                    React.createElement("small", null, "(alleen procedurecontroles)")),
                React.createElement("div", { className: "ndt-kpis" },
                    React.createElement("p", null,
                        React.createElement("small", null, "Belichtingstijd"),
                        React.createElement("strong", null, result.exposure?.ok && Number.isFinite(result.exposure.minutes) ? `${Math.round(result.exposure.minutes * 60)} s` : 'Niet beschikbaar')),
                    React.createElement("p", null,
                        React.createElement("small", null, "Filmsegmenten"),
                        React.createElement("strong", null, input.geometry.shape === 'plate' ? 'n.v.t. (plaat)' : fmt(result.filmPlan.filmSegments))),
                    React.createElement("p", null,
                        React.createElement("small", null, "Min. opnamen"),
                        React.createElement("strong", null, fmt(result.filmPlan.minimumExposures))),
                    React.createElement("p", null,
                        React.createElement("small", null, "Vereiste IQI"),
                        React.createElement("strong", null, result.iqi.wireNumber ? `W${result.iqi.wireNumber} (${result.iqi.wireDiameterMm} mm)` : 'Onbekend'))),
                React.createElement("p", { className: "ndt-help" },
                    "IQI-positie: ",
                    result.iqi.position === 'film' ? 'filmzijde' : 'bronzijde',
                    " \u00B7 Gemeten zichtbaarheid en daadwerkelijke filmdekking moeten apart worden beoordeeld."),
                React.createElement("ul", { className: "ndt-checklist" }, result.checks.map((c, i) => React.createElement("li", { key: `${c.code}-${i}`, className: `ndt-${c.status}` },
                    React.createElement("strong", null, c.status === 'red' ? 'STOP' : c.status === 'orange' ? 'CONTROLE' : 'OK'),
                    " ",
                    c.message))),
                React.createElement("label", { className: "ndt-field" },
                    React.createElement("span", null, "Logboeknaam"),
                    React.createElement("input", { value: planName, onChange: e => setPlanName(e.target.value), placeholder: "Project / lasnummer / opname-ID" })),
                React.createElement("button", { type: "button", disabled: !planName.trim(), onClick: async () => { try {
                        if (!active)
                            return;
                        await savePlan(createSavedPlan(planName, active, result));
                        setPlanName('');
                        await refresh();
                        setMessage('Opnameplan inclusief status en snapshot opgeslagen in het lokale logboek.');
                    }
                    catch (e) {
                        setError(String(e));
                    } } }, "Bewaar opnameplan in logboek")),
            React.createElement("div", { className: "ndt-planner-sticky", role: "group", "aria-label": "Berekening en procedurecontrole" },
                React.createElement("button", { className: "ndt-primary-calculate", type: "button", disabled: !active || busy, onClick: () => void evaluate() }, busy ? 'Controleren…' : 'Bereken met bestaande motor'),
                React.createElement("small", null, "Met procedurecontrole \u00B7 geen automatische RT-vrijgave"))),
        tab === 'history' && React.createElement("section", { className: "ndt-card" },
            React.createElement("h3", null, "Opnamelogboek / historie"),
            plans.length === 0 ? React.createElement("p", { className: "ndt-help" }, "Nog geen opnameplannen opgeslagen.") : plans.map(x => React.createElement("article", { className: "ndt-library-item", key: x.id },
                React.createElement("div", null,
                    React.createElement("strong", null, x.name),
                    React.createElement("p", null,
                        new Date(x.createdAt).toLocaleString('nl-NL'),
                        " \u00B7 ",
                        x.procedureSnapshot.code,
                        " rev. ",
                        x.procedureSnapshot.revision),
                    React.createElement("p", { className: `ndt-status-text ndt-${x.result.status}` }, friendlyStatus[x.result.status]),
                    React.createElement("p", null,
                        x.result.input.source,
                        " \u00B7 ",
                        x.result.input.film,
                        " \u00B7 t=",
                        x.result.input.thicknessMm,
                        " mm \u00B7 D=",
                        x.result.input.density,
                        " \u00B7 tijd=",
                        x.result.exposure?.ok && x.result.exposure.minutes !== undefined ? Math.round(x.result.exposure.minutes * 60) + ' s' : 'onbekend'),
                    React.createElement("p", null,
                        "Films: ",
                        fmt(x.result.filmPlan.filmSegments),
                        " \u00B7 Belichtingen: ",
                        fmt(x.result.filmPlan.minimumExposures),
                        " \u00B7 IQI: ",
                        x.result.iqi.wireNumber ? 'W' + x.result.iqi.wireNumber : 'onbekend')),
                React.createElement("button", { type: "button", className: "ndt-secondary ndt-danger", onClick: () => void confirmDelete(x.id, 'plan') }, "Verwijderen")))),
        React.createElement("footer", { className: "ndt-footer" }, "Opgeslagen gegevens blijven in IndexedDB op dit apparaat. Maak regelmatig een JSON-back-up. Deze module geeft geen automatische RT-procedurevrijgave of toestemming voor een werkelijke opname."));
}
