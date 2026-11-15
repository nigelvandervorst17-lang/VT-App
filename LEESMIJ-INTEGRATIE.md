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

## iPhone UX v0.2

Grote tikknoppen voor bronnen, filmtypes en technieken; expliciete labels voor IQI-zijde; lege wanddikte-/zwartingsinvoer met decimaal iPhone-toetsenbord; naam van bevestiger lokaal onthouden na succesvolle opslag. Na opslag is de nieuwe procedure actief en staat er een knop naar Opnameplan. De onderzoekswaarschuwing blijft compact zichtbaar.

**D6** is niet toegevoegd: de bestaande app ondersteunt D2, D3, D4, D5, D7 en D8; een extra filmkeuze zou zonder gevalideerde motordata misleidend zijn.

De gewijzigde bestanden zijn alleen de React-UI (`src/ui/ProcedureSuite.tsx`), stylesheet, gegenereerde UI-browserruntime, de tijdelijke HTML-schil en dit document. Alle bestaande motor-, IQI-, planner- en curvebestanden zijn ongewijzigd.
