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
15. **Tekster som ikke står i innhold.md** er merket med en kommentar i `tekster.js` (innstillinger, «Lukk», bekreftelser, `LESING_FEILET`, meny, emner, faste aktiviteter og kalender).
16. **Meny:** Appen har faner i toppen: «Kalender» (fase 3), «Timeplan» (faste aktiviteter og emner) og «Innstillinger». «I dag» og «Oppgaver» kommer i senere faser. Gjeldende visning ligger i `ui.view`.
17. **Faste aktiviteter legges inn med dato for første gang**, ikke bare ukedag. Ukentlige aktiviteter gjentas fra den datoen. De har ingen sluttdato (f.eks. semesterslutt), og aktiviteter over midnatt støttes ikke.
18. **Emnefarger** velges fra 8 faste farger (`COURSE_COLORS` i `models.js`, navn i `tekster.js`). Nytt emne får første ubrukte farge. Dette er brukerdata og ikke en del av designpaletten.
19. **Sletting** skjer etter et ja/nei-spørsmål i raden. Når et emne slettes, beholdes oppgaver og aktiviteter i emnet, men `course_id` settes til `null`.
20. **Bildene i `assets/`** har nesten hvit, ikke gjennomsiktig, bakgrunn og viser en svak firkant på hvite kort. Bør fikses i bildene (gjennomsiktig PNG) i steg 7.2.
21. **`clock.js` ble laget i fase 3** (bare `now()`), fordi kalenderen trenger dagens dato. Simulert dato legges til i steg 5.5. Dagens dato lagres i `ui.today` når appen starter.
22. **Kalenderen er startvisningen** frem til «I dag»-visningen kommer i steg 5.7. Smale skjermer (under 40rem) starter i dagsvisning. Ukevisningen scroller sidelengs inne i kortet på mobil.
23. **Timene i kalenderen** er studievinduet, utvidet til hele timer hvis aktiviteter ligger utenfor (`visibleHours`).
24. **Klikk i kalenderen:** klikk på en dag i ukevisning åpner dagsvisning, og klikk på en fast aktivitet åpner redigering i Timeplan. Arbeidsøkter kan ikke klikkes ennå.
25. **Ukenummer** følger ISO 8601 (`isoWeek` i `dates.js`).

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

- [ ] **4.1 Kategorisering** (`logic/todo.js`). `groupTasks(tasks, nå)` deler oppgavene i aktive, kommende og fullførte, sortert etter frist.
  *Tester:* grensen på 7 dager, påbegynt oppgave med fjern frist, og fullførte oppgaver.
- [ ] **4.2 Skjema «+ Ny oppgave».** Tittel, emne, beskrivelse, estimert tid og frist, med feilmeldingene «Noe mangler» og «Fristen har allerede vært».
- [ ] **4.3 To-do-liste.** Kort med emnefarge, frist, fremdriftslinje og de tre gruppene. Tom liste viser `empty-tasks.png` og «Legg til første oppgave». Når alt for i dag er ferdig, vises `all-done.png` og «Alt unnagjort for i dag!».
- [ ] **4.4 Fremgang** (`logic/progress.js`). `registerProgress(task, {timer | prosent})` og `completeTask(task)` oppdaterer `completed_hours` og `status`.
  *Tester:* prosent til timer, verdier over 100 %, og at status går fra `not_started` til `in_progress` til `completed`.
- [ ] **4.5 Knappene «Registrer fremgang» og «Marker som ferdig»** i to-do-listen.

## Fase 5 – Planlegging og forskyvning (Må ha · F4, Bør ha · automatisk plan)

Planleggeren trengs allerede i «Må ha», fordi forskyvning av økter forutsetter at noe kan planlegge på nytt.

- [ ] **5.1 Ledig tid** (`logic/slots.js`). `freeSlots(dato, opptatt, innstillinger)` finner ledige tidsrom i studievinduet, utenom faste aktiviteter. Er dagen i dag, telles bare tiden etter «nå».
  *Tester:* tom dag, dag full av forelesninger, økt som starter før vinduet, og «nå» midt på dagen.
- [ ] **5.2 Planlegger** (`logic/scheduler.js`). `scheduleTasks(oppgaver, opptatt, innstillinger, { fra, nå })` returnerer `{ blocks, unplaced }`. `opptatt` er faste aktiviteter pluss økter som beholdes, og `fra` er første dato det planlegges på. Er `fra` i dag, brukes bare tid etter «nå». Oppgaven med tidligst frist planlegges først. Gjenstående tid er `estimated_hours – completed_hours – (beholdte, ikke fullførte økter)`. Øktene er 30–120 min, og daglig kapasitet gjelder på tvers av alle oppgaver, også beholdte økter.
  *Tester:* én oppgave, to oppgaver med ulik frist, kapasiteten fylles opp, frist i morgen, ingen tid igjen (gir `unplaced`), beholdte økter i dag som teller mot kapasitet og gjenstående tid, og at faste blokker aldri endres.
- [ ] **5.3 Frigjøring** (`logic/scheduler.js`). `removeFutureSessions(blocks, taskId, nå)` sletter gjenstående økter når en oppgave er ferdig.
  *Tester:* fullførte og tidligere økter beholdes.
