// All tekst i grensesnittet, hentet fra docs/innhold.md.
// UI-koden skal bruke disse i stedet for å skrive tekst direkte.

const tall = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });

// «1 time», «2,5 timer»
export function formatHours(antall) {
  return `${tall.format(antall)} ${antall === 1 ? 'time' : 'timer'}`;
}

export const landingsside = {
  // Ikke fra innhold.md – lagt til i steg 7.1–7.2
  tittel: 'Pace – studiehverdagen, i ditt tempo',
  tilAppen: 'Åpne Pace',
  fordelerOverskrift: 'Slik hjelper Pace deg',
  avslutning: 'Klar for et roligere semester?',
  bunntekst: 'Pace lagrer planen din bare i denne nettleseren. Ingen konto, ingen innlogging.',
  appTittel: 'Pace',
  hero: {
    overskrift: 'Studiehverdagen, i ditt tempo.',
    underoverskrift:
      'Pace fordeler arbeidskravene dine rundt forelesningene automatisk. Blir du forsinket, tilpasser planen seg – uten pekefingre eller stress.',
    hovedknapp: 'Kom i gang – det er gratis',
    sekundaerknapp: 'Se hvordan det fungerer',
  },
  fordeler: [
    {
      overskrift: 'Slutt på skippertak',
      tekst: 'Store oppgaver deles opp i overkommelige økter som passer inn mellom forelesningene dine.',
    },
    {
      overskrift: 'En plan som tilpasser seg livet',
      tekst:
        'Rakk du ikke leseøkten i går? Ingen fare. Pace flytter arbeidet videre, så du alltid vet hva neste steg er.',
    },
    {
      overskrift: 'Smarte tidsestimater',
      tekst: 'Lim inn oppgaveteksten eller arbeidskravet, så foreslår Pace hvor mye tid du bør sette av.',
    },
  ],
};

export const knapper = {
  nyOppgave: '+ Ny oppgave',
  nyAktivitet: '+ Ny forelesning/aktivitet',
  foreslaTidsbruk: 'Foreslå tidsbruk',
  markerSomFerdig: 'Marker som ferdig',
  registrerFremgang: 'Registrer fremgang',
  justerArbeidsmengde: 'Juster arbeidsmengde',
  lagre: 'Lagre',
  avbryt: 'Avbryt',
  // Ikke fra innhold.md
  lukk: 'Lukk',
  rediger: 'Rediger',
  slett: 'Slett',
  jaSlett: 'Ja, slett',
};

// Ikke fra innhold.md – lagt til i fase 2
export const navigasjon = {
  meny: 'Hovedmeny',
  hoppTilInnhold: 'Hopp til innhold',
  idag: 'I dag',
  kalender: 'Kalender',
  oppgaver: 'Oppgaver',
  timeplan: 'Timeplan',
  innstillinger: 'Innstillinger',
};

// Ikke fra innhold.md – lagt til i fase 3
export const kalender = {
  overskrift: 'Kalender',
  visning: 'Visning',
  uke: 'Uke',
  dag: 'Dag',
  iDag: 'I dag',
  forrigeUke: 'Forrige uke',
  nesteUke: 'Neste uke',
  forrigeDag: 'Forrige dag',
  nesteDag: 'Neste dag',
  ukenummer: (nummer) => `Uke ${nummer}`,
  apneDag: (dag) => `Vis ${dag}`,
};

// Ikke fra innhold.md – «I dag»-visningen og arbeidsøkter (steg 5.6–5.7)
export const iDag = {
  overskrift: 'I dag',
  arbeidsokt: 'Arbeidsøkt',
  fastAktivitet: 'Fast aktivitet',
  fremdrift: (gjort, totalt) => `${gjort} av ${totalt} ${totalt === 1 ? 'arbeidsøkt' : 'arbeidsøkter'} gjennomført`,
  ingenting: 'Ingenting planlagt i dag',
  ingentingTekst: 'Du har ingen forelesninger eller arbeidsøkter i dag.',
  ingenOkter: 'Ingen arbeidsøkter i dag.',
  merkGjennomfort: (tittel, tid) => `${tittel}, ${tid}, gjennomført`,
};

