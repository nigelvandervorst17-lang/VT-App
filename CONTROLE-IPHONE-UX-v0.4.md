# BASIC RT PRO Procedure Suite — iPhone UX v0.4 testverslag

**Status:** ontwerp- en codecontrole geslaagd; niet vrijgegeven voor echte RT-opnamen.
**Basis:** v0.3 op GitHub-branch `ndt-opnameplan-iphone-v03`.

## De zeven wijzigingen
1. Randdikte alleen bij **Pijp / Rondlas**; placeholder `Bijv. 11.0`.
2. Minimale filmoverlap: placeholder `Bijv. 25`.
3. IQI-extra fijne draden: geen stilzwijgende 0; leeg veld en voorbeeld `Bijv. 0`. De bevestiger moet expliciet een geheel getal 0–5 vastleggen.
4. Object-film-afstand `b` optioneel; `Standaard = w` alleen als **tijdelijke geometrieaanname** bij film tegen object. Bij lege `b` is de geometriecontrole maximaal oranje; een geometrieovertreding blijft rood. De motor ontvangt de bestaande, onveranderde invoer.
5. Drie grote, toegankelijk klikbare en selecteerbare checkboxkaarten (vlak defect, filmzijde-IQI en bevestiging).
6. Extra pagina- en kaartpadding onder de vaste berekenknop, inclusief iPhone-safe-area.
7. Geen lege accordions bij 0 IQI-/opnameregels. Er is nog steeds een knop om een gecontroleerde regel toe te voegen.

## Tests
`node build-browser-runtime.cjs` genereert de browsermodules vanuit de TypeScript/React-broncode. `npm test` geeft **39/39 geslaagd**, waarvan 9 gerichte v0.4-controles. Browsercomponenten zijn gegenereerd; interactieve Safari- en PDF/DOCX-tests zijn hier nog niet uitgevoerd.

## Ongewijzigde onderdelen
Alle onderstaande bestanden zijn byte-voor-byte gelijk aan v0.3:
- `rt-core.mjs`
- `rt-curves.mjs`
- `rt-curves.json`
- `film-response.mjs`
- `app.mjs`
- `xray-extra-curves.mjs`
- `basicRTProBridge.mjs`
- `procedure-suite-source/src/engine/evaluateExposurePlan.ts`
- `procedure-suite-source/examples/basicRTProBridge.mjs`

## Bestandswijzigingen ten opzichte van v0.3
- `procedure-runtime/parser/parseProcedureDocument.js`
- `procedure-runtime/planning/filmPlanning.js`
- `procedure-runtime/ui/ProcedureSuite.js`
- `procedure-suite-source/package.json`
- `procedure-suite-source/src/parser/parseProcedureDocument.ts`
- `procedure-suite-source/src/planning/filmPlanning.ts`
- `procedure-suite-source/src/ui/ProcedureSuite.tsx`
- `procedure-suite-source/src/ui/procedureSuite.css`
- `procedure-suite-source/tests/iphone-ux-v04.test.mjs`
- `procedure-suite.css`
- `procedure-suite.html`

## Beperkingen
Deze UI-wijzigingen zijn geen kalibratie, ISO-vrijgave of opheffing van herkomst-/licentiebeperkingen van bestaande referentiegegevens. Zonder goedgekeurde IQI- en opnametabellen blijven procedurewaarden onbekend en kunnen controles niet automatisch groen worden.
