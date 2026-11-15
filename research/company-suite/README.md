# NDT Radiography Pro — geïntegreerde bedrijfsmodus (testversie)

**Status:** ONDERZOEK / STAGING, **geen gevalideerde RT- of kalibratievrijgave**.  
**Branch:** \`research/integrated-company-suite\`. \`main\`, PR #6 en PR #7 worden niet samengevoegd of gewijzigd.  
**Startpagina:** \`research/company-suite/index.html\`.

Dit is een **werkende statische frontendimplementatie** van een Supabase Auth-/PostgREST-accountlaag, bedrijfsrollen, offline encryptie, conceptlogboek, en aparte iPhone-schermen. Om echt in te loggen is een **eigen Supabase-TESTproject met uitgevoerd SQL-script** vereist. Zonder dat project toont de testlink alleen de interface en onderzoekscontroles — geen verbonden accounts of echte bedrijfsgegevens.

## 1. Supabase inrichten (staging, geen productiegegevens)

1. Maak een **nieuw, leeg Supabase-project**. Schakel Email Auth in; gebruik e-mailbevestiging en sterke wachtwoorden/MFA volgens eigen bedrijfsbeleid.
2. Open de SQL Editor en voer het volledige bestand **\`research/company-suite/supabase-schema.sql\`** uit. Het maakt tabellen, RLS, drie beveiligde RPC-functies en grants aan. **Niet** uitvoeren op een bestaande productiedatabase zonder afzonderlijke migratie-/securityreview.
3. Configureer in Supabase Auth → URL Configuration de **Site URL** en de exacte **Redirect URL** van de onderzoeks-testpagina, inclusief het GitHub Pages/raw.githack-pad. E-mailconfirmatie en Magic Links kunnen dan terugkomen in de testapp.
4. Open de testlink op iPhone. Vul uitsluitend **Project URL** en de **publishable (of legacy anon)** sleutel in. **NOOIT** de \`service_role\`-sleutel, secret key of databasewachtwoord invoeren.
5. Registreer een account met e-mail/wachtwoord, bevestig de e-mail, log in. Of vraag een Magic Link aan.
6. Kies 'Nieuw bedrijf': gebruik het formulier om bedrijf en admin-lidmaatschap aan te maken. Noteer de 32-tekenige bedrijfscode **privé**.
7. Een radiograaf registreert een **eigen** Auth-account en gebruikt de bedrijfscode om **een aanvraag** te doen. De admin keurt die aanvraag op het Beheer-scherm goed.
8. Alleen daarna toont Supabase RLS voor staff de administratief **approved** bedrijfstoestellen, bronnen en procedures. Admin kan drafts en goedgekeurde records zien en beheren. Het gezamenlijke \`exposure_logs\`-logboek laat staff uitsluitend eigen conceptlogs opslaan; admin kan bedrijfslijsten controleren.

**Belangrijk:** een *administratief* goedgekeurd bedrijfsrecord bewijst op zichzelf geen fysisch geldige filmcurve, RT-procedure, broncertificaat of toestelkalibratie. De beheerder moet de werkelijke kwaliteitsdocumenten onafhankelijk controleren.

## 2. Mobiel veldscherm

De pagina bevat vier tabbladen: **Account**, **Opnameplan**, **Beheer** (alleen online admin) en **Controles**.

- Het veldscherm filtert de gesynchroniseerde lijst tot bedrijfsmiddelen met \`approval_status='approved'\`.
- Supabase **RLS** bewaakt de serverrechten. Verbergen van admin-knoppen is alleen UX, geen beveiligingsmaatregel.
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

**Nog te testen in een werkelijke staging-omgeving:** Supabase SQL-uitvoering, twee echte afzonderlijke Auth-accounts, RLS-rollen en bedrijfsscheiding, mailredirects, Safari/PWA offline, sleutelverlies/herstel, netwerkuitval tijdens upload, uitlog/verlopen token en certificaatbeheer. Zonder echte projectinstellingen zijn dat nog geen live bewezen functies.

**Privacy / veiligheid:** geen geheimen of gevoelige klant-/brondata in GitHub of publiek te openen testpagina. Met echte klantprocedures of echte RT-opnamen pas werken na expliciete organisatorische, technische en wettelijke vrijgave.