// Ikke fra innhold.md – banner for simulert dato (steg 5.5)
export const testmodus = {
  banner: (dato) => `Testmodus: dato satt til ${dato}`,
};

// Ikke fra innhold.md – lagt til i fase 4
export const oppgaver = {
  overskrift: 'Oppgaver',
  aktive: 'Aktive',
  kommende: 'Kommende',
  fullforte: 'Fullførte',
  ny: 'Ny oppgave',
  rediger: 'Rediger oppgave',
  tittel: 'Tittel',
  tittelEksempel: 'F.eks. Arbeidskrav 2',
  emne: 'Emne',
  beskrivelse: 'Beskrivelse (valgfri)',
  estimat: 'Estimert tidsbruk (timer)',
  fristDato: 'Frist',
  fristTid: 'Klokkeslett (valgfritt)',
  fristTidHjelp: 'Uten klokkeslett settes fristen til 23:59.',
  frist: (tekst) => `Frist ${tekst}`,
  fristPassert: 'Fristen har gått ut',
  relativ: (dager) => (dager === 0 ? 'i dag' : dager === 1 ? 'i morgen' : `om ${dager} dager`),
  fremdrift: (gjort, totalt) => `${gjort} av ${totalt}`,
  ingenKommende: 'Ingen oppgaver med frist lenger frem.',
  utfort: 'Utført så langt',
  enhet: 'Enhet',
  enheter: { hours: 'timer', percent: 'prosent' },
  gjenapne: 'Gjenåpne',
  slettSporsmal: (tittel) => `Vil du slette «${tittel}»? Planlagte arbeidsøkter for oppgaven slettes også.`,
};

// Ikke fra innhold.md – lagt til i steg 2.1
export const emner = {
  overskrift: 'Emner',
  ingen: 'Du har ikke lagt inn noen emner ennå. Emner gir oppgaver og aktiviteter en egen farge.',
  navn: 'Navn på emnet',
  navnEksempel: 'F.eks. ITF10619 Programmering 2',
  farge: 'Farge',
  leggTil: 'Legg til emne',
  rediger: 'Rediger emne',
  slettSporsmal: (navn) => `Vil du slette «${navn}»? Oppgaver og aktiviteter i emnet beholdes, men mister emnet.`,
};

export const fargeNavn = {
  '#2E5B88': 'Blå',
  '#FF8C61': 'Korall',
  '#3F8F6B': 'Grønn',
  '#7B5EA7': 'Lilla',
  '#D9A21B': 'Gul',
  '#2A9BA8': 'Turkis',
  '#C2577A': 'Rosa',
  '#64748B': 'Grå',
};

// Ikke fra innhold.md – lagt til i steg 2.3
export const fasteAktiviteter = {
  overskrift: 'Faste aktiviteter',
  ny: 'Ny forelesning/aktivitet',
  rediger: 'Rediger aktivitet',
  tittel: 'Tittel',
  tittelEksempel: 'F.eks. Forelesning eller Deltidsjobb',
  emne: 'Emne',
  utenEmne: 'Uten emne',
  dato: 'Dato',
  datoHjelp: 'Første gang aktiviteten skjer. Ukentlige aktiviteter gjentas samme ukedag.',
  start: 'Starttid',
  slutt: 'Sluttid',
  ukentlig: 'Gjentas hver uke',
  hver: (ukedag) => `Hver ${ukedag}`,
  slettSporsmal: (tittel) => `Vil du slette «${tittel}»?`,
};

// Ikke fra innhold.md – lagt til i steg 1.4
export const innstillinger = {
  overskrift: 'Innstillinger',
  navn: 'Navn (valgfritt)',
  dagligKapasitet: 'Daglig studiekapasitet (timer)',
  studietidFra: 'Studietid fra',
  studietidTil: 'Studietid til',
  studievindu: 'Pace legger arbeidsøkter bare innenfor dette tidsrommet.',
};

