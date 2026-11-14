# Basic RT PRO 3.8.5 — eenvoudige plaat- en buisinvoer

Gemaakt op basis van Basic RT PRO 3.8.4.

## Nieuw
- Bovenaan Rekenen: Plaat / Las of Pijp / Buis.
- Plaat: alleen gemeten wanddikte, met snelkeuzes 6/10/12/16/20 mm.
- Buis: zelf gemeten buitendiameter (snelkeuzes 60/89/114/168/219/324 mm) en t (4/6/8/10/12 mm).
- Buis: w=2*t **uitsluitend als nominale startaanname**. w is bewerkbaar voor echte stralingsweg bij schuine belichting.
- De bestaande calculator rekent voortaan met het gesynchroniseerde w-veld; geen tweede calculator.
- Voorstel DWDI bij diameter <=100 en t<=8 alleen na expliciete bevestiging; **niet** automatisch DWSI bij diameter >100.
- IQI-klasse, positie, aantal opnames en normgeschiktheid worden **niet** automatisch goedgekeurd.
- NPS/Schedule-sectie verborgen uit Naslag, maar de oude data blijven intact voor interne compatibiliteit.
- Nederlands, Engels en Pools voor de nieuwe invoer.
- Werkstukmaten meegenomen in lokaal onderzoeksrecord.

**Let op**: Ø en t alleen bepalen de juiste techniek, benodigde IQI en opnames NIET. Daarvoor zijn opstelling, lasbreedte, bron- en filmpositie, klasse, beeldkwaliteit en de toepasselijke procedure nodig. Filmzwarting en praktische belichting moeten apart worden gevalideerd.

## GitHub

Pak de volledige ZIP uit en upload alle bestanden naar de root van je GitHub Pages repository. Test de nieuwe vorminvoer en de standaard tijden 14:28 voor Se-75 D4 10 mm en 11:07 voor Ir-192 D4 20 mm op 40 Ci, 800 mm en D=2,0.
