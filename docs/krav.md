# Kravspesifikasjon – Pace

## 1. Målgruppe

- **Hovedmålgruppe:** Studenter i høyere utdanning (universitet, høyskole og fagskole) som opplever tidsklemme, sliter med å strukturere hverdagen, eller har problemer med å anslå tidsbruk på større oppgaver og arbeidskrav.
- **Sekundærmålgruppe:** Elever i videregående skole med mye selvstendig arbeid, samt studenter som jobber ved siden av studiene og trenger en plan som tilpasser seg uforutsette hendelser.

## 2. Brukerhistorier

Brukerhistoriene er prioritert etter MoSCoW-metoden (Må ha, Bør ha, Kan ha).

### Må ha

- Som student vil jeg kunne **legge inn emner, forelesningstider og andre faste aktiviteter**, slik at systemet vet når jeg er opptatt.
- Som student vil jeg kunne **legge inn oppgaver og arbeidskrav med frister**, slik at jeg får oversikt over hva som må gjøres.
- Som student vil jeg ha en **visuell kalender og en to-do-liste**, slik at jeg enkelt ser dagens og ukens gjøremål.
- Som student vil jeg kunne **registrere progresjon og huke av oppgaver som ferdige**, slik at planen oppdateres og tid frigjøres.
- Som student vil jeg at **planlagte arbeidsøkter jeg ikke gjennomfører automatisk flyttes til senere ledig tid før fristen**, slik at jeg ser konsekvensen av å ligge etter.

### Bør ha

- Som student vil jeg kunne **lime inn en oppgavebeskrivelse og få et tidsestimat**, slik at jeg vet hvor mye tid jeg bør sette av.
- Som student vil jeg få **en automatisk generert arbeidsplan** fordelt utover dagene, basert på frister og ledige tidsrom.
- Som student vil jeg få **et varsel og en visuell markering når arbeid hoper seg opp**, slik at jeg ser når en frist er i fare.

### Kan ha

- Som student vil jeg kunne synkronisere med eksterne kalendere (f.eks. Google Calendar eller Outlook).
- Som student vil jeg kunne dele opp store arbeidskrav i mindre delmål.
- Som student vil jeg kunne logge inn og få tilgang til planen fra flere enheter.

## 3. Funksjonelle krav

### F1: Timeplan og kalender

- Brukeren skal kunne legge inn ukentlige faste forelesninger, seminarer og andre faste aktiviteter, knyttet til et emne.
- Systemet skal vise en kalender med dags- og ukevisning.
- Faste aktiviteter skal aldri flyttes automatisk.

### F2: Oppgaver og arbeidskrav

- Brukeren skal kunne opprette oppgaver med tittel, emne, beskrivelse, estimert tidsbruk og frist.
- Systemet skal ha en to-do-liste som viser aktive, kommende og fullførte oppgaver.
- Brukeren skal kunne registrere utført tid eller progresjon (%) på en oppgave.

### F3: Tidsestimering

- Brukeren skal kunne skrive inn eller lime inn en oppgavetekst.
- Systemet skal vurdere omfanget (f.eks. antall sider eller ord, krav til kilder, type oppgave) og foreslå et antall timer som brukeren kan godta eller justere.
- Første versjon er regelbasert. Bruk av språkmodell via API kan legges til senere, med API-nøkkelen lagret på serversiden.

### F4: Dynamisk planlegging og progresjon

- Systemet skal automatisk fordele gjenstående arbeid på ledige tidsrom frem til fristen, innenfor brukerens daglige studiekapasitet.
- Når en oppgave markeres som fullført, slettes gjenstående planlagte økter for oppgaven, og tiden frigjøres i kalenderen.
- Uferdige økter flyttes etter logikken i del 5.

### F5: Prioritet på oppgaver

- Oppgaver skal ha prioriteten lav, normal eller høy. Standard er normal.
- Høy prioritet planlegges tidligere, men aldri slik at en annen oppgave mister fristen når det kunne vært unngått.

### F6: Foretrukne studietider

- Brukeren kan angi foretrukne tidsrom per ukedag, f.eks. «hverdager 09–15» og «aldri etter 20».
- Planleggeren bruker foretrukne tidsrom først. Øvrig ledig tid i studievinduet brukes bare når det trengs for å rekke en frist.

### F7: Øktlengde og pauser

