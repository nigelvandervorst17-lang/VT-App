# QA — Basic RT PRO 3.8.3

- Rekenkern: `PASS 120 Basic RT PRO 3.8 Waygate comparison tests. Model fit is not RT exposure validation.`
- HTML: geen dubbele element-ID's, geen ontbrekende letterlijke lokale asset-paden.
- Alle JavaScript-modules en `sw.js` voldoen aan `node --check`.
- Mobiele Chromium-preview (in-memory met lokale modulebundling; geen echte GitHub/Safari-test): opstart zonder JavaScript-runtimefouten.
- Se-75 D4 10 mm: **00:14:28**; Ir-192 D4 20 mm: **00:11:07**.
- 5 zichtbare hoofdnav-buttons; Meer opent Tools/Records/Instellingen.
- Curvelijst bevat 9 items (2 gamma + 7 X-ray); test YXLON SMART 225 160 kV: bij 18,49 mm ca. 2,572 mA·min als **niet-gevalideerde onderzoekswaarde**.
- Naslag-accordions (10), Comet in fabrikantdocumenten, Tool-accordions gesloten.
- Taalwissel NL→EN→PL: titels, calculator-knop en Meer-label worden aangepast, geen runtimefouten.
- Sticky-resultaat alleen op Rekenen, ook na taalwissel.
- DWDI 2×t-voorstel: 10→20 mm en 7,5→15 mm; handmatige invoer 18 mm blijft bij wijziging van wanddikte behouden.
- Geometriehulp neemt SFD 800 en OFD 20 over als voorgestelde SOD 780 mm.

## Beperkingen
- Simulator kan iPhone/Safari-safe-area en scroll-gedrag **niet definitief bevestigen**.
- X-ray-cijfergrafieken zijn afgeleid van ongevalideerde pixelcurves; geen vrijgave.
- 15-Ci-afwijking bij Se-75 en nog deels onvertaalde oudere onderliggende modules blijven open.
- Werkelijke NDO/RT-belichtingsparameters zijn niet zelfstandig gevalideerd.
