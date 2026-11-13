# Basic RT PRO 2.5.1 — Filmmiddens in centimeters (PRIVÉTEST)

Deze versie is een kleine update van versie 2.5, met behoud van alle bestaande functies.

## Nieuw

- Per film wordt het **MIDDELPUNT in cm vanaf het 0-punt** nadrukkelijk weergegeven.
- In de filmindeling zijn ook begin- en eindpunten in cm zichtbaar.
- Voor een **rondlas** is het 0-punt nu het **begin van de eerste bruikbare filmstrook** (voorheen stond filmmidden 1 op het 0-punt). Het middelpunt ligt op de halve bruikbare lengte. Hiermee zijn de markeerposities intuïtiever.
- In de export-CSV staan begin, midden, eind, eventuele uitloop voorbij het 0-punt en hoek.
- De schets toont de markeerposities in cm voor maximaal acht films.

## Voorbeeld — 8-inch rondlas, De = 219,1 mm, film = 240 mm, overlap = 10 mm

Omtrek ≈ 68,83 cm. Drie films, de middelpunten liggen op **12,00 cm**, **34,94 cm** en **57,89 cm** vanaf het 0-punt, gemeten over de buitenomtrek. De middenpuntafstand is ongeveer **22,94 cm**. Midden van de ingevoerde bruikbare filmstrook, gemeten vanaf de eigen beginrand is bij een film van 24 cm **12 cm**. Het laatste segment overlapt het begin van de eerste film.

**Let op:** de lengtes zijn theoretische *bruikbare beeldsegmenten*, geen bewijs van volledige lasdekking; de te gebruiken film, werkelijke beeldlengte, opnamehoek, penetratiedikte, IQI en minimumaantal exposures moeten apart volgens de procedure worden gecontroleerd. Niet vrijgegeven voor daadwerkelijke RT-opnames.

## Installeren

Pak ZIP uit, upload de inhoud naar de bestaande webhost-map, ververs Safari online. Door de nieuwe serviceworker-cache `v2.5.1` worden de aangepaste bestanden opgehaald. Alle eerder gebruikte opties blijven intact.
