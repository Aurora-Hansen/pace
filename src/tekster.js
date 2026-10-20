// All tekst i grensesnittet, hentet fra docs/innhold.md.
// UI-koden skal bruke disse i stedet for å skrive tekst direkte.

const tall = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });

// «1 time», «2,5 timer»
export function formatHours(antall) {
  return `${tall.format(antall)} ${antall === 1 ? 'time' : 'timer'}`;
}

export const landingsside = {
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
