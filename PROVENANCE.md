# Herkomst en grenzen van de onderzoeksgegevens

- **Se-75:** originele AGFA/Waygate-belichtingsgrafiek (gedrukte p.16 / PDF index 15), reeds eerder vector-gedigitaliseerd uit door gebruiker aangeleverde `AGFA Structurix films.pdf` (pagina 9). D4, D5, D7; Fe; Pb; filmzwarting 2,0; SFD 1 m; Ci·h; 5–40 mm. 24 punten. Nog niet onafhankelijk gecontroleerd.
- **Ir-192:** dezelfde fabrikantgrafiek, middenpaneel op gedrukte p.16. Vectorlijnen D4 (seq 1596), D5 (1597), D7 (1598) uit `AGFA Structurix films.pdf` p.9. Asextractie: 10 mm bij x=334.8819 pt, 90 mm bij x=537.6063 pt, y bij 1 Ci·h ≈ 590.27 pt, log10-interval ≈ 50.0 pt. 27 afgeleide punten. Fe; Pb; D=2,0; 1m. **Tweede onafhankelijke kalibratie noodzakelijk.**
- **X-ray:** `Belichtingsgrafiek SMART 225b.pdf` (door gebruiker aangeleverd), Andrex SMART 225 / AGFA D5 / Pb-schermen 0,027 mm / D=2,5 / 800 mm FFD; 100,120,140,160,180,200,210,225 kV. Gelogde mA·min-lijnen uit `ANDREX_225_VECTOR_CURVES.csv` eerder gedigitaliseerd. Lijnbereik 1–64 mA·min; geen interpolatie tussen kV-lijnen. Grafiekcondities en apparaat kunnen afwijkingen geven. Onafhankelijk herverifiëren.
- **Overige X-ray:** YXLON, COMET, ICM en andere Andrex-modellen zijn navigatieopties zonder ingevoerde belichtingsdata. De app blokkeert hun tijdweergave.
- **Filmzwarting:** geen generieke omzetting van D=2,0 of D=2,5 naar andere densiteiten. Geen ongefundeerde correctiefactoren.
- **Bronverval:** Se-75 halveringstijd 119,78 dagen; Ir-192 73,827 dagen (rekenconstants uit vorige app; vergelijk IAEA afgeronde 120 en 74 dagen). Werkelijke certificaatgegevens blijven noodzakelijk.
- **Belangrijk:** resultaten zijn **niet geverifieerd en nooit vrijgegeven voor werkelijke industriële radiografie**. Niet gebruiken om een röntgenbuis of gammabron te bedienen.
- **Bron-URL:** https://dam.bakerhughes.com/m/15e84aab13c9d73d/original/Radiographic-Film-Systems-Brochure_EN_LR.pdf
- **Hergebruiksrechten:** gebruiker leverde de PDF's aan; onafhankelijk nagaan of uitgever toestemming geeft om afgeleide dataset publiek te verspreiden.
