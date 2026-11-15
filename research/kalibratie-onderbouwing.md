# NDT Radiography Pro — Kalibratie-onderbouwing D4/D5/D7

**Documenttype:** Leeg, gecontroleerd onderzoeksformulier · **Revisie:** 0.1 · **Datum:** 15 november 2026  
**Repository/branch:** nigelvandervorst17-lang/VT-App / gamma-nine-point-factor-review  
**Bijbehorende onderzoeks-PR:** #6 (draft; niet samenvoegen)  
**Status:** **GEEN MEETGEGEVENS ONTVANGEN · NIET GEVALIDEERD · GEEN KALIBRATIEVRIJGAVE**

Dit formulier dient voor onafhankelijk meetbewijs en formele beoordeling. De negenpuntscontrole toont slechts softwarematige overeenkomsten; deze zijn geen fysische validatie. Geen opdracht voor het uitvoeren van radiografische belichtingen. Metingen met ioniserende straling mogen uitsluitend plaatsvinden binnen een daarvoor bevoegde, vergunde en goedgekeurde organisatie, volgens geldende stralingsbeschermingsprocedures.

**Privacy:** deze GitHub-repository kan openbaar zijn. Bewaar ingevulde bronidentificaties, klantinformatie, certificaten, films en volledige meetrapporten in een beveiligd documentbeheersysteem. Voeg in deze openbare repository uitsluitend het **lege sjabloon** of niet-identificeerbare dossierverwijzingen toe.

## 1. Projectdossier en gecontroleerde documentatie

| Verplicht dossiergegeven | Waarde of beveiligde dossierreferentie |
|---|---|
| Project-/meetdossiernummer | … |
| Klant/project (intern referentienummer, geen gevoelige gegevens) | … |
| Meetplan nummer, revisie en goedkeuringsdatum | … |
| RT-procedurenummer en revisie | … |
| Toepasselijke normen, editie, klasse en acceptatievoorwaarden | … |
| Onderzoeker/personeelscode, RT-kwalificatie en bevoegdheidsbereik | … |
| RT Level 3 / verantwoordelijk beoordelaar, kwalificatiebereik | … |
| Onafhankelijke reviewer / kwaliteitsfunctie | … |
| Vergunning / werkautorisatie / stralingsbeschermingsreview, dossier-ID | … |
| Plaats, onderzoeksperiode, datum en tijdzone | … |
| Ruwe-dataregister, toegangsbeheer en bewaartermijn | … |
| Meetapparatuurcertificaten, filmbatchdocumenten, films en logboek-IDs | … |
| Vooraf goedgekeurde meetonzekerheids- en acceptatiecriteria | … |
| Documentstatus | CONCEPT — NIET VRIJGEGEVEN |

### Revisions

| Revisie | Datum | Wijziging | Opsteller | Beoordelaar |
|---|---|---|---|---|
| 0.1 | 2026-11-15 | Leeg sjabloon aangemaakt; geen metingen | — | — |
| … | … | … | … | … |

## 2. Vijf openstaande geblokkeerde tests

| Test | Isotoop | Film | Staal t (mm) | Activiteit (Ci) | SFD (mm) | Zwarting D | Huidige blokkade | Bewijs-ID/status |
|---:|---|---|---:|---:|---:|---:|---|---|
| 38 | Ir-192 | D5 | 15 | 40 | 800 | 2,0 | D5-curve vanaf 20 mm | … / GEBLOKKEERD |
| 39 | Ir-192 | D7 | 15 | 40 | 800 | 2,0 | D7-curve vanaf 20 mm | … / GEBLOKKEERD |
| 43 | Se-75 | D4 | 10 | 40 | 800 | 1,2 | D onder modelgrens 1,5 | … / GEBLOKKEERD |
| 48 | Se-75 | D7 | 20 | 40 | 800 | 3,5 | D boven modelgrens 3,2 | … / GEBLOKKEERD |
| 49 | Ir-192 | D4 | 40 | 40 | 800 | 3,9 | D boven modelgrens 3,2 | … / GEBLOKKEERD |

**Belangrijk onderscheid:** aantonen dat een zwarting fysisch kan worden gemeten is niet hetzelfde als aantonen dat zij toegestaan is volgens de toepasselijke ISO-/klantprocedure, kijker, techniek en testklasse. D = 1,2 of D = 3,9 mag nooit automatisch operationeel worden vrijgegeven.

## 3. Meetmatrix A — Ir-192 D5 en D7 onder 20 mm