// Bekreftelser etter vellykkede handlinger. Ikke fra innhold.md.
export const bekreftelser = {
  INNSTILLINGER_LAGRET: 'Innstillingene er lagret.',
  EKSEMPELDATA_LAGT_INN:
    'Eksempeldataene er lagt inn. En arbeidsøkt som ikke ble gjort i går, er flyttet til ledig tid, og én frist er i fare.',
  DATA_SLETTET: 'Alle data er slettet.',
  EKSPORT_LASTET_NED: 'Kalenderfilen er lastet ned. Åpne den, eller importer den i kalenderen din.',
  SIKKERHETSKOPI_LASTET_NED: 'Sikkerhetskopien er lastet ned. Ta vare på filen, så kan du hente dataene inn igjen senere.',
  IMPORT_FULLFORT: 'Dataene er hentet inn fra filen, og planen er oppdatert.',
  SLETTING_ANGRET: 'Slettingen er angret.',
};

// Ikke fra innhold.md – lys og mørk modus
export const utseende = {
  overskrift: 'Utseende',
  tekst: 'Velg lyst eller mørkt, eller la Pace følge innstillingen på enheten din.',
  valg: { light: 'Lyst', dark: 'Mørkt', system: 'Følg systemet' },
  tilMorkt: 'Bytt til mørk modus',
  tilLyst: 'Bytt til lys modus',
};

// Ikke fra innhold.md – hilsen etter tid på døgnet øverst på «I dag»
export const hilsen = {
  morgen: 'God morgen',
  dag: 'God dag',
  kveld: 'God kveld',
  natt: 'God natt',
  tekst: (periode, navn) => {
    const trimmet = (navn ?? '').trim();
    return trimmet ? `${hilsen[periode]}, ${trimmet}!` : `${hilsen[periode]}!`;
  },
};

// Ikke fra innhold.md – ukesoppsummering øverst på «I dag»
// Timene er summer av kvarter, så to desimaler (23,25) i stedet for avrunding (23,3)
const kvarter = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 });

export const ukesoppsummering = {
  tekst: (gjort, planlagt) =>
    `Denne uken: ${kvarter.format(gjort)} av ${kvarter.format(planlagt)} ${planlagt === 1 ? 'time' : 'timer'}`,
  ingenOkter: 'Denne uken: ingen arbeidsøkter planlagt ennå',
  fremdrift: 'Gjennomført denne uken',
};

// Ikke fra innhold.md – førstegangsveiviser
export const veiviser = {
  tittel: 'Velkommen til Pace',
  steg: (nummer, totalt) => `Steg ${nummer} av ${totalt}`,
  lukk: 'Lukk veiviseren',
  neste: 'Neste',
  hoppOver: 'Hopp over',
  ferdig: 'Kom i gang',
  steg1: {
    overskrift: 'Hvor mye vil du studere på en vanlig dag?',
    tekst: 'Pace legger aldri inn mer arbeid enn du har sagt ja til. Du kan endre det når som helst.',
  },
  steg2: {
    overskrift: 'Legg inn en fast aktivitet',
    tekst: 'Start med en forelesning eller noe annet som skjer hver uke, så vet Pace når du er opptatt.',
  },
  steg3: {
    overskrift: 'Legg inn ditt første arbeidskrav',
    tekst: 'Fortell hva som skal gjøres og når fristen er, så lager Pace en plan i et jevnt og behagelig tempo.',
  },
  innstillinger: {
    overskrift: 'Kom i gang-veiviser',
    tekst: 'Gå gjennom de tre første stegene igjen. Ingenting av det du har lagt inn, blir slettet.',
    knapp: 'Start veiviseren på nytt',
  },
};

