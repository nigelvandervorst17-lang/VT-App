# Basic RT PRO 3.4 — controlerapport

Status: **privétest; niet vrijgegeven voor echte radiografische belichtingen**.

## Uitgevoerd
- ZIP van GitHub-repository geïnspecteerd (36 items). Geen `index.html` in root; wel een versiegenaamd HTML-bestand. Afbeeldingen in de root terwijl de HTML `assets/` vraagt; oude `sw.js` gebruikte niet-bestaande offline-cachepaden.
- Basis genomen van de in dit gesprek eerder opgebouwde 3.3-release, met de negen Se-75/D4/Waygate-referenties en de schiettechniek- en RT-tools uit 3.2/3.1. Kernbestanden `rt-procedure.mjs`, `reference-tools.mjs` enz. zijn ongewijzigd ten opzichte van de aangeleverde GitHub-ZIP.
- Officiële AGFA-brochure geraadpleegd: p.13 filmfactoren en sensitometrie; p.16 gamma-belichtingsgrafieken. Grafieklijnen zijn als numerieke **onderzoeksaflezingen** gedigitaliseerd (D=1,5–3,2). Geen extrapolatie toegestaan.
- Filmtypes D2/D3/D8 toegevoegd met relatieve AGFA-filmfactoren ten opzichte van de bestaande D7-curve, afzonderlijk voor Se-75 en Ir-192. D4/D5/D7-basiscurves behouden.
- Voor Se-75/D4 extra zwartingsanker D2,5: Waygate 36 Ci, 10 mm staal, 800 mm, 21m20s; basis D2,0 dezelfde condities via 40 Ci: 14m28s. Eén anker garandeert geen volledige sensitometrische validatie.
- Vrije decimale invoer met komma of punt. Buiten D=1,5–3,2 of ongeldige activiteiten/dikten blokkade.
- Alle externe lokale module-imports en bronnen in `index.html` aanwezig in release.

## Resultaten
- **54/54** unit- en regressiechecks geslaagd met Node.js.
- 9/9 historische Se-75/D4/Waygate-basispunten exact op de seconde gereproduceerd bij D2,0, 40 Ci en 800 mm.
- Extra Se-75/D4 zwartingsanker bij D2,5/36 Ci/10 mm/800 mm exact gereproduceerd (21:20). **Niet onafhankelijk bevestigd.**
- D=2,1 / 2,4 / 2,8 / 3,1 geaccepteerd als onderzoeksmodel, D=3,9 correct afgewezen.
- D2/D3/D4/D5/D7/D8 voor beide isotopen getest op positieve en toenemende belichting bij stijgende zwarting.
- JavaScript module-syntax en zes inline scriptblokken zonder syntaxfouten.
- HTML-ID's uniek; lokale modulepaden bestaan.
- **Niet gelukt:** browseromgeving blokkeert lokale URL (`ERR_BLOCKED_BY_ADMINISTRATOR`); daarom **geen geslaagde end-to-end mobiele/Safari-test** geclaimd.

## Beperkingen
- Een passende rekentijd betekent geen zekerheid over werkelijke filmzwarting, IQI-kwaliteit of operationele veiligheid.
- Digitalisering van de filmrespons is bij 200 kV, Pb-schermen en automatische ontwikkeling G135 / 8 minuten / 28°C; gamma- en overige kV-toepassing zijn **niet onafhankelijk gevalideerd**.
- D2/D3/D8 berekeningen voor gamma gebruiken *relatieve filmfactoren*, niet rechtstreeks gedigitaliseerde eigen gammacurves.
- Bij COMET zijn niet alle apparaten rekenbaar. De proefgrafiek voor EVO225DS blijft beperkt tot zijn oorspronkelijke referentiecondities en D=2,0; er is geen onafhankelijke fabrikantvalidatie.
- Geen aanspraak op formele conformiteit met RT-procedures en ANVS/IAEA-vereisten.
