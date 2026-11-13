# Basic RT PRO 2.5 — IQI & filmverdeling (PRIVÉTEST / CONCEPT)

## Installatie

1. Pak de ZIP uit en upload de **inhoud** van de map naar de bestaande GitHub Pages-/webhost-publicatiemap. `index.html`, `app.mjs`, `rt-procedure.mjs`, `procedure-ui.mjs`, `styles.css`, `sw.js`, `RT_IQI_Filmverdeling_Concept_Procedure.pdf` en `assets/` moeten naast elkaar blijven staan.
2. Ververs de pagina op je iPhone; bij offline/installatie moet de serviceworker de nieuwe cache (v2.5.0) eenmaal online kunnen ophalen.
3. Ga naar **Rekenen → Open IQI & filmverdeling / procedure**, of **Naslag → Open IQI & filmverdeling**.
4. Voer eerst de juiste norm en geometrie in. Je kunt ook via **Naslag → Buismaten → Gebruik Ø en wanddikte in filmplan** de diameter en nominale wanddikte overnemen.

## Wat doet de nieuwe module?

- **IQI ISO-lassen:** klasse A/B, SWSI/DWSI/DWDI, bron- of filmzijde, MME-techniek, wanddikte t en waar relevant de doorstraalde dikte w. Toont minimale zichtbare draad, diameter, set, bronverwijzing en IQI-aantal. Alleen ondersteunde combinaties leveren een resultaat. Minimaal vereiste beeldkwaliteit is *niet* hetzelfde als door de opname bewezen geschiktheid.
- **IQI ASME-stalen gietstukken:** ASTM E747-draadnummer, draaddiameter en set volgens MM 11400 E tabel 9.6 op basis van nominale enkelwandige dikte t. Dit is **geen ASME-lasprocedure**.
- **Filmplaatsing:** berekent theoretische film-middenpunten voor rechte of rondgaande las/segment in cm, met buisomtrek (`π × buitendiameter`), bruikbare filmlengte en verplichte geplande overlap. ISO gebruikt minimaal 10 mm uit MM 00102 E; ASME-gietstukken minimaal 40 mm uit MM 11400 E.
- **ISO MME 1/5:** effectieve lengte per exposure wordt maximaal 70% van ingevoerde SFD gehouden. SFD ontbreekt -> berekening blokkeert.
- **DWDI MME 6 / 6A / 6B:** vaste filmverdeling over de omtrek wordt geblokkeerd; hoekaantallen en exposureplanning apart bepalen.
- **Diagram en export:** indicatieve schets (eigen SVG), individuele filmposities en export van plan als CSV. Concept-PDF beschikbaar in de app.

## Wat bepaalt de module NIET?

- Het minimum aantal RT-exposures voor ISO MME 3/4/7, MME 6 of ASME-castings. Dat vereist de grafieken/nomogrammen, detailgeometrie en het door RT Level 3 vrijgegeven opnameplan.
- De werkelijk gedekte laslengte zonder proefopname/markercontrole, filmhoek, profiel, bundelbegrenzing of beeldkwaliteit.
- RT-belichtingstijden of acceptatie van indicaties. De bestaande 2.4 belichtingsdata blijven **onderzoekscurves**, geen gekeurde waarden.

## Bronnen, revisies en grenzen

1. **MM 00102 E rev04** (14-08-2026): §§4.5, 4.6, 4.11, 6.
2. **MM 18100 E rev22** (15-12-2023): ISO 17636-1:2022 / ISO 10675-1:2021; §§2, 10.3, 11.4, 12, tabellen 12.2-12.7. Procedurelimiet 75 mm doorstraalde dikte.
3. **MM 11400 E rev23** (01-11-2025): ASME Section V Art. 2 en ASME VIII; §§2, 9.2, 9.8, 9.10-9.12, tabel 9.6. **Stalen gietstukken**, t/m 76 mm.

Code: `rt-procedure.mjs` (reken- en normlogica) en `procedure-ui.mjs` (weergave, 2D-schets, CSV). Het document is een **conceptwerkhulp, geen officieel goedgekeurde bedrijfsprocedure**. Controleer ook de licenties op de bedrijfsprocedures en fabrikantdata voordat je deze versie publiek deelt.

**Teststatus:** pure JavaScript-/normlookup-tests en regressietests van bestaande 2.4 rekencode zijn uitgevoerd. De volledige grafische browser-/iPhone-test kon hier niet afgerond worden doordat Chromium lokale en externe navigatie blokkeerde. Proef op iPhone, desktop en met verschillende NPS/technieken vóór verdere verspreiding. **Niet gebruiken als zelfstandig besluitvormend systeem bij werkelijke RT-opnames.**