- Brukeren kan velge foretrukket øktlengde (f.eks. 50 eller 90 minutter), minste øktlengde (f.eks. 45 minutter) og pause mellom økter (0, 10 eller 15 minutter).
- Planleggeren lager ikke økter som er kortere enn minste øktlengde, med mindre det er nødvendig for å rekke en frist.

### F8: Fridager og «Jeg er syk i dag»

- Brukeren kan markere en dag som syk eller fri. Dagen får null studiekapasitet.
- Ved «syk i dag» flyttes dagens gjenstående økter med ett klikk, og brukeren ser hvilke frister som eventuelt kommer i fare.
- Markeringen kan angres.

### F9: Flytte økter med dra og slipp

- Brukeren kan dra en arbeidsøkt til en annen dag eller et annet tidspunkt i kalenderen, f.eks. fra tirsdag til onsdag.
- Økten fester seg til nærmeste kvarter.
- Økten kan ikke slippes oppå en fast aktivitet. Slippes den utenfor studievinduet eller etter fristen, får brukeren en advarsel.
- En økt brukeren har flyttet selv, blir **låst**. Planleggeren flytter den ikke når planen bygges på nytt, men den teller med i dagskapasiteten.
- Låste økter vises med et lite låsikon og kan låses opp.
- Flyttingen kan angres.
- Faste aktiviteter (forelesninger) kan ikke dras.
- Det finnes et alternativ uten mus: «Flytt økt» med valg av dato og klokkeslett. Det skal også fungere på mobil.
- **Kan ha:** Endre lengden på en økt ved å dra i nedre kant.

### F10: Én boks per sammenhengende økt

- Økter for samme oppgave som ligger rett etter hverandre, uten noe imellom, vises og lagres som **én** økt.
- Ligger det en pause, en annen aktivitet eller en annen oppgave imellom, blir det egne økter.
- Når en sammenslått økt hukes av, registreres hele lengden som utført tid.

## 4. Datamodell

I første versjon lagres alle data lokalt i nettleseren (localStorage), uten innlogging.

### User (Bruker / innstillinger)

- `id` (UUID)
- `name` (String, valgfri)
- `daily_available_study_hours` (Float – maks antall studietimer per dag)

### Course (Emne)

- `id` (UUID)
- `name` (String, f.eks. «ITF10619 Programmering 2»)
- `color` (String, hex – brukes i kalender og liste)

### Task (Oppgave / arbeidskrav)

- `id` (UUID)
- `course_id` (FK, valgfri)
- `title` (String)
- `description` (Text)
- `deadline` (DateTime)
- `estimated_hours` (Float)
- `completed_hours` (Float)
- `status` (Enum: `not_started`, `in_progress`, `completed`)
- `created_at` (DateTime)

### ScheduleBlock (Kalenderhendelse / arbeidsøkt)

- `id` (UUID)
- `task_id` (FK, null for faste aktiviteter)
- `course_id` (FK, valgfri)
- `title` (String)
- `start_time` (DateTime)
- `end_time` (DateTime)
- `is_fixed` (Boolean – `true` for forelesninger og faste aktiviteter, `false` for fleksible arbeidsøkter)
- `recurrence` (Enum: `none`, `weekly` – for faste aktiviteter)
- `is_completed` (Boolean)

## 5. Logikk for forskyvning av uferdige økter

### Hovedprinsipp: daglig evaluering og rullerende plan

1. **Daglig sjekk:** Når appen åpnes en ny dag, går systemet gjennom tidligere planlagte arbeidsøkter (`is_fixed = false`) som ikke er markert som fullført.
2. **Gjenstående tid:** For hver berørt oppgave beregnes gjenstående timer som `estimated_hours – completed_hours`.
3. **Forskyvning:**
   - Systemet finner ledige tidsrom fra og med i dag frem til oppgavens frist, utenom faste aktiviteter og innenfor `daily_available_study_hours`.
   - Gjenstående timer legges inn i de første ledige tidsrommene.
   - Oppgaver med tidligst frist planlegges først.
4. **Varsel når arbeid hoper seg opp:**
   - Hvis gjenstående timer overstiger tilgjengelig tid før fristen, vises et varsel.
   - Dager der planlagt arbeid overstiger daglig kapasitet markeres i rødt i kalenderen.
   - Brukeren kan velge å omfordele, øke daglig kapasitet, redusere omfang eller flytte fristen (hvis mulig).
