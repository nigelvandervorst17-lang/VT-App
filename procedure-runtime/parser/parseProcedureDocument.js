const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT = 1_000_000;
const MAX_PAGES = 180;
const maxQuote = 180;
const SOURCE_PATTERNS = [['Se-75', /\b(?:Se[\s-]?75|Selenium[\s-]?75)\b/gi], ['Ir-192', /\b(?:Ir[\s-]?192|Iridium[\s-]?192)\b/gi], ['X-ray', /\b(?:X[\s-]?ray|R[oö]ntgen|X[\s-]?stral(?:en|ing))\b/gi]];
const FILM_PATTERNS = [['D2', /\bD2\b/gi], ['D3', /\bD3\b/gi], ['D4', /\bD4\b/gi], ['D5', /\bD5\b/gi], ['D7', /\bD7\b/gi], ['D8', /\bD8\b/gi]];
const TECH_PATTERNS = [['SWSI', /\bSWSI\b/gi], ['DWSI', /\bDWSI\b/gi], ['DWDI-ELLIPSE', /\bDWDI(?:[\s-]?(?:ellips|ellipse|elliptic))?\b/gi]];
const dec = (s) => Number(s.replace(',', '.'));
const textMatches = (line, p) => { p.lastIndex = 0; return p.test(line); };
const recognizedValues = (line, patterns) => patterns.filter(([, p]) => textMatches(line, p)).map(([v]) => v);
/** Strict *suggestion-only* parser. It never declares that a document is approved. */
export function parseProcedureText(text, source = { kind: 'text' }) {
    if (typeof text !== 'string' || !text.trim())
        throw new Error('Geen leesbare proceduretekst gevonden');
    if (text.length > MAX_TEXT)
        throw new Error('Proceduretekst is te groot');
    const lines = text.split(/\r?\n/);
    const evidence = {};
    const warnings = [];
    const candidate = { source };
    const observations = {};
    const suggestedIqiRules = [];
    const add = (key, value, line, quote) => {
        (observations[key] ??= []).push({ value, line, quote: quote.trim().slice(0, maxQuote) });
    };
    lines.forEach((raw, index) => {
        const line = raw.replace(/\s+/g, ' ').trim();
        if (!line)
            return;
        const valueAfter = (rx) => line.match(rx)?.[1]?.trim() ?? null;
        const code = valueAfter(/^(?:procedure(?:code|nummer)?|document(?:nummer|code)?|proc(?:edure)?[\s-]?no\.?|doc(?:ument)?[\s-]?no\.?)\s*[:#=\-]\s*([\w./\- ]{2,70})$/i);
        if (code)
            add('code', code, index + 1, line);
        const customer = valueAfter(/^(?:klant(?:naam)?|customer|client|opdrachtgever)\s*[:=\-]\s*(.{2,100})$/i);
        if (customer)
            add('customer', customer, index + 1, line);
        const rev = valueAfter(/^(?:rev(?:ision|isie)?\.?|uitgave|versie)\s*[:=#\-]\s*([\w.\-]{1,30})$/i);
        if (rev)
            add('revision', rev, index + 1, line);
        if (/ISO\s*17636\s*[-–]\s*1\s*[:\-]?\s*2022/i.test(line))
            add('norm', 'ISO 17636-1:2022', index + 1, line);
        const classLine = /^(?:testklasse|keuringsklasse|testing\s*class|klasse|class)\s*[:=\-]?\s*([AB])\s*$/i.exec(line);
        if (classLine)
            add('class', classLine[1].toUpperCase(), index + 1, line);
        if (/(?:vlakke\s*(?:fouten|defecten)|planar\s*(?:imperfections|defects))\s*[:=\-]\s*(ja|nee|yes|no|vereist|niet vereist)/i.test(line)) {
            const m = line.match(/(?:vlakke\s*(?:fouten|defecten)|planar\s*(?:imperfections|defects))\s*[:=\-]\s*(ja|nee|yes|no|vereist|niet vereist)/i);
            add('planarDefectsRequired', /^(?:ja|yes|vereist)$/i.test(m[1]), index + 1, line);
        }
        // Match only *allowed* lists; mentions in narrative text are not permissions.
        if (/^(?:toegestane|allowed|permitted|gebruikte)\s+(?:isotopen|bronnen|sources|isotopes)\s*[:=\-]/i.test(line)) {
            const found = recognizedValues(line, SOURCE_PATTERNS);
            if (found.length)
                add('sources', found, index + 1, line);
        }
        if (/^(?:toegestane|allowed|permitted|gebruikte)\s+(?:film(?:types|soorten|s)?|films|film\s+types)\s*[:=\-]/i.test(line)) {
            const found = recognizedValues(line, FILM_PATTERNS);
            if (found.length)
                add('films', found, index + 1, line);
        }
        if (/^(?:toegestane|allowed|permitted|gebruikte)\s+(?:opname)?techniek(?:en|es)?\s*[:=\-]|^(?:allowed|permitted)\s+techniques\s*[:=\-]/i.test(line)) {
            const found = recognizedValues(line, TECH_PATTERNS);
            if (found.length)
                add('techniques', found, index + 1, line);
        }
        const thickness = line.match(/^(?:wanddikte(?:bereik)?|nominale\s*dikte|wall\s*thickness(?:\s*range)?)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:[-–—]|t(?:ot|o)|\.\.)\s*(\d+(?:[.,]\d+)?)\s*mm\b/i);
        if (thickness)
            add('thickness', { minMm: dec(thickness[1]), maxMm: dec(thickness[2]) }, index + 1, line);
        const density = line.match(/^(?:zwarting(?:svenster)?|optische\s*dichtheid|film\s*density|density)\s*[:=\-]?\s*(?:D\s*[=:]?\s*)?(\d+(?:[.,]\d+)?)\s*(?:[-–—]|t(?:ot|o)|\.\.)\s*(\d+(?:[.,]\d+)?)/i);
        if (density)
            add('density', { min: dec(density[1]), max: dec(density[2]) }, index + 1, line);
        const side = line.match(/^(?:IQI\s*(?:positie|plaatsing|zijde)|IQI\s*side)\s*[:=\-]?\s*(bronzijde|source\s*side|filmzijde|film\s*side|beide|either)/i);
        if (side)
            add('iqiSide', /^(?:bronzijde|source)/i.test(side[1]) ? 'source' : /^(?:filmzijde|film)/i.test(side[1]) ? 'film' : 'either', index + 1, line);
        const extra = line.match(/^(?:IQI\s*(?:extra|compensatie)|extra\s+(?:fijne\s*)?draden|extra\s+wires)\s*[:=\-]?\s*([0-5])\b/i);
        if (extra)
            add('extraFinerWires', Number(extra[1]), index + 1, line);
        const overlap = line.match(/^(?:minimale\s+overlap|min(?:imum)?\.?\s+filmoverlap|film\s*overlap)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*mm/i);
        if (overlap)
            add('minimumFilmOverlapMm', dec(overlap[1]), index + 1, line);
        // IQI rows are suggestions ONLY, and only when every dimension is explicit.
        // e.g. "IQI: klasse B SWSI bronzijde t 10-25 mm W12".
        if (/^IQI\b/i.test(line)) {
            const cls = line.match(/\b(?:klasse|class)\s*([AB])\b/i)?.[1]?.toUpperCase();
            const sides = /\b(?:bronzijde|source\s*side)\b/i.test(line) ? 'source' : /\b(?:filmzijde|film\s*side)\b/i.test(line) ? 'film' : null;
            const tech = recognizedValues(line, TECH_PATTERNS);
            const range = line.match(/\b(t|w)\s*[=:]?\s*(\d+(?:[.,]\d+)?)\s*(?:[-–—]|tot|to|\.\.)\s*(\d+(?:[.,]\d+)?)\s*mm\b/i);
            const wire = line.match(/\bW\s*(1[0-9]|[1-9])\b/i);
            if (cls && sides && tech.length === 1 && range && wire) {
                const t0 = dec(range[2]), t1 = dec(range[3]), w = Number(wire[1]);
                if (t0 >= 0 && t1 > t0) {
                    suggestedIqiRules.push({ id: `parsed-iqi-${index + 1}`, technique: tech[0], side: sides, class: cls,
                        basis: range[1].toLowerCase() === 'w' ? 'penetrated' : 'nominal', aboveMm: t0, upToMm: t1,
                        wireNumber: w, reference: `Proceduretekst regel ${index + 1} — BEVESTIG BRON: ${source.fileName ?? 'geplakt'}` });
                    add('iqiRulesSuggested', `W${w}, ${tech[0]}, klasse ${cls}, ${t0}-${t1} mm, ${sides}`, index + 1, line);
                }
            }
            else if (wire)
                warnings.push(`IQI W-vermelding regel ${index + 1} is onvolledig; eis niet automatisch ingesteld.`);
        }
    });
    const keys = Object.keys(observations);
    const effective = {};
    for (const k of keys) {
        const obs = observations[k];
        evidence[k] = obs.map(x => ({ quote: x.quote, line: x.line, confidence: 'medium' }));
        const unique = new Map(obs.map(x => [JSON.stringify(x.value), x.value]));
        if (unique.size === 1)
            effective[k] = obs[0].value;
        else
            warnings.push(`Tegenstrijdige waarden voor ${k} (regels ${obs.map(x => x.line).join(', ')}); handmatig bepalen`);
    }
    for (const [k, v] of Object.entries(effective)) {
        if (k === 'iqiSide' || k === 'extraFinerWires' || k === 'minimumFilmOverlapMm')
            continue;
        candidate[k] = v;
    }
    candidate.iqi = { side: effective.iqiSide ?? 'source', extraFinerWires: effective.extraFinerWires ?? 0, filmSideComparisonVerified: false, approvedRules: suggestedIqiRules };
    if (suggestedIqiRules.length)
        warnings.push(`${suggestedIqiRules.length} IQI-regels als VOORSTEL herkend; controleer elk bereik, zijde, klasse en normtabel bij de bevestiging.`);
    candidate.planning = { minimumFilmOverlapMm: effective.minimumFilmOverlapMm ?? null, approvedExposureRules: [] };
    const required = ['code', 'customer', 'revision', 'norm', 'class', 'planarDefectsRequired', 'sources', 'films', 'techniques', 'thickness', 'density'];
    for (const key of required)
        if (!(key in effective))
            warnings.push(`Niet ondubbelzinnig gevonden: ${key} — handmatig bevestigen`);
    warnings.push('IQI-tabellen en opnameaantallen worden NOOIT uit algemene tekst gegokt: vul alleen gecontroleerde regels in met bronreferentie.');
    if (!('iqiSide' in effective))
        warnings.push('IQI-positie niet ondubbelzinnig gevonden; bronzijde is alleen de invoerstandaard en moet handmatig worden bevestigd.');
    return { candidate, evidence, warnings, source };
}
async function digestFile(bytes) {
    if (typeof crypto === 'undefined' || !crypto.subtle)
        return undefined;
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function extractPdf(bytes) {
    // pdfjs-dist is loaded only for PDFs. Vite ?url bundles a same-version worker.
    const [pdfjs, worker] = await Promise.all([import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs'), Promise.resolve({ default: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs' })]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false });
    try {
        const pdf = await task.promise;
        if (pdf.numPages > MAX_PAGES)
            throw new Error(`PDF heeft meer dan ${MAX_PAGES} pagina's`);
        const pages = [];
        let total = 0;
        for (let i = 1; i <= pdf.numPages; i++) {
            const content = await (await pdf.getPage(i)).getTextContent();
            let out = '';
            let previousY = null;
            for (const item of content.items) {
                if (!('str' in item) || !item.str)
                    continue;
                const y = Array.isArray(item.transform) ? item.transform[5] : undefined;
                // pdf.js often omits EOL. Recover the visual line break from PDF coordinates.
                if (y !== undefined && previousY !== null && Math.abs(y - previousY) > 2)
                    out += '\n';
                out += item.str + (item.hasEOL ? '\n' : ' ');
                if (item.hasEOL)
                    previousY = null;
                else if (y !== undefined)
                    previousY = y;
            }
            pages.push(out);
            total += out.length + 1;
            if (total > MAX_TEXT)
                throw new Error('PDF-tekst is te groot');
        }
        return pages.join('\n');
    }
    finally {
        await task.destroy();
    }
}
async function extractDocx(bytes) {
    const loaded = await Promise.resolve({ default: globalThis.mammoth });
    const api = loaded;
    const extract = api.extractRawText ?? api.default?.extractRawText;
    if (typeof extract !== 'function')
        throw new Error('mammoth.extractRawText niet beschikbaar');
    const result = await extract({ arrayBuffer: bytes });
    if (result.messages?.length)
        console.info('Procedure DOCX tekst-extractie:', result.messages.map(m => m.message));
    return result.value;
}
export async function parseProcedureDocument(input) {
    if (typeof input === 'string')
        return parseProcedureText(input);
    if (input.size > MAX_FILE_BYTES)
        throw new Error('Bestand groter dan 20 MB');
    const fileName = input.name.slice(0, 150);
    const ext = fileName.toLowerCase().split('.').pop();
    let kind;
    if (ext === 'pdf')
        kind = 'pdf';
    else if (ext === 'docx')
        kind = 'docx';
    else if (ext === 'txt')
        kind = 'text';
    else
        throw new Error('Alleen .pdf, .docx en .txt ondersteund');
    const bytes = await input.arrayBuffer();
    const source = { kind, fileName, sha256: await digestFile(bytes) };
    const text = kind === 'pdf' ? await extractPdf(bytes) : kind === 'docx' ? await extractDocx(bytes) : new TextDecoder().decode(bytes);
    const draft = parseProcedureText(text, source);
    if (kind === 'pdf' && text.trim().length < 100)
        draft.warnings.unshift('Weinig doorzoekbare tekst: mogelijk scan-PDF. OCR is niet uitgevoerd; controleer het origineel handmatig.');
    return draft;
}
