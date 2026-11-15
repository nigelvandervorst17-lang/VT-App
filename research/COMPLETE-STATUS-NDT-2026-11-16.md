# NDT Radiography Pro — volledige GitHub-inventaris, integratie en openstaande punten

**Datum:** 16 november 2026  
**Branch:** \`research/integrated-company-suite\` · concept-PR #8 · **NIET MERGEN**  
**Live hoofdbranch:** \`main\` is bewust ongemoeid. De aparte gamma-PR #6 en X-ray-PR #7 blijven hun eigen *draft*; hun bronmodules zijn in de onderzoeksintegratie opgenomen, niet in productie samengevoegd.

## Wat is nu werkelijk ingebouwd?

| Onderdeel | Implementatie onder \`research/\` | Status / harde grens |
|---|---|---|
| Gamma Se-75 / Ir-192 | \`gamma-nine-point-review.mjs\`, de bestaande \`calculateGamma()\` als referentie, regressietests | **Onderzoek**. PR #6: D4/D5-zwartingsfactoren bij D=2,5 alleen in tests. Tests 38, 39, 43, 48 en 49 blijven geblokkeerd. Geen onafhankelijke Waygate-/praktijkkalibratie. |
| X-ray mA·min / exacte kV / mA en SFD | \`xray-core.mjs\`, \`xray-report.mjs\`, \`xray-core.test.mjs\` | **Onderzoek**. Alleen gedocumenteerde aanwezige toestel-/filmreferentiecurves; geen nieuwe D4 X-ray-curve. |
| Tien Waygate X-ray staalpunten | \`xray-reference-points.json\` | **Nog leeg**: 2, 4, 6, 8, 10, 12, 15, 20, 25 en 30 mm. Alle kV- en tijdvelden: \`Referentie ontbreekt\`. Geen verzonnen kalibratie. |
| Mijn Röntgenbuizen / XrayTubeProfile | \`xray-tube-profiles.mjs\`, \`mijn-rontgenbuizen.html\`, \`xray-tube-ui.mjs\` | Fictieve/local browserprofielen, maximale kV/mA/kW, brandvlek d, CP/Half-wave en richting. Niet automatisch gekoppeld aan een universele CP-curve. |
| Eén-/tweepunts-k_tube | \`calibrateXrayTube()\` met meting-/kwaliteitsreferenties | Berekent een **voorlopige** factor; \`REVIEW_REQUIRED\`, niet automatisch \`CALIBRATED\`. Een rekenkundige match van 1–2 metingen is geen fysische kalibratie of RT-vrijgave. |
| Gamma- en X-ray-materiaalknoppen | \`research-physics-preview.mjs\`, \`company-suite/index.html\` | Vijf grote knoppen (staal, RVS, aluminium, koper, titanium), uitsluitend **hypothetische equivalentie**. Geen onbewezen materiaalcorrecties in de originele motor. |
| ISO 17636-1 en geometrie | A/B f_min preview, \`Ug=d×b/(SFD-b)\`, object-film-afstand | Onderzoekshulp, niet een automatische ISO-procedure-/IQI-/opnamevrijgave. |
| Pijp / IQI | \`field-calculators.mjs\` gebruikt bestaande \`filmPlanning.js\` en \`iqi.mjs\` | Filmdekking en tabelhulp. Geen fictief minimaal aantal RT-opnamen of ongecontroleerde acceptatiegrens. |
| 50 gratis proefberekeningen | \`trial-50.mjs\`, \`workbench-ui.mjs\` | Meteen op het startscherm; teller van 50 naar 0 en dan naar account. Browser-localStorage **kan worden gewist**; geen server-gecontroleerd abonnement. |
| Account: e-mail/wachtwoord en Magic Link | \`supabase-rest.mjs\`, \`company-app.mjs\` | **Backend aanwezig**, echte registratie en links met individuele accounts nog end-to-end te testen. Redirect-URL moet in Supabase Auth geautoriseerd worden. |
| Hoofdgebruiker versus Personeel | \`company_members\` met \`role=admin/staff\`, persoonlijke Auth-JWT | Server RLS is leidend; code alleen geeft **geen** toegang. Staff dient een aanvraag in; admin keurt goed of wijst af. |
| Bedrijfscode | \`register_company\`, \`request_company_join\`, \`get_company_invite_code\` | **Privacy verbeterd**: codekolom niet meer rechtstreeks leesbaar door staff; alleen admin mag de code opvragen. |
| Personeel later blokkeren/heractiveren | \`set_staff_membership_active\`, Bedrijfsbeheer-UI | Vereist online admin en gecontroleerde Supabase RPC. Offline eerder verkregen snapshots blijven mogelijk verouderd. |
| Beheer van buizen/bronnen/procedures | Formulieren en selecties in Beheer, \`admin-workflows.mjs\` | Admin kan toevoegen, selecteren, wijzigen en **administratief** goedkeuren/archiveren. Niet hetzelfde als technische kalibratie of RT-vrijgave. |
| Gamma-bronverval | \`gammaDecayPreview()\` van Se-75/Ir-192 | Informatieve activiteitstijdlijn; niet ter vervanging van broncertificaat. |
| Gezamenlijk bedrijfslogboek | \`exposure_logs\`, \`fetchCompanyLogs()\`, veldscherm | Staff kan eigen conceptlogs opslaan en lezen; admin leest het bedrijfslogboek. **Conceptlogs zijn geen geautoriseerde opnamen.** |
| Offline Bunker-modus | AES-GCM/PBKDF2 IndexedDB per account+bedrijf, Service Worker voor app-shell, draft-outbox | Beschikbaar **na een eerste online login en het instellen/ontgrendelen van de offline wachtzin**. Geen gegarandeerd realtime revoke tijdens netwerkuitval. |
| Supabase-project | **Basic NDT**, project-ID \`olugdgrlfyrdyxclphlu\` | Project weer **ACTIVE_HEALTHY**; schema v1 en aanvullende v2-beveiligingsmigratie **daadwerkelijk toegepast** (16-11-2026). |
| Databasebeveiliging | 7 tabellen met RLS, admin-only beheerbeleid, staff approved-only | Gecontroleerd: **12/12 read-only SQL-validaties slagen**. Twee echte afzonderlijke Auth-accounts zijn nog niet end-to-end beproefd. |
| Productie en oorspronkelijke app | \`main\`, \`rt-core.mjs\`, \`rt-curves.mjs/json\`, \`xray-extra-curves.mjs\`, \`film-response.mjs\`, live-interface | **Niet aangepast**, geen merge en geen RT-kalibratievrijgave. |

## Actuele GitHub- en Supabase-bestanden

- **Ingebouwde app:** \`research/company-suite/index.html\`
- **Integratie van UI en accountlogica:** \`research/company-suite/company-app.mjs\`
- **Admin-bewerkingen, Bedrijfscode, medewerkerblokkering:** \`research/company-suite/admin-workflows.mjs\`
- **Openbare Supabase-clientconfig:** \`research/company-suite/project-config.mjs\` — uitsluitend een publishable-sleutel, nooit service-role of wachtwoorden.
- **Volledig éénklik-schema voor nieuwe testprojecten:** \`research/company-suite/supabase-schema.sql\` (basis v1 + hardening v2)
- **Losse niet-destructieve upgrade na v1:** \`research/company-suite/supabase-hardening-v2.sql\`
- **Leesbare RLS-controlequery:** \`research/company-suite/supabase-verify-rls.sql\`
- **Offline cache en outbox:** \`research/company-suite/offline-cache.mjs\`, \`sw.js\`
- **Geautomatiseerde tests:** \`research/company-suite/*test.mjs\`, plus bestaande gamma-, X-ray-, buis- en Procedure Suite-tests.

### Supabase feitelijke status

- Migratie \`ndt_company_auth_roles_rls_v1\`: **toegepast**
- Migratie \`ndt_company_invite_privacy_and_staff_revocation_v2\`: **toegepast**
- De zeven betrokken \`public\`-tabellen hebben **RLS aan** en waren op 16-11-2026 nog **leeg**.
- De 12 statische/grant/RLS-databasecontroles van \`supabase-verify-rls.sql\` geven **passes=true**.
- Browserproject-URL en **publishable key** zijn in de onderzoekstestversie ingesteld. Dit bewijst op zichzelf nog niet dat e-mailregistratie, Magic Links, bedrijfsregistratie en offline iPhone op echte accounts zijn getest.

## Nog niet klaar, niet doen alsof het wel klaar is

### A. Account-/bedrijfsfunctionaliteit vóór echte bedrijfsuitrol
- [ ] In **Supabase → Authentication → URL Configuration** de exacte URL van de onderzoeksapp bij de toegestane Redirect URLs toevoegen, voor e-mailverificatie/Magic Link:
  \`https://raw.githack.com/nigelvandervorst17-lang/VT-App/research/integrated-company-suite/research/company-suite/index.html\`
- [ ] Bevoegde tester registreert een eerste Hoofdgebruiker en een afzonderlijk personeelsaccount; test: uitnodigen, goedkeuren, blokkeren, weer activeren, gewijzigde rechten, bedrijfsscheiding en logboekrechten.
- [ ] **Auth Leaked Password Protection** inschakelen in Supabase als de planopties dat toelaten. De Supabase security-advisor meldde op 16-11-2026 dat dit uit staat.
- [ ] Supabase lint-waarschuwingen voor **authenticated security-definer RPCs** apart beoordelen. Ze zijn bewust nodig voor \`register_company\`, \`request_company_join\`, \`approve_company_join\`, \`get_company_invite_code\` en \`set_staff_membership_active\`, en verrichten interne admin- of gebruikerscontrole. Dit blijft een expliciet beveiligingsreviewpunt.
- [ ] Test op een echte iPhone/Android: offline heropenen, encryptie, sleutelverlies, versleutelde lokale conceptlogboek-sync, tokenverval, terugkeer online en gewiste toegang.
- [ ] Voor echte klantgegevens: organisatiebeleid voor credential-MFA, logging, back-ups, rechtenbeheer, retentie en privacy vaststellen. Gebruik **geen** echte klant- of broncertificaten op de publieke demo.

### B. RT-/NDO-onderzoek, bewust niet automatisch in productie vrijgeven
- [ ] De ontbrekende vijf gamma-referentiepunten 38, 39, 43, 48, 49 onafhankelijk meten en formeel beoordelen vóór range-uitbreiding.
- [ ] De D4/D5-zwartingsfactoren bij D=2,5 met filmtype, verwerking, densitometer, staal/geometrie en echte fabrikant-/praktijkdata valideren.
- [ ] De tien D4 X-ray-referentiepunten met **werkelijke** toestel-kV en tijden, herkomst, Pb-schermen en filmverwerking invullen.
- [ ] Toestelspecifieke CP-curves en dekkingsgebied onderbouwen; **geen universele CP-curve voor alle merken**.
- [ ] \`k_tube\` niet automatisch als \`CALIBRATED\` classificeren op basis van alleen 1–2 opnames; onafhankelijke meerderepunts-review en documentatiescope nodig.
- [ ] Voorgestelde RVS-, Al-, Cu- en Ti-equivalentiefactoren **niet** in de oorspronkelijke gamma-/X-ray-motor gebruiken zonder energiebereik-/materiaalspecifieke validatie.
- [ ] ISO-/IQI-/film-/pijp-geometrie in daadwerkelijk toepasselijke normeditie/procedure controleren, inclusief IQI-zichtbaarheid en werkelijke opnametechniek.
- [ ] Geen merge naar \`main\` zonder expliciet ander besluit, kwaliteitsreview en vrijgave.

## Testen en bronbescherming

\`\`\`sh
node --test research/gamma-nine-point-review.test.mjs \
  research/xray-core.test.mjs \
  research/xray-tube-profiles.test.mjs \
  research/company-suite/company-suite.test.mjs \
  research/company-suite/workbench-50.test.mjs \
  research/company-suite/workbench-interaction.test.mjs \
  research/company-suite/admin-workflows.test.mjs \
  research/company-suite/ui-integrity.test.mjs

npm install --prefix procedure-suite-source --no-audit --no-fund
npm --prefix procedure-suite-source test
\`\`\`

De GitHub Actions-workflow \`.github/workflows/research-company-suite.yml\` voert deze regressies automatisch uit en controleert elf beschermde motor-/curve-/UI-bestanden tegen de oorspronkelijke \`main\`-Git-blobhashes. Controleer daarnaast altijd de PR-diff.

**Testpagina (onderzoek):**
https://raw.githack.com/nigelvandervorst17-lang/VT-App/research/integrated-company-suite/research/company-suite/index.html

**Conclusie:** de afgesproken **softwareonderdelen en ontbrekende administratieve GitHub-functies** zijn op een veilige onderzoeksbranch verzameld. Een **gevalideerd industrieel radiografisch NDO-systeem** of een uitgevoerde RT-kalibratie is hieruit **niet** af te leiden.
