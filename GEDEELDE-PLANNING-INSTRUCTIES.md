# NDT Radiography Pro — één login, rolgestuurde Planning en versleutelde werkbonnen

**Software-onderzoeksversie: geen RT-vrijgave.** De originele exposuremotor, referentiecurves, IQI-tabellen en veiligheidsgrenzen zijn ongewijzigd.

## 1. Inloggen en demomodus

Open de app. Het inlogscherm toont **Inloggen** en **Start demomodus (50 berekeningen)**. Onder de knoppen staat een link **Nieuw account registreren**. De gebruikersrol wordt niet gekozen: de bestaande Supabase Authentication en server-RLS bepalen of de ingelogde gebruiker Planning of Onderzoeker is.

De sessie blijft op het toestel bestaan via de bestaande Supabase-refreshsessie. Bewaarde browser-/sessiegegevens zijn **niet allemaal standaard versleuteld**. Het apparaat of de browser kan een eigen pincode, wachtwoordmanager of biometrische beveiliging aanbieden; de webapp belooft geen zelfstandige FaceID-ontgrendeling.

De demomodus bewaart geen centrale teamgegevens en beschikt over precies de bestaande 50 lokale onderzoeksberekeningen.

## 2. Collega eenmalig uitnodigen (Planning)

1. De beheerder opent **Planning → Collega uitnodigen en werkbon toewijzen**.
2. Vul het exacte e-mailadres van de collega in. Kies eventueel een bedrijfsruimte, mits je daarvoor ook actieve bedrijfsbeheerder bent.
3. Klik **Uitnodigingslink maken**. De server maakt een cryptografisch willekeurige link, zeven dagen geldig en eenmalig te gebruiken.
4. Klik **Open uitnodigingsmail en klik op Verzenden**. Het e-mailprogramma opent een **concept**. De planner verzendt de uitnodiging **zelf**; er wordt geen onzichtbare e-mail verstuurd.
5. De collega opent de link op het toestel, registreert indien nodig, bevestigt de e-mail en logt in met **hetzelfde e-mailadres**. De server koppelt uitsluitend dit bevestigde account als **onderzoeker**, niet als beheerder.
6. Planning selecteert de onderzoeker in het werkbonformulier. De toegewezen werkbon wordt zichtbaar na verversen van Planning.

De link bevat een geheim fragment en wordt direct uit de browseradresbalk verwijderd nadat deze in de tijdelijke browsersessie is vastgelegd. Bewaar of deel de uitnodigingslink niet buiten de bedoelde ontvanger.

## 3. Werkbon in 2 stappen aanmaken

1. Klik als Planning op **+** en kies een PDF of foto. De app leest tekst lokaal en verwerkt deze na bestaande Cloudflare-beveiligingscontrole met de ingestelde Gemini Worker.
2. Controleer en verbeter de voorgestelde gegevens: bonnummer, klant, order, adres, datum, tijden, toestel, procedure/revisie en eventuele **expliciet op de bon vermelde** materiaalaanduiding, wanddikte, SFD, film, doelzwarting of bronactiviteit.

Ontbrekende waarden verschijnen als **Nog in te vullen** en blijven oningevuld. Planning mag zelf gegevens aanvullen en de bon alvast aan een onderzoeker toewijzen, ook als de bon nog niet volledig is. Een niet-toegewezen bon blijft een concept.

De originele PDF/foto staat in een aparte **private Supabase Storage-bucket**, niet in de publieke GitHub-broncode. Alleen Planning en de toegewezen onderzoeker mogen het origineel downloaden.

**Privacy:** bij Gemini wordt herkende documenttekst doorgestuurd naar de ingestelde Cloudflare Worker en externe AI-verwerking. Upload alleen gegevens waarvoor je die verwerking mag gebruiken.

## 4. Onderzoeker op locatie

De onderzoeker ziet uitsluitend eigen, toegewezen bonnen. Open de bon en kies **Start onderzoek**. Expliciet herkende materiaal-/film-/zwartings-/wanddikte-/afstand-/activiteitswaarden zijn **voorstellen**, geen door de app goedgekeurde RT-instellingen. De ontbrekende velden zijn gemarkeerd. Kies zelf de opnametechniek, geometrie, actuele activiteit en het juiste model. **Controleer en bevestig elk veld**, ook voorgestelde waarden, vóór **Berekenen**.

