# CLAUDE.md – Pace

Pace er en studieplanlegger for studenter. Den fordeler arbeid på oppgaver rundt faste forelesninger og flytter økter som ikke blir gjennomført. Data lagres i `localStorage`, og det er ingen innlogging eller server.

Prosjektet bruker vanilla JavaScript (ES-moduler), Vite og Vitest. Det publiseres som statisk side på Netlify eller Vercel. I motsetning til de andre skoleoppgavene i hjemmemappen bruker dette prosjektet npm.

## Dokumenter

- `docs/krav.md` – brukerhistorier, funksjonelle krav, datamodell og logikk for forskyvning
- `docs/design.md` – farger og fonter
- `docs/innhold.md` – all tekst i grensesnittet
- `docs/plan.md` – stegvis plan, teknologivalg og antakelser

## Kommandoer

- `npm run dev` – utviklingsserver
- `npm test` – kjør Vitest
- `npm run build` – bygg til `dist/`

## Arbeidsmåte

- Følg `docs/plan.md` ett steg om gangen. Gjør bare det steget beskriver.
- **Stopp etter hvert steg.** Oppsummer hva som er gjort og vent på brukeren før du går videre.
- Kjør `npm test` før du sier at et steg er ferdig, og si fra hvis noen tester feiler. Huk av steget i plan.md først når testene er grønne.
- Hvis du tar en beslutning som plan.md ikke dekker, skriv den under «Beslutninger og antakelser» i plan.md.

## Prosjektregler

### Design
- Følg `docs/design.md`. Bruk fargene via CSS-variablene i `src/styles/tokens.css`, ikke hex-koder direkte i komponentene.
- Bruk Plus Jakarta Sans (600/700) for overskrifter og Inter (400/500) for brødtekst og UI.
- Advarselsfargen (#EF4444) brukes bare til overbelastning og frister i fare.

### Tekst
- All tekst i grensesnittet er på norsk bokmål, og alle sider har `lang="nb"`.
- Bruk tekstene fra `src/tekster.js`, som bygger på `docs/innhold.md`. Ikke skriv tekst direkte i UI-koden.
- Trengs en tekst som ikke står i innhold.md, legg den i `tekster.js` i samme vennlige tone og nevn det for brukeren.
- Datoer formateres med `Intl.DateTimeFormat('nb-NO')`. Uken starter mandag.

### Planleggingslogikk
- All planleggingslogikk ligger i `src/logic/` som rene funksjoner:
  - ingen DOM og ingen `localStorage`
  - «nå» sendes inn som parameter
  - argumentene endres ikke; funksjonene returnerer nye objekter
- Hver funksjon i `src/logic/` har tester i en `*.test.js`-fil ved siden av seg.
- Faste aktiviteter (`is_fixed = true`) skal aldri flyttes av planleggeren.

### Tid
- «Nå» hentes **bare** fra `src/data/clock.js`, som også håndterer simulert dato (`?dato=`). Bruk aldri `Date.now()` eller `new Date()` uten argument andre steder.

### Tilstand og rendering
- All tilstand endres **bare** via `store.update(endring)` i `src/data/store.js`, der `endring` er en ren funksjon `state → nyState`.
- UI tegnes **bare** via den felles `render(state)` i `src/ui/render.js`. Hendelser kaller `store.update` og endrer aldri DOM direkte.
- All tilgang til `localStorage` går gjennom `src/data/storage.js`.

### Kode
- Feltnavn følger datamodellen i krav.md del 4 (engelsk snake_case).
- Funksjonsnavn er på engelsk, og kommentarer er på norsk.
- Ikke legg til rammeverk eller biblioteker uten å spørre først.
