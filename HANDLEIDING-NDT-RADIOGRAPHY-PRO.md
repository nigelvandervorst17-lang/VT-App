# Handleiding — NDT Radiography Pro

*Onderzoeksversie. Geen RT-vrijgave of vervanging van geldende NDO-procedures en stralingsbeschermingsmaatregelen.*

## A. Op laptop of pc beginnen

1. Open de GitHub Pages-app in Chrome, Edge, Firefox of Safari. Er is geen installatie vereist.
2. Gebruik op een breed scherm de navigatie bovenaan: **Rekenen**, **Planning**, **Grafieken**, **Naslag**, **AI Expert**, **Logboek**, **Handleiding** en **Instellingen**.
3. Op telefoon is dezelfde functionaliteit beschikbaar via de onderste navigatie en **Meer**.
4. Kies **Inloggen** of **Nieuw account aanmaken**. De gebruiker moet zijn e-mailadres bevestigen. De app heeft voor gedeelde Planning en privédocumenten een internetverbinding nodig.
5. Rekenen werkt op eerder geladen toestellen ook offline, binnen de bestaande gebruikslimieten. Gedeelde werkbonnen en bedrijfsreferenties werken niet offline.

## B. Planning — onderzoeker toevoegen

1. Meld aan als het bevoegde Planning-account.
2. Open **Planning → Onderzoekers kiezen en werkbonnen toewijzen**.
3. In de dropdown **Kies onderzoeker / filter werkbonnen** staan reeds toegevoegde onderzoekers. Selecteer iemand om uitsluitend diens bonnen te tonen.
4. Voor een **nieuwe** onderzoeker: laat hem/haar eerst een account registreren en e-mail bevestigen. Typ vervolgens het exacte e-mailadres in **Onderzoeker toevoegen**. Daarna verschijnt deze in de dropdowns.
5. Klik **+** om een werkbon te maken of uploaden. PDF/foto wordt lokaal uitgelezen; de herkende tekst kan na Turnstile-controle naar de bestaande Gemini Worker worden verzonden.
6. Controleer de herkende klant, adres, bonnummer, order, datum, start-/eindtijd, bron/toestel, procedure en revisie.
7. Kies de onderzoeker uit **Onderzoeker toewijzen (keuzelijst)** in het bonformulier of rechtstreeks uit **Snel onderzoeker toewijzen** op een werkbonkaart.
8. Is de bon niet compleet of nog niet toegewezen, dan blijft hij **Concept**. Zodra bonnummer, klant en datum zijn ingevuld en een onderzoeker is gekozen wordt hij **Ingepland**.
9. Een originele PDF/foto wordt afzonderlijk opgeslagen in een private Supabase-bucket. Via **Originele bon** kunnen uitsluitend bevoegde gebruikers deze weer bekijken.

## C. Onderzoeker — werkbon uitvoeren

1. Log in met het account waaraan de bon is toegewezen.
2. Open **Planning**, kies jouw bon en **Start onderzoek**.
3. De onderzoeker bepaalt zelf **geometrie**, **techniek**, **wanddikte**, **SFD/FFD** en de **broninstelling**. Deze informatie wordt niet uit onbevestigde AI-teksten aangenomen.
4. Controleer film, IQI, opnameklasse, broncertificaat, actuele activiteit en alle geldende veiligheids- en toepassingsgrenzen.
5. Druk **Berekenen**; de originele RT-rekenmotor wordt aangeroepen. Er is geen nieuwe of aparte belichtingsformule.
6. Als er een geldige onderzoeksuitkomst is, tik je **Opslaan bij werkbon**. Deze opname wordt in Supabase gekoppeld aan het bon-ID en de ingelogde onderzoeker.
7. Voor de volgende opname binnen dezelfde bon blijven de laatste instellingen beschikbaar. Bij het wisselen naar een andere bon worden de vijf onderzoeksgegevens opnieuw gevraagd.
8. Na de laatste opname kies je **Meld gereed**. Planning kan gekoppelde resultaten bekijken, de bon administratief afronden en een e-mailconcept openen.