Documenteer onafhankelijke punten bij **10 mm en 15 mm**, met **20 mm** als aangrenzende referentie voor continuïteitscontrole. Een uit de D4-curve afgeleide filmfactor bewijst op zichzelf geen geldigheid onder 20 mm.

| Punt-ID | Isotoop | Film | Staal (mm) | Nominale D | Meetreeks-ID | Werkelijke D | Gemeten tijd (uu:mm:ss) | Controle/besluit |
|---|---|---|---:|---:|---|---|---|---|
| IR-D5-10 | Ir-192 | D5 | 10 | 2,0 | … | … | … | Ontbreekt |
| IR-D5-15 | Ir-192 | D5 | 15 | 2,0 | … | … | … | Ontbreekt (test 38) |
| IR-D5-20-REF | Ir-192 | D5 | 20 | 2,0 | … | … | … | Referentie |
| IR-D7-10 | Ir-192 | D7 | 10 | 2,0 | … | … | … | Ontbreekt |
| IR-D7-15 | Ir-192 | D7 | 15 | 2,0 | … | … | … | Ontbreekt (test 39) |
| IR-D7-20-REF | Ir-192 | D7 | 20 | 2,0 | … | … | … | Referentie |

- [ ] Geldige en herleidbare D4-basisreferenties bij overeenkomstige condities vastgesteld.
- [ ] D5- en D7-verhoudingen onafhankelijk getoetst in het relevante diktegebied; herhalingen en variatie onderzocht.
- [ ] Norm- en proceduretoelaatbaarheid van Ir-192 bij deze diktes afzonderlijk beoordeeld.
- [ ] Beeldkwaliteit/IQI, geometrie en screens gecontroleerd.
- [ ] Geen uitbreiding naar **4–100 mm** of een ander totaalbereik uitsluitend op basis van 10-, 15- en 20-mm-punten; elk vrijgegeven bereik heeft eigen onderbouwing.

## 4. Meetmatrix B — optische zwartingscurve

Registreer de **zeven doelpunten D = 1,2 · 1,5 · 2,0 · 2,5 · 3,0 · 3,5 · 3,9** voor **D4, D5 en D7**. Vanwege verschillen in gamma-energie worden **Se-75 en Ir-192 afzonderlijk beoordeeld**. Vul per cel het meetreeks-/ruwe-data-ID in; de daadwerkelijk gemeten D kan van de doelwaarde afwijken en moet apart worden geregistreerd.

| Isotoop / film | D=1,2 | D=1,5 | D=2,0 | D=2,5 | D=3,0 | D=3,5 | D=3,9 |
|---|---|---|---|---|---|---|---|
| Se-75 · D4 | … | … | … | … | … | … | … |
| Se-75 · D5 | … | … | … | … | … | … | … |
| Se-75 · D7 | … | … | … | … | … | … | … |
| Ir-192 · D4 | … | … | … | … | … | … | … |
| Ir-192 · D5 | … | … | … | … | … | … | … |
| Ir-192 · D7 | … | … | … | … | … | … | … |

| Open test | Vereiste gegevens om beoordeling te starten | Dossier-ID | Uitkomst |
|---:|---|---|---|
| 43 | Se-75 D4, 10 mm, D=1,2 én normatieve toelaatbaarheid | … | Geblokkeerd |
| 48 | Se-75 D7, 20 mm, D=3,5 én densitometer-/kijkergrenzen | … | Geblokkeerd |
| 49 | Ir-192 D4, 40 mm, D=3,9 én densitometer-/kijkergrenzen | … | Geblokkeerd |
| 53 | Se-75 D5, 12 mm, D=2,5, onafhankelijke factorcontrole | … | Numeriek passend, niet gevalideerd |
| 54 | Se-75 D4, 10 mm, D=2,5, onafhankelijke factorcontrole | … | Numeriek passend, niet gevalideerd |

Vereisten bij deze matrix:
- [ ] D=2,0-referentie per combinatie aanwezig en herleidbaar; géén blind hergebruik van één basisreeks voor verschillende isotopen.
- [ ] Herhalingen, procesvariatie, film-/batchvariatie en onzekerheid geregistreerd volgens een **vooraf goedgekeurd meetplan**.
- [ ] Nieuw dichtheidsbereik en interpolatie uitsluitend gebaseerd op meetgegevens; ontbrekende punten blijven onbeschikbaar.
- [ ] De geschiktheid van de huidige uit **200-kV-filmsensitometrie** afgeleide filmrespons voor beide gamma-isotopen is onafhankelijk onderbouwd, of het model wordt gescheiden/vervangen in een aparte wijziging.
- [ ] D=1,2 en D=3,9 zijn apart tegen toepasselijke procedure-/normgrenzen getoetst. Ongeoorloofde zwartingen blijven **geblokkeerd**, ook als zij meetbaar zijn.

