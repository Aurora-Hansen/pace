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