## D. Materiaalcorrectie: koper

Kies onder **Rekenen → Materiaal** voor **Koper**. De bestaande **niet-gevalideerde onderzoeksfactoren** zijn Gamma **1,12** en X-ray **1,50**. De app laat de voorgestelde Fe-equivalente materiaaldikte zien:

- 10 mm koper wordt in de Gamma-onderzoeksvergelijking 11,2 mm Fe-equivalent.
- 10 mm koper wordt in de X-ray-onderzoeksvergelijking 15 mm Fe-equivalent.

Deze factoren zijn niet universeel en niet onafhankelijk gevalideerd voor elke energie, bron en film. De app houdt de bestaande blokkades actief als de equivalente dikte of overige voorwaarden buiten de ondersteunde rekengebieden vallen. Dit is **geen instructie voor werkelijke RT-belichtingen**.

## E. Bedrijfsgrafieken zelf uploaden

1. Ga naar **Meer → Grafieken → Privé-bedrijfsgrafieken** of via Grafieken in het desktopmenu.
2. Voor een werkmap van Planning: log in als Planning en kies **Planning · gedeelde bedrijfsgrafieken**.
3. Voor een NDT-bedrijf: log in met een **actieve bedrijfsbeheerder** die in het bestaande Supabase-bedrijfsaccount de rol *admin* heeft; kies het bedrijf in de keuzelijst.
4. Kies **+ Belichtingsgrafiek privé toevoegen**, voer naam, bron/toestel, revisie, herkomst en bestand in (PDF, JPG, PNG of WEBP, maximaal 12 MB).
5. De bestanden worden in de aparte niet-publieke Supabase-bucket `ndt-company-chart-library` bewaard. Alleen geautoriseerde medewerkers van die map kunnen ze bekijken.
6. **Let op:** de grafieken zijn alleen documentair naslagmateriaal. Ze worden niet automatisch ingelezen, gedigitaliseerd of toegepast bij het berekenen van belichtingstijden.
7. De bestaande speciale privé-Naslag van het eigenaarsaccount blijft onaangeroerd en wordt niet beschikbaar gesteld aan andere beheerders.

## F. Gebruiksstatistieken

Alleen Planning kan in **Planning → Hoeveel mensen gebruiken de app?** de aantallen zien:

- Bevestigde accounts in Supabase.
- Unieke ingelogde accounts vandaag.
- Unieke ingelogde accounts in de afgelopen zeven dagen.
- Unieke ingelogde accounts in de afgelopen dertig dagen.

Er wordt **geen IP-adres, apparaatvingerafdruk of locatie** verzameld voor deze telling. Proefgebruik zonder login telt niet mee. De statistiek geeft dus geen volledig aantal anonieme bezoekers.

## G. Veiligheid en problemen oplossen

- De onderzoeksversie vervangt geen geldige procedure, kwaliteitsbeoordeling, stralingsbeschermingsplan of vrijgave door een bevoegd persoon.
- Bedrijfsgrafieken en eigen documenten vormen geen door de fabrikant of een deskundige gevalideerde blootstellingscurve.
- De automatische bonlezer kan herkenningsfouten maken; corrigeer klant, datum, apparatuur en procedure altijd zelf. Upload vertrouwelijke bonnen alleen met de benodigde toestemming voor AI-verwerking.
- Je kunt geen gedeelde bonnen zien? Controleer je bevestigde e-mailadres, actieve login en toewijzing door Planning.
- Zie je oude knoppen of een oud scherm? Sluit de mobiele PWA volledig, open opnieuw en controleer de verbinding zodat de nieuwe cache geladen wordt.
- Naslag-afbeeldingen van de oorspronkelijke eigenaar blijven strikt privé; registratie bij Planning of bedrijfsbeheer geeft daar geen toegang toe.
