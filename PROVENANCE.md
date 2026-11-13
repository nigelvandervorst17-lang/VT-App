# Herkomst en grenzen van de onderzoeksgegevens

- **Se-75:** originele AGFA/Waygate-belichtingsgrafiek (gedrukte p.16 / PDF index 15), reeds eerder vector-gedigitaliseerd uit door gebruiker aangeleverde `AGFA Structurix films.pdf` (pagina 9). D4, D5, D7; Fe; Pb; filmzwarting 2,0; SFD 1 m; Ci·h; 5–40 mm. 24 punten. **Coördinaten opnieuw tegen de oorspronkelijke PDF-vectorlijnen gecontroleerd (13 november 2026); maximale relatieve afrondingsafwijking 0,38%. De berekende belichtingstijden zijn NIET gevalideerd.**
- **Ir-192:** dezelfde fabrikantgrafiek, middenpaneel op gedrukte p.16. Vectorlijnen D4 (seq 1596), D5 (1597), D7 (1598) uit `AGFA Structurix films.pdf` p.9. Asextractie: 10 mm bij x=334.8819 pt, 90 mm bij x=537.6063 pt, y bij 1 Ci·h ≈ 590.27 pt, log10-interval ≈ 50.0 pt. 27 afgeleide punten. Fe; Pb; D=2,0; 1m. **Tweede onafhankelijke kalibratie noodzakelijk.**
- **X-ray:** `Belichtingsgrafiek SMART 225b.pdf` (door gebruiker aangeleverd), Andrex SMART 225 / AGFA D5 / Pb-schermen 0,027 mm / D=2,5 / 800 mm FFD; 100,120,140,160,180,200,210,225 kV. Gelogde mA·min-lijnen uit `ANDREX_225_VECTOR_CURVES.csv` eerder gedigitaliseerd. Lijnbereik 1–64 mA·min; geen interpolatie tussen kV-lijnen. Grafiekcondities en apparaat kunnen afwijkingen geven. Onafhankelijk herverifiëren.
- **Overige X-ray:** YXLON, COMET, ICM en andere Andrex-modellen zijn navigatieopties zonder ingevoerde belichtingsdata. De app blokkeert hun tijdweergave.
- **Filmzwarting:** geen generieke omzetting van D=2,0 of D=2,5 naar andere densiteiten. Geen ongefundeerde correctiefactoren.
- **Bronverval:** Se-75 halveringstijd 119,78 dagen; Ir-192 73,827 dagen (rekenconstants uit vorige app; vergelijk IAEA afgeronde 120 en 74 dagen). Werkelijke certificaatgegevens blijven noodzakelijk.
- **Belangrijk:** resultaten zijn **niet geverifieerd en nooit vrijgegeven voor werkelijke industriële radiografie**. Niet gebruiken om een röntgenbuis of gammabron te bedienen.
- **Bron-URL:** https://dam.bakerhughes.com/m/15e84aab13c9d73d/original/Radiographic-Film-Systems-Brochure_EN_LR.pdf
- **Hergebruiksrechten:** gebruiker leverde de PDF's aan; onafhankelijk nagaan of uitgever toestemming geeft om afgeleide dataset publiek te verspreiden.


## Aanvullende controle van 13 november 2026
- Een tweede coördinaatextractie uit de oorspronkelijke PDF-vectoren bevestigt alle 24 Se-75-punten binnen maximaal 0.38% afrondingsverschil; D4 bij 5 mm heeft de grootste afwijking.
- Bij Se-75, D4, 25 mm: vectorlijn 44.23 Ci·h tegenover 44,20 Ci·h opgeslagen.
- Drie Waygate-screenshots bij activiteit 25/36/40 Ci leiden (voor zover de overige instellingen én Se-75 identiek zijn) tot respectievelijk 40,67 / 40,96 / 40,89 Ci·h. Geen van deze waarden is rechtstreeks uit de fabrikantgrafiek overgenomen.
- Dit bewijst uitsluitend dat de PDF-coördinaten correct naar getallen zijn omgezet; geen onafhankelijke validatie van filmzwarting, opnamecondities of de door Waygate gebruikte methode.
- **Geen correctiefactor toegevoegd; de berekende app-tijden blijven ongewijzigd en niet vrijgegeven voor echte opnames.**