## 5. Vast meetformulier — kopiëren per meetreeks

**Meetreeks-ID:** … · **Datum/tijdzone:** … · **Onderzoeker/personeelscode:** … · **Tweede controleur:** …  
**Beveiligd meetdossier:** … · **Goedgekeurd meetplan/revisie:** … · **Testnr of matrixpunt:** …

### 5A. Stralingsbron

| Verplicht vast veld | Waarde / bewijs-ID |
|---|---|
| Gebruikte isotoop: Se-75 / Ir-192 | … |
| Bronidentificatie, certificaatnummer (beveiligde referentie) | … |
| **Bronactiviteit (Ci)** en referentiedatum/tijd | … |
| Activiteit op moment van meting; gebruikte verval-/onzekerheidsregistratie | … |
| **Effectieve bronafmeting (mm)** en herkomst | … |
| Apparatuur-/bronhouder-ID en operationele goedkeuringsreferentie | … |

### 5B. Opstelling, geometrie en materiaal

| Verplicht vast veld | Waarde / bewijs-ID |
|---|---|
| **Staaldikte t (mm)**, materiaalsoort, meetmethode, diktemiddel | … |
| **SFD (mm)**, meetreferentie en meetonzekerheid | … |
| Opnametechniek/geometrie (bijv. SWSI/DWSI/DWDI) en onderbouwing | … |
| Object-film-afstand (mm) en relevante geometrische condities | … |
| **Loodschermen vóór film: type en dikte (mm)** | … |
| **Loodschermen achter film: type en dikte (mm)** | … |
| Cassettesysteem, schermcontact en relevante opstellingsvariabelen | … |
| IQI-indicatie, plaatsing, filmdekking en beeldkwaliteit (indien van toepassing) | … |
| Opstellingsschets-/logboek-ID | … |

### 5C. Film en verwerking

| Verplicht vast veld | Waarde / bewijs-ID |
|---|---|
| **Filmtype D4 / D5 / D7** | … |
| **Fabrikant, filmproduct en batch/lot** | … |
| Filmhoudbaarheid en opslagcondities (bewijs-ID) | … |
| Ontwikkelchemicaliën, batch, proces en verwerkingsinstelling | … |
| **Ontwikkeltijd (min:s)** | … |
| **Ontwikkeltemperatuur (°C)** | … |
| Overige verwerking, procescontrole en afwijkingen | … |
| **Densitometer-ID**, serienummer in beveiligd dossier | … |
| Densitometerkalibratie / referentiewig, datum en bruikbaar meetbereik | … |
| Filmviewer, kijkcondities en aantoonbaar bruikbaar zwartingsbereik | … |

### 5D. Metingen en ruwe gegevens

| Verplicht vast veld | Waarde / bewijs-ID |
|---|---|
| Beoogde optische zwarting D | … |
| **Gemeten optische zwarting D** (meetplaats en methode vermelden) | … |
| **Gemeten belichtingstijd (uu:mm:ss)** | … |
| Herleidbare tijdregistratie / tijdmeetinstrument | … |
| Activiteit (Ci) en SFD (mm) op meetmoment | … |
| Densitometer nul-/referentiecontrole en basis+sluierbehandeling | … |
| Film-ID's, aantal herhalingen, gemeten variatie en onzekerheid | … |
| Afwijking tussen doelzwarting en meetwaarde | … |
| IQI-, film- en procesafwijkingen / ruwe-data-ID | … |

| Herhaling | Film-ID | Belichtingstijd (uu:mm:ss) | Gemeten D | Activiteit (Ci) | SFD (mm) | Ontwikkeltemp. (°C) | Ruwe-data-ID |
|---:|---|---|---|---|---|---|---|
| 1 | … | … | … | … | … | … | … |
| 2 | … | … | … | … | … | … | … |
| 3 | … | … | … | … | … | … | … |
| … | … | … | … | … | … | … | … |

**Beoordeling per meetreeks**

- Vooraf vastgelegde acceptatiecriteria en methode voor normalisatie: …
- Onzekerheidsbegroting / herhaalbaarheid / reproduceerbaarheid: …
- Onafhankelijk bevestigingsonderzoek en dossier-ID: …
- Afwijkingen, uitschieters, corrigerende maatregelen: …
- Resultaat: [ ] Voldoet [ ] Voldoet niet [ ] Gegevens onvoldoende
- Onderzoeker + datum + ondertekening in beveiligd dossier: …
- Onafhankelijke reviewer + datum + ondertekening in beveiligd dossier: …

