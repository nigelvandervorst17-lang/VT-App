# NDT Radiography Pro — Mijn Röntgenbuizen, Fase 1

**Status:** afzonderlijke onderzoeksmodule, **geen gevalideerde kalibratie / geen RT-vrijgave**.  
**Branch:** \`research/xray-exposure-engine\` · **PR:** #7 (draft, NIET MERGEN).  
**Baseline:** \`main\` op \`1dc0c836b804f49867801a9c757d01aa097f755d\`.  
**Bestaande gamma-onderzoeks-PR:** #6, niet aangepast.

## Beschikbare onderzoeksbestanden

| Bestand | Functie |
|---|---|
| \`research/xray-tube-profiles.mjs\` | XrayTubeProfile, opslag, voorlopig één-/tweepunts-\`k_tube\`, referentieblokkades, review en geometrie |
| \`research/mijn-rontgenbuizen.html\` | Los, mobielvriendelijk proefscherm; geen koppeling in \`index.html\` |
| \`research/xray-tube-ui.mjs\` | Browserformulieren, lokale opslag en resultatenweergave |
| \`research/xray-tube-profiles.test.mjs\` | Geautomatiseerde regressietests voor profiel, factoren en blokkades |
| \`research/xray-core.mjs\` | Bestaande zelfstandige, ongevalideerde X-ray-onderzoeksberekening |
| \`research/xray-baseline-shas.json\` | Beschermde bronbestand-hashes uit \`main\` |

## XrayTubeProfile — vaste velden

- Merk / fabrikant, model, serienummer (alleen in browseropslag).
- Generatortype: \`CONSTANT_POTENTIAL\` of \`HALF_WAVE\`.
- Straler: \`RICHTSTRALER\` of \`RONDSTRALER\`.
- Maximaal \`maxKv\`, \`maxMa\`, optionele gedocumenteerde \`maxPowerKw\`.
- Effectieve brandvlekgrootte \`focalSpotMm\` (d in mm).
- Aparte \`referenceModel\` en \`referenceEvidenceId\` voor de geselecteerde, **daadwerkelijk aanwezige** onderzoeksreferentiecurve. Modelnamen worden nooit automatisch gelijkgesteld.
- \`calibrationStatus\`: **\`UNVERIFIED_REFERENCE\`** of **\`CALIBRATED\`**, \`kTube\`, \`pendingCalibration\`, \`calibrationApproval\`.

**Standaard:** \`UNVERIFIED_REFERENCE\`, \`kTube=1\`, met oranje tekst:

> Standaard referentiecurve — nog niet geijkt op deze specifieke röntgenbuis

**Opgelet:** een toestel dat alleen qua model lijkt op een ander (bijvoorbeeld Comet MXR versus YXLON) heeft geen automatisch geldige referentiecurve. Zonder gedocumenteerde model-/film-/kV-koppeling wordt de onderzoekstijd **geblokkeerd**. Deze repository bevat X-ray-curves voor D5 (Andrex) en D7 (bepaalde YXLON-modellen), maar niet voor de gevraagde D4-standaard. Er worden geen D4-curves verzonnen.

## Eén of twee proefopnames en de rekenkundige k-factor

Elk gecontroleerd meetpunt bevat:
- unieke meetserie-ID, kwaliteitsbewijs-ID en expliciete bevestiging dat de proefopname aan de **extern beoordeelde** beeldkwaliteit voldoet;
- staaldikte (mm), exact gebruikte kV, mA, SFD (mm), filmtype;
- **werkelijk gemeten optische zwarting D** en belichtingstijd (\`uu:mm:ss\`);
- indien van toepassing de referentie-Pb-schermcondities.

De onderliggende kandidaatfactor wordt berekend uit de *bestaande*, ongevalideerde onderzoeksreferentie:

\`\`\`text
k_i = t_referentie_i / t_gemeten_i
k_tube_onderzoek = (k_1 + k_2) / 2   bij 2 meetpunten
t_onderzoek_i = t_referentie_i / k_tube_onderzoek
\`\`\`

Dit is de gekozen **conventie voor opbrengstfactor**: een buis die volgens de referentie minder tijd nodig zou moeten hebben dan werkelijk gemeten, krijgt \`k_tube < 1\`; het kandidaatmodel verhoogt dan de tijd. Deze definitie is technisch gespecificeerd, maar is geen fysische validatie.

Bij **één** meetpunt is de factor de ene verhouding; bij **twee** is de factor het rekenkundig gemiddelde. De spreiding tussen de twee individuele factoren wordt afzonderlijk gerapporteerd. Er wordt niet verondersteld dat twee overeenkomende metingen de curve buiten hun eigen meetgebied dekken.

**Belangrijke veiligheidsafwijking van een volledig automatische 'CALIBRATED'-promotie:** na 1–2 meetpunten retourneert \`calibrateXrayTube()\` **\`REVIEW_REQUIRED\`** met \`pendingCalibration.candidateKTUbe\`, terwijl \`calibrationStatus='UNVERIFIED_REFERENCE'\` en \`kTube=1\` blijven. Dit voorkomt dat alleen twee proefopnames tot een onterechte opnamevrijgave leiden.

De kandidaatfactor kan **uitsluitend optioneel** worden doorgerekend via \`previewTubeExposure(...,{includePendingResearchFactor:true})\`. Deze actie verandert de originele rekenmotor niet. Elke uitkomst is gemarkeerd als **onderzoek, niet voor belichting**.

## Status CALIBRATED — alleen na gedocumenteerde review

\`approveTubeCalibration()\` is een **afzonderlijke handmatige onderzoeksadministratie**, geen onafhankelijk certificatiesysteem. Voor deze functie zijn vereist:

1. meetrapport-ID en **onafhankelijk validatiebewijs**;
2. goedgekeurde procedure en een uniek scope-ID;
3. verantwoordelijke reviewer-ID, beoordelingsdatum en verwijzing naar ondertekening;
4. expliciet bevestigde onafhankelijke review en scopecontrole;
5. **\`approvedScope\`** met toegestane filmtypen, exact toegestane kV-lijnen en minimale/maximale waarden van dikte, D, mA en SFD.

Zelfs een aldus gemarkeerd \`CALIBRATED\` profiel krijgt **\`releaseAuthorized=false\`**. De factor is uitsluitend bruikbaar in de research-preview **binnen de ingeschreven scope**. De inhoud van ondertekende dossiers wordt niet cryptografisch door dit script geverifieerd; een bevoegd persoon moet de bewijsstukken werkelijk beoordelen. De UI heeft **geen knop** die zonder review \`CALIBRATED\` instelt.

**Geen automatische vervanging** van \`calculateXray()\`, \`rt-core.mjs\` of \`film-response.mjs\`.

## Toestelmaxima, externe curvegrenzen en geometrie

- Een invoer \`kv>maxKv\`, \`ma>maxMa\` of, indien \`maxPowerKw\` vastgelegd, \`kv×ma/1000>maxPowerKw\`, wordt direct geblokkeerd. **Maxima zijn geen bewijs dat elke combinatie onder de gehele duty-cycle/bedrijfscurve toegestaan is**; daarvoor blijft de toestelhandleiding en onafhankelijke proceduretoets noodzakelijk.
- Onbekende apparatuur, niet-onderbouwde referentiemapping, verkeerde film, niet-aanwezige exacte kV-lijn, ontbrekende meetgegevens, buiten-bereik-dikte en filmzwarting blijven geblokkeerd.
- Geometrie gebruikt **automatisch de profielbrandvlek d**. Afzonderlijk wordt \`f = SFD - b\` en \`Ug=d×b/f\` gerapporteerd. Deze vergelijking wijzigt geen belichtingstijd.
- Een **\`f_min\`-waarde** wordt **niet verzonnen**. \`assessTubeGeometry()\` kan alleen een door de bevoegde organisatie uit de toepasselijke ISO 17636-1-editie / goedgekeurde procedure vastgelegde \`fMinMm\` vergelijken als document-ID, revisie, normeditie en goedkeuringsreferentie alle aanwezig zijn. Zonder die gegevens: \`F_MIN_NOT_DOCUMENTED\` of \`F_MIN_SOURCE_NOT_VERIFIED\`, dus geen procedurevinkje.

## Privacy, opslag en onderzoeksscherm

Open de losse proefpagina \`research/mijn-rontgenbuizen.html\` via een webserver. Zij heeft **geen navigatiekoppeling in de productie-app**, gebruikt geen online API voor dataoverdracht en slaat profielen op onder een aparte \`localStorage\`-sleutel. Lokale browseropslag is echter **niet versleuteld**, kan op gedeelde apparaten worden uitgelezen en is afhankelijk van het domein waar de onderzoekspagina geopend wordt. Gebruik dus **alleen fictieve serienummers en niet-gevoelige proefdata op de publieke testpagina**. Werkelijke kalibratiedossiers en klantgegevens moeten worden bewaard in een beveiligd kwaliteitssysteem.

## Testen

\`\`\`sh
node --test research/xray-core.test.mjs
node --test research/xray-tube-profiles.test.mjs
node research/xray-report.mjs
\`\`\`

Alle voorbeeldwaarden en test-IDs in de regressietests zijn **synthetische invoer voor eenheidstests**; ze komen niet uit een echte proefopname. Ze mogen niet worden gebruikt als onafhankelijke kalibratie.

**Testdekking fase 1:** onbeoordeelde waarschuwing en \`k=1\`, één- en tweepuntsfactoren, exacte proefdoorrekening, max kV/mA/kW, D4-/kV-/dikteblokkades, opslag, expliciete review, ingeperkte scope, brandvlek en f_min-documentatie. \`main\`-ongewijzigdheid wordt aanvullend bewaakt door \`research/xray-core.test.mjs\` (SHA-1 Git-blobhashes van 11 beschermde bestanden) én de GitHub-vergelijking van PR #7 met \`main\`.

## Harde vervolgvoorwaarden

- [ ] Onafhankelijke X-ray-toestel- en filmreferentiecurves met rechten/herkomst en toepasselijke verwerking beschikbaar.
- [ ] Reële meetgegevens, meetonzekerheid en meerpuntsvalidatie in gecontroleerd meetdossier.
- [ ] Toestel-specificaties en bedrijfsenvelop afzonderlijk gecontroleerd.
- [ ] Filmkwaliteit/IQI, densiteit, brandvlek en normatieve f_min binnen bewezen procedure gecontroleerd.
- [ ] Bevoegde RT Level 3 en onafhankelijke software-/kwaliteitsreview tekenen de scope en risicoanalyse af.
- [ ] Alle regressies, CI en afzonderlijke software-review en releasebeslissing afgerond.
- [ ] Afzonderlijke, expliciete toestemming voor enige toekomstige wijziging van de live-rekenmotor; deze fase mag niet naar \`main\` worden gemerged.

**Eindstatus:** onderzoeksprototype. \`main\` en PR #6 blijven ongewijzigd. Geen vrijgave voor RT-opnamen.
