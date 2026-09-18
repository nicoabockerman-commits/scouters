# Scouters

Suomalainen sovellus, joka yhdistää nuoret osaajat ja opiskelijat pienyrityksiin
ja yksityishenkilöihin. Molemmat osapuolet selaavat toisiaan, ja match syntyy,
kun kiinnostus on molemminpuolista.

## Tekniikka

- Vite + vanilla JavaScript (PWA myöhemmin)
- Firebase Authentication (Google ja sähköposti)
- Firestore (profiilit, tykkäykset, matchit, viestit, keikat, arvostelut)
- Cloudinary (kuvat ja videot)
- Firebase Hosting

## Käyttöönotto

```bash
npm install
npm run dev          # avaa http://localhost:5173
```

Täytä `src/firebase.js` -tiedostoon Cloudinaryn `cloudName`.

### Firestore-säännöt ja indeksit

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

### Julkaisu

```bash
npm run deploy
```

## Tietomalli

| Kokoelma | Dokumentin id | Sisältö |
| --- | --- | --- |
| `users` | uid | profiili: rooli, tyyppi, nimi, kaupunki, kategoriat, hinta, koulutus tai yritystiedot |
| `likes` | `<from>_<to>` | yksi tykkäys tai ohitus per pari |
| `matches` | `<uidA>_<uidB>` | osapuolet, tila (active tai completed), viimeisin viesti |
| `matches/{id}/messages` | auto | viestit |
| `gigs` | auto | keikkailmoitukset |
| `reviews` | `<matchId>_<from>` | tähdet ja teksti, julkaistaan vasta kun molemmat ovat arvostelleet |

## Turvallisuus

Kaikki pääsynhallinta on `firestore.rules` -tiedostossa:

- profiilit näkyvät vain kirjautuneille
- jokainen kirjoittaa vain omiin dokumentteihinsa
- matchin voi luoda vain, jos molemmat ovat tykänneet
- viestit näkyvät vain matchin osapuolille
- arvostelun voi jättää vasta valmiiksi merkitystä keikasta
- arvosanakeskiarvoa ei voi muuttaa käsin

Salaisuudet (Cloudinary API Secret, Firebasen service account, Anthropicin
API-avain) eivät koskaan tule tähän repoon eivätkä selaimeen. Ne asetetaan
myöhemmin Cloud Functionsin ympäristömuuttujiin.

## Valmiina (vaihe 2)

- kirjautuminen, roolin valinta ja yhtä laaja profiili molemmille osapuolille
- selaus ja pyyhkäisy: profiilit ja ilmoitukset samassa pakassa, kategoriasuodatus
- kiinnostuneet-näkymä molemmille
- match molemminpuolisesta kiinnostuksesta
- chat reaaliajassa ja keikan merkitseminen valmiiksi

## Seuraavat vaiheet

1. Arvostelut ja keskiarvon päivitys Cloud Functionilla
2. Ladattava Scouters-kortti ja tarinakuva molemmille osapuolille
3. Ilmoituksen luonti sovelluksessa
4. AI-matchmaker Cloud Functionin kautta
5. Ilmianto, esto, tilin poisto, ikäraja ja tietosuojaseloste ennen julkaisua
