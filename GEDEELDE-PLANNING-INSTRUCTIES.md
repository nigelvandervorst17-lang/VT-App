# Gedeelde Planning — NDT Radiography Pro

## Accounts en rollen

De werkbonworkflow draait in het bestaande Supabase-project `olugdgrlfyrdyxclphlu`. De tabellen `planning_members`, `planning_workbonnen` en `planning_opnames` hebben RLS. De bucket `planning-werkbonnen` is **privé**. Een anonieme bezoeker heeft geen toegang tot deze data.

Het bevestigde account **ndtradiographypro@outlook.com** heeft de rol **Planning**. Dit verandert niets aan de bestaande privé-Naslag-rechten (uitsluitend dit e-mailadres). Andere accounts kunnen de werkbonomgeving alleen gebruiken als Planning ze expliciet toevoegt.

1. Een onderzoeker maakt zelf via het normale inlogscherm een account aan en bevestigt zijn e-mailadres.
2. Planning logt in, opent **Planning → Onderzoekers toewijzen** en voegt het bevestigde e-mailadres toe.
3. Planning maakt een werkbon aan (of uploadt PDF/foto/TXT) en kiest de onderzoeker in **Onderzoeker toewijzen**.
4. Een incomplete bon blijft **Concept** en is niet beschikbaar voor de onderzoeker. Bij minimaal klant, bonnummer, datum en toewijzing wordt de bon **Ingepland**.
5. Onderzoeker opent de toegewezen bon, kiest **Start onderzoek**, voert zelf geometrie, techniek, wanddikte, SFD/FFD en actuele broninstelling in en controleert het toestelmodel in Rekenen.
6. **Berekenen** roept uitsluitend de bestaande onderzoeksrekenknop aan. **Opslaan bij werkbon** bewaart de actuele indicatieve uitkomst met parameters en onderzoeker-ID in Supabase.
7. Onderzoeker kiest **Meld gereed**; Planning ziet de gekoppelde opnames en kan de werkbon administratief afronden en een mailconcept openen.

## Automatische bonherkenning

Na selectie van een PDF of foto start lokaal tekstlezen/OCR. De herkende tekst wordt na de Turnstile-beveiligingscontrole automatisch naar de bestaande Cloudflare/Gemini Worker verstuurd. Dit betekent dat mogelijk vertrouwelijke klantinformatie naar derden gaat; gebruik alleen werkbonnen waarvoor die verwerking is toegestaan. De originele afbeelding/PDF wordt **niet** voor AI-herkenning doorgestuurd, maar na opslaan wel privé geüpload naar Supabase Storage.

De ontbrekende of onzekere administratieve velden blijven leeg; een werkbon mag als concept worden opgeslagen. Techniek, geometrie, wanddikte, SFD en activiteit worden **niet** door Planning of Gemini als onderzoekerwaarden ingevuld.

Opgenomen originele PDF’s/foto’s zijn uitsluitend toegankelijk voor Planning en de aan de werkbon toegewezen onderzoeker. Werkbonnen en resultaten worden via Supabase gesynchroniseerd; er is geen offline wijzigingswachtrij voor deze gedeelde gegevens.

## Bestaande lokale werkbonnen

De vorige planningversie bewaarde bonnen uitsluitend op het toestel. Deze browsergegevens worden bewust niet zonder bevestiging naar de centrale server verplaatst. Nieuwe bonnen die met de nieuwe workflow worden opgeslagen, zijn direct beschikbaar op andere toestellen na login.

De proefversie kan de twee lokale voorbeeldbonnen tonen, maar mag geen centrale account- of onderzoeksgegevens delen.

## Grenzen

- Alleen onderzoekssoftware: géén RT-vrijgave, geen zelfstandig stralingsbeschermingsplan, geen werkelijke belichtingsautorisatie.
- Formules, referentiecurves, IQI-tabelvalidatie, veiligheid, margen en private Naslag zijn ongewijzigd.
- Cloudflare/Gemini OCR en e-mailprogramma moeten nog end-to-end op de gebruikte mobiele toestellen worden getest.
- Een rapport dat via `mailto:` wordt geopend is een **concept**; de gebruiker controleert en verstuurt het zelf.
