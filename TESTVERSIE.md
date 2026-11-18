# PR #24 — afgeschermde testcode
Deze branch is een **testkopie** van PR #24 op commit `224bfa486d9048a32a93255b80ed7b8f61042332`. `main` is ongewijzigd.

- Testlabel bovenaan; mailverzending in de testinterface uitgeschakeld.
- Nieuwe accountregistratie is geblokkeerd in het testinlogscherm.
- De PDF kan lokaal worden samengesteld met een **leeg** Service Record-sjabloon en een testhandtekening.
- De bestaande backend-instellingen zijn NIET omgezet naar een aparte staging-database. Log daarom niet in met productiegegevens en gebruik geen echte klant- of meetgegevens in deze preview. Het openen van de planningsomgeving met echte credentials kan nog steeds naar de bestaande backend verbinden.
- De testbranch is nog geen gehoste preview-URL. Open via een eigen statische testserver met een apart testproject en testaccounts, of download de branch als ZIP. Gebruik niet de productie-URL voor deze branch.
- Automatische GPS-aankomst, echte e-maillevering en database-migraties zijn niet actief in deze testkopie.
