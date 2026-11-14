# QA Basic RT PRO 3.8 BETA — 14 november 2026

## Automatische checks
- **120 geslaagd:** `node test-3.8.mjs`. Verwerkt Se-75/Ir-192 D4-basisreferenties, de D5/D7-filmfactoren, verschillende zwartingen, grenswaarden, toegestane films, activiteit, afstand, en staal-only afscherming.
- **24 geslaagd:** `node xray_regression.mjs`. Vergelijking van onveranderde X-ray berekeningen uit de 3.7 `rt-core.mjs` versus 3.8.
- JavaScript-syntaxis: `node --check rt-core.mjs app.mjs rt-curves.mjs sw.js` geslaagd.
- In de HTML zijn **6 inline JavaScript-scripts syntactisch gecontroleerd**; alle geslaagd.
- `rt-curves.mjs` en `rt-curves.json` bevatten dezelfde dataset.

## Niet uitgevoerd
- Een echte browser-/iPhone-interfaceproef is in deze testomgeving **geblokkeerd** (`ERR_BLOCKED_BY_ADMINISTRATOR`). Geen claim dat de PWA in Safari is getest.
- Geen fysieke belichtingsmeting, filmzwarting, ontwikkeltest, IQI of stralingsveiligheidsvrijgave.
- De vroegere testbestanden `test-3.4.mjs`, `test-3.5.mjs`, `test-3.7.mjs` gebruiken oude modelregels en oude domeingrenzen; ze zijn geen bruikbare regressiesuite voor 3.8. Daarom vervangen door 3.8-controles.

## Onzekerheden in de gebruikerswaarden
- Se-75, D4 10 mm, 800 mm, 15 Ci, D2,0: gebruiker bevestigde `38:15`; fysische 1/Ci-scaling vanaf 40 Ci `14:28` geeft `38:35` (20 sec verschil). Niet automatisch weggecorrigeerd.
- Ir-192 D5/D7-factoren zijn op 20 en 50 mm bepaald, **geen onafhankelijke hold-out bij een derde dikte**.
- Het model veronderstelt per film een lineaire correctie tussen de meetzwartingen; dit is een softwarefit, geen fysisch bewijs dat een OEM-calculator intern zo werkt.
- Alle dichtheden, materiaalsoorten, broncurves, viewer- en procedureregels moeten afzonderlijk geschikt worden bevonden door een bevoegde deskundige.

## Snel na GitHub upload testen (niet vooraf als geslaagd tellen)
1. Se-75 / D4 / 10 mm / D2,0 / 40 Ci / 800 mm → `00:14:28`.
2. Se-75 / D5 / 4 mm / D2,0 / 40 Ci / 800 mm → `00:05:40`.
3. Ir-192 / D4 / 20 mm / D2,0 / 40 Ci / 800 mm → `00:11:07`.
4. Ir-192 / D5 / 20 mm / D2,0 / 40 Ci / 800 mm → `00:07:08`.
5. Ir-192 / D7 / 50 mm / D2,0 / 40 Ci / 800 mm → `00:18:56`.
6. Filmselectie: alleen D4, D5, D7. Se-75 D5 op 35 mm en Ir-192 D7 op 70 mm → geblokkeerd.
