# BASIC RT PRO / NDT Radiography Pro — iPhone UX v0.2

Datum: 15 november 2026. **Prototype voor controle**, niet vrijgegeven voor werkelijke RT-opnamen.

## Gewijzigde functies

1. Multiselect (toegestane bronnen, films, technieken) en enkelkeuze (opnameplan, IQI-zijde) zijn tastbare tegels met `aria-pressed`, focusrand en geselecteerde kleur. Interne waarden blijven ongewijzigd.
2. Wanddikte en zwarting hebben geen standaardgetal `0`; `Number.NaN` is de interne niet-ingevulde stand, die door de bestaande controles wordt afgekeurd. Invoer gebruikt `type="text"` / `inputMode="decimal"` en onthoudt een tijdelijk decimaalteken tijdens typen.
3. `source` wordt getoond als `Bronzijde (Source)`; `film` als `Filmzijde (Film)`; opgeslagen waarden blijven `source`/`film` voor compatibiliteit.
4. Naam of personeelscode wordt na **succesvolle opslag** in browser-localStorage op hetzelfde apparaat onthouden. Het originele procedureprofiel bevat nog steeds de individuele bevestiger.
5. Onderzoekswaarschuwing blijft zichtbaar, maar extra privacydetails zijn in een uitklapgedeelte gezet. Na opslaan wordt de zojuist bevestigde procedure actief en verschijnt direct een knop `Verder naar Opnameplan →`.

## Regressiecontrole

- 15 bestaande tests voor parser, procedurevalidatie, film/IQI en motoradapter: geslaagd.
- 8 aanvullende **statische UX-contracttests**: geslaagd.
- Syntaxcontrole van gegenereerde browser-JS: geslaagd.
- Alle originele bron-, curve-, IQI-, geometrie-, motoradapter- en rekencodebestanden byte-voor-byte gelijk gebleven aan de vorige testversie.
- Volledige React-build en daadwerkelijke Safari/iPhone-bediening **niet live gevalideerd**: npm-afhankelijkheden en internettoegang zijn hier niet beschikbaar.

**Let op:** D6 is niet toegevoegd; in de huidige app zijn D2, D3, D4, D5, D7 en D8 bekend. Het toevoegen van een niet-ondersteund filmtype zonder bijbehorende data is onveilig.

De app heeft nog leveranciersafhankelijke referentiegegevens uit eerdere versies. Deze UX-update maakt de curves niet Waygate-onafhankelijk.