## 6. Afleiding en onderbouwing van voorgestelde onderzoeksfactoren

De huidige onderzoeksbranch gebruikt bij **D=2,5** uitsluitend de *voorlopige* factoren:

| Film | Onderzoeksfactor D=2,5 | Herkomststatus |
|---|---:|---|
| D4 | **1,4278** | Afgestemd op referentietest 54; geen onafhankelijke kalibratie |
| D5 | **1,3085** | Afgestemd op referentietest 53; geen onafhankelijke kalibratie |
| D7 | **ongewijzigd** | Geen wijziging voorgesteld |

De bestaande Se-75 **D5/D4-basisverhouding ≈ 0,584514** blijft behouden. Dit is een huidige softwareverhouding, niet automatisch een algemeen geldende laboratoriumconstante.

| Isotoop / film | Referentiereeks D=2,0 | Reeks D=2,5 | Onafhankelijk berekende factor | Onzekerheid | Afwijking t.o.v. voorstel | Validatiestatus |
|---|---|---|---|---|---|---|
| Se-75 D4 | … | … | … | … | … | Open |
| Se-75 D5 | … | … | … | … | … | Open |
| Se-75 D7 | … | … | … | … | … | Open |
| Ir-192 D4 | … | … | … | … | … | Open |
| Ir-192 D5 | … | … | … | … | … | Open |
| Ir-192 D7 | … | … | … | … | … | Open |

**Analyseregels:** vergelijk alleen herleidbare gelijkwaardige referentiecondities; leg normalisatie, vooraf vastgestelde nauwkeurigheids-/onzekerheidsgrenzen en modelpassing vast. Gebruik onafhankelijke verificatiemetingen die **niet** zijn ingezet om de factoren te kiezen. Valideer per isotoop, film, batch-/ontwikkelproces en diktegebied. Een gemeenschappelijke factor voor alle omstandigheden mag uitsluitend worden toegepast als die generalisatie is aangetoond.

## 7. Vrijgavechecklist — vóór wijziging van film-response.mjs of samenvoeging PR #6

**Beginstatus: alle vakjes staan open; geen toestemming is verondersteld.**

### A. Meetbewijs en traceerbaarheid

- [ ] Gecontroleerd, vooraf goedgekeurd meetplan met vooraf vastgelegde acceptatiecriteria bestaat.
- [ ] Alle betrokken meetreeksen hebben volledige gegevens uit §5, inclusief bron, activiteit (Ci), bronafmeting (mm), staal, SFD, schermen vóór/achter, film/fabrikant/batch, ontwikkeltijd/temperatuur, densitometer-ID, werkelijk gemeten D en tijd (uu:mm:ss).
- [ ] Bron-/apparatuurcertificaten, kalibraties, tijdregistratie, onzekerheden en ruwe film-/procesdata zijn herleidbaar.
- [ ] Ir-192 D5 én D7 bij **10 mm en 15 mm** zijn onderzocht; resultaten zijn met aangrenzende referenties en relevante kwaliteitsvereisten vergeleken.
- [ ] Voor D4/D5/D7 zijn de doelpunten **1,2 / 1,5 / 2,0 / 2,5 / 3,0 / 3,5 / 3,9** per beoogde broncombinatie herleidbaar onderzocht; ontbrekende waarden niet ingevuld of geïnterpoleerd alsof ze gemeten zijn.
- [ ] Herhalingen, onafhankelijke meetreeksen, meetonzekerheid en proces-/batchvariatie zijn geanalyseerd.
- [ ] Een onafhankelijke reviewer heeft de brongegevens, methode en conclusies gecontroleerd.

### B. Fysische/normatieve modelvaliditeit

