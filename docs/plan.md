# Plan – Pace

Planen dekker kravene under «Må ha» og «Bør ha» i [krav.md](krav.md). Hvert steg er lite nok til å bygges, testes og committes for seg. Ta stegene i rekkefølge og huk av når «Ferdig når» er oppfylt.

## Teknologivalg

| Område | Valg | Begrunnelse |
| --- | --- | --- |
| Språk | Vanilla JavaScript (ES-moduler), HTML, CSS | Ingen rammeverk å lære. Appen er liten nok til å klare seg uten. |
| Byggeverktøy | [Vite](https://vite.dev) | Utviklingsserver med automatisk oppdatering, og `npm run build` gir en statisk `dist/`-mappe. |
| Tester | [Vitest](https://vitest.dev) | Bruker samme oppsett som Vite og kjører rene funksjoner i Node uten nettleser. |
| Lagring | `localStorage`, én nøkkel `pace:v1` | Krav fra krav.md del 4. Ingen server og ingen innlogging. |
| Datoer | Innebygd `Date` og `Intl.DateTimeFormat('nb-NO')`, egne hjelpefunksjoner | Ingen ekstra avhengighet. Hjelpefunksjonene testes, også rundt sommertid. |
| Kalender | Egen uke- og dagsvisning med CSS Grid | Vi trenger bare enkle visninger, og et kalenderbibliotek er tungt å tilpasse til designet. |
| Publisering | Netlify eller Vercel, statisk side | Byggkommando `npm run build`, mappe `dist`. Begge oppdager Vite automatisk. |

**Viktig prinsipp:** All planleggingslogikk ligger i `src/logic/` som *rene funksjoner*. De rører ikke DOM eller `localStorage` og kaller ikke `Date.now()`. «Nå» sendes inn som parameter. Det gjør dem enkle å teste.

## Mappestruktur (mål)

```
index.html            Landingsside
app.html              Selve appen
vite.config.js        Flersideoppsett (index + app)
assets/               Bilder (finnes allerede)
src/
  styles/             tokens.css (farger/fonter fra design.md), base.css, komponenter
  tekster.js          All grensesnittekst fra innhold.md
  logic/              Rene funksjoner + *.test.js ved siden av
  data/               storage.js (localStorage), store.js (tilstand + lagring), clock.js («nå», ev. simulert)
  ui/                 render.js (felles render) + visninger (i dag, kalender, to-do, skjema, varsler)
  main.js             Starter appen
```

## Beslutninger og antakelser

Krav.md sier ikke noe om disse punktene. Her er forslag som kan endres:

1. **Studievindu:** Innstillingene får i tillegg `study_window_start` / `study_window_end` (standard 08:00–21:00). Arbeidsøkter plasseres bare innenfor vinduet.
2. **Øktlengde:** Arbeidsøkter er 30–120 minutter og rundes til hele kvarter.
3. **Planen regenereres, men dagens økter står fast:**
   - *Ved endring* (ny oppgave, fremgang, endret estimat eller frist) slettes ikke fullførte arbeidsøkter **fra og med i morgen**, og de planlegges på nytt. Dagens økter blir ikke flyttet. De teller mot dagens kapasitet og mot oppgavens gjenstående tid. Ny plan **kan likevel bruke ledig tid i dag etter «nå»**, så lenge den ikke overlapper dagens økter og det er kapasitet igjen i dag.
   - *Ved rollover til ny dag* fjernes tidligere, ikke fullførte økter, og planen bygges på nytt **fra og med i dag**.
   - *Når en oppgave markeres som ferdig*, slettes alle gjenstående ikke fullførte økter for oppgaven, også dagens (F4). Det regnes som frigjøring av tid, ikke flytting.
4. **Fremgang:** Når en økt markeres som gjennomført, legges varigheten til `completed_hours`. Brukeren kan også sette timer eller prosent direkte.
5. **To-do-kategorier:** *Aktive* er påbegynt eller har frist innen 7 dager. *Kommende* har senere frist. *Fullførte* har `status = completed`.
6. **Uken starter mandag.** Datoer vises på norsk format.
7. **Overbelastning:** Planleggeren holder seg først innenfor daglig kapasitet. Timer som ikke får plass, gir et varsel. «Fordel på nytt» plasserer resten i ledig tid uten kapasitetsgrense, og de dagene markeres røde. «Behold planen» lukker varselet.
8. **Kontrast:** Hvit tekst på korall (#FF8C61) har for lav kontrast, så aksentknapper får mørk tekst (#1E293B). Rød (#EF4444) brukes som kant og markering, ikke som bakgrunn bak tekst.
9. **Stilark lenkes uten `media="screen"`**, fordi Vite da ikke bygger CSS-en riktig.
10. **Feilkoder:** I tillegg til kodene fra 1.2 finnes `LAGRING_FEILET`, `LESING_FEILET` og `TOMT_ESTIMAT`. Nøklene i `feilmeldinger` i `tekster.js` er disse kodene. Validering returnerer en liste `{ code, field }`, og skjemaet viser én melding øverst (manglende felt først) og markerer feltene.
11. **Tidspunkter lagres som ISO-strenger i UTC** (`toISOString()`). All dagslogikk regner i lokal tid via datonøkler `YYYY-MM-DD` i `logic/dates.js`. Testene kjører i tidssonen Europe/Oslo.
12. **Tilstanden er `{ data, ui }`.** `data` er det som lagres (datamodellen). `ui` er midlertidig: åpne skjema med verdier og feil, bekreftelser og feil for hele appen. Endringer ligger i `data/actions.js` som funksjoner `(...) → state → nyState` og testes der.
13. **Korrupte lagrede data** kopieres til `pace:v1:backup`, appen starter tom og viser `LESING_FEILET`.
14. **Rød brukes også til skjemafeil** (kant og markering), i tillegg til overbelastning.
15. **Tekster som ikke står i innhold.md** er merket med en kommentar i `tekster.js` (innstillinger, «Lukk», bekreftelser, `LESING_FEILET`, meny, emner, faste aktiviteter, kalender og oppgaver).
16. **Meny:** Appen har faner i toppen: «Kalender» (fase 3), «Oppgaver» (fase 4), «Timeplan» (faste aktiviteter og emner) og «Innstillinger». «I dag» kommer i steg 5.7. Gjeldende visning ligger i `ui.view`.
17. **Faste aktiviteter legges inn med dato for første gang**, ikke bare ukedag. Ukentlige aktiviteter gjentas fra den datoen. De har ingen sluttdato (f.eks. semesterslutt), og aktiviteter over midnatt støttes ikke.
18. **Emnefarger** velges fra 8 faste farger (`COURSE_COLORS` i `models.js`, navn i `tekster.js`). Nytt emne får første ubrukte farge. Dette er brukerdata og ikke en del av designpaletten.
19. **Sletting** skjer etter et ja/nei-spørsmål i raden. Når et emne slettes, beholdes oppgaver og aktiviteter i emnet, men `course_id` settes til `null`.
20. **Bildene i `assets/`** har nesten hvit, ikke gjennomsiktig, bakgrunn og viser en svak firkant på hvite kort. Bør fikses i bildene (gjennomsiktig PNG) i steg 7.2.
21. **`clock.js` ble laget i fase 3** (bare `now()`), fordi kalenderen trenger dagens dato. Simulert dato legges til i steg 5.5. Dagens dato lagres i `ui.today` når appen starter.
22. **Kalenderen er startvisningen** frem til «I dag»-visningen kommer i steg 5.7. Smale skjermer (under 40rem) starter i dagsvisning. Ukevisningen scroller sidelengs inne i kortet på mobil.
23. **Timene i kalenderen** er studievinduet, utvidet til hele timer hvis aktiviteter ligger utenfor (`visibleHours`).
24. **Klikk i kalenderen:** klikk på en dag i ukevisning åpner dagsvisning, og klikk på en fast aktivitet åpner redigering i Timeplan. Arbeidsøkter kan ikke klikkes ennå.
25. **Ukenummer** følger ISO 8601 (`isoWeek` i `dates.js`).
26. **`groupTasks(tasks, today)`** tar dagens dato (`ui.today`) i stedet for «nå», så render ikke trenger klokka. «Innen 7 dager» betyr at fristens dato er færre enn 7 dager unna. Passerte frister regnes som aktive. Fullførte sorteres med seneste frist først.
27. **Fremgang registreres som totalt utført** («jeg har gjort 3 timer så langt»), ikke som tid lagt til. Verdien begrenses til 0–100 % av estimatet. 100 % gjør oppgaven ferdig. «Marker som ferdig» endrer bare status og kan angres med «Gjenåpne».
28. **Frist** legges inn som dato og valgfritt klokkeslett (standard 23:59). En oppgave med passert frist kan redigeres så lenge fristen ikke endres.
29. **Tallfelt er tekstfelt med `inputmode="decimal"`**, ikke `type="number"`, fordi nettleseren forkaster «2,5» i tallfelt. Tall vises med desimalkomma (`numberToInput`).
30. **«Alt unnagjort for i dag!»** vises i «Aktive» når det finnes oppgaver, men ingen aktive. I steg 5.7 kan dette i stedet styres av dagens arbeidsøkter.
31. **Sletting av oppgave** sletter også arbeidsøktene til oppgaven.
32. **Menyen bryter over to linjer på mobil** med fire faner. Bør løses i steg 7.3 (f.eks. sidelengs scrolling eller meny nederst).
33. **Planleggeren (5.1–5.2):**
    - Økter og ledig tid går i hele kvarter. «Nå» rundes opp til neste kvarter.
    - Det er minst 15 minutters pause mellom to arbeidsøkter (også beholdte), men ikke mellom en økt og en fast aktivitet.
    - Tidsrom under 30 minutter brukes ikke. Unntaket er siste økt for en oppgave, som kan være kortere hvis det er lite igjen.
    - Gjenstående tid rundes opp til nærmeste kvarter.
    - Fullførte økter opptar tid og kapasitet, men trekkes ikke fra gjenstående tid (de er allerede med i `completed_hours`).
    - Oppgaver med passert frist planlegges ikke og kommer ikke i `unplaced`. To-do-listen viser dem som «Fristen har gått ut».
    - Økter får fast id `oppgave-id@starttid`, så funksjonen er ren.
34. **`removeFutureSessions`** sletter økter for oppgaven som ikke er fullført og ikke er over (slutt etter «nå»). En økt som pågår, slettes også.
35. **En økt gjøres kortere** hvis det ellers ville blitt igjen en rest på under 30 minutter (f.eks. 1:45 + 0:30 i stedet for 2:00 + 0:15).
36. **`replan` og `rollover`** tar inn og gir tilbake `data` (den lagrede tilstanden). `replan` fjerner også ufullførte økter for oppgaver som er ferdige eller slettet, også dagens. `rollover` fjerner alle ufullførte økter (også fremtidige) og planlegger alt på nytt fra i dag. Første gang appen åpnes, kjører `rollover` og lagrer datoen.
37. **Simulert dato:** `?dato=2026-11-03` bruker dagens klokkeslett, som går videre. `?dato=2026-11-03T14:00` står stille på det klokkeslettet. Ugyldig verdi gir ekte tid uten banner. Banneret viser dato og klokkeslett.
38. **Kobling (5.6):** Alle klikk og skjema i appen går gjennom `withReplan(endring, nå)`, som kjører `replan` bare når `data` faktisk ble endret. `rollover` kjøres via `startDay` når appen åpnes, og via `newDay` når appen blir synlig igjen etter midnatt.
39. **Arbeidsøkter henter navn og emne fra oppgaven** i kalender og «I dag». Da følger også dagens økter med hvis oppgaven får nytt navn eller emne. I kalenderen har økter hvit bakgrunn og stiplet kant, og fullførte økter har ✓.
40. **«I dag» (5.7)** er startvisningen. Avhuking kan angres (`uncompleteSession` trekker tiden fra igjen). «Alt unnagjort for i dag!» vises når alle dagens økter er huket av. Uten noe i dag vises «Ingen oppgaver ennå» (når det ikke finnes oppgaver) eller «Ingenting planlagt i dag». Det vises ikke «Ikke gjennomført» på økter som er over, fordi render ikke skal hente «nå».
41. **En fast aktivitet som legges inn oppå en av dagens økter**, flytter ikke økten (dagens økter står fast). Økter fra i morgen planlegges rundt den.
42. **Menyen scroller sidelengs på smale skjermer** i stedet for å bryte over to linjer (midlertidig løsning på punkt 32).
43. **«Fordel på nytt» lagres på oppgaven** som `allow_over_capacity: true` (utvidelse av datamodellen). Ellers ville neste `replan` presset arbeidet tilbake innenfor kapasiteten. Planleggeren har to runder: først alle oppgaver innenfor kapasiteten, deretter resten for disse oppgavene i ledig tid uten kapasitetsgrense. Flagget blir stående til oppgaven er ferdig.
44. **«Behold planen»** lukker varselet for oppgaven til appen lastes på nytt (`ui.dismissedOverload`, lagres ikke).
45. **{antall} og {dag} i varselet:** {dag} er den siste dagen oppgaven har økter før fristen (fristdagen hvis den ikke har noen), skrevet som «i dag», «i morgen», «på torsdag» eller full dato. {antall} er timene som allerede ligger den dagen pluss det som mangler.
46. **Overbelastning regnes ut sammen med planen** (`withReplan` og `startDay`) og ligger i `ui.overload`, så render ikke trenger «nå». Dager over kapasitet markeres med rød dato og rødlig kolonne i kalenderen. Oppgaver i fare får merkelappen «Frist i fare» i to-do-listen. Varselet vises øverst i «I dag» og «Oppgaver».
47. **«Juster arbeidsmengde»** åpner et skjema i varselet med daglig kapasitet, estimat og frist (krav.md del 5: øke kapasitet, redusere omfang, flytte frist).
48. **Tidsestimat (6.3):**
    - `estimateHours(tekst)` gir `{ hours, reasons }`, der `reasons` er koder med tall (f.eks. `{ code: 'ORD', words: 2000, hours: 10 }`). Teksten til hver kode ligger i `tekster.js` (`estimat.begrunnelse`). Tom tekst gir `{ error: 'TOMT_ESTIMAT' }`.
    - Reglene: 1 time per 200 ord, 400 ord per side, grunntid per oppgavetype når lengde mangler (programmering 10 t legges alltid til), +0,5 t per kilde (maks 5 t, +2 t uten tall), +3 t presentasjon, +1 t gruppearbeid, +1–2 t for lang oppgavetekst. Rundes til nærmeste halve time og er minst 1 time.
    - Alle tallene står som konstanter øverst i `logic/estimate.js`, så de er lette å justere.
49. **«Foreslå tidsbruk» (6.4)** bruker beskrivelsesfeltet i oppgaveskjemaet. Knappene «Foreslå tidsbruk» og «Bruk forslaget» er egne submit-knapper (`name="intent"`), så skjemaverdiene ikke forsvinner. En skjult «Lagre»-knapp står først i skjemaet, så Enter i et felt lagrer.
50. **Bildene (7.2):** Originalene i `assets/` er urørt. Optimaliserte versjoner er laget med canvas i headless Chrome. Nesten-hvit bakgrunn som henger sammen med kanten, er gjort gjennomsiktig. Illustrasjonene (400 px, WebP), hero (800 og 1376 px, WebP) og logo (64 px) ligger i `src/images/`. Favicon, apple-touch-icon og `og-image.jpg` ligger i `public/`, fordi de trenger faste adresser. Til sammen gikk bildene fra ca. 3,1 MB til ca. 160 kB. Byttes et bilde, må det optimaliseres på nytt.
51. **Tekster i HTML-filene (7.1):** En liten Vite-plugin i `vite.config.js` erstatter `{{landingsside.hero.overskrift}}` osv. med tekst fra `tekster.js` når siden bygges. Landingssiden er dermed vanlig HTML (virker uten JavaScript), men tekstene har fortsatt én kilde. Mangler en tekst, stopper bygget med en feilmelding.
52. **Kontrast (7.2):** Rød tekst og hvit tekst på rødt har for lav kontrast (3,8:1). «Fristen har gått ut» er derfor mørk tekst med rød prikk, og dager over kapasitet får rød ring i stedet for rød fylling.
53. **Mobilmeny (7.3):** Under 40rem ligger menyen fast nederst med ikon over teksten (erstatter punkt 32 og 42).
54. **Tilgjengelighet:** «Hopp til innhold» på begge sidene. Appen har en skjult `h1` med navnet på visningen. Sluttsjekken kjørte axe-core (WCAG 2.1 AA og «best practice») på landingssiden og alle visningene, og fant ingen feil.
55. **Eksempeldata (lagt til etter planen):**
    - `createSampleData(bruker, nå)` i `logic/sample.js` lager tre emner, fem ukentlige aktiviteter og fire arbeidskrav. Datoene regnes ut fra «nå», og id-ene er faste (`eksempel-…`).
    - Data fra i går (en gjennomført og en droppet økt) og `last_checked_date` = i går gjør at daglig sjekk flytter den droppede økten med en gang.
    - Eksamensforberedelsen (14 t, frist om to dager kl. 12) får aldri plass med 4 t om dagen. Derfor vises varselet uansett når på døgnet dataene lastes. Testene sjekker dette for seks tidspunkter, også dagen sommertiden slutter.
    - Eksempeldataene beholder navn og bruker-id, men setter kapasitet og studievindu til standard.
    - Knappen finnes i tomme tilstander («I dag», «Kalender», «Oppgaver») og under Innstillinger. Finnes det data fra før, spør den før de erstattes.
    - «Slett alle data» (under Innstillinger) spør først. Den beholder bare bruker-id-en, og innstillingene settes tilbake til standard.
56. **Eksport til kalenderfil (lagt til etter planen):**
    - `createIcs` og `prepareExport` i `logic/ics.js` lager en iCalendar-fil (RFC 5545). Brukeren velger arbeidsøkter, faste aktiviteter eller begge, og en periode på 1–16 uker fra i dag (standard 4).
    - Tider skrives som norsk veggklokketid med `TZID=Europe/Oslo` og en `VTIMEZONE` med sommertidsreglene. Omregningen bruker `Intl` med `timeZone: 'Europe/Oslo'`, så filen blir riktig uansett tidssone på maskinen.
    - Ukentlige aktiviteter blir én hendelse med `RRULE:FREQ=WEEKLY;UNTIL=…` (i UTC), fra første forekomst i perioden til slutten av perioden. Datamodellen har ingen egen sluttdato for faste aktiviteter (punkt 17).
    - Arbeidsøkter får oppgavens tittel, og emne og frist i beskrivelsen. Fullførte økter og økter uten oppgave tas ikke med.
    - Tekst escapes (`\`, `;`, `,`, linjeskift), og linjer over 75 byte brytes uten å dele æ, ø og å. Linjeskift er CRLF.
    - UID er `id@pace`, stabil mellom eksporter.
    - Selve nedlastingen (Blob og lenke) er en sideeffekt i `main.js`. Tom periode gir feilmeldingen «Ingenting å eksportere» i stedet for en tom fil.
    - Filen er kontrollert med Python-biblioteket `icalendar`, også en ukentlig aktivitet over sommertidsskiftet: alle forekomster ble 10:15 norsk tid.
57. **Førstegangsveiviser:**
    - Tre steg: daglig kapasitet, første faste aktivitet og første oppgave. Alle kan hoppes over, og veiviseren kan lukkes med krysset eller Esc.
    - `onboarding_done` i data (utvidelse av datamodellen) gjør at den bare vises én gang. Data lagret før veiviseren fantes, regnes som ferdig hvis det finnes emner, oppgaver eller aktiviteter. Eksempeldata setter den også. «Slett alle data» nullstiller den.
    - Dialogen har `role="dialog"` og `aria-modal`, og resten av siden er `inert`. Tab går i ring inne i dialogen. Fokus flyttes til steg-overskriften, til feilmeldingen ved feil, og til hovedinnholdet når veiviseren lukkes.
    - Kan startes på nytt fra Innstillinger uten at noe slettes.
58. **Ukesoppsummering:** `weekSummary(data, iDag)` i `logic/summary.js`. Planlagt = alle arbeidsøkter mandag–søndag, gjennomført = økter som er huket av. Fremgang registrert direkte på en oppgave (uten avhuking) telles ikke. Dagens dato kommer fra `clock.js` via `ui.today`, så `?dato=` virker. Timer vises med to desimaler (23,25).
59. **Hilsen:** `greetingPeriod(dato)` i `logic/greeting.js`. Perioden regnes ut når appen åpnes og når fanen blir synlig igjen, og ligger i `ui.greeting`, så render ikke trenger «nå».
60. **Mørk modus:**
    - Paletten står i design.md under «Mørk modus» og er kontrastmålt (alle tekstkombinasjoner minst 4,5:1).
    - Valget (`light`, `dark` eller `system`) lagres under `pace:tema`, egen nøkkel utenfor appdataene. Et lite skript i `<head>` i begge HTML-filene leser den og setter `data-theme` før siden tegnes, så det ikke blinker hvitt. Det er det eneste unntaket fra at `localStorage` bare brukes i `storage.js`.
    - Knapp med sol eller måne i headeren (også på landingssiden). Valget gjelder begge sidene.
    - Under Innstillinger: «Lyst», «Mørkt» og «Følg systemet» som radioknapper (fungerer med piltaster).
    - Bilder: illustrasjonene står på en lys, avrundet flate i mørk modus, logoen lysnes med et filter, og hero-bildet dempes og får en mørk overgang bak teksten.
    - Fremdriftslinjen i korall har 2,3:1 mot hvitt i lys modus (WCAG krever 3:1 for grafikk). Det er godtatt, fordi fremgangen alltid står som tekst ved siden av, og korall er fargen design.md bruker for fremgang.
61. **Fokus beholdes ved ny tegning:** Render husker elementet med fokus (`id` eller `data-*`-attributter) og gir det fokus igjen etter tegning. Et nytt `data-autofocus`-mål (skjema som åpnes, feilmelding, nytt steg) går foran.
62. **Robots (8.1):** `public/robots.txt` tillater alt (`User-agent: *`, `Allow: /`). Den har ingen `Sitemap`, fordi siden bare har to sider.
63. **Bilder (8.2):** Illustrasjonene finnes i 160 og 320 px (`src/images/*-160.webp` og `*-320.webp`) med `srcset` og `sizes`, så nettleseren velger etter visningsbredde og pikseltetthet. `ui/images.js` lager `<img>`-elementet i appen. Logoen er WebP. Favicon og apple-touch-icon er PNG, og OG-bildet er JPEG, fordi det er det disse formålene forventer. Landingssidens tre illustrasjoner har `loading="lazy"`. Bildene i appen står øverst i visningen og lastes vanlig. Chrome laster «lazy»-bilder som er innenfor ca. 1250 px av skjermen, så på den korte landingssiden lastes de likevel med en gang.
64. **Sikkerhetskopi (8.3):**
    - `logic/backup.js` lager filen (`{ format: 'pace-sikkerhetskopi', version: 1, exported_at, data }`) og validerer den ved import.
    - Valideringen sjekker filtype, versjon, innstillinger, felt og verdier i emner, oppgaver og aktiviteter, dobbelt id og at alle koblinger peker på noe som finnes. Feilmeldingen sier hvor feilen er (f.eks. «oppgave nr. 3»), og ingenting endres. Filer over 5 MB avvises før de leses.
    - Importen viser hva filen inneholder og spør før alt erstattes. Etter import kjører daglig sjekk, så gamle økter flyttes.
    - Valget av lys/mørk modus er ikke med, fordi det er en innstilling for nettleseren og ikke en del av planen.
65. **Angre sletting (8.4):**
    - `confirmDelete` legger det som trengs for å angre i `ui.undo` (lagres ikke): oppgaven og dens gjennomførte økter, emnet og hvilke oppgaver og aktiviteter som pekte på det, eller den faste aktiviteten. Ikke en kopi av alle data, så endringer gjort etter slettingen beholdes ved angring. Øvrige arbeidsøkter for en oppgave planlegges på nytt.
    - Hver sletting har et `token`, så tidtakeren for en eldre sletting ikke fjerner en nyere. Bare siste sletting kan angres.
    - Meldingen forsvinner etter 5 sekunder (`setTimeout` i `main.js`). Tiden står stille så lenge musepekeren er over meldingen eller «Angre» har tastaturfokus (`:focus-visible`), og starter på nytt når den forlates (WCAG 2.2.1). «Angre» får fokus etter slettingen.

---

## Fase 0 – Oppsett

- [x] **0.1 Prosjektoppsett.** `npm init`, Vite, Vitest, `.gitignore` (`node_modules`, `dist`), skriptene `dev`, `build`, `preview` og `test`. `vite.config.js` med `index.html` og `app.html`.
  *Ferdig når:* `npm run dev` viser begge sidene, og `npm test` kjører en eksempeltest som går grønt.
- [x] **0.2 Designgrunnlag.** `tokens.css` med fargene fra design.md som CSS-variabler, Plus Jakarta Sans (600/700) og Inter (400/500) fra Google Fonts, grunnstiler, og logo som favicon.
  *Ferdig når:* En testside viser overskrift, brødtekst og knapper (primær/aksent) i riktige farger og fonter.
- [x] **0.3 Tekster.** `src/tekster.js` med alle tekstene fra innhold.md: knapper, tomme tilstander, varsel, feilmeldinger og hjelpetekster. Varselteksten er en funksjon med `{antall}` og `{dag}`.
  *Ferdig når:* En test sjekker at varselteksten fylles ut riktig.
- [x] **0.4 Første publisering.** Koble repoet til Netlify eller Vercel med byggkommando `npm run build` og mappe `dist`. Publisert på https://pacewa.netlify.app/.
  *Ferdig når:* Den tomme appen ligger ute på en offentlig URL.

## Fase 1 – Datagrunnlag

- [x] **1.1 Dato-hjelpere** (`logic/dates.js`). Lokal dato som `YYYY-MM-DD`, minutter siden midnatt, `addDays`, `startOfWeek` (mandag), ukedag, og overlapp mellom tidsrom.
  *Tester:* månedsskifte, årsskifte, og sommertid slutt 25.10.2026.
- [x] **1.2 Modeller og validering** (`logic/models.js`, `logic/validation.js`). Funksjonene `createCourse`, `createTask` og `createFixedBlock` lager objekter med feltene fra krav.md del 4 og standardverdier. Valideringen returnerer feilkoder: `MANGLER_FELT`, `FRIST_I_FORTIDEN`, `SLUTT_FOR_START`.
  *Tester:* gyldige og ugyldige objekter, og frist sammenlignet med en innsendt «nå».
- [x] **1.3 Lagring** (`data/storage.js`). `load()` og `save(state)` med versjonsnummer. Lagringen skal tåle korrupt eller manglende data. Feil ved lagring vises som «Endringene ble ikke lagret».
  *Tester:* med en falsk `localStorage` i minnet, både lagre/hente på nytt, korrupt JSON og en `setItem` som kaster feil.
- [x] **1.4 Innstillinger.** Skjema for navn (valgfritt), daglig studiekapasitet med hjelpetekst og studievindu.
  *Ferdig når:* Verdiene er lagret etter at siden lastes inn på nytt.
- [x] **1.5 Store og felles render** (`data/store.js`, `ui/render.js`). Hele tilstanden ligger i `store.js`. Den endres bare via `update(endring)`, der `endring` er en ren funksjon `state → nyState`. Etter hver endring lagrer store via `storage.js` og kaller den felles funksjonen `render(state)` én gang. `render` tegner alle visningene. Senere UI-steg legger visningene sine inn i `render` og oppdaterer aldri DOM direkte fra hendelser.
  *Tester:* `update` kaller `render` nøyaktig én gang med ny tilstand, lagrer, og endrer ikke den gamle tilstanden. Testene bruker falsk lagring og en falsk render-funksjon.

## Fase 2 – Emner og faste aktiviteter (Må ha · F1)

- [x] **2.1 Emner.** Legge til, endre og slette emner med navn og farge.
  *Ferdig når:* Emner lagres og vises med fargeprikk.
- [x] **2.2 Gjentakelse** (`logic/recurrence.js`). `expandFixedBlocks(blocks, fra, til)` gjør ukentlige aktiviteter om til konkrete forekomster i et datointervall.
  *Tester:* `none` og `weekly`, intervall over flere uker, og sommertid.
- [x] **2.3 Skjema «+ Ny forelesning/aktivitet».** Tittel, emne, ukedag/dato, start/slutt og gjentakelse, med hjelpeteksten for fast aktivitet og feilmeldingen «Sjekk klokkeslettet».
  *Ferdig når:* Aktiviteten lagres, og ugyldig tid gir riktig melding.

## Fase 3 – Kalender (Må ha · F1)

- [x] **3.1 Kalenderlogikk** (`logic/calendar.js`). `blocksForRange` henter blokker for en periode. `layoutDay` gir overlappende blokker egne kolonner.
  *Tester:* blokker som ikke overlapper, delvis overlapp og tre samtidige blokker.
- [x] **3.2 Ukevisning.** Mandag til søndag, timer innenfor studievinduet, blokker i emnefarge og navigasjon forrige/neste uke/i dag.
  *Ferdig når:* Faste aktiviteter vises riktig over flere uker.
- [x] **3.3 Dagsvisning og tom tilstand.** Bytte mellom dag og uke. Tom kalender viser `empty-calendar.png`, teksten fra innhold.md og knappen «Legg til forelesning».

## Fase 4 – Oppgaver og to-do-liste (Må ha · F2)

- [x] **4.1 Kategorisering** (`logic/todo.js`). `groupTasks(tasks, iDag)` deler oppgavene i aktive, kommende og fullførte, sortert etter frist.
  *Tester:* grensen på 7 dager, påbegynt oppgave med fjern frist, og fullførte oppgaver.
- [x] **4.2 Skjema «+ Ny oppgave».** Tittel, emne, beskrivelse, estimert tid og frist, med feilmeldingene «Noe mangler» og «Fristen har allerede vært».
- [x] **4.3 To-do-liste.** Kort med emnefarge, frist, fremdriftslinje og de tre gruppene. Tom liste viser `empty-tasks.png` og «Legg til første oppgave». Når alt for i dag er ferdig, vises `all-done.png` og «Alt unnagjort for i dag!».
- [x] **4.4 Fremgang** (`logic/progress.js`). `registerProgress(task, {timer | prosent})` og `completeTask(task)` oppdaterer `completed_hours` og `status`.
  *Tester:* prosent til timer, verdier over 100 %, og at status går fra `not_started` til `in_progress` til `completed`.
- [x] **4.5 Knappene «Registrer fremgang» og «Marker som ferdig»** i to-do-listen.

## Fase 5 – Planlegging og forskyvning (Må ha · F4, Bør ha · automatisk plan)

Planleggeren trengs allerede i «Må ha», fordi forskyvning av økter forutsetter at noe kan planlegge på nytt.

- [x] **5.1 Ledig tid** (`logic/slots.js`). `freeSlots(dato, opptatt, innstillinger)` finner ledige tidsrom i studievinduet, utenom faste aktiviteter. Er dagen i dag, telles bare tiden etter «nå».
  *Tester:* tom dag, dag full av forelesninger, økt som starter før vinduet, og «nå» midt på dagen.
- [x] **5.2 Planlegger** (`logic/scheduler.js`). `scheduleTasks(oppgaver, opptatt, innstillinger, { fra, nå })` returnerer `{ blocks, unplaced }`. `opptatt` er faste aktiviteter pluss økter som beholdes, og `fra` er første dato det planlegges på. Er `fra` i dag, brukes bare tid etter «nå». Oppgaven med tidligst frist planlegges først. Gjenstående tid er `estimated_hours – completed_hours – (beholdte, ikke fullførte økter)`. Øktene er 30–120 min, og daglig kapasitet gjelder på tvers av alle oppgaver, også beholdte økter.
  *Tester:* én oppgave, to oppgaver med ulik frist, kapasiteten fylles opp, frist i morgen, ingen tid igjen (gir `unplaced`), beholdte økter i dag som teller mot kapasitet og gjenstående tid, og at faste blokker aldri endres.
- [x] **5.3 Frigjøring** (`logic/scheduler.js`). `removeFutureSessions(blocks, taskId, nå)` sletter gjenstående økter når en oppgave er ferdig.
  *Tester:* fullførte og tidligere økter beholdes.
- [x] **5.4 Ny plan og daglig sjekk** (`logic/rollover.js`). Begge følger antakelse 3.
  - `replan(state, nå)` beholder dagens økter og sletter ikke fullførte økter fra i morgen. Deretter planlegger den fra «nå» i dag, med dagens økter som opptatt tid.
  - `rollover(state, nå)` fjerner tidligere, ikke fullførte økter, planlegger fra i dag og lagrer `last_checked_date`.
  *Tester:* `replan` rører ikke dagens økter. En ny oppgave med frist i morgen tidlig får økt i dag når det finnes ledig tid etter «nå», men ikke når dagen er full eller dagskapasiteten er brukt opp. `rollover` gjør ingenting samme dag, flytter økter en ny dag og håndterer flere dager borte. Begge håndterer frist som har gått ut. `rollover` gjør ingenting når «nå» er før `last_checked_date`, slik at det er trygt å gå tilbake fra simulert dato.
- [x] **5.5 Simulert dato for manuell testing** (`data/clock.js`). Appen henter «nå» bare via `clock.js`. Med URL-parameteren `?dato=2026-11-03` bruker appen den datoen med dagens klokkeslett. `?dato=2026-11-03T14:00` setter også klokkeslettet. Funksjonen er skjult og lenkes ikke fra noe sted, men et lite banner viser «Testmodus: dato satt til …» så den ikke forveksles med vanlig bruk. Merk at testmodus bruker de samme lagrede dataene.
  *Tester:* `parseSimulatedNow(søkestreng, ekteNå)` håndterer gyldig dato, dato med klokkeslett, ugyldig verdi (bruker ekte «nå») og manglende parameter.
- [x] **5.6 Kobling i appen.** `replan` kjøres ved endringer og `rollover` når appen åpnes, begge via `store.update` og med «nå» fra `clock.js`. Arbeidsøkter vises i kalenderen i emnefarge.
  *Ferdig når:* Manuell sjekk viser at en ny oppgave kan få økter i ledig tid i dag uten å endre dagens eksisterende økter, og at «ferdig» fjerner øktene. Åpnes appen med `?dato=` satt til en senere dag, flyttes uferdige økter.
- [x] **5.7 «I dag»-visning** (`logic/today.js`, `ui/today.js`). Viser dagens faste aktiviteter og arbeidsøkter i tidsrekkefølge, med emnefarge og oppgavetittel. Arbeidsøkter kan hukes av. Da settes `is_completed = true`, og varigheten legges til oppgavens `completed_hours` (antakelse 4). Dette blir startvisningen i appen.
  *Tester:* `todayAgenda(state, nå)` gir riktig utvalg og sortering, med ukentlige faste aktiviteter utvidet. `completeSession(state, blockId)` oppdaterer økt og oppgave og endrer status til `in_progress`. Å huke av to ganger gir ikke dobbel tid.
  *Ferdig når:* Avhuking vises med en gang via felles render, og tiden er lagret etter at siden lastes inn på nytt.

## Fase 6 – Bør ha

- [x] **6.1 Overbelastning** (`logic/overload.js`). `detectOverload(data, nå)` returnerer oppgaver i fare med `{ taskId, dag, timerNødvendig }` og dager over kapasitet.
  *Tester:* ingen overbelastning, én oppgave i fare og flere oppgaver som konkurrerer.
- [x] **6.2 Varsel og rød markering.** Varselet «Her hoper det seg opp» med `{antall}` og `{dag}` utfylt, og knappene «Fordel på nytt» og «Behold planen» (antakelse 7). Dager over kapasitet blir røde (#EF4444) i kalenderen. «Juster arbeidsmengde» åpner kapasitet, estimat og frist.
- [x] **6.3 Tidsestimat** (`logic/estimate.js`). `estimateHours(tekst)` returnerer `{ hours, reasons }`. Den er regelbasert og ser på antall ord og sider, krav til kilder, oppgavetype (essay, rapport, presentasjon, programmering, lab), gruppearbeid og lengden på selve teksten.
  *Tester:* minst seks eksempeltekster, tom tekst som gir feil, og at resultatet alltid er rundet og større enn 0.
- [x] **6.4 «Foreslå tidsbruk» i oppgaveskjemaet.** Tom tilstand og feilen «Vi trenger litt tekst». Forslaget vises med begrunnelser og hjelpetekst og kan godtas eller justeres.

## Fase 7 – Landingsside og ferdigstilling

- [x] **7.1 Landingsside** (`index.html`). Hero med `hero.jpg`, overskrifter og knapper fra innhold.md og de tre fordelene. «Kom i gang» lenker til `app.html`.
- [x] **7.2 Metadata og tilgjengelighet.** `lang="nb"`, OG-tagger med `og-image.png`, alt-tekster fra innhold.md, synlig tastaturfokus og fargekontrast.
- [x] **7.3 Responsivitet.** To-do og dagsvisning fungerer på mobil (ca. 400 px), og ukevisning på nettbrett og PC.
- [x] **7.4 Sluttsjekk.** `npm test` er grønn, `npm run build` gir ingen feil, og en gjennomgang av alle brukerhistoriene under «Må ha» og «Bør ha» på den publiserte siden er gjort.

## Fase 8 – Videreutvikling

- [x] **8.1 robots.txt.** `public/robots.txt` som tillater alt.
  *Ferdig når:* filen ligger i `dist/`, og Netlify serverer den med `Content-Type: text/plain`.
- [x] **8.2 Bildeoptimalisering.** WebP, riktig størrelse per visning (`srcset` og `sizes`) og `loading="lazy"` for bilder under bretten.
  *Ferdig når:* ingen bilder lastes i større oppløsning enn de vises i, og bilder under bretten lastes ikke før de trengs (målt i nettleseren).
- [x] **8.3 Eksport og import av data (JSON)** under Innstillinger. Ren funksjon i `logic/backup.js` som lager og validerer filen.
  *Tester:* gyldig fil gir data tilbake, og ugyldig JSON, feil filtype, nyere versjon, manglende felt, ugyldige verdier, dobbelt id og brutte koblinger gir feil.
  *Ferdig når:* import spør før data erstattes, og avbryt beholder dataene.
- [x] **8.4 Angre sletting.** «Angre» i 5 sekunder etter sletting av oppgave, emne eller fast aktivitet.
  *Tester:* angre gjenoppretter det som ble slettet (også koblinger fra oppgaver og aktiviteter til emnet), og etter 5 sekunder kan det ikke angres.

---

# Fase 9–14: Smartere planlegging (F5–F10)

Fasene bygger på kravene F5–F10 i [krav.md](krav.md). Arbeidsmåten er den samme som før:
- ett steg om gangen
- `npm test` etter hvert steg
- axe-core i lys og mørk modus, på desktop og mobil, etter steg som endrer grensesnittet

## Datamodell v2

Godkjent. Alle nye felt har standardverdier som gir samme plan som i dag (punkt 68).

| Hvor | Felt | Type og standard |
| --- | --- | --- |
| User | `preferred_session_minutes` (foretrukket øktlengde) | Tall: 25–120 i steg på 5. Standard 120. Brukes bare når pausen er over 0 (punkt 72). |
| User | `min_session_minutes` (minste øktlengde) | Tall: 15, 30, 45 eller 60. Standard 30. |
| User | `break_minutes` (pause) | 0, 10 eller 15. Standard 15. |
| User | `preferred_times` | Liste med `{ id, weekdays: [1–7], start: 'HH:MM', end: 'HH:MM' }`, der 1 er mandag. Standard `[]`, som betyr hele studievinduet. |
| Task | `priority` | `low`, `normal` eller `high`. Standard `normal`. |
| ScheduleBlock | `is_locked` | Boolean. Standard `false`, og alltid `false` for faste aktiviteter. |
| Data (øverst) | `days_off` | Liste med `{ date: 'YYYY-MM-DD', kind: 'sick' \| 'off' }`. Standard `[]`. |

Lagringsformatet får `version: 2`. Nøkkelen er fortsatt `pace:v1` (punkt 67).

## Slik kombinerer planleggeren reglene

### Rekkefølgen planleggeren går frem i

1. **Opptatt tid.** Disse blokkene står fast og flyttes ikke:
   - faste aktiviteter
   - fullførte økter
   - låste økter
   - dagens økter (punkt 3)

   Rundt hver arbeidsøkt holdes pausen (`break_minutes`) fri. Fridager har null kapasitet.
2. **Gjenstående tid** per oppgave er `estimert – utført – planlagt i økter som står fast`. Låste økter er med i det som står fast.
3. **Grunnlinje.** Planleggeren kjører først dagens metode, der tidligste frist går først. Den bruker all ledig tid i studievinduet og ser bort fra prioritet og foretrukne tider. Resultatet er hvor mange timer som *uansett* ikke får plass. Det kalles grunnlinjen.
4. **Rekkefølge.** Oppgavene sorteres etter *effektiv frist*:
   - Høy prioritet: fristen minus 3 døgn.
   - Lav prioritet: fristen pluss 3 døgn.
   - Ved likhet: ekte frist, deretter når oppgaven ble opprettet.
5. **Runde 1, foretrukne tider.** Oppgavene tas én og én i rekkefølgen fra punkt 4. Hver oppgave får økter i de første ledige foretrukne tidene:
   - Med pause over 0 får øktene ønsket øktlengde.
   - Med pause 0 får oppgaven én sammenhengende økt per ledige tidsrom (punkt 72).

   Hver økt må gjennom en **kontroll** før den godtas. Kontrollen kjører metoden med tidligste frist først på alt arbeid som gjenstår, i all ledig tid. Økten godtas bare hvis det ikke mangler flere timer totalt enn i grunnlinjen. Ellers prøver planleggeren neste ledige tid.
6. **Runde 2, øvrig tid i studievinduet.** Gjør det samme for det som ikke fikk plass, med samme kontroll.
7. **Runde 3, korte hull.** Hull som er kortere enn minste øktlengde, men minst 15 minutter, brukes bare for oppgaver som ellers ikke rekker fristen.
8. **Runde 4, «Fordel på nytt».** Bare for oppgaver med `allow_over_capacity`. Tiden plasseres uten kapasitetsgrense, som i dag.
9. **Sammenslåing.** Økter for samme oppgave som ligger rett etter hverandre, blir én økt (F10). Med pause 0 skjer dette i den vanlige planen. Med pause over 0 skjer det bare etter flytting eller import.

Det som fortsatt ikke har fått plass, gir varselet «Her hoper det seg opp».

Kontrollen i punkt 5 gjør at prioritet og foretrukne tider bare *flytter* arbeid. De kan aldri føre til at det mangler flere timer før fristene enn de ellers ville gjort.

### Eksempel A: prioritet uten at noen mister fristen

Utgangspunkt:
- Det er mandag kl. 08.00.
- Kapasiteten er 3 timer om dagen, og det finnes ingen faste aktiviteter eller foretrukne tider.
- Oppgavene er:
  - **Rapport**, normal prioritet, 6 timer, frist onsdag
  - **Presentasjon**, høy prioritet, 6 timer, frist fredag (effektiv frist tirsdag)

Presentasjonen planlegges først:

| Forsøk | Kontroll | Resultat |
| --- | --- | --- |
| Presentasjon mandag, 3 t | Rapporten har tirsdag og onsdag, til sammen 6 t | Godtatt |
| Presentasjon tirsdag | Rapporten ville bare hatt onsdag, 3 t av 6 | Avvist |
| Presentasjon onsdag | Rapporten ville bare hatt tirsdag, 3 t av 6 | Avvist |
| Presentasjon torsdag, 3 t | Rapporten er fortsatt ok | Godtatt |

Deretter får rapporten tirsdag og onsdag.

Planen blir: mandag presentasjon, tirsdag rapport, onsdag rapport, torsdag presentasjon. Uten prioritet ville rapporten fått mandag og tirsdag.

**Variant:** Hvis rapporten trenger 9 timer, avvises presentasjonen både mandag, tirsdag og onsdag. Presentasjonen får torsdag og fredag, selv om den har høy prioritet. Prioritet går aldri foran en frist som kan rekkes.

**Når ikke alt får plass:** Ingen rekkefølge kan da redde alle fristene. Kontrollen sørger for at det ikke mangler flere timer totalt enn i grunnlinjen, mens rekkefølgen avgjør hvem som får tiden. Den med høyest prioritet får tiden først, og varselet kommer på den med lavere prioritet.

### Eksempel B: foretrukne tider og «aldri etter 20»

Utgangspunkt:
- Foretrukne tider er hverdager 09–15.
- Studievinduet er 08–20. «Aldri etter 20» er slutten på studievinduet (punkt 77).
- Kapasiteten er 4 timer, og øktlengden er 120 minutter med 15 minutters pause.
- Det er forelesning mandag til onsdag kl. 09–13.
- Det er mandag kl. 08.00, og én oppgave på 10 timer har frist torsdag kl. 12.

Ledig foretrukket tid:

| Dag | Tid | Timer |
| --- | --- | --- |
| Mandag | 13–15 | 2 |
| Tirsdag | 13–15 | 2 |
| Onsdag | 13–15 | 2 |
| Torsdag | 09–12 | 3 |
| **Sum** | | **9** |

Runde 1 gir 9 timer. Runde 2 legger den siste timen i den første ledige tiden utenom de foretrukne: mandag 08.00–09.00.

Ingenting legges etter kl. 20, fordi studievinduet er en fast grense.

Hvis oppgaven bare var på 8 timer, ville alt havnet i foretrukket tid.

### Eksempel C: øktlengde, minste lengde og pause

Med ønsket lengde 50 minutter og 10 minutters pause fra kl. 09.00 blir øktene 09.00–09.50, 10.00–10.50 og 11.00–11.50. Planleggeren regner derfor i steg på 5 minutter (punkt 74).

Rester under minste lengde, med ønsket lengde 90 og minste lengde 45:

| Gjenstår | Første oppdeling | Problem | Løsning | Resultat |
| --- | --- | --- | --- | --- |
| 200 min | 90 + 90 + 20 | Resten er under 45 | Forrige økt kortes ned (som i punkt 35) | 90 + 65 + 45 |
| 130 min, ønsket 50 | 50 + 50 + 30 | Nedkorting gir 35, som er under 45 | Resten legges til forrige økt | 50 + 80 |

Med pause over 0 kan en økt aldri bli lengre enn 120 minutter.

Pause 0 med ønsket lengde 50, når det gjenstår 3 timer, tidsrommet 09–12 er ledig og kapasiteten er 4 timer:

| Pause | Økter |
| --- | --- |
| 10 min | 09.00–09.50, 10.00–10.50 og 11.00–11.50. Den siste halvtimen kommer i neste ledige tidsrom. |
| 0 | Én økt 09.00–12.00. Ønsket lengde brukes ikke, og økter rett etter hverandre slås sammen (F10). |

Pause 0 med to oppgaver, når kapasiteten er 4 timer og det er ledig 09–13:

| Oppgave | Gjenstår | Økt |
| --- | --- | --- |
| Rapport | 1 t | 09.00–10.00 |
| Lab | 3 t | 10.00–13.00 |

Øktene ligger rett etter hverandre, men blir to bokser, fordi de gjelder ulike oppgaver.

Låst økt og pause: Brukeren har låst en økt tirsdag 10.00–11.30, og pausen er 10 minutter. Andre økter kan da tidligst starte 11.40. Det første ledige tidsrommet etter låste blokker og forelesninger rundes opp til nærmeste kvarter, så neste økt starter 11.45.

### Låste økter som ikke blir gjort (rollover)

En låst økt betyr «jeg vil gjøre dette *da*». Når det tidspunktet har passert uten at økten er huket av, gjelder ikke låsen lenger.

- **Samme dag:** Økten blir liggende, som alle dagens økter (punkt 3). Brukeren kan fortsatt huke den av eller flytte den til senere i dag.
- **Ny dag:** Den daglige sjekken fjerner økten. Tiden går tilbake til oppgavens gjenstående tid og planlegges på nytt etter de vanlige reglene. Den nye økten er *ikke* låst.

  En melding forteller hva som skjedde, for eksempel «1 låst økt fra i går ble ikke gjort og er planlagt på nytt».
- **Låste økter frem i tid** blir stående låst etter daglig sjekk.
- **Oppgaven er ferdig:** Låste økter som ikke er gjort, slettes som andre økter (F4).
- **Fristen flyttes før en låst økt:** Økten blir liggende, fordi brukeren har valgt tidspunktet. Den får merket «Etter fristen», og oppgaven får «Frist i fare».

Eksempel:
- Tirsdag ligger en låst økt «Rapport» kl. 18.00–19.30 som ikke blir huket av.
- Onsdag morgen blir økten fjernet, og 1,5 timer planlegges på nytt fra onsdag, i foretrukne tider først.
- En låst økt torsdag kl. 10.00 for samme oppgave blir liggende.

### Dra og slipp med mus, tastatur og på mobil

Felles for alle måtene:
- **Hva kan flyttes:** arbeidsøkter som ikke er fullført. Faste aktiviteter og fullførte økter kan ikke flyttes.
- **Etter flyttingen:**
  - Økten låses og beholder lengden.
  - Planen bygges på nytt rundt den.
  - En melding nederst sier for eksempel «Økten er flyttet til onsdag 10.15» og har knappen «Angre». Den bruker samme 5-sekunders mekanisme som ved sletting.

**Hvor økten kan og ikke kan slippes:**

| Mål | Hva skjer |
| --- | --- |
| Oppå en fast aktivitet | Ikke lov |
| Oppå en fullført eller låst økt | Ikke lov |
| Oppå en annen oppgaves økt i dag | Ikke lov |
| Før «nå» | Ikke lov |
| Oppå en ulåst økt fra i morgen eller senere | Lov. Den andre økten planlegges på nytt. |
| Utenfor studievinduet | Lov, med advarsel i meldingen |
| Etter fristen | Lov, med advarsel i meldingen |
| På en fridag | Lov, med advarsel i meldingen |

**Mus:**
- Ta tak i økten og dra den. En skygge viser ny plass og tid, for eksempel «Ons 10.15–11.45», festet til nærmeste kvarter.
- Over et sted der økten ikke kan slippes, er skyggen markert med «Kan ikke flyttes hit». Slipper man der, skjer ingenting.
- Esc avbryter.
- En bevegelse under 5 piksler regnes som klikk og åpner økt-panelet.

**Tastatur:**
- Hver arbeidsøkt i kalenderen og i «I dag» er en knapp. Enter eller mellomrom åpner økt-panelet med «Marker som gjort», «Flytt økt» og «Lås opp» (når økten er låst).
- «Flytt økt» åpner et lite skjema med dato og starttid. Feltene er fylt ut på forhånd, og starttiden går i steg på 15 minutter.
- Skjemaet gir feil på samme måte som slipp:
  - Et sted der økten ikke kan ligge, gir skjemafeil.
  - Advarsler kommer i meldingen etterpå.
- Etter flyttingen får økten fokus på det nye stedet, og meldingen leses opp, fordi den har `role="status"`.
- Det blir ingen «dra med piltaster». Skjemaet er alternativet til dra-bevegelsen (WCAG 2.5.7).

**Mobil:**
- **Hovedvei:** Et kort trykk på en økt åpner samme økt-panel. «Flytt økt» bruker telefonens egne velgere for dato og klokkeslett.
- **Dra:** Et langt trykk (ca. 0,5 sekunder) starter dra.
  - Vanlig sveip scroller som før.
  - Når dra er i gang, stoppes scrolling.
  - Kalenderen scroller av seg selv når økten dras mot kanten.
- **Dagsvisning:** Dra flytter bare klokkeslettet. For å bytte dag bruker man «Flytt økt».

## Fase 9 – Overføring av lagrede data til nytt format

- [x] **9.1 Fasit fra dagens kode.** Lag en testfil med to typiske v1-datasett som rene data (`src/logic/fixtures/`):
  - eksempeldataene
  - et datasett med fullførte og ulåste økter

  Lagre øktene som dagens `replan` og `rollover` gir for dem.
  *Ferdig når:* fasiten er committet før datamodellen endres.
- [x] **9.2 Datamodell v2** (`logic/models.js`). Nye felt med standardverdier i `createUser`, `createTask`, `createFixedBlock`, `createInitialState` og `normalizeState`. Ingen endring i planleggeren ennå.
  *Tester:* nye objekter får standardverdier, og `normalizeState` fyller inn manglende felt uten å endre de som finnes.
- [ ] **9.3 Migrering** (`logic/migrate.js`). `migrate(stored)` kjører en kjede av rene funksjoner (`1 → 2`, senere `2 → 3`) og gir `{ data, from, to }` eller `{ error }`.
  *Tester:*
  - Fasit-dataene fra 9.1 og tomme data overføres riktig.
  - Data med manglende eller rare felt håndteres.
  - Data fra en nyere versjon gir feil.
  - Migrering to ganger gir samme resultat, og argumentet endres ikke.
  - `replan` på overførte data gir nøyaktig fasiten fra 9.1.
- [ ] **9.4 Lagring** (`data/storage.js`). `load` overfører via `migrate`. Før data lagres i nytt format første gang, kopieres originalen til `pace:v1:pre-v2`. Feil i overføringen behandles som korrupte data (punkt 13).
  *Tester:* med falsk `localStorage`:
  - v1 inn gir v2 lagret, med kopi av originalen.
  - Kopien overskrives ikke ved neste lasting.
  - v2 lastes uten endring.
- [ ] **9.5 Sikkerhetskopi** (`logic/backup.js`). Eksporten får `version: 2`. Import godtar versjon 1 og 2 via `migrate` og validerer de nye feltene (gyldige verdier, ukedager 1–7, gyldige klokkeslett og datoer).
  *Tester:* v1-fil importeres, ugyldig `priority`, `break_minutes` og `days_off` gir feil med plassering.
  *Ferdig når:* data lagret av den publiserte versjonen åpnes i den nye uten at noe ser annerledes ut, også en sikkerhetskopi tatt før endringen (sjekket i nettleser).

## Fase 10 – Én boks per sammenhengende økt (F10) og minste øktlengde

- [ ] **10.1 Sammenslåing** (`logic/sessions.js`). `mergeAdjacentSessions(blocks)` slår sammen økter etter reglene i punkt 71.
  *Tester:*
  - To og tre økter på rad blir én.
  - Økter blir ikke slått sammen når det ligger en pause, en fast aktivitet eller en annen oppgave imellom.
  - En fullført og en ikke fullført økt blir ikke slått sammen.
  - Låst og ulåst blir én låst økt.
  - En økt som ender 10.00, og en som starter 10.05, blir ikke slått sammen.
  - Den sammenslåtte økten får id-en til den første.
  - Faste aktiviteter berøres ikke, og argumentet endres ikke.
- [ ] **10.2 Bruk i planen.** Sammenslåing kjøres sist i `replan` og `rollover`, og ved import.
  *Tester:* når en sammenslått økt hukes av, registreres hele lengden. Angring trekker hele lengden fra igjen.
  *Ferdig når:* kalenderen og «I dag» viser én boks (sjekket med data der to økter ligger rett etter hverandre).
- [ ] **10.3 Minste øktlengde i planleggeren.** `user.min_session_minutes` erstatter `SESSION_MIN`. Restregelen og runden med korte hull følger punkt 73.
  *Tester:*
  - Eksemplene i eksempel C.
  - Kort hull brukes bare når fristen ellers ikke rekkes.
  - Oppgaver med mindre igjen enn minste lengde får én kort økt.
  - Standardverdien gir samme plan som fasiten fra 9.1.
- [ ] **10.4 Innstilling «Korteste økt»** under Innstillinger i en ny gruppe «Økter og pauser», med valgene 15, 30, 45 og 60 minutter. Planen bygges på nytt når innstillingen endres.

## Fase 11 – Dra og slipp av økter (F9)

- [ ] **11.1 Logikk for flytting** (`logic/move.js`).
  - `checkMove(data, blockId, nyStart, nå)` gir `{ ok, error }` med feilkodene `OPPTATT`, `I_FORTIDEN` og `KAN_IKKE_FLYTTES`, og `warnings` med `UTENFOR_STUDIEVINDU`, `ETTER_FRISTEN` og `FRIDAG`.
  - `moveSession` flytter, låser og slår sammen.
  - `unlockSession` låser opp.
  - `snapToQuarter` fester til nærmeste kvarter.
  *Tester:* alle reglene i tabellen over hvor økten kan slippes, og flytting over midnatt (ikke lov).
- [ ] **11.2 Låste økter i planen.** `replan` beholder låste økter uansett dato, og `rollover` fjerner låste økter fra tidligere dager (punkt 79). Kapasitet og overbelastning teller låste økter.
  *Tester:*
  - Eksemplet i avsnittet om rollover.
  - Låst økt etter fristen gir «Frist i fare».
  - En ulåst økt som overlapper en låst, planlegges på nytt.
- [ ] **11.3 Økt-panel og låsikon.** Et klikk eller Enter på en arbeidsøkt i kalenderen eller «I dag» åpner panelet med «Marker som gjort», «Flytt økt» og «Lås opp». Låste økter har et lite låsikon med tekst for skjermlesere. Dette erstatter punkt 24.
- [ ] **11.4 Skjemaet «Flytt økt».** Dato og starttid, feil og advarsler som i 11.1, meldingen med «Angre» (`ui.undo` med `kind: 'move'`) og fokus på økten etterpå.
  *Tester:* angre gir tilbake økten slik den var, også låsen.
  *Ferdig når:* hele flyttingen kan gjøres med tastatur og på mobil (400 px).
- [ ] **11.5 Dra med mus** (Pointer Events). Skygge med tid, festet til kvarter, markering der økten ikke kan slippes, Esc for å avbryte og klikk under 5 piksler. Tilstanden følger punkt 84.
  *Ferdig når:* flytting fra tirsdag til onsdag i ukevisning og innenfor en dag i dagsvisning virker i Chrome og Firefox.
- [ ] **11.6 Dra på mobil.** Langt trykk starter dra, vanlig sveip scroller, og kalenderen scroller av seg selv nær kanten. Dette testes med berøringsemulering i Chrome.
- [ ] **11.7 (Kan ha) Endre lengde** ved å dra i nedre kant. Gjøres bare hvis du ønsker det når vi kommer hit.

## Fase 12 – Prioritet, foretrukne tider, øktlengde og pauser (F5–F7)

- [ ] **12.1 Prioritet på oppgaver.** Valget «Lav, Normal, Høy» i oppgaveskjemaet. Merket «Høy prioritet» eller «Lav prioritet» vises på kortet, og normal vises ikke. Eksempeldataene får én oppgave med høy prioritet. Planleggeren endres ikke ennå.
- [ ] **12.2 Kontroll av fristene** (`logic/scheduler.js`). Dagens metode, der tidligste frist går først, skilles ut som `shortfall(oppgaver, opptatt, bruker, { fra, nå })`, som gir timer som mangler per oppgave.
  *Tester:* samme resultat som dagens `unplaced` for fasit-dataene.
- [ ] **12.3 Prioritet i planleggeren.** Effektiv frist og kontroll per økt (punkt 75).
  *Tester:*
  - Eksempel A med variant.
  - Overbelastning der høy prioritet får tiden.
  - Uten prioritet blir planen lik fasiten.
  - En egenskapstest med 200 tilfeldige oppsett (fast frø) viser at prioritet aldri gir flere manglende timer enn uten prioritet.
- [ ] **12.4 Øktlengde og pause i planleggeren.** `preferred_session_minutes` og `break_minutes` med steg på 5 minutter (punkt 74). Med pause 0 får samme oppgave én sammenhengende økt per ledige tidsrom (punkt 72).
  *Tester:*
  - 50/10-eksemplet.
  - Pause 0 gir én økt 09.00–12.00 for 3 timer uansett ønsket lengde.
  - Pause 0 med to oppgaver gir to økter rett etter hverandre.
  - Pause 0 legger ikke nytt arbeid inntil en låst økt for samme oppgave.
  - Pause rundt låste økter.
  - Med pause over 0 blir ingen økt over 120 minutter.
- [ ] **12.5 Foretrukne tider i planleggeren.** `preferredSlots(dato, ledig, bruker)` og runde 1 og 2.
  *Tester:*
  - Eksempel B.
  - Ingen foretrukne tider gir samme plan som før.
  - Foretrukne tider utenfor studievinduet kuttes.
  - Overlappende foretrukne tider teller én gang.
- [ ] **12.6 Innstillinger for økter og foretrukne tider.**
  - Gruppen «Økter og pauser» får ønsket lengde og pause (0, 10 eller 15).
  - Ny gruppe «Foretrukne studietider» med en liste over tidsrom. Hvert tidsrom har ukedager (avkrysning, med hurtigvalgene «Hverdager» og «Helg») og fra–til.
  - Hjelpetekst om at «aldri etter» settes med studievinduet.
- [ ] **12.7 Samlet sjekk.**
  - Ytelse: 30 oppgaver over 16 uker planlegges på under 100 ms (test).
  - Overbelastning, «I dag», kalender og kalendereksport virker med alle de nye innstillingene.
  - axe-core er kjørt.

## Fase 13 – Fridager og «Jeg er syk i dag» (F8)

- [ ] **13.1 Logikk** (`logic/daysoff.js`). `markDaysOff(data, fra, til, type, nå)` og `unmarkDayOff(data, dato)`. Planleggeren, kontrollen og overbelastningen gir fridager null kapasitet. Ulåste og låste økter på dagen fjernes og planlegges på nytt. Daglig sjekk fjerner markeringer for dager som er passert.
  *Tester:*
  - Fridag midt i en plan.
  - Periode over flere dager.
  - Fridag fjernet gir ny plan.
  - Faste aktiviteter blir stående.
  - Fridag i fortiden er ikke lov.
- [ ] **13.2 «Jeg er syk i dag»** (`markSickToday(data, nå)`). Dagens gjenværende, ikke fullførte økter flyttes, og oppgaver som *nylig* kom i fare (overbelastning før og etter) returneres.
  *Tester:* fullførte økter blir stående, låste økter flyttes, listen over oppgaver i fare er riktig, og angre gir nøyaktig tilbake det som var.
- [ ] **13.3 Knappen i «I dag».** Ett klikk markerer dagen. Panelet viser hvilke frister som kom i fare, eller at ingen gjorde det, med «Angre».
- [ ] **13.4 Fridager i kalender og innstillinger.**
  - Dagsvisningen har «Marker som fri» og «Fjern markering».
  - Fri- og sykedager vises som nedtonede dager med merkelapp.
  - Under Innstillinger finnes en liste over kommende fridager, og et skjema med fra–til (maks 31 dager).

## Fase 14 – Designforbedringer

- [ ] Stegene legges inn når listen med designforbedringer kommer.

## Beslutninger og antakelser (fase 9–14)

Nummereringen fortsetter fra listen øverst, så punktene kan henvises til på samme måte. Dette er forslag som kan endres.

66. **Datamodell v2** er godkjent som i tabellen. Den har tre innstillinger for økter på brukeren:
    - foretrukket øktlengde (`preferred_session_minutes`)
    - minste øktlengde (`min_session_minutes`)
    - pause (`break_minutes`)
67. **Lagring:**
    - Nøkkelen er fortsatt `pace:v1`, og versjonsfeltet går fra 1 til 2. Navnet på nøkkelen er bare et navn, og å bytte den gir ekstra kode uten gevinst.
    - Originalen kopieres én gang til `pace:v1:pre-v2`.
    - Data fra en *nyere* versjon behandles som i dag (kopieres til `pace:v1:backup`, punkt 13).
    - En fane som står åpen med gammel kode under publisering, kan lagre v1 over v2. Det overføres riktig ved neste lasting, så risikoen er godtatt.
68. **Standardverdiene gir samme plan som i dag:** ønsket lengde 120, minste 30, pause 15, ingen foretrukne tider og normal prioritet. Brukere som ikke endrer noe, merker ingen forskjell, og fasiten fra 9.1 kan brukes som test gjennom alle fasene.
69. **Migrering** er rene funksjoner i en kjede, én per versjonsskifte. Den brukes både ved lasting og ved import av sikkerhetskopi.
70. **Fasit før endring (9.1):** Øktene fra dagens kode lagres som testdata *før* noe endres, så vi kan bevise at planen ikke endrer seg utilsiktet.
    - `src/logic/fixtures/` har to datasett i v1-format (`{ version: 1, data }`, slik localStorage har dem). Det ene er eksempeldataene lastet mandag 2.11.2026 kl. 09.00. Det andre har fullførte, droppede og fremtidige økter, «Fordel på nytt», en ferdig oppgave med gjenstående økt og en engangsaktivitet.
    - `fasit-v1.json` har resultatet av `rollover` og `replan` (blokker, `last_checked_date` og `detectOverload`) for 8 tilfeller. `fasit.test.js` sjekker dem.
    - Skriptet som laget fasiten, er `scripts/lag-fasit.mjs`. Det skal bare kjøres mot koden fra før fase 9, aldri for å oppdatere fasiten etter endringer, for da tester fasiten ingenting.
71. **Sammenslåing (F10):**
    - Kravene for å slå sammen: samme oppgave, slutt lik start, samme dag og samme `is_completed`.
    - En fullført og en ikke fullført del blir to bokser, fordi de har ulik status.
    - Er én av dem låst, blir hele økten låst.
    - Den sammenslåtte økten beholder id-en til den første.
    - Med pause 0 lager planleggeren selv økter som ligger rett etter hverandre, og de slås da sammen (punkt 72). Med pause over 0 oppstår slike økter bare ved flytting eller import.
72. **Pause 0 og øktlengde (F10):**
    - Ønsket øktlengde brukes bare til å dele opp arbeidet når pausen er større enn 0.
    - Når pausen er 0, slås økter for samme oppgave som ligger rett etter hverandre sammen til én økt, slik F10 krever. Oppgaven får da én sammenhengende økt per ledige tidsrom.
    - Lengden på den sammenhengende økten begrenses bare av tidsrommet, dagskapasiteten og det som gjenstår. Grensen på 120 minutter gjelder ikke, fordi deler av økten uansett ville blitt slått sammen igjen.
    - Ulike oppgaver kan ligge rett etter hverandre når pausen er 0. Det blir egne økter (F10).
    - Planleggeren legger ikke nytt arbeid rett inntil en låst økt for samme oppgave. Da ville sammenslåingen låst tid som planleggeren har valgt (punkt 71). Brukeren kan selv flytte en økt inntil en annen. Da blir de én låst økt.
73. **Minste øktlengde:**
    - Valgene er 15, 30, 45 og 60 minutter.
    - Blir det en rest under minste lengde, kortes forrige økt ned. Hvis det gjør forrige økt for kort, legges resten til forrige økt i stedet (maks 120 minutter). Dette gjelder bare når pausen er over 0. Med pause 0 blir arbeidet ikke delt opp (punkt 72).
    - Har en oppgave mindre igjen enn minste lengde totalt, får den én kort økt, fordi arbeidet ellers aldri blir planlagt.
    - Hull under minste lengde (minst 15 minutter) brukes bare i runde 3.
74. **Steg på 5 minutter i planleggeren:** 50 minutters økter og 10 minutters pause går ikke opp i kvarter. Ledig tid som begynner av seg selv («nå», slutten på en forelesning eller låst økt) rundes fortsatt opp til nærmeste kvarter, så de fleste økter starter på hele kvarter. Dra og slipp og skjemaet «Flytt økt» bruker kvarter (F9).
75. **Prioritet:**
    - Effektiv frist er fristen minus 3 døgn for høy og pluss 3 døgn for lav. 3 døgn er en konstant som er lett å justere.
    - Prioritet *flytter* oppgaver i køen, men gjør dem ikke absolutt viktigst. Ellers ville oppgaver med normal prioritet alltid ligge helt inntil fristen, uten slingringsmonn.
    - **Lav prioritet:** I køen regnes oppgaven som om fristen var 3 døgn senere. Den kommer derfor bak oppgaver med normal prioritet som har lik frist, og også bak oppgaver med normal prioritet som har inntil 3 døgn senere frist. Den ekte fristen er alltid en fast grense: ingen økt legges etter den, og kontrollen avviser plasseringer som gjør at oppgaven ikke rekker fristen. Lav prioritet kan altså bli planlagt senere, men aldri for sent når det kunne vært unngått.
      - *Eksempel 1, lik frist:* Det er mandag, og kapasiteten er 3 timer om dagen. «Lesing» har lav prioritet, «Øving» har normal prioritet, og begge er på 3 timer med frist torsdag. Øving får mandag og lesing tirsdag.
      - *Eksempel 2, lav prioritet med tidligere frist:* Lesing har nå 6 timer og frist onsdag, og øving har 6 timer og frist torsdag.
        - Den effektive fristen for lesing er lørdag, så øving kommer først i køen og får mandag.
        - Øving tirsdag eller onsdag avvises av kontrollen, fordi lesing da ikke ville rukket fristen onsdag.
        - Lesing får tirsdag og onsdag, og øving får torsdag.
        - Lesing har tidligere frist, men kommer bak øving i køen fordi fristen regnes 3 døgn senere. Den ekte fristen onsdag gjør likevel at lesing får tirsdag og onsdag.
    - Kontrollen sikrer at prioritet aldri gir flere manglende timer totalt enn uten prioritet.
    - Metoden med tidligste frist først er ikke matematisk perfekt med daglig kapasitet og oppstykket tid, men er god nok for en students mengde oppgaver. Egenskapstesten i 12.3 sjekker garantien mot planen uten prioritet.
76. **Prioritet går foran foretrukne tider for andre oppgaver:** En oppgave med høy prioritet kan ta formiddagen, så en vanlig oppgave havner på ettermiddagen. Det skjer bare innenfor studievinduet og aldri slik at en frist ryker.
77. **Foretrukne tider:**
    - Settes som tidsrom per ukedag. Ingen foretrukne tider betyr at hele studievinduet er foretrukket, som i dag.
    - «Aldri etter 20» er slutten på studievinduet, som allerede er en fast grense. Det blir ikke egne faste grenser per ukedag.
78. **Låste økter:**
    - Står fast i planen på alle datoer.
    - Teller mot dagskapasiteten og oppgavens planlagte tid.
    - Holder pause rundt seg.
    - En låst økt etter fristen teller som planlagt, men gir merket «Etter fristen» og «Frist i fare» på oppgaven.
79. **Rollover av låste økter:**
    - En låst økt fra en tidligere dag som ikke er huket av, fjernes, og tiden planlegges på nytt uten lås.
    - En melding sier hvor mange låste økter det gjaldt.
    - Låste økter i dag og fremover blir stående.
80. **Lås opp** setter `is_locked: false`. Økter fra i morgen kan da flyttes ved neste nye plan, og dagens økter står som før (punkt 3).
81. **Dagens økter står fortsatt fast (punkt 3).** Endret prioritet, foretrukne tider eller øktlengde påvirker bare planen fra i morgen og ledig tid i dag etter «nå».
82. **Hvor økten kan slippes:** Se tabellen i avsnittet «Dra og slipp». Ulåste økter fra i morgen kan dekkes, fordi de uansett planlegges på nytt. Dagens økter kan ikke dekkes (punkt 3). Over kapasitet er lov, og dagen blir rød som før.
83. **Flytting låser økten i samme operasjon.** Angre bruker `ui.undo` med `kind: 'move'` og gir tilbake økten slik den var. Som ved sletting kan bare siste handling angres.
84. **Dra og slipp følger reglene for tilstand og rendering:**
    - Skyggen ligger i `ui.drag` (lagres ikke).
    - Den oppdateres bare når kvarteret eller dagen under pekeren endres, og høyst én gang per skjermbilde.
    - Pekeren fanges på `#app`, som ikke tegnes på nytt, så dra ikke brytes av render.
    - Omregning fra piksler til tid er en ren funksjon med tester.
    - Det trengs ikke noe nytt unntak i CLAUDE.md.
85. **Mobil:** Et kort trykk åpner økt-panelet, og «Flytt økt» er hovedveien. Langt trykk (0,5 sekunder) starter dra. Da stoppes scrolling med `touchmove` og `preventDefault`. I dagsvisningen flytter dra bare klokkeslettet.
86. **Tastatur:** Skjemaet «Flytt økt» er alternativet til dra-bevegelsen (WCAG 2.5.7). Det blir ingen flytting med piltaster, fordi det ARIA-mønsteret for dra og slipp er avviklet og vanskelig å gjøre godt.
87. **Arbeidsøkter blir klikkbare** (økt-panelet i 11.3). Det erstatter punkt 24.
88. **Fridager:**
    - Lagres som én markering per dato. Skjemaet godtar fra–til (maks 31 dager).
    - Faste aktiviteter vises fortsatt, fordi forelesningen går uansett.
    - Låste økter på dagen låses opp og flyttes, og spørsmålet før markeringen sier det.
    - Dager i fortiden kan ikke markeres, og passerte markeringer fjernes ved daglig sjekk.
89. **«Jeg er syk i dag»:**
    - Flytter alle dagens ikke fullførte økter, også låste og den som pågår. Fullførte økter blir stående.
    - Listen viser bare oppgaver som *kom* i fare på grunn av markeringen.
    - «Angre» i panelet gir tilbake nøyaktig det som var.
    - Senere kan markeringen fjernes fra kalenderen. Da bygges planen på nytt i stedet for at det gamle hentes tilbake.
90. **Kalendereksport (.ics):** Låste økter eksporteres som andre økter, og fridager eksporteres ikke.
91. **Nye tekster** (prioritet, økter og pauser, foretrukne tider, flytting, lås, fridager og syk) legges i `tekster.js` og merkes som ikke fra innhold.md, som før.
92. **Endre lengde ved å dra (Kan ha)** er et eget valgfritt steg (11.7) og gjøres bare hvis du ønsker det.
93. **Datamodell v2 i koden (9.2):**
    - `PRIORITY` og `DAY_OFF_KIND` ligger i `models.js`.
    - `DEFAULT_SETTINGS` har de tre øktinnstillingene og en frosset, tom `preferred_times`, så den delte standardlisten ikke kan endres ved et uhell.
    - `normalizeState` fyller inn `priority`, `is_locked` og `days_off` bare der de mangler. Elementer som ikke er objekter, får være som de er, så valideringen ved import fortsatt finner dem.
    - Eksempeldataene har alle v2-feltene.
    - Øktene planleggeren lager, får ikke `is_locked` før steg 11.2, fordi planleggeren ikke endres i fase 9. Feltet fylles inn når dataene lastes, og en økt uten feltet regnes som ulåst.