## IQI-hulpmodule (Basic RT PRO 2.2)
- **Technische basis:** ISO 17636-1:2022 Annex B (draad-IQI minimumwaarden) en ISO 19232-1:2013 (draaddiameters).
- **Toepassing:** SWSI met IQI aan bronzijde, DWDI met IQI aan bron- of filmzijde en DWSI met IQI aan filmzijde; klasse A/B; numerieke eisen uitsluitend voor staal.
- **Beperkingen:** geen automatische uitzonderingen uit ISO 17636-1 §6.9, geen extrapolatie naar andere IQI-technieken, geen goedkeuring van filmkwaliteit of vrijgave. Bij dubbelwandige opnames moet de werkelijk doorstraalde dikte w worden ingevoerd. Filmzijde-IQI en eventueel F-markering/overeenstemming tussen contractpartijen moeten afzonderlijk volgens de norm worden beoordeeld.
- **Normen/licenties:** dit bestand bevat geen volledige norm; controleer auteurs-/hergebruiksrechten van de afgeleide normgetallen bij publicatie in een openbare repository.


## Basic RT PRO 2.3 — naslag, 13 november 2026
- Nieuwe `reference-data.mjs` en `reference-tools.mjs` bevatten geen links naar de automatische tijdscalculator.
- 36 NPS-maten/320 schedule-wanddiktes zijn van de twee pagina's van het aangeleverde Van Leeuwen ASME B36.10/B36.19 naslagblad (bron heeft mogelijk typfouten).
- Zwartingstabel 9×6 is letterlijk overgenomen van `Bereikte Zwarting(1).doc`; toepasselijkheid, meetmethode en nauwkeurigheid zijn **niet gevalideerd**.
- AGFA Structurix filmklassen zijn afhankelijk van de juiste chemische verwerking; waarden in de app zijn een voorbeeld uit de brochure (automatische verwerking).
- Drie oorspronkelijke fabrikantgrafiekafbeeldingen zijn als referentie toegevoegd, niet voor nieuwe automatische belichtingstijden.
- Controleer uitdrukkelijk de rechten van de originele scans en afbeeldingen bij publicatie op GitHub of elders.

## 2.4 aanvullingen (13 november 2026)

Zes door gebruiker ingezonden PNG-afbeeldingen met belichtingsdiagrammen van YXLON SMART 160, 200, 200PC, 225, 300HP en 300PC zijn als ongewijzigde visuele broninhoud (alleen bestandscompressie WebP) toegevoegd in `assets/`.

Nieuwe numerieke data zijn uitsluitend *pixelgebaseerde approximaties* van vijf van deze diagrammen. Zie `DIGITIZATION-2.4.md` voor traceerbare uitgangspunten en passen per kV, `xray-extra-curves.json` voor parameters en `README-2.4.md` voor beperkingen. De SMART 200PC-berekening is bewust geblokkeerd wegens inconsistent geannoteerde log-as. Alle nieuwe curves hebben **geen** onafhankelijk gecontroleerde metrologische herkomst en **geen** bewijs van realistische filmzwarting of reproduceerbare belichtingstijd op een werkelijk apparaat. Voorbereid als privétest, niet als OEM-gegevensbestand of formeel RT Level 3-goedgekeurde werkinstructie.

## Basic RT PRO 2.5 - IQI en filmverdeling (concept, 13 november 2026)
- De normen in de nieuwe proceduremodule zijn uitsluitend gebaseerd op de drie door gebruiker aangeleverde MMT-bedrijfsprocedures: `MM 00102 E r04`, `MM 18100 E r22`, en `MM 11400 E r23`. Er is geen licentie of actuele geldigheid van de onderliggende normeditie geverifieerd.
- `rt-procedure.mjs` selecteert uitsluitend IQI-draden van ondersteunde tabellen en blokkeert ongerechtvaardigde combinaties. ISO lasprocedure t/m 75 mm; ASME gietstukprocedure t/m 76 mm.
- De filmplanner is een geometrische plaatsingshulpmiddel en **niet** een methode voor de normatieve minimumaantallen belichtingen of de werkelijke filmbeelddekking. Bij ISO MME 6A/6B en ASME MME6 is de omtrek-planner bewust geblokkeerd.
- De eigen schetsen (SVG in app, ringdiagram in PDF) zijn alleen indicatief. Alle oude gamma-/X-ray-rekenmodules ongewijzigd.
- Concept-PDF is als commentaar/samenvatting opgesteld. Formele goedkeuring RT Level3 is noodzakelijk.

## 2.8 uitbreiding (13 november 2026)
Automatische curve-assistent hergebruikt de reeds gedigitaliseerde gamma/Andrex/YXLON-gegevens zonder wijziging van formules. Voor COMET EVO 225DS zijn vijf lijnen van het officiële productblad (versie 05, p.2) op grove, visuele basis als kruisingen met y=1 en y=100 mA.min benaderd. Deze handmatige aflezingen hebben onvoldoende nauwkeurigheidsvalidatie en mogen niet als OEM-waarden worden gepresenteerd. De overige COMET modellen blijven alleen naslag of handmatige onderzoeksaflezing. Geen veldvrijgave.