Een andere bon vereist nieuwe controle van de technische parameters. Een volgende opname voor dezelfde bon kan de actuele waarden hergebruiken. De originele reken- en veiligheidsblokkades bepalen nog steeds of een onderzoeksresultaat beschikbaar is.

Klik **Opslaan bij werkbon** om een opname centraal vast te leggen. De planner ziet de aanvullende waarden in de gekoppelde opname. Na de laatste opname kies je **Metingen afronden & terugsturen**. Dat zet de bon op **Gereed**, uitsluitend wanneer alle opnames zijn gesynchroniseerd. De app maakt geen e-mailrapport meer.

## 5. Versleuteld offline werken

Gebruik als ingelogde onderzoeker onder Planning **Versleuteld offline werken** en kies een aparte wachtzin (minimaal 8 tekens). Deze opent de bestaande AES-GCM/PBKDF2 Offline Bunker onder een afzonderlijke persoonlijke werkbonnamespace. De wachtzin is alleen in het geheugen beschikbaar, niet in localStorage of de server.

Na een internetstoring kun je de eerder bevoegde, versleuteld opgeslagen werkbonnen opnieuw ontgrendelen. Nieuwe onderzoeksopnames worden versleuteld in een wachtrij gezet. Bij herstel van de internetverbinding controleert de app eerst de actuele login en bon-toewijzing, en verstuurt de opnames met een unieke client-ID zodat herhaalverzoeken geen dubbele opnames opleveren.

Als de toewijzing op kantoor is gewijzigd, kunnen oude niet-gesynchroniseerde opnames in de bunker achterblijven; meld dit bij Planning. **Gereed** kan pas worden gemeld als de wachtrij leeg is.

Dit is een **expliciet ingestelde offline werkboncache**, niet een belofte dat álle oudere lokale calculatorrecords of login-refreshsessies versleuteld zijn. Afwezige netwerkcontrole maakt een oude offline toewijzing niet automatisch actueel.

## 6. AI Expert, rollen, privacy en veiligheid

Voor ingelogde gebruikers wordt Cloudflare Turnstile in `interaction-only`-weergave gestart. Bij de demomodus is de controle zichtbaar. **De AI Worker controleert het veiligheidstoken nog steeds**, want het weglaten van die controle zonder een op de server geverifieerd alternatief zou misbruik mogelijk maken. De AI Expert blijft alleen een onderzoekshulp.

Planning ziet teambeheerdelen, werkbonnen, gekoppelde opnames en procedurebeheer. Onderzoekers krijgen geen beheerbuttons. Het bestaande eigenaars-Naslag is **uitsluitend voor `ndtradiographypro@outlook.com`**; een onderzoeker of andere bedrijfsbeheerder krijgt via deze werkbonrechten **geen** toegang tot dat materiaal.

De grote oranje onderzoeksversiebalk bovenin wordt alleen voor een geverifieerd ingelogde sessie verborgen. De **waarschuwing naast de rekeninvoer en de veiligheidsstatus van het rekenresultaat blijven bestaan**. Geen van de onderzoeksresultaten geeft toestemming om echte RT-belichtingen uit te voeren.

## 7. Testen vóór publicatie

- Inloggen, opnieuw starten, uitloggen, signup met e-mailbevestiging, demo 50 berekeningen.
- Uitnodiging maken / mailconcept openen / accepteren met juist e-mailadres / verkeerd e-mailadres geweigerd / hergebruik geweigerd.
- Planning vs onderzoeker: geen cross-account inzage in bonnen of privé-Naslag; rolbeveiliging server-side.
- Werkbon uploaden, OCR/AI deels ingevuld, ontbrekende velden ongemoeid, onderzoeker kan wijzigen, originele bon privé.
- Berekenen / opslaan / offline bunker ontgrendelen / offline opname / reconnect / geen dubbele opname / Gereed pas na sync.
- Echte iPhone, Android, laptop/pc en Cloudflare Worker test. Unit- en RLS-tests zijn noodzakelijk, maar vervangen de echte toestellen niet.
