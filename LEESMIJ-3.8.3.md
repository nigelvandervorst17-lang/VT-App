# Basic RT PRO 3.8.3 — mobiele UX en grafieken

## Nieuw
- Vaste, donkere iOS-statusbalk-afdekking en sticky header met `safe-area-inset-top`.
- Vijf hoofdknoppen; Tools, Records, Instellingen via **Meer**.
- Extra padding in dropdowns; geen halfleeg rastervak bij Filmzwarting; sneltoetsen 2,0 / 2,5 / 3,0.
- Se-75/Ir-192 en 7 toestelgrafieken in dezelfde viewer; op grafiek tikken om Ci·h of mA·min af te lezen. Deze X-ray-plots zijn onderzoeksdata, niet gevalideerd.
- X-ray-kaarten tonen kenmerken; technische dataset-ID achter ⓘ.
- Naslag en fabrikantdocumenten ingeklapt; Comet-snelkeuze en catalogus bij elkaar; linkjes breken niet meer midden in een woord.
- Afbeeldingszoom op originele grafiek; lasdetailschets gedimd in donker thema.
- Tools standaard ingeklapt, titels van Tools en belangrijkste nieuwe UI-onderdelen in NL/EN/PL.
- Broncertificaatvelden direct bij Bronnen; SFD−object/film als te controleren geometrievoorstel.
- DWDI/DWSI-hulp: 2 × wanddikte als **bewerkbare nominale schatting**, geen automatische garantie voor de werkelijke stralingsweg.
- Opnieuw geteste sticky-resultaatbalk blijft na een taalwissel binnen Rekenen.
- Serviceworker-cacheversie verhoogd naar 3.8.3.

## Niet veranderd
De gamma-/X-ray-kern, filmcorrecties, normalisatie en rekencurves zijn niet aangepast. Bronverval en IQI-logica zijn gelijk gebleven.

## Nog open
- De oude uitgebreide RT-procedure-inhoud, detailwaarschuwingen en enkele oudere tools bevatten nog Nederlandse tekst bij EN/PL. De taalwissel van de belangrijkste schermen en hoofdtitels is verbeterd, maar **niet alles is al 100% vertaald**.
- Geen echte iPhone/Safari validatie in deze omgeving: de browsertests zijn uitgevoerd met een geïsoleerde Chromium-preview.
- De historische zwartingsfactor uit Naslag is bewust niet automatisch gekoppeld aan belichting omdat die tabel niet als productiecorrectie is gevalideerd.
- De 15-Ci-afwijking bij Se-75 blijft onopgelost.

**Geen gebruik voor werkelijke RT-belichtingen zonder geldige procedure en onafhankelijke praktijkvalidatie.**
