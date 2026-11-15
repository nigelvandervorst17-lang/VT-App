# BASIC RT PRO / NDT Radiography Pro — Opnameplan iPhone UX v0.3

**Status:** niet-live proefmodule, geen RT-vrijgave. De 3.8.6/3.8.5 motorbestanden en kalibratiecurves zijn niet bewerkt.

## Nieuwe functies

1. **Bronafhankelijke invoer**: gamma (`Se-75`, `Ir-192`) uitsluitend bronactiviteit Ci; `X-ray` uitsluitend model, kV en mA. Verborgen parameters worden bij wisselen naar de andere broncategorie in het opnameplan opgeschoond.
2. **Werkstuk**: `Vlakke plaat` of `Pijp / Rondlas`. Bij plaat worden buisdiameter, bronpositie voor rondlas, filmsegmentlengte en omgelegde film verborgen. Oude buisgegevens worden uit de actieve opname-invoer gewist. Bij platen wordt geen fictieve omtrek of minimumopnameaantal berekend; het resultaat meldt handmatige dekking als *niet vastgesteld*.
3. **Nominale w**: `SWSI = t`, `DWSI/DWDI ellips = 2 × t`, uitsluitend bij eindige positieve t. Het readonly w-resultaat blijft leeg als t ontbreekt. **Dit is geen exacte stralingsweg bij schuine/elliptische opnamen**. De oorspronkelijke gamma-/X-ray-motor blijft uitsluitend `thicknessMm` (t) uit het bestaande inputcontract gebruiken; `penetratedThicknessMm` (w) wordt in de aparte IQI-/filmcontrolelaag gebruikt.
4. **Decimalen en taal**: `FloatField` blijft leeg bij ontbrekende waarde, gebruikt `inputMode="decimal"` en Nederlandse labels. IQI-zijde zichtbaar als Bronzijde (Source) of Filmzijde (Film), interne codes ongewijzigd.
5. **Vaste knop onderaan**: altijd zichtbare iPhone-berekenknop zolang Opnameplan actief is. `safe-area-inset-bottom` voorkomt overlap met het home-indicatorgebied. De knop roept de bestaande `evaluate()`-controlelaag aan, die vervolgens de ongewijzigde hostmotor aanroept of op procedureblokkades stopt.

## Technische controle

- `npm test` in `procedure-suite-source` → **30/30 geslaagd** (23 voorgaande tests plus 7 nieuwe Opnameplan-tests).
- Browser-ES-module runtime opnieuw gegenereerd met bestaande `build-browser-runtime.cjs`; nieuwe helper beschikbaar in `procedure-runtime/planning/plannerInput.js`.
- `rt-core.mjs`, `rt-curves.mjs`, `rt-curves.json`, `film-response.mjs`, `xray-extra-curves.mjs`, `basicRTProBridge.mjs`, `procedure-suite-source/src/engine/evaluateExposurePlan.ts` en `app.mjs` zijn byte-voor-byte identiek aan UX v0.2.
- iPhone Safari-interacties, virtueel toetsenbord en daadwerkelijke PDF/DOCX-upload zijn nog **niet** door een praktijkbrowser-test bevestigd. Eerdere headless browserpoging leverde geen bruikbare screenshot op.

**Let op:** de huidige data/curves kunnen nog leverancier-afhankelijk zijn. Deze UX-release verandert niets aan rechten, dataprovenance of stralingsveiligheidsvalidatie. De onderzoekswaarschuwing blijft zichtbaar en geen opname-uitkomst is automatisch vrijgegeven.
