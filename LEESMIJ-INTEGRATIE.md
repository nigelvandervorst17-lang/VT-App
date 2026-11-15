# NDT Radiography Pro — geïntegreerde app-preview

Deze ZIP is een **volledige aparte app-kopie** met de procedure-suite toegankelijk via de knop op het startscherm. Alle bestaande motorbestanden en curves komen ongewijzigd uit de plaatselijke 3.8.6-kandidaat. Voor een echte productie-integratie moet dit tegen de LIVE GitHub-main worden gesynchroniseerd.

De nieuwe procedurelaag bevat: PDF/DOCX/TXT-tekstparser, verplichte bevestiging, profielbibliotheek (IndexedDB), actief profiel, import/export JSON, opnameplan, IQI, geometrie, historie en motoradapter. Broncode staat in procedure-suite-source en het lokale browserdoel in procedure-runtime.

## Opstarten

Gebruik een lokale HTTP-server of zet deze app in een aparte testomgeving onder HTTPS. Open index.html en kies Procedure Suite. Met `python -m http.server` lokaal op http://localhost:8000 testen. Bestand direct als file:// openen werkt niet met moderne importmodules.

De tijdelijke browserbuild gebruikt externe ESM-react en PDF.js/Mammoth-CDN's (geen offline garanties; client-server-exfiltratie door een extern gehost script is niet uitgesloten). Gebruik voor vertrouwelijke procedurebestanden een eigen server/build met gepinde lokaal gehoste dependencies.

## Onderzoeksstatus

De module **wijzigt** rt-core.mjs, rt-curves.mjs, rt-curves.json en xray-extra-curves.mjs NIET. De app is niet Waygate-vrij alleen door herbenoemen of toevoegen van een proceduremodule. Normtabellen en opnameregels moeten nog Level 3-gecontroleerd ingevoerd worden. De getoonde tijden zijn geen vrijgave voor daadwerkelijke RT-belichting.

## Tests

15 package-tests. React-integratie en daadwerkelijke Safari-browserfuncties zijn nog niet live gevalideerd.
