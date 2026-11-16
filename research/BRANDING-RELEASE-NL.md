# NDT RADIOGRAPHY PRO — merklogo's voor live web-app

## Nieuwe logo's (uit de twee aangeleverde afbeeldingen)

| Asset | Toepassing |
|---|---|
| `brand/ndt-banner-512.webp` | Brede donkere banner bovenaan Rekenen en andere tabs, 512 × 171 pixels |
| `brand/ndt-square-192.webp` | Favicon en Android webmanifest 192 × 192 |
| `brand/ndt-square-512.webp` | Android webmanifest 512 × 512 |
| `brand/ndt-apple-touch-180.png` | iPhone/iPad-beginschermicoon 180 × 180 |

De vier bestanden zijn rechtstreeks afgeleid van de twee afbeeldingen die de eigenaar in de chat heeft aangeleverd. Ze zijn voor webgebruik verkleind en gecomprimeerd. De oorspronkelijke foto's zijn niet gepubliceerd.

De live pagina verwijst in `index.html` naar de banner, favicon en iPhone-icoon. `manifest.webmanifest` verwijst naar de 192- en 512-pixel logo's; `sw.js` bewaart alle vier de assets voor offline gebruik. Het service-worker-cachenummer is verhoogd, zodat bestaande iPhone-installaties de nieuwe bestanden bij online herladen kunnen ophalen. Een reeds aan het iPhone-beginscherm vastgemaakte snelkoppeling kan zijn oude icoon nog in de iOS-cache houden; verwijder deze en voeg de app zo nodig opnieuw toe.

## Bewust NIET in de operationele motor veranderd

De materiaal-, gamma-zwartings- en X-ray-rekenmotorbestanden zijn ongewijzigd. De eerdere rekenkundige scenario's bevatten nog niet de onafhankelijke onderbouwing nodig voor een algemene, fysiek veilige RT-belichtingscalculator.

- Staal/RVS/Al/Cu/Ti: voorgestelde `w × f_mat`-waarden blijven alleen in het zichtbare onderzoeksblok en worden niet als gecontroleerde equivalente staaldikte aan `rt-core.mjs` doorgegeven.
- D4=1,4278 en D5=1,3085 bij D=2,5: het 00:00:57 Se-75-voorbeeld blijft een afzonderlijke onderzoeksvergelijking. Geen ongecontroleerde tijd wordt de standaard hoofd-uitkomst.
- De zes opgegeven Waygate X-ray-tijden blijven in `research/waygate-six-user-points-unverified.json` staan. Ze bevatten geen sluitende fabrikant/toestel, mA, SFD, Pb-schermen, filmverwerking en kalibratiebron per punt. Daarom mogen ze niet worden samengevoegd tot D4/D5/D7-blootstellingscurves.

**Voor een echte vrijgave** moeten onafhankelijke gevalideerde toestel- en filmcurves, een nauwkeurige scope, meetschema, review door bevoegde Level 3 en formele proces- en stralingsveiligheidscontroles beschikbaar zijn. Zelfs met expliciete softwaretoestemming kunnen ontbrekende fysieke meetcondities niet door interpolatie of een enkele algemeen toegekende factor worden vervangen.

## Automatische controles

`node --test research/brand-logos.test.mjs research/live-material-preview.test.mjs`

Het testscript verifieert de Git-blobhashes van de vier beeldbestanden en de vijf oorspronkelijk beschermde motor/film/curvebestanden, naast de iPhone-/Android-links en de status van de ongeverifieerde X-ray-punten.
