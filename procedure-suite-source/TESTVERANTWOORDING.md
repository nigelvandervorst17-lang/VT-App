# Testverantwoording — NDT Procedure Suite 0.1

Datum: 15 november 2026.

## Uitgevoerd in deze omgeving

- TypeScript-domein, parser, IQI, geometrie, evaluatie en opslagmodules: `tsc -p tsconfig.core.json` succesvol.
- React TSX / host mount: syntactisch geparseerd met TypeScript 5.8.3 en aanvullend offline gecontroleerd met tijdelijke UI-typedeclaraties. **Niet** met echte React-typedeclaraties of Vite gebouwd.
- 15 geautomatiseerde `node --test` regressietests: allemaal geslaagd.
- Adapterintegriteit tegen de **originele, ongewijzigde** BASIC RT PRO 3.8.5 `rt-core.mjs` en `rt-curves.mjs` (tijdelijke lokale extractie alleen voor controle):
  - Se-75, D4, Fe, 10 mm, D2.0, 40 Ci, SFD 800 mm: oorspronkelijke `minutes=14.466666666666669`, adapter identiek.
  - Ir-192, D4, Fe, 20 mm, D2.0, 40 Ci, SFD 800 mm: oorspronkelijke `minutes=11.116666666666667`, adapter identiek.
  - Se-75, D4, Fe, 25 mm, D2.8, 54 Ci, SFD 500 mm: oorspronkelijke `minutes=17.287501929012343`, adapter identiek.
  Deze vergelijkingen bewijzen alleen dat de adapter de rekenwaarde **niet verandert**. Ze bewijzen geen kalibratie, praktijkvalidatie, goedkeuring of intellectuele-eigendomsrechten.

## Nog niet getest

- Een volledige `npm install`/Vite/React-build was niet mogelijk vanwege ontbrekende npm-netwerktoegang.
- PDF.js- en Mammoth-bestandsextractie in Safari/iPhone, inclusief scan-PDF's en complexe tabellen.
- IndexedDB-dataretentie, JSON-export/import en bediening in echte iPhone-/iPad-Safari.
- Alle ISO 17636-1-techniekconfiguraties en uitzonderingen, alle IQI-tabellen en aantallen uit bijlage A.
- Werkelijke opname-/filmacceptatie; de app is daar niet voor vrijgegeven.

## Reproduceerbaar

Installeer dependencies en voer uit:

```sh
npm install
npm test
npm run build
```

Verifieer vervolgens op iPhone dat PDF en DOCX goed lezen, profielen na opnieuw starten blijven bestaan, JSON-import/export werkt en de bestaande calculator exact dezelfde waarde houdt.
