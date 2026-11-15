# NDT Radiography Pro — 9 correctiepunten (review, geen release)

**Status:** Rekenkundige hypothese. Niet gebruiken om een RT-bron of X-ray-toestel te bedienen.  
**Rekenmotor:** `rt-core.mjs`, `film-response.mjs`, `rt-curves.mjs/json`, `app.mjs` en de Procedure Suite worden **niet gewijzigd**.

De vorige 60 combinaties waren motor-uitkomsten, geen 60 onafhankelijk gemeten of geverifieerde belichtingstijden. Uit die lijst volgt dus niet dat alle basiscurves natuurkundig gevalideerd zijn.

## Uitvoering
```sh
node research/gamma-nine-point-review.mjs
node --test research/gamma-nine-point-review.test.mjs
```

Dit script reproduceert precies de **voorgestelde getallen** als _what-if_, niet als nieuwe kalibratie. Het importeert de live-motor uit deze repository en roept die ongewijzigd aan. De nieuwe factoren worden **alleen in de vergelijkingsmodule** gebruikt.

## Bevindingen
- **Nr. 53** met Se-75 D5-filmfactor **0,60** en zwartingsfactor **1,415**: **00:01:03**, niet de gevraagde **00:00:57**.
- **Nr. 54** met D4-factor **1,415**: **01:25:18**, niet **01:26:04**.
- **Nr. 32** gaat met D5 = 0,60 van **00:07:24** naar **00:07:36**. Dat verandert dus een bestaande filmverhouding.
- **Nr. 38/39**: de D5/D7-verhouding is wiskundig afgeleid uit het huidige overlapgebied, maar toepassing bij 15 mm Ir-192 heeft **geen onafhankelijke validatie**.
- **Nr. 43/49**: de nieuwe density-ankers leveren getallen, maar vallen buiten het huidig onderbouwde zwartingsbereik.
- **Nr. 48**: D = 3,5 vereist een extra aanname; voor de verkennende tabel is er **alleen lineair geïnterpoleerd** tussen 2,5 en 3,9.

Het **exacte** D4-factorgetal voor nr. 54 vanuit huidige D4-basiscurve is ongeveer **1,427834**. Voor nr. 53 zou met filmfactor **0,60** een **andere** D5-zwartingsfactor van ongeveer **1,274839** nodig zijn. Dat is geen bewijs dat deze factoren fysisch juist zijn.

### Beslissing
Geen merge naar `main` en geen verruimde invoer in de gebruikersapp totdat onafhankelijke film-/dichtheidsmetingen, toegestane extrapolatie en toepassingsgebied zijn vastgesteld en beoordeeld. Bestaande fabrikantafgeleide grafieken krijgen door een andere formule geen nieuwe onafhankelijke herkomst.
