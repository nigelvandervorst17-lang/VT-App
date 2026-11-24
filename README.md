# NDT Radiography Pro

VT-App is een Nederlandstalige webapp voor industrieel radiografisch onderzoek, gedeelde planning en werkbonnen. De berekeningen en de Procedure Suite ondersteunen onderzoek en beoordeling. Gebruik voor praktijkbelichtingen de vrijgegeven procedure van je bedrijf.

## Lokaal starten

Start in de hoofdmap een HTTP-server en open [de app op localhost](http://127.0.0.1:8000/).

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open de hoofdpagina en de bedrijfsomgeving elk één keer online zodat de browser hun offline bestanden kan installeren. Voor aanmelden, synchroniseren, AI Expert, de Procedure Suite en PDF-export is internet nodig.

## Tests en build

Voer vanuit de hoofdmap de tests voor de webapp en de bedrijfsomgeving uit met Node.js 22 of hoger.

```sh
node --test *.test.mjs research/*.test.mjs research/company-suite/*.test.mjs
```

Bouw en test de TypeScript-bron van de Procedure Suite afzonderlijk.

```sh
cd procedure-suite-source
npm install
npm test
npm run build
```

`test-3.8.mjs` hoort bij een oudere rekenbaseline en verwacht onder meer invoer die de huidige versie afwijst. `test-worker.mjs` hoort bij de Cloudflare Worker en vereist de afzonderlijke Worker-bron op `src/index.mjs`.

## Hosting en beheer

- **GitHub Pages** past bij de statische frontend. Publiceer de hoofdmap en controleer de installatie via [de technische controlepagina](https://nigelvandervorst17-lang.github.io/VT-App/controle.html).
- **Supabase** verzorgt accounts en gedeelde planningsgegevens. Zie [de planninginstructies](GEDEELDE-PLANNING-INSTRUCTIES.md) voor projectconfiguratie en rollen.
- **Cloudflare Workers** verzorgt de proxy voor AI Expert. Gebruik de afzonderlijke Worker-bron en de stappen in [AI Expert-installatie](AI-EXPERT-INSTALLATIE.md). Bewaar privésleutels in de serveromgeving.
