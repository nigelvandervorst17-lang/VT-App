# NDT Radiography Pro — negenpuntstest met film-specifieke proeffactoren

**Alleen onderzoeksbranch:** `gamma-nine-point-factor-review`.  
**Geen productiewijziging / geen kalibratievrijgave.**

De huidige `calculateGamma()` uit `rt-core.mjs` wordt rechtstreeks en ongewijzigd geïmporteerd. Voor de twee D=2,5-proeven wordt uitsluitend in dit onderzoeksscript de uitkomst op basis van de huidige D=2,0-filmcurve vermenigvuldigd met:
- **D4: 1,4278**
- **D5: 1,3085**

De oorspronkelijke Se-75 D5/D4-verhouding is **ca. 0,584514**, rechtstreeks uit de bestaande filmcurves. Deze wordt niet vervangen of afgerond in de berekening. **D7 blijft volledig ongewijzigd.** Voor alle andere zwartingen blijft de huidige motor ongewijzigd. De vijf afgewezen situaties blijven geblokkeerd; er worden geen film- of zwartingsgrenzen verruimd.

## Regressierapport

| Testnr | Oorspronkelijke tijd | Nieuwe tijd | Verschil (sec) | Status |
|---:|---|---|---:|---|
| 32 | 00:07:24 | 00:07:24 | 0 | Overeenkomst |
| 33 | 00:05:24 | 00:05:24 | 0 | Overeenkomst |
| 38 | Geblokkeerd | Geblokkeerd | — | Geblokkeerd |
| 39 | Geblokkeerd | Geblokkeerd | — | Geblokkeerd |
| 43 | Geblokkeerd | Geblokkeerd | — | Geblokkeerd |
| 48 | Geblokkeerd | Geblokkeerd | — | Geblokkeerd |
| 49 | Geblokkeerd | Geblokkeerd | — | Geblokkeerd |
| 53 | 00:00:54 | 00:00:57 | +3 | Overeenkomst |
| 54 | 01:15:30 | 01:26:04 | +634 | Overeenkomst |

Tests 53 en 54 zijn **numerieke regressie-overeenkomsten met aangeleverde richttijden**, geen bewijs voor de fysische juistheid van de correctiefactoren. Dit script is niet aangesloten op de live-app en mag nooit worden gebruikt om echte belichtingstijden vast te stellen.

## Uitvoering
```sh
node research/gamma-nine-point-review.mjs
node --test research/gamma-nine-point-review.test.mjs
```

De andere vijf tests blijven geblokkeerd door het oorspronkelijke model: Ir-192 D5/D7 bij 15 mm en zwartingen D=1,2; 3,5; 3,9. Nieuwe data en onafhankelijke validatie blijven noodzakelijk voor eventuele latere wijzigingen.