- [ ] **5.4 Ny plan og daglig sjekk** (`logic/rollover.js`). Begge følger antakelse 3.
  - `replan(state, nå)` beholder dagens økter og sletter ikke fullførte økter fra i morgen. Deretter planlegger den fra «nå» i dag, med dagens økter som opptatt tid.
  - `rollover(state, nå)` fjerner tidligere, ikke fullførte økter, planlegger fra i dag og lagrer `last_checked_date`.
  *Tester:* `replan` rører ikke dagens økter. En ny oppgave med frist i morgen tidlig får økt i dag når det finnes ledig tid etter «nå», men ikke når dagen er full eller dagskapasiteten er brukt opp. `rollover` gjør ingenting samme dag, flytter økter en ny dag og håndterer flere dager borte. Begge håndterer frist som har gått ut. `rollover` gjør ingenting når «nå» er før `last_checked_date`, slik at det er trygt å gå tilbake fra simulert dato.
- [ ] **5.5 Simulert dato for manuell testing** (`data/clock.js`). Appen henter «nå» bare via `clock.js`. Med URL-parameteren `?dato=2026-11-03` bruker appen den datoen med dagens klokkeslett. `?dato=2026-11-03T14:00` setter også klokkeslettet. Funksjonen er skjult og lenkes ikke fra noe sted, men et lite banner viser «Testmodus: dato satt til …» så den ikke forveksles med vanlig bruk. Merk at testmodus bruker de samme lagrede dataene.
  *Tester:* `parseSimulatedNow(søkestreng, ekteNå)` håndterer gyldig dato, dato med klokkeslett, ugyldig verdi (bruker ekte «nå») og manglende parameter.
- [ ] **5.6 Kobling i appen.** `replan` kjøres ved endringer og `rollover` når appen åpnes, begge via `store.update` og med «nå» fra `clock.js`. Arbeidsøkter vises i kalenderen i emnefarge.
  *Ferdig når:* Manuell sjekk viser at en ny oppgave kan få økter i ledig tid i dag uten å endre dagens eksisterende økter, og at «ferdig» fjerner øktene. Åpnes appen med `?dato=` satt til en senere dag, flyttes uferdige økter.
- [ ] **5.7 «I dag»-visning** (`logic/today.js`, `ui/today.js`). Viser dagens faste aktiviteter og arbeidsøkter i tidsrekkefølge, med emnefarge og oppgavetittel. Arbeidsøkter kan hukes av. Da settes `is_completed = true`, og varigheten legges til oppgavens `completed_hours` (antakelse 4). Dette blir startvisningen i appen.
  *Tester:* `todayAgenda(state, nå)` gir riktig utvalg og sortering, med ukentlige faste aktiviteter utvidet. `completeSession(state, blockId)` oppdaterer økt og oppgave og endrer status til `in_progress`. Å huke av to ganger gir ikke dobbel tid.
  *Ferdig når:* Avhuking vises med en gang via felles render, og tiden er lagret etter at siden lastes inn på nytt.

## Fase 6 – Bør ha

- [ ] **6.1 Overbelastning** (`logic/overload.js`). `detectOverload(plan, oppgaver, innstillinger)` returnerer oppgaver i fare med `{ taskId, dag, timerNødvendig }` og dager over kapasitet.
  *Tester:* ingen overbelastning, én oppgave i fare og flere oppgaver som konkurrerer.
- [ ] **6.2 Varsel og rød markering.** Varselet «Her hoper det seg opp» med `{antall}` og `{dag}` utfylt, og knappene «Fordel på nytt» og «Behold planen» (antakelse 7). Dager over kapasitet blir røde (#EF4444) i kalenderen. «Juster arbeidsmengde» åpner kapasitet, estimat og frist.
- [ ] **6.3 Tidsestimat** (`logic/estimate.js`). `estimateHours(tekst)` returnerer `{ timer, begrunnelser[] }`. Den er regelbasert og ser på antall ord og sider, krav til kilder, oppgavetype (essay, rapport, presentasjon, programmering, lab), gruppearbeid og lengden på selve teksten.
  *Tester:* minst seks eksempeltekster, tom tekst som gir feil, og at resultatet alltid er rundet og større enn 0.
- [ ] **6.4 «Foreslå tidsbruk» i oppgaveskjemaet.** Tom tilstand og feilen «Vi trenger litt tekst». Forslaget vises med begrunnelser og hjelpetekst og kan godtas eller justeres.

## Fase 7 – Landingsside og ferdigstilling

- [ ] **7.1 Landingsside** (`index.html`). Hero med `hero.jpg`, overskrifter og knapper fra innhold.md og de tre fordelene. «Kom i gang» lenker til `app.html`.
- [ ] **7.2 Metadata og tilgjengelighet.** `lang="nb"`, OG-tagger med `og-image.png`, alt-tekster fra innhold.md, synlig tastaturfokus og fargekontrast.
- [ ] **7.3 Responsivitet.** To-do og dagsvisning fungerer på mobil (ca. 400 px), og ukevisning på nettbrett og PC.
- [ ] **7.4 Sluttsjekk.** `npm test` er grønn, `npm run build` gir ingen feil, og en gjennomgang av alle brukerhistoriene under «Må ha» og «Bør ha» på den publiserte siden er gjort.
