# NDT Radiography Pro — geïntegreerde bedrijfsmodus (testversie)

**Status:** ONDERZOEK / STAGING, **geen gevalideerde RT- of kalibratievrijgave**.  
**Branch:** \`research/integrated-company-suite\`. \`main\`, PR #6 en PR #7 worden niet samengevoegd of gewijzigd.  
**Startpagina:** \`research/company-suite/index.html\`.

Dit is een statische onderzoeksfrontend met een live aangesloten Supabase-TESTproject **Basic NDT** (`olugdgrlfyrdyxclphlu`). De zeven tabellen, RLS en de beveiligde functies van schema v1 én v2 zijn **op 16 november 2026 toegepast**. Er zijn nog geen testgebruikers of bedrijven geregistreerd; e-mail-/Magic-Link redirects en echte accounttests vereisen verdere bevestiging.

## Startscherm op iPhone, Android en laptop — 50 proefberekeningen

- De testpagina opent nu **direct op Opnameplan / Rekenwerkbank**. Bovenaan staat **Gratis proefversie: nog X van 50 berekeningen** met een voortgangsbalk.
- Zonder account kan een bezoeker **50 geslaagde onderzoeksberekeningen** bekijken in **Gamma**, **X-ray**, **Pijp/filmdekking**, **IQI-draadnummerhulp** en **Materialen**. Ongeldige invoer en geblokkeerde combinaties worden niet geteld.
- Na de vijftigste geslaagde berekening **schakelt de UI over naar het Account-tabblad** en wordt verder rekenen als gast geblokkeerd. Een ingelogde medewerker kan verder met onderzoeksberekeningen.
- De teller staat in **localStorage op dit apparaat/deze browser** en is niet fraudebestendig; opslag wissen of een andere browser kan hem resetten. Dit is **geen server-side proefabonnement** en er is nog geen betaal- of licentiebeheer.
- De knop **Inloggen / Registreren** brengt je rechtstreeks naar het scherm voor e-mail/wachtwoord, Magic Link, nieuw bedrijf of personeel dat met een Bedrijfscode toegang aanvraagt. Formulieren zijn zichtbaar; het uitvoeren ervan vereist eerst een Supabase-account.
- Een online Hoofdgebruiker ziet **Beheer** en kan **toegangsaanvragen goedkeuren of afwijzen**. RLS op de server bepaalt wat daadwerkelijk toegestaan is.
- De vijf grote rekenkeuzes blijven op **één mobiel veldscherm**. De aanvullende materiaalfactoren, IQI-tabelhulp en pijpberekening zijn **onderzoekshulpen** en geven geen formele RT-vrijgave.
- De gekoppelde Supabase-backend is nu ingericht. De 50 gastproeven werken zonder account; registratie en personeelstoegang moeten nog met echte afzonderlijke testaccounts en geconfigureerde e-mailredirects worden geverifieerd.
- Directe live-hosting via derden (zoals raw.githack) vereist bereikbare HTTPS-hosting; de bronbestanden staan gecontroleerd in GitHub, maar iPhone/Safari en publieke URL-respons zijn nog niet op een echt toestel geverifieerd.

## 1. Supabase inrichten (staging, geen productiegegevens)

1. **Basic NDT staat al ingesteld**, met de openbare publishable-sleutel en RLS. Voor een andere installatie maak je eerst een apart, leeg Supabase-project aan.
2. **Voer het SQL-script niet opnieuw uit op Basic NDT.** Voor een **nieuw leeg project** gebruik je `research/company-suite/supabase-schema.sql` (v1+v2), en voor een reeds geïnstalleerde v1 uitsluitend `supabase-hardening-v2.sql`. Test vóór productie de migratie-/rechtenimpact.
3. **Nog handmatig nodig:** voeg in Supabase → Authentication → URL Configuration de exacte Redirect URL `https://raw.githack.com/nigelvandervorst17-lang/VT-App/research/integrated-company-suite/research/company-suite/index.html` toe. Controleer de Site URL, e-mailbevestiging en Magic Links.
4. Open de iPhone-testlink. De **publieke project-URL en publishable-sleutel** van Basic NDT zijn reeds als standaard ingesteld; gebruik **nooit** een service-role-sleutel of databasewachtwoord.
5. Registreer een account met e-mail/wachtwoord, bevestig de e-mail, log in. Of vraag een Magic Link aan.
6. Kies 'Nieuw bedrijf': gebruik het formulier om bedrijf en admin-lidmaatschap aan te maken. Noteer de 32-tekenige bedrijfscode **privé**.
7. Een radiograaf registreert een **eigen** Auth-account en gebruikt de bedrijfscode om **een aanvraag** te doen. De admin keurt die aanvraag op het Beheer-scherm goed.
8. Alleen daarna toont Supabase RLS voor staff de administratief **approved** bedrijfstoestellen, bronnen en procedures. Admin kan drafts en goedgekeurde records zien en beheren. Het gezamenlijke \`exposure_logs\`-logboek laat staff uitsluitend eigen conceptlogs opslaan; admin kan bedrijfslijsten controleren.

**Belangrijk:** een *administratief* goedgekeurd bedrijfsrecord bewijst op zichzelf geen fysisch geldige filmcurve, RT-procedure, broncertificaat of toestelkalibratie. De beheerder moet de werkelijke kwaliteitsdocumenten onafhankelijk controleren.

## 2. Mobiel veldscherm

De hoofdnav toont **Account** en **Rekenen**. **Beheer** verschijnt voor online admins. De eerdere onderzoekscontroles staan nu geïntegreerd bij de vijf rekenkeuzes op het veldscherm.

- Het veldscherm filtert de gesynchroniseerde lijst tot bedrijfsmiddelen met \`approval_status='approved'\`.
- Supabase **RLS** bewaakt de serverrechten; het verbergen van admin-knoppen is alleen UX. De Hoofdgebruiker kan nu bestaande buizen/bronnen/procedures **bewerken**, medewerkers **blokkeren/heractiveren**, de Bedrijfscode via een admin-only RPC ophalen en het **gezamenlijke logboek bekijken**. Staff ziet via RLS alleen zijn eigen logs. Een bedrijfsrecord met administratieve goedkeuring is nog geen RT-vrijgave.
- Er is géén integratie die onbewezen materiaal- of \`k_tube\`-factoren als effectieve waarde doorstuurt naar \`rt-core.mjs\`.
- De originele Procedure Suite blijft bereikbaar als **aparte, ongewijzigde pagina**. Automatisch doorgeven van Supabase-records aan de oorspronkelijke belichtingscalculator is **niet** geactiveerd.
- De gamma-onderzoeksbestanden uit PR #6 en de X-ray-onderzoeksmodule uit PR #7 zijn in deze aparte branch opgenomen. Hun originele pull requests zijn niet gewijzigd.

## 3. Offline Bunker-modus

1. Meld je **online** aan als goedgekeurd lid en kies een bedrijf.
2. Kies een aparte **offline wachtzin van minimaal 8 tekens** in het Account-tabblad en ontgrendel de cache. De app haalt serverrecords op en slaat een **AES-GCM versleutelde** snapshot onder jouw Supabase user-ID en bedrijfs-ID op in IndexedDB. Sleutelafleiding: PBKDF2 / SHA-256, 250.000 iteraties met unieke salt.
3. Bij volgende online opening synchroniseer je na aanmelden en ontgrendelen de cache opnieuw. Een ingelogde gebruiker kan via **Synchroniseren** nieuw goedgekeurde gegevens ophalen.
4. Zonder internet open je de geïnstalleerde PWA/webpagina, vult dezelfde offline wachtzin in, ontgrendelt de bestaande cache en bekijkt de **laatst opgeslagen** informatie.
5. Je kunt offline een **conceptwerklog** opslaan. Zodra het account opnieuw online is aangemeld en de cache is ontgrendeld, stuurt **Synchroniseren** die conceptlogs via het persoonlijke JWT naar Supabase. De server controleert opnieuw lidmaatschap en identiteit via RLS; geweigerde logs blijven in de versleutelde outbox.

**Beperkingen:** offline kan het systeem géén onmiddellijke server-revocations, gewijzigd personeelscertificaat, verlopen bevoegdheid of gewijzigde procedure zien. De status "offline, gegevens mogelijk verouderd" moet zichtbaar blijven. Op een gedeelde iPhone moet het toestel zelf ook een toegangscode/biometrie gebruiken; localStorage met de publieke verbindingsgegevens en sessionStorage met kortdurende Auth-tokens zijn niet hetzelfde als een hardwarebeveiligde kluis. De wachtzin wordt **niet** opgeslagen. Zonder bekende wachtzin is de offline cache niet leesbaar. Encryptie biedt geen garantie tegen een gecompromitteerd of ontgrendeld toestel.

De Service Worker cachet uitsluitend de statische frontend binnen zijn eigen origin. Supabase Auth-/REST-verkeer en vertrouwelijke bedrijfsrecords worden **nooit** in de Service Worker-cache gezet. De records worden apart in versleutelde IndexedDB opgeslagen.

## 4. Bewust afgeschermde rekenfuncties

### CP-buizen en een-/tweepunts-'ijking'

- Nieuwe Constant Potential-buizen worden **niet** automatisch gekoppeld aan een willekeurige andere merk-/modelcurve. Een CP-generator is **geen universele opbrengstcurve**.
- De losse PR #7-pagina **\`research/mijn-rontgenbuizen.html\`** laat een passende onderzoeksreferentie selecteren en uit 1–2 gedocumenteerde proefopnames een **voorlopige** \`k_tube\` berekenen.
- Eén/twee proefopnames **automatisch omzetten naar \`CALIBRATED\`**, zonder onafhankelijke review, is bewust niet geïmplementeerd. \`REVIEW_REQUIRED\`, \`k_tube=1\` als actieve factor en de oorspronkelijke blokkades blijven totdat de vereiste reviewinformatie beschikbaar is.
- Dossier-/kwaliteitsbewijsreferenties blijven vereist voor de onderzoeksreview; een losse testtijd is **geen** vrijgavebewijs.
- Dit geïntegreerde scherm toont bedrijfsrecords, **niet** vrijgegeven CP-belichtingstijden.

### Materiaalfactoren (alleen research-preview)

| Materiaal | Gamma-factor (voorgesteld) | X-ray-factor (voorgesteld) |
|---|---:|---:|
| Staal | 1,00 | 1,00 |
| RVS | 1,02 | 1,08 |
| Aluminium | 0,35 | 0,30 |
| Koper | 1,12 | 1,50 |
| Titanium | 0,58 | 0,75 |

De vijf grote tik-knoppen tonen alleen de **hypothetische** staalequivalentie. De vier niet-stalen factoren zijn **niet onafhankelijk onderbouwd** voor het volledige energie-/film-/materiaaldomein; ze wijzigen geen echte gamma- of X-ray-tijd.

### ISO 17636-1 geometrie

De aparte research-preview berekent:
- Klasse A: \`f_min = 7,5 × d × b_eff^(2/3)\`
- Klasse B: \`f_min = 15 × d × b_eff^(2/3)\`
- Als \`b < 1,2×t\`, dan \`b_eff = t\` (in plaats van \`b\`).
- Klasse A met relevante vlakke defecten wordt voor dit criterium als klasse B vergeleken.
- \`f = SFD − b\` wordt afzonderlijk getoond.

Dit volgt de nominale formules/condities zoals in **ISO 17636-1:2022** beschreven, maar toepasbaarheid en editie moeten worden gecontroleerd in de **gecontroleerde norm en goedgekeurde procedure**. Een geslaagde f-vergelijking is geen complete beeldkwaliteit-/IQI- of stralingsbeschermingsvrijgave.

### Se-75 / Ir-192 verval

Alleen de afzonderlijke wiskundige preview \`activity(now)=activity(reference)×2^(-days/half_life)\`, met Se-75 \`119,78 dagen\` en Ir-192 \`73,827 dagen\`, overeenkomstig de bestaande appconstanten. Gebruik nooit als vervanging van broncertificaat, peildatum en procedurecontrole.

## 5. Regressietests

\`\`\`sh
node --test research/company-suite/company-suite.test.mjs
node --test research/xray-core.test.mjs
node --test research/xray-tube-profiles.test.mjs
node --test research/gamma-nine-point-review.test.mjs
node research/xray-report.mjs
\`\`\`

Beschermde originele motor-/curve-/UI-bestanden worden met hun Git-blobhashes uit \`research/xray-baseline-shas.json\` gecontroleerd. Controleer ook de GitHub-PR-diff tegen \`main\`. De testdata in de Node.js-tests zijn **synthetisch** en zijn geen uit echte RT-belichtingen afgeleide kalibraties.

**Nog te testen:** daadwerkelijke Auth-registratie met twee verschillende testaccounts, bedrijfsscheiding, verzoek-/goedkeuringsflow, mailredirects, echte iPhone/Safari offline, sleutelverlies/herstel, netwerkuitval tijdens upload en bevoegdheidsintrekking. De **twee Supabase-migraties en 12/12 read-only RLS-grantcontroles zijn al geslaagd**; dit vervangt geen echte eindgebruikersproef. **Security-advisor:** bescherming tegen gelekte wachtwoorden staat nog uit en de bewust via `authenticated` toegankelijke SECURITY DEFINER-RPCs vereisen een onafhankelijke review. Volledige statusmatrix: `research/COMPLETE-STATUS-NDT-2026-11-16.md`.

**Privacy / veiligheid:** geen geheimen of gevoelige klant-/brondata in GitHub of publiek te openen testpagina. Met echte klantprocedures of echte RT-opnamen pas werken na expliciete organisatorische, technische en wettelijke vrijgave.
