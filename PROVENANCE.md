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
