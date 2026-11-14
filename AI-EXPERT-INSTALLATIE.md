# Basic RT PRO 3.8.6 · AI Expert — installatie

## Wat deze ZIP bevat

- `index.html`, `styles.css`, `ai-expert.mjs`, `ai-config.mjs`: mobiel AI-tabblad, chat en opt-in context uit de bestaande RT-calculator.
- `app.mjs` en `rt-core.mjs`: de bestaande berekeningen blijven leidend. De knop **Reken opnieuw met app** activeert de bestaande berekeningsknop; AI berekent géén eigen operationele belichtingstijden.
- `cloudflare-ai-worker/src/index.mjs`: Gemini-proxy met strikte CORS-controle, Turnstile-verificatie, verzoeklimiet, invoerlimieten, vaste veiligheidsinstructies en beperkte conversatiegeschiedenis.
- `cloudflare-ai-worker/wrangler.toml`: Cloudflare-configuratie. Nergens staan geheime sleutels in de ZIP.

## 1. Gemini API-sleutel

1. Maak een project/API-sleutel aan via [Google AI Studio](https://aistudio.google.com/apikey).
2. Bewaar de sleutel privé. Zet deze **nooit** in `index.html`, `app.mjs`, `ai-config.mjs`, `wrangler.toml` of GitHub.
3. Controleer in AI Studio welke Gemini-modellen en limieten beschikbaar zijn voor jouw project. De standaard is `gemini-2.5-flash`, indien jouw API-project toegang heeft.

## 2. Cloudflare Turnstile

1. Open Cloudflare Dashboard → Turnstile → Add widget.
2. Voeg bij toegestane hostnames je GitHub Pages hostname toe, bijvoorbeeld `nigelvandervorst17-lang.github.io` (**zonder** `/VT-App`).
3. Kopieer de **publieke sitekey** (mag in de website/app staan) en de **private secret key** (alleen in Cloudflare).
4. Turnstile is verplicht voor iedere vraag. De Worker controleert het token serverside en controleert of de hostname overeenkomt.

## 3. Worker maken

Zorg dat Node.js/npm beschikbaar is en open een terminal in **`cloudflare-ai-worker`**:

```bash
npx wrangler login
npx wrangler deploy
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put TURNSTILE_SECRET
```

- Pas vóór het deployen de `[vars]` in `wrangler.toml` aan voor **jouw** exacte GitHub Pages herkomst, bijvoorbeeld `ALLOWED_ORIGIN = "https://nigelvandervorst17-lang.github.io"` (geen pad, geen slash achteraan) en `TURNSTILE_HOSTNAME = "nigelvandervorst17-lang.github.io"`.
- Bewaar de geheimen bij Cloudflare als **secrets**, niet als gewone vars.
- De eerste deploy zonder secrets is niet operationeel: de Worker weigert chatvragen totdat beide secrets bestaan.
- `AI_LIMITER` beperkt standaard tot ongeveer 5 verzoeken/minuut per client-IP per Cloudflare-locatie. Dit is anti-misbruik, maar geen gegarandeerd kostplafond. Configureer ook Google-quota en budgetbewaking.
- Kopieer na het deployen de exacte publieke Worker-URL, bv. `https://basic-rt-pro-ai.<account>.workers.dev` (zonder `/chat`).

## 4. GitHub Pages updaten

1. Pak de ZIP lokaal uit.
2. Upload de **inhoud van `VT-App-main/`** naar de **root** van de GitHub Pages repository. Maak geen extra `VT-App-main` map aan.
3. Houd de volledige oorspronkelijke app erbij, met name `material-equivalence.mjs`, `rt-core.mjs`, `iqi.mjs` en `sw.js`.
4. Open Basic RT PRO in Safari; kies **AI Expert** in de onderste navigatie.
5. Open **Verbinding instellen**, vul de Worker-URL en **publieke Turnstile-sitekey** in, kies **Verbinding op dit toestel bewaren**. Deze twee publieke waarden worden alleen in de browser bewaard.
6. Optioneel: vul de publieke waarden in `ai-config.mjs` in voor een voorgedefinieerde configuratie voor alle gebruikers van de app. **Niet** de geheime sleutels!
7. Doorloop de Turnstile-controle. Stel een vraag. De AI werkt **niet offline**.
8. Ontbreekt het nieuwe tabblad? Open Safari privévenster, en gebruik zo nodig de bestaande **Cache wissen**-actie. De service-worker-cache is verhoogd naar een nieuwe versie.

## 5. Gebruiksgrenzen en privacy

- **Geen zelfstandige veldaanpassing in v1.** Het AI-tabblad kan de huidige invoer en bestaande indicatieve appuitkomst meesturen, maar verandert de RT-velden niet via de AI.
- **Geen automatische RT-goedkeuring.** De bestaande curvefitting en verschillende procedures/IQI-functies zijn onderzoekssoftware. Een tekstmodel heeft geen live toegang tot volledige normdocumenten, tabellen of door je organisatie goedgekeurde procedures. Het systeem vraagt om een normcontrole als exacte grenswaarden ontbreken.
- **Geen operationele veiligheidsberekeningen.** De AI mag algemene HVL-/dosisprincipes toelichten, maar geeft geen definitieve afzettingsafstand of RT-vrijgave.
- **Contextkeuze:** vink *Huidige RT-invoer meesturen* uit om uitsluitend de vraag door te sturen. **Bekijk context** toont welke velden anders worden verstuurd. Er worden geen opgeslagen records, inventarislijsten of originele certificaatbestanden meegestuurd.
- **Verwerking door derden:** vragen en eventueel meegestuurde RT-invoer gaan via je Cloudflare Worker naar Google Gemini. Volgens Google's actuele prijspagina kan invoer bij bepaalde gratis API-diensten voor productverbetering worden gebruikt. Deel geen vertrouwelijke opdracht-, persoons- of klantgegevens zonder passende verwerkersafspraken.
- **Geen chatopslag door deze code:** geen serverdatabase of opgeslagen chatgeschiedenis; hoogstens de recente berichten binnen dezelfde open sessie. Infrastructuur- en API-providerlogs kunnen wel een eigen bewaarbeleid hebben.
- **Herkomst/financieel risico:** CORS beschermt niet tegen alle externe HTTP-clients. De Turnstile-controle, exact hostname-check, rate limiter en Google-quota beperken misbruik; ze zijn geen volledige garantie.

## 6. Testen

Vanuit de map `VT-App-main` met Node.js:

```bash
node --test test-3.8.mjs
node --test cloudflare-ai-worker/test-worker.mjs
node --check ai-expert.mjs
node --check cloudflare-ai-worker/src/index.mjs
```

De bestaande 120 RT-testchecks en de 7 nieuwe tests voor Worker/Turnstile/CORS zijn gecontroleerd. De externe live Cloudflare- en Gemini-koppeling is **niet** geactiveerd of end-to-end op je account getest; daarvoor ontbreken je Cloudflare-deployment, sitekey en geheimen.

## 7. Formulier-/normuitbreiding later

Automatisch velden laten invullen is **bewust niet** ingeschakeld. Bij een vervolgversie kan een gecontroleerd voorstel uit de AI eerst in een bevestigingsscherm worden getoond. Alleen na expliciet bevestigen en dezelfde validaties als handmatige invoer mag de app invoerwaarden overnemen — nooit operationele vrijgave of wijzigingen aan de berekeningsformules.