- [ ] **D4 = 1,4278** en **D5 = 1,3085** zijn met *onafhankelijke* metingen onderbouwd; uitsluitend tests 53/54 passend maken is onvoldoende.
- [ ] Filmverhouding D5/D4 en zwartingscorrectie per film zijn aantoonbaar van elkaar gescheiden en hun geldige interval is vastgesteld.
- [ ] D7 blijft bij deze onderzoekswijziging ongewijzigd; elke latere D7-wijziging heeft een afzonderlijke onderbouwing.
- [ ] Se-75-/Ir-192-specifieke toepassingen zijn beoordeeld; overdracht van de huidige **200-kV-filmsensitometrie** naar gamma is onafhankelijk verantwoord of vervangen.
- [ ] Toepasbaarheid per filmtype, dikte, bron, activiteit-/afstandscondities en verwerkingsproces is expliciet begrensd. Buiten het bewezen domein blijft de app blokkeren.
- [ ] D=1,2 en D=3,9 zijn afzonderlijk getoetst aan toepasselijke norm, klasse, klantprocedure en filmviewer; indien niet toegestaan, blijven ze operationeel geblokkeerd ongeacht meetbaarheid.
- [ ] Beeldkwaliteit/IQI en overige RT-procedure-eisen zijn separaat getoetst. Kalibratie van zwarting vervangt geen procedurevrijgave.

### C. Softwarewijziging en code-review

- [ ] Een afzonderlijk en gecontroleerd wijzigingsvoorstel bepaalt of, waar en voor welk bereik de bewezen factoren naar **film-response.mjs** mogen worden overgezet; de huidige onderzoeksbranch zelf wijzigt dat bestand niet.
- [ ] De noodzakelijke aanpassingen aan film- en zwartingsgrenzen zijn expliciet en afzonderlijk beoordeeld; er is geen automatische verruiming.
- [ ] De volledige **60-puntentest**, de **negenpuntscontrole**, nieuwe onder-/bovengrenscases en onafhankelijk gemeten referentiegevallen zijn met gedocumenteerde toleranties herhaald.
- [ ] Er is een impactanalyse voor alle andere uitkomsten, D4-basiscurves, D5/D7-filmverhoudingen en bestaande veiligheidsblokkades.
- [ ] Versiebeheer, CI-tests, peer-review, rollback en herkomst-/rechtencontrole zijn aantoonbaar afgerond.
- [ ] De verantwoordelijke RT Level 3 binnen diens bevoegdheidsbereik én onafhankelijke software-/kwaliteitsreviewer hebben het softwarewijzigingsvoorstel formeel goedgekeurd.
- [ ] PR #6 is expliciet apart beoordeeld. **Alleen na** formele toestemming van bevoegde repositorybeheerders mag een merge naar **main** plaatsvinden. Dit formulier of een geslaagde test mag niet automatisch mergen.

### D. Afzonderlijk besluit voor praktisch RT-gebruik

- [ ] De organisatie heeft onafhankelijk van de softwarecode een geldige, goedgekeurde RT-procedure, vergunningen, stralingsbescherming, apparatuurvoorwaarden en bevoegd personeel gecontroleerd.
- [ ] Toepassing van een berekende belichtingstijd als werkvoorbereidingshulpmiddel is binnen het expliciet goedgekeurde bereik afzonderlijk toegestaan. **Een GitHub-merge is nooit gelijk aan praktische RT-vrijgave.**

## 8. Formeel besluit / ondertekening (leeg)

| Besluitonderdeel | Waarde |
|---|---|
| Dossier-/meetplanrevisies en bijlagen | … |
| Bewezen bron-, film-, dikte- en zwartingsbereik | … |
| Resterende beperkingen / blijvend geblokkeerde gevallen | … |
| Onafhankelijke validatierapportage en acceptatiecriteria | … |
| RT Level 3: naam/code, bevoegdheid, datum, handtekening | … |
| Onafhankelijke reviewer: naam/code, datum, handtekening | … |
| Software-eigenaar/releasebevoegde: naam/code, datum, handtekening | … |
| Aparte praktische RT-/stralingsbeschermingsautorisatie (indien toepasselijk) | … |

**Kies na beoordeling precies één status:**

- [ ] Onderzoek onvolledig; de vijf blokkades blijven van kracht.
- [ ] Onderzoeksgegevens onvoldoende of afgekeurd; geen softwarewijziging.
- [ ] Aanvullende metingen vereist; geen softwarewijziging.
- [ ] Gegevens technisch beoordeeld: aparte code-PR mag worden voorbereid binnen afgebakende scope; nog niet mergen.
- [ ] Softwarewijziging afzonderlijk formeel goedgekeurd, gereviewd en beheerd vrijgegeven; **dit is geen automatische RT-opnamevrijgave**.

**Ondertekening/revisie in beveiligd dossier:** …

---

**Aanmaakstatus:** geen echte metingen of handtekeningen ingevuld. Tests **38, 39, 43, 48 en 49 blijven geblokkeerd**. Onderzoeksfactoren D4/D5 blijven alleen in research; de bestaande rekenmotor, kalibratiecurves, live-interface, main en PR #6 worden niet veranderd of samengevoegd.
