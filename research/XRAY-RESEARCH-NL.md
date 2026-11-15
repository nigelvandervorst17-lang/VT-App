# NDT Radiography Pro — X-ray Research Engine

**Onderzoek, geen kalibratie of productiefunctionaliteit.**  
**Branch:** \`research/xray-exposure-engine\` vanaf \`main\` commit \`1dc0c836b804f49867801a9c757d01aa097f755d\`  
**Status:** CONCEPT · geen praktijk-RT-berekening of vrijgave · geen merge naar \`main\`.

## Doel en afgescheiden opzet

- **\`research/xray-core.mjs\`**: zelfstandige rekentechnische vergelijking van bestaande X-ray-modellen, zonder \`calculateXray()\` als subroutine aan te roepen. De originele functie in \`rt-core.mjs\` dient **uitsluitend als referentie** in het rapport en de regressietests.
- **\`research/xray-reference-points.json\`**: exact tien **lege** staal-/D4-punten, 800 mm SFD, 5 mA en D=2,0. Tijd en kV staan overal op **\`Referentie ontbreekt\`**.
- **\`research/xray-report.mjs\`**: tabel met gevraagde acht kolommen; uitsluitend berekeningen bij voldoende bruikbare en herleidbare invoer.
- **\`research/xray-core.test.mjs\`**: geautomatiseerde tests voor motorovereenkomst, kV-scheiding, mA- en afstandsschaling, bron-/film-/materiaalblokkades, geometrie, lege referenties en de beschermde originele bronbestanden.
- **\`research/xray-baseline-shas.json\`**: SHA-1 Git-blob-fingerprints van elf originele bestanden op \`main\`, inclusief gamma, X-ray, filmrespons, de Procedure Suite en de live-interface.

De bestaande \`rt-core.mjs\`, \`rt-curves.mjs\`, \`rt-curves.json\`, \`xray-extra-curves.mjs\`, \`film-response.mjs\`, \`app.mjs\`, \`basicRTProBridge.mjs\` en live-interface zijn **niet aangepast**. Gamma-onderzoeksbranch en PR #6 blijven apart en ongewijzigd.

## Hoe de huidige X-ray-referentie werkelijk werkt

De bestaande \`calculateXray()\` in \`rt-core.mjs\` gebruikt toestelgebonden, exacte kV-lijnen. Een lijn heeft een logaritmische fit in **mA·min**, min-/max-dikte en een geldig mA·min-bereik. De onafhankelijke onderzoekscode vergelijkt exact dezelfde stappen:

\`\`\`text
mA·min = 10^(log10MamPerMm[kV] × dikteFe + log10MamIntercept[kV])
tijd in minuten = (mA·min / mA) × (SFD / referentie-SFD)^2 × bestaande zwartingsfactor
\`\`\`

**Geen** kV-interpolatie, nieuw gefitte toestelfactor, filmomrekening of extrapolatie. De filmzwartingsfactor wordt uitsluitend uit de reeds bestaande \`film-response.mjs\` gehaald als **ongevalideerde** onderzoekscorrectie voor vergelijking, niet als nieuw kalibratiebewijs. Voor niet-stalen materialen wordt geen materiaalequivalentie aangenomen.

### Bestaande filmdekking — kritische beperking

| Datasetgroep | Film in de huidige curve | Opmerking |
|---|---|---|
| Andrex SMART 225 | **D5**, referentie D=2,5 en 800 mm | Alleen de vooraf vastgelegde kV-lijnen en hun diktebereik |
| YXLON SMART-referentiecurves | **D7**, doorgaans referentie D=2,0 en 700 mm | Pixelgefitte onderzoeksreferenties; een model zonder curve blijft geblokkeerd |
| De gevraagde D4-referentiematrix | **Geen ondersteunde D4 X-ray-dataset** | **Tijden/kV mogen niet worden verzonnen of uit D5/D7 worden afgeleid** |

Daarom kan een ingevuld kV-/tijdstip voor D4 hoogstens worden beoordeeld als *onvoldoende softwaredekking* totdat er een afzonderlijk onderbouwde, herleidbare D4-/toestel-/kV-referentie beschikbaar is. Het sjabloon zelf bevat geen voorspellingen.

## Tien referentiepunten

**Vast:** staal Fe · 800 mm SFD · 5 mA · D4-film · optische zwarting D=2,0.

| Nr | Staal (mm) | kV | Referentietijd (uu:mm:ss) |
|---:|---:|---|---|
| 1 | 2 | Referentie ontbreekt | Referentie ontbreekt |
| 2 | 4 | Referentie ontbreekt | Referentie ontbreekt |
| 3 | 6 | Referentie ontbreekt | Referentie ontbreekt |
| 4 | 8 | Referentie ontbreekt | Referentie ontbreekt |
| 5 | 10 | Referentie ontbreekt | Referentie ontbreekt |
| 6 | 12 | Referentie ontbreekt | Referentie ontbreekt |
| 7 | 15 | Referentie ontbreekt | Referentie ontbreekt |
| 8 | 20 | Referentie ontbreekt | Referentie ontbreekt |
| 9 | 25 | Referentie ontbreekt | Referentie ontbreekt |
| 10 | 30 | Referentie ontbreekt | Referentie ontbreekt |

**Vul de fabrikant, het exacte model, de filmfabrikant/-batch, het ontwikkelproces (tijd/temperatuur), loodschermen vóór/achter, de bron/versie van afgelezen referentiewaarden en toestemming voor datagebruik in het JSON-sjabloon in.** Zonder model, kV en referentietijd geen geldige numerieke vergelijking. De openbare repository is niet bedoeld voor klantgegevens, persoonlijke broncertificaten of vertrouwelijke films.

## Brandvlek en geometrische onscherpte

\`assessGeometricUnsharpness()\` is **een afzonderlijke, informatieve berekening**:

\`\`\`text
Ug = d × b / (SFD - b)
d = effectieve brandvlek (mm)
b = werkelijk gemeten object-film-afstand (mm)
SFD - b = bron-object-afstand (mm)
\`\`\`

De module bevat **geen ingeschreven ISO 17636-1-grenswaarde**. Zij rapporteert zonder geverifieerde norm/procedure **\`LIMIT_NOT_SPECIFIED\`**; als een grens wordt ingevoerd maar documentnummer, revisie, goedkeuringsreferentie of normuitgave ontbreken: **\`LIMIT_SOURCE_NOT_DOCUMENTED\`**. Zelfs bij een geldige, extern vastgelegde proceduregrens wordt uitsluitend een rekenkundige vergelijking getoond, **nooit automatische RT-vrijgave**.

De effectieve brandvlek \`d\`, toestelfabrikant/model, loodschermen en toestelcorrectiefactor blijven **aparte velden**. Een toestelcorrectiefactor verschillend van 1 wordt afgewezen zonder onafhankelijk aangetoonde referentie; er wordt niets in de belichtingstijd opgenomen.

## Rapportage en testuitvoering

Voer in een lokale clone van deze onderzoeksbranch uit:

\`\`\`sh
node research/xray-report.mjs
node --test research/xray-core.test.mjs
\`\`\`

**Rapportkolommen (exact):**

\`\`\`text
Nr | Staal | kV | Referentietijd | Huidige motor | Onderzoeksmotor | Verschil (sec) | Status
\`\`\`

Bij de huidige lege invoer moeten alle tien rijen \`Referentie ontbreekt\` tonen, zonder tijdresultaat. Als kV/toestel alsnog worden ingevuld maar het filmtype D4 niet door de geselecteerde dataset wordt ondersteund, hoort het resultaat **\`Geblokkeerd\`** te zijn. Bij twee wel ondersteunde berekeningen wordt het verschil in seconden met de externe referentietijd gerapporteerd. Tijdwaarden komen uit de motor; niet uit de tabelsjabloon.

De regressietests vergelijken Git-blobhashes van de oorspronkelijke motor-/UI-bestanden met het vastgelegde \`main\`-commit. Dit bewijst ongewijzigdheid **binnen de onderzoeksbranch ten opzichte van de geregistreerde baseline**; de afzonderlijke GitHub-diff moet daarnaast altijd worden gecontroleerd. Vergelijking van twee dezelfde formules bewijst niet dat de afgeleide fabrikantcurves fysisch gevalideerd zijn.

## Stop-/vrijgavevoorwaarden

- [ ] Reële, herleidbare referentiepunten met exacte kV per punt en geldig toestelmodel beschikbaar.
- [ ] D4-filmcurve onafhankelijk en toepassingsgebonden onderbouwd; geen automatische D5/D7→D4-omrekening.
- [ ] Alle gebruikte film-, buis-, staal-, scherm-, ontwikkel- en geometriecondities vergeleken met de bron van de data.
- [ ] Meetonzekerheid en onafhankelijke controles beoordeeld door bevoegd en onafhankelijk personeel.
- [ ] Normatieve geometrie-/IQI-limieten geverifieerd op de juiste procedure, editie en werkgebied.
- [ ] Volledige X-ray- en gamma-regressie, brondatarechten, software-review en wijzigingsimpact afgehandeld.
- [ ] Uitdrukkelijk nieuw besluit over eventuele implementatie, met aparte code-PR en release-autorisatie.

**Totdat dit is aangetoond:** alle niet-onderbouwde referenties en combinaties geblokkeerd, **geen wijzigingen aan de hoofdapp**, geen samenvoeging naar \`main\`, geen vrijgave voor echte RT-opnamen.
