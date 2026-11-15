# NDT Radiography Pro — Procedure Suite 0.1 (TypeScript + React)

**Status: programmeerbaar prototype, niet vrijgegeven voor echte RT-opnamen.**

Modulair pakket voor BASIC RT PRO 3.8.5 met vijf onafhankelijke functies:

1. `parseProcedureDocument(file | text)` — PDF (`pdfjs-dist`), DOCX (`mammoth`), TXT en plakken. Geeft `ProcedureDraft` met kandidaatvelden, tekstbewijs, onzekerheden en ontbrekende waarden; **geen automatische goedkeuring**. Scans zonder tekst hebben externe OCR/handmatige invoer nodig.
2. `ProcedureSuite` — React-bevestiging met corrigeerbare velden en expliciete bevestiging door onderzoeker/Level 3, inclusief handmatige normtabellen voor IQI en minimale opnameaantallen.
3. `procedureStorage.ts` — IndexedDB voor procedurebibliotheek, actieve procedure (blijft actief bij heropenen), versiebeheer, export/import JSON en logboek van resultaten met onveranderde procedure-snapshot.
4. `filmPlanning.ts` en `iqi.ts` — berekening omtrek / benodigde **omgelegde filmsegmenten**, berekende verhouding doorstraalde dikte (klasse A ≤ 20%, B ≤ 10%), bron-object-afstand (ISO 7.6) en lookup in **door Level 3 ingevoerde** IQI- en opnametabellen. Niet alle ISO-opnameconfiguraties zijn algebraïsch uit de enkele diameter en wanddikte af te leiden. Zonder juiste goedgekeurde normtabel: `onbekend`, niet gokken. Minimaal aantal **belichtingen** blijft een aparte grootheid.
5. `evaluateExposurePlan(input, profile, existingCalculateExposure)` — status groen/oranje/rood voor de procedurecriteria; de originele rekenmotor ontvangt dezelfde invoer en produceert zijn eigen resultaat. Deze module verandert geen curves, formules, parameters of bronverval. Bij een harde procedureblokkade wordt de motor niet aangeroepen.

## Integratie in oorspronkelijke app

De oorspronkelijke BASIC RT PRO 3.8.5 is *vanilla JavaScript*: geen React-bouwomgeving. Daarom is dit een **afzonderlijk bouwpakket met een kleine adapter**; het is niet zonder installatie direct uitvoerbaar in de huidige GitHub Pages-pagina.

```
cd NDT_Procedure_Suite
npm install
npm run build
npm test
```

Neem de gegenereerde `dist/` bestanden op in een **afzonderlijke testkopie** van de bestaande app en volg `examples/app-integration.html`. Zet `examples/basicRTProBridge.mjs` naast de bestaande `rt-core.mjs` en `rt-curves.mjs` in de testkopie. De adapter roept de ongewijzigde bestaande `calculateGamma` en `calculateXray` aan; *bij het berekenen wordt geen film-/dichtheids-/afstandsfactor vanuit de procedurelaag op de tijd toegepast*.

De engine-adapter markeert originele resultaten **niet als gekalibreerd**: in de gekeurde productversie moet de kalibratiestatus aantoonbaar per bron/film/dikterange worden beheerd, los van procedures.

## Belangrijke normgrenzen

- ISO 17636-1:2022 §7.6: `f_min = (7,5 voor A; 15 voor B) × d × b_eff^(2/3)`, met `b_eff = t` indien `b < 1,2 t`, anders `b`, en `f = SFD - b`. Voor vlakke defecten waarvoor detectie is vereist, gebruikt **klasse A ook geometrieklasse B**. De speciale geometrie-uitzonderingen vergen verdere controle. `d` = grootste gemeten bron-/focusafmeting, niet de diagonaal.
- Bijlage A: 10% (klasse B), 20% (klasse A) dikteverandering is niet hetzelfde als het minimale aantal opnamen. Dit minimum komt uit de juiste bijlage-A-grafiek/geometrie of een door Level 3 gecontroleerde, bronvermelde lookupregel. DWDI-ellips kent eigen randvoorwaarden.
- Bijlage B: IQI W1–W19 is afhankelijk van techniek, zijde, klasse en **nominale óf doorstraalde dikte**. Geen IQI-lookup is actief totdat de Level 3 tabelregels zijn ingevoerd. Filmzijde kan extra vergelijkingsopname/afspraak vergen; de uitkomst is nooit automatische filmacceptatie.
- Filmoverlap: effectieve dekking en zichtbare markervereisten moeten worden gecontroleerd. De berekende omgelegde-filmsegmenten zijn **geen** automatische bewijslast van volledige radiografische 100%-dekking.

## Eigendom en herkomst

Dit pakket bevat **geen Waygate-/MME-/MM-belichtingsdatasets of bedrijfsprocedures**. Het bevat bewust ook niet een volledige overgenomen ISO-tabel; de toepasselijke normgegevens worden door een bevoegde gebruiker ingevoerd en met een referentie opgeslagen. De adapter sluit aan op de originele motor van de oorspronkelijke app: daarmee worden bestaande herkomstrechten van de oorspronkelijk gebruikte curves **niet gewijzigd of weggepoetst**.

## Veilige opslag

Alle data blijft in de IndexedDB van het apparaat en de gebruikte domeinnaam. Geen cloud-synchronisatie, geen versleuteling of authenticatie: **voer geen vertrouwelijke procedures in op gedeelde of onbeheerde apparaten**. Een JSON-back-up is leesbare tekst. Sla die veilig op. Browsergegevens verwijderen of overschakelen naar een ander domein kan lokale data onbereikbaar maken; importeer dan de JSON-back-up. Import overschrijft bestaande procedures niet op ID, en verandert de actieve procedure niet.

## Tests

`npm test` controleert parser (geen hallucinatie), geometrische grenzen, filmaantallen, IQI-rule matching, hard-blocking, engine-readonly en behoud van exacte ongewijzigde minuutwaarden. Voor een daadwerkelijke browser/PDF/DOCX/UI-eindtest moeten de npm-dependencies worden geïnstalleerd. In de huidige uitwerkomgeving was npm-netwerktoegang niet beschikbaar; die integratietest kan daarom hier niet worden geclaimd.

## Normbron (zelf verifiëren bij vrijgave)

ISO 17636-1:2022 §§ 6.7, 7.6 en bijlagen A/B; ISO 19232-1 (W-draadreeksen). De norm zelf en contractuele vereisten zijn leidend. Dit pakket geeft geen zelfstandige formele vrijgave.
