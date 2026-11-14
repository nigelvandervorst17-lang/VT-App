# Basic RT PRO 3.8 BETA — Se-75 en Ir-192, alleen D4/D5/D7

**ONDERZOEKSVERSIE — NIET gebruiken om RT-belichtingen vrij te geven.** Dit is vergelijking met door de gebruiker overgenomen Waygate-calculatoruitkomsten, géén fysische meetkalibratie. Alle tijdswaarden zijn rekenverwachtingen die gecontroleerd moeten worden aan de hand van procedure, broncertificaat, filmverwerking, zwarting en IQI.

## Nieuw
- Gamma-filmselectie beperkt tot **D4, D5, D7**. D2/D3/D8 zijn niet in de gamma-rekenkern beschikbaar.
- **Se-75 D4**: 14 directe software-referentiepunten bij 1–40 mm staal (D=2,0; 40 Ci; 800 mm).
- **Se-75 D5/D7**: verhouding t.o.v. D4, gecontroleerd bij 4, 10, 15, 25 en 30 mm staal; domein 4–30 mm.
- **Ir-192 D4**: 14 software-referentiepunten bij 4–100 mm staal (D=2,0; 40 Ci; 800 mm); de herbevestigde 20 en 40 mm correcties zijn overgenomen.
- **Ir-192 D5/D7**: afgeleide filmfactoren uit software-referenties bij 20 en 50 mm; domein 20–50 mm.
- Per film en isotoop een **film-specifieke empirische lineaire zwartingscorrectie**. D4 Se-75 1,4–3,9; alle overige combinaties 1,5–3,9.
- Activiteit en SFD vrij invulbaar binnen de technisch begrensde invoervelden, omgerekend met 1/Ci en SFD². Bronverval/certificaatmodus blijft intact.
- Geen extrapolatie buiten een film/dikte/zwarting-domein; geen gamma-omrekening voor andere materialen dan Fe.
- Röntgen, IQI en andere naslagfuncties blijven aanwezig.

## Bekende beperkingen
1. **Ir-192 D5/D7 buiten 20–50 mm** is niet op meerdere diktes gecontroleerd; software blokkeert daarom, ook al bestaat een D4-basistabel tot 100 mm.
2. **Se-75 D5/D7 buiten 4–30 mm** wordt niet berekend, ook al bestaat een D4-basistabel tot 40 mm.
3. **Se-75 activiteit 15 Ci**: de gebruiker meldde 38:15 bij D4/10 mm/D=2,0/800 mm, terwijl 40-Ci-referentie met 1/Ci ongeveer 38:35 geeft. De app past **geen onbewezen correctie** toe. Andere Ci/SFD zijn theoretische schalingen, niet bewezen exact gelijk aan Waygate.
4. Een filmzwarting bij 1 punt en een interpolatievorm bewijst niet dat de formule op elke combinatie fysisch klopt. De getoetste bovengrens D=3,9 is een **softwaremodelgrens**, geen normatieve filmzwartingsvrijgave.
5. Geen toestemming of garantie van AGFA/Waygate. Werkprocedures en stralingsbescherming zijn bepalend.

## Rekenmodel
De basispunten worden opgeslagen als Ci·h bij 1000 mm: `Ci·h = seconds_at_40Ci_800mm / 57.6`. Tussen diktes wordt ln(Ci·h) geïnterpoleerd; D5 en D7 gebruiken een per-isotoop-factor t.o.v. D4; zwarting gebruikt `1 + k_film × (D-2.0)`; activiteit is omgekeerd evenredig; SFD kwadratisch. Pas aan het einde wordt de tijd afgerond naar hele seconden.

## GitHub
Pak de **snelle update** uit en upload alle bestanden uit die ZIP naar de hoofdmap van `VT-App`, met dezelfde bestandsnamen. Vervang de bestaande versies en commit. Open daarna de GitHub Pages-website opnieuw of probeer een privévenster om de nieuwe serviceworker-cache te vernieuwen.

## Tests
`node test-3.8.mjs` heeft 120 gerichte checks doorstaan op de gebruikersreferenties, reken-/domeingrenzen en formules. Historische tests van 3.4/3.5/3.7 bevatten *oude* verwachtingen (oude filmrespons, oude toepassingsgrenzen) en zijn voor deze versie vervangen, niet als geslaagde regressietests geclaimd. X-ray-berekeningen zijn in de core niet gewijzigd, maar praktijk- en volledige browsertests zijn niet uitgevoerd.