// Ikke fra innhold.md – eksport til kalenderfil (.ics)
const fristFormat = new Intl.DateTimeFormat('nb-NO', {
  timeZone: 'Europe/Oslo',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export const eksport = {
  knapp: 'Eksporter til kalender',
  overskrift: 'Eksporter til kalender',
  hvaMed: 'Hva skal med?',
  valg: {
    both: 'Arbeidsøkter og faste aktiviteter',
    sessions: 'Bare arbeidsøkter',
    fixed: 'Bare faste aktiviteter',
  },
  periode: 'Periode',
  uker: (antall) => (antall === 1 ? 'Neste uke' : `Neste ${antall} uker`),
  lastNed: 'Last ned kalenderfil (.ics)',
  hjelp:
    'Filen er et øyeblikksbilde av planen akkurat nå. Den oppdateres ikke automatisk når planen endres, så eksporter på nytt etter store endringer.',
  importHjelp: 'Åpne filen, eller importer den i Google Calendar, Outlook eller Apple Kalender.',
  // Tekst som havner i selve kalenderfilen
  ics: {
    calendarName: 'Pace – studieplan',
    sessionDescription: ({ course, deadline }) =>
      [course && `Emne: ${course}`, `Frist: ${fristFormat.format(deadline)}`, 'Arbeidsøkt planlagt av Pace']
        .filter(Boolean)
        .join('\n'),
    fixedDescription: ({ course }) => (course ? `Emne: ${course}` : ''),
  },
};

// Ikke fra innhold.md – eksempeldata og sletting av alle data
export const eksempeldata = {
  knapp: 'Prøv med eksempeldata',
  sporsmal: 'Eksempeldataene erstatter emnene, timeplanen og oppgavene dine. Vil du fortsette?',
  jaErstatt: 'Ja, bruk eksempeldata',
};

// Ikke fra innhold.md – angre sletting
export const angre = {
  slettet: (navn) => `«${navn}» er slettet.`,
  knapp: 'Angre',
  knappLabel: (navn) => `Angre sletting av «${navn}»`,
};

// Ikke fra innhold.md – sikkerhetskopi (eksport og import av data)
const antall = (tall, en, flere) => `${tall} ${tall === 1 ? en : flere}`;

export const sikkerhetskopi = {
  overskrift: 'Sikkerhetskopi',
  tekst: 'Last ned alle dataene dine som en fil, eller hent dem inn igjen, for eksempel i en annen nettleser.',
  lastNed: 'Last ned sikkerhetskopi',
  velgFil: 'Gjenopprett fra fil',
  sporsmal: ({ emner, oppgaver, aktiviteter, dato }) =>
    `Filen${dato ? ` fra ${dato}` : ''} har ${antall(emner, 'emne', 'emner')}, ${antall(oppgaver, 'oppgave', 'oppgaver')} og ${antall(aktiviteter, 'fast aktivitet', 'faste aktiviteter')}. Den erstatter alt du har i Pace nå. Vil du fortsette?`,
  jaErstatt: 'Ja, erstatt dataene mine',
  hvor: {
    data: 'oppbygningen av filen',
    user: 'innstillingene',
    courses: (nr) => `emne nr. ${nr}`,
    tasks: (nr) => `oppgave nr. ${nr}`,
    blocks: (nr) => `aktivitet eller arbeidsøkt nr. ${nr}`,
  },
  feilGjelder: (hvor) => `Feilen gjelder ${hvor} i filen.`,
};

// Ikke fra innhold.md – lagrede data som denne versjonen ikke kan bruke (steg 9.4).
// Dataene er ikke endret, og brukeren kan laste dem ned. Overskrift og forklaring står i feilmeldinger.
export const lagredeData = {
  hjelp: 'Filen inneholder planen din akkurat slik den er lagret i nettleseren. Ta vare på den, så går ingenting tapt.',
  lastNed: 'Last ned dataene',
  lastInnPaNytt: 'Last inn siden på nytt',
};

export const data = {
  overskrift: 'Data',
  tekst: 'Alt du legger inn, lagres bare i denne nettleseren. Eksempeldata viser hvordan planlegging, flytting av økter og varsler fungerer.',
  slettAlt: 'Slett alle data',
  slettSporsmal: 'Vil du slette alle emner, timeplanen, oppgaver og innstillinger? Det kan ikke angres.',
  jaSlettAlt: 'Ja, slett alt',
};

export const tommeTilstander = {
  ingenOppgaver: {
    overskrift: 'Ingen oppgaver ennå',
    tekst: 'Legg inn ditt første arbeidskrav, så hjelper vi deg å jobbe i et jevnt og behagelig tempo.',
    knapp: 'Legg til første oppgave',
  },
  altFerdigIDag: {
    overskrift: 'Alt unnagjort for i dag!',
    tekst: 'Godt jobbet. Ta en velfortjent pause med god samvittighet.',
  },
  tomKalender: {
    overskrift: 'Kalenderen din er helt åpen',
    tekst: 'Legg inn forelesninger og faste aktiviteter, så vet Pace når du har tid til å jobbe.',
    knapp: 'Legg til forelesning',
  },
  tidsestimat: {
    overskrift: 'Usikker på hvor lang tid oppgaven tar?',
    tekst: 'Lim inn oppgavebeskrivelsen eller kriteriene, så foreslår vi et fornuftig antall timer.',
  },
};

// Varsel når arbeid hoper seg opp.
// `dag` er en ferdig formulering, f.eks. «i morgen» eller «på torsdag».
export const hoperSegOpp = {
  overskrift: 'Her hoper det seg opp',
  // Tekstbitene hver for seg, slik at UI kan utheve antall timer
  tekstDeler({ antall, dag }) {
    return {
      for: 'For å rekke fristen må du jobbe ',
      uthevet: formatHours(antall),
      etter: ` ${dag}. Det er mer enn dagskapasiteten din. Vil du fordele arbeidet annerledes?`,
    };
  },
  tekst({ antall, dag }) {
    const deler = hoperSegOpp.tekstDeler({ antall, dag });
    return deler.for + deler.uthevet + deler.etter;
  },
  knapper: {
    fordelPaNytt: 'Fordel på nytt',
    beholdPlanen: 'Behold planen',
  },
};

// Tidsestimat (steg 6.4). Hjelpeteksten og tom tilstand står i innhold.md, resten er nytt.
const timer = (antall) => formatHours(antall);
export const estimat = {
  forslag: (antall) => `Forslag: ${formatHours(antall)}`,
  brukForslaget: 'Bruk forslaget',
  typer: {
    programmering: 'Programmering',
    labrapport: 'Labrapport',
    rapport: 'Rapport',
    essay: 'Essay eller drøfting',
    refleksjon: 'Refleksjonsnotat',
  },
  begrunnelse: {
    ORD: ({ words, hours }) => `${tall.format(words)} ord å skrive: ${timer(hours)}`,
    SIDER: ({ pages, hours }) => `${tall.format(pages)} sider å skrive: ${timer(hours)}`,
    TYPE: ({ type, hours }) => `${estimat.typer[type]}: ${timer(hours)}`,
    STANDARD: ({ hours }) => `Vanlig innlevering: ${timer(hours)}`,
    KILDER: ({ sources, hours }) => `${tall.format(sources)} kilder: + ${timer(hours)}`,
    KILDER_UTEN_TALL: ({ hours }) => `Krav til kilder: + ${timer(hours)}`,
    PRESENTASJON: ({ hours }) => `Presentasjon: + ${timer(hours)}`,
    GRUPPE: ({ hours }) => `Gruppearbeid og koordinering: + ${timer(hours)}`,
    LANG_TEKST: ({ hours }) => `Lang oppgavetekst å sette seg inn i: + ${timer(hours)}`,
  },
};

// Ikke fra innhold.md – tillegg til varselet (steg 6.2)
export const overbelastning = {
  oppgave: (tittel, frist) => `${tittel} · frist ${frist}`,
  dagOverKapasitet: 'Mer enn dagskapasiteten',
  fristIFare: 'Frist i fare',
  dag: (dager, ukedag, dato) =>
    dager === 0 ? 'i dag' : dager === 1 ? 'i morgen' : dager < 7 ? `på ${ukedag}` : `${dato}`,
};

// Nøklene er feilkodene fra logikken (se steg 1.2 og 1.3 i plan.md)
export const feilmeldinger = {
  LAGRING_FEILET: {
    overskrift: 'Endringene ble ikke lagret',
    tekst: 'Noe gikk galt under lagring. Prøv igjen.',
  },
  FRIST_I_FORTIDEN: {
    overskrift: 'Fristen har allerede vært',
    tekst: 'Velg en dato frem i tid.',
  },
  TOMT_ESTIMAT: {
    overskrift: 'Vi trenger litt tekst',
    tekst: 'Lim inn oppgaveteksten eller en kort beskrivelse først.',
  },
  MANGLER_FELT: {
    overskrift: 'Noe mangler',
    tekst: 'Fyll ut feltene som er markert.',
  },
  SLUTT_FOR_START: {
    overskrift: 'Sjekk klokkeslettet',
    tekst: 'Sluttid må være etter starttid.',
  },
  // Ikke fra innhold.md – import av sikkerhetskopi
  UGYLDIG_JSON: {
    overskrift: 'Filen kunne ikke leses',
    tekst: 'Det ser ikke ut som en sikkerhetskopi. Velg filen du lastet ned fra Pace.',
  },
  IKKE_PACE_FIL: {
    overskrift: 'Dette er ikke en sikkerhetskopi fra Pace',
    tekst: 'Velg filen som heter «pace-sikkerhetskopi» og dato.',
  },
  NYERE_VERSJON: {
    overskrift: 'Filen er fra en nyere versjon av Pace',
    tekst: 'Last siden på nytt for å få siste versjon, og prøv igjen.',
  },
  UGYLDIG_INNHOLD: {
    overskrift: 'Noe i filen stemmer ikke',
    tekst: 'Ingenting er endret. Sjekk at filen ikke er redigert, og prøv igjen.',
  },
  FILEN_ER_FOR_STOR: {
    overskrift: 'Filen er for stor',
    tekst: 'En sikkerhetskopi fra Pace er bare noen få kilobyte. Sjekk at du har valgt riktig fil.',
  },
  // Ikke fra innhold.md – eksport uten hendelser i perioden
  INGEN_HENDELSER: {
    overskrift: 'Ingenting å eksportere',
    tekst: 'Det finnes ingen hendelser i perioden du valgte. Prøv en lengre periode, eller ta med flere typer hendelser.',
  },
  // Ikke fra innhold.md – lagrede data som ikke kan overføres til nytt format (steg 9.4)
  LAGRET_NYERE_VERSJON: {
    overskrift: 'Planen din er lagret av en nyere versjon av Pace',
    tekst: 'Denne siden er en eldre versjon. Last inn siden på nytt for å få siste versjon. Dataene dine er ikke endret.',
  },
  LAGRET_UKJENT_FORMAT: {
    overskrift: 'Vi kjenner ikke igjen dataene i nettleseren',
    tekst: 'Pace har ikke endret eller slettet noe. Last ned dataene og ta vare på filen før du gjør noe annet.',
  },
  LAGRET_KOPI_FEILET: {
    overskrift: 'Vi fikk ikke tatt en kopi av planen din',
    tekst: 'Pace må oppdatere hvordan planen er lagret, og tar alltid en kopi først. Det gikk ikke, kanskje fordi lagringen i nettleseren er full. Ingenting er endret.',
  },
  // Ikke fra innhold.md – lagrede data som ikke kan leses (steg 1.3)
  LESING_FEILET: {
    overskrift: 'Vi kunne ikke lese planen din',
    tekst: 'De lagrede dataene var skadet, så Pace startet med en tom plan. En kopi av de gamle dataene er tatt vare på i nettleseren.',
  },
};

export const hjelpetekster = {
  dagligKapasitet:
    'Hvor mange timer vil du maksimalt studere på en vanlig dag? Husk tid til pauser, mat og fritid.',
  fastAktivitet: 'Faste aktiviteter, som forelesninger eller jobb, flyttes aldri automatisk.',
  forskyvning:
    'Fullfører du ikke en økt, flyttes de gjenstående timene automatisk til neste ledige tid før fristen.',
  tidsestimat: 'Estimatet er et forslag basert på omfanget av oppgaven. Du kan alltid justere det.',
};

export const altTekster = {
  hero: 'Illustrasjon av en student ved et skrivebord med laptop, med en ukekalender og en sjekkliste på veggen.',
};
