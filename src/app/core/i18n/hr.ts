// Croatian is the default language. Its shape defines the Dictionary type.
export const hr = {
  meta: {
    home: {
      title: 'Dijana Savanović – Relax, Beauty and Spa Studio',
      description:
        'Masaže, njega lica i spa rituali. Rezervirajte svoj termin online, bez registracije.',
    },
    services: {
      title: 'Usluge i cjenik – Relax, Beauty and Spa Studio',
      description: 'Pregled tretmana, trajanja i cijena.',
    },
    booking: {
      title: 'Rezervacija termina – Relax, Beauty and Spa Studio',
      description: 'Odaberite tretman, datum i vrijeme. Registracija nije potrebna.',
    },
    privacy: {
      title: 'Privatnost i pravila rezervacije – Relax, Beauty and Spa Studio',
      description: 'Kako obrađujemo vaše podatke i pravila rezervacije.',
    },
    notFound: { title: 'Stranica nije pronađena', description: 'Tražena stranica ne postoji.' },
  },
  common: {
    book: 'Rezerviraj termin',
    bookShort: 'Rezerviraj',
    minutes: 'min',
    skipToContent: 'Preskoči na sadržaj',
    comingSoon: 'Uskoro',
    sampleNotice: 'Pregledna verzija: usluge, cijene, radno vrijeme i tekstovi su primjeri.',
  },
  nav: {
    home: 'Početna',
    services: 'Usluge',
    about: 'O nama',
    contact: 'Kontakt',
    openMenu: 'Otvori izbornik',
    closeMenu: 'Zatvori izbornik',
    main: 'Glavna navigacija',
    language: 'Jezik',
  },
  home: {
    eyebrow: 'Relax · Beauty · Spa',
    title: 'Vaš trenutak mira i njege',
    lead: 'Opustite se, odmorite i prepustite njezi. Termin rezervirate online u nekoliko koraka.',
    explore: 'Pogledajte usluge',
    servicesTitle: 'Naše usluge',
    servicesLead: 'Odaberite ono što vam danas treba.',
    allServices: 'Sve usluge i cijene',
    aboutTitle: 'O studiju',
    aboutText:
      'Primjer teksta. Ovdje dolazi priča o studiju: kako je nastao, kakvo iskustvo nudi i što ga čini posebnim.',
    ownerText: 'Primjer teksta. Ovdje dolazi kratko predstavljanje Dijane, iskustvo i edukacije.',
    galleryTitle: 'Galerija',
    galleryLead: 'Fotografije studija uskoro.',
    galleryPlaceholder: 'Mjesto za fotografiju studija',
    showAll: 'Prikaži sve',
    showLess: 'Prikaži manje',
    faqTitle: 'Česta pitanja',
    faq: [
      {
        q: 'Trebam li korisnički račun?',
        a: 'Ne. Za rezervaciju su dovoljni ime, e-mail adresa i broj telefona.',
      },
      {
        q: 'Kako znam da je termin rezerviran?',
        a: 'Nakon potvrde prikazuje se jedinstveni broj rezervacije, a potvrdu dobivate i e-mailom. Sačuvajte broj rezervacije.',
      },
      {
        q: 'Mogu li otkazati termin?',
        a: 'Da. Javite se studiju najkasnije 24 sata prije termina i navedite broj rezervacije.',
      },
    ],
    contactTitle: 'Kontakt',
  },
  contact: {
    address: 'Adresa',
    phone: 'Telefon',
    email: 'E-mail',
    hours: 'Radno vrijeme',
    closed: 'Zatvoreno',
    map: 'Otvori na karti',
    days: ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'],
  },
  services: {
    title: 'Usluge i cjenik',
    lead: 'Cijene su izražene u eurima.',
    filterLabel: 'Filtriraj po kategoriji',
    all: 'Sve',
    details: 'Detalji',
  },
  booking: {
    title: 'Rezervacija termina',
    lead: 'Bez registracije. Potrebna su samo četiri koraka.',
    steps: {
      service: 'Tretman',
      time: 'Datum i vrijeme',
      details: 'Vaši podaci',
      confirm: 'Potvrda',
    },
    chooseDate: 'Odaberite datum',
    chooseTime: 'Slobodni termini',
    loadingTimes: 'Učitavanje termina…',
    noTimes: 'Za ovaj datum nema slobodnih termina. Odaberite drugi dan.',
    timesError: 'Termine trenutačno nije moguće učitati.',
    retry: 'Pokušaj ponovno',
    name: 'Ime i prezime',
    email: 'E-mail adresa',
    phone: 'Broj telefona',
    note: 'Napomena (neobavezno)',
    noteHint: 'Nemojte upisivati zdravstvene podatke. O tome razgovaramo osobno.',
    privacyAck: 'Pročitao/la sam obavijest o privatnosti i pravila rezervacije.',
    privacyLink: 'Otvori obavijest (nova kartica)',
    requiredNote: 'Polja označena zvjezdicom (*) su obavezna.',
    errors: {
      nameRequired: 'Upišite ime i prezime.',
      name: 'Ime i prezime mora imati najmanje 2 znaka.',
      emailRequired: 'Upišite e-mail adresu.',
      email: 'Upišite ispravnu e-mail adresu, npr. ana@primjer.hr.',
      phoneRequired: 'Upišite broj telefona.',
      phone: 'Upišite ispravan broj telefona (6 do 15 znamenki), npr. +385 91 123 4567.',
      note: 'Napomena može imati najviše 500 znakova.',
      privacyAck: 'Za nastavak potvrdite da ste pročitali obavijest.',
    },
    back: 'Natrag',
    next: 'Dalje',
    confirm: 'Potvrdi rezervaciju',
    sending: 'Spremanje…',
    summary: 'Vaš odabir',
    service: 'Tretman',
    date: 'Datum',
    time: 'Vrijeme',
    duration: 'Trajanje',
    price: 'Cijena',
    submitErrors: {
      SLOT_TAKEN: 'Taj je termin upravo zauzet. Vaši su podaci sačuvani. Odaberite drugo vrijeme.',
      LIMIT_REACHED:
        'Za ovu e-mail adresu već postoji najveći dopušteni broj nadolazećih rezervacija. Javite se studiju.',
      INVALID: 'Provjerite unesene podatke i pokušajte ponovno.',
      SERVER_ERROR:
        'Rezervaciju nije bilo moguće potvrditi. Pokušajte ponovno; nećete dobiti dvostruku rezervaciju.',
    },
    successTitle: 'Termin je rezerviran',
    reference: 'Broj rezervacije',
    emailQueued:
      'Potvrdu šaljemo na vašu e-mail adresu. Ako je ne vidite za nekoliko minuta, provjerite mapu neželjene pošte.',
    saveReference: 'Zapišite ili snimite ovaj broj. E-mail potvrde trenutačno se ne šalju.',
    another: 'Nova rezervacija',
    backHome: 'Na početnu',
    noscript: 'Za online rezervaciju uključite JavaScript.',
  },
  privacy: {
    title: 'Privatnost i pravila rezervacije',
    draft: 'Nacrt. Tekst mora pregledati vlasnica studija ili pravni savjetnik prije objave.',
    sections: [
      {
        h: 'Koje podatke prikupljamo',
        p: 'Ime i prezime, e-mail adresu, broj telefona, odabrani tretman i termin te neobaveznu napomenu. Nemojte upisivati zdravstvene podatke.',
      },
      {
        h: 'Zašto ih obrađujemo',
        p: 'Isključivo radi rezervacije, održavanja i otkazivanja termina te komunikacije u vezi s terminom.',
      },
      {
        h: 'Tko ih obrađuje',
        p: 'Cloudflare (smještaj stranice i baza podataka) i Resend (slanje e-mail poruka), kao pružatelji usluga.',
      },
      {
        h: 'Koliko ih čuvamo',
        p: 'Planirano je anonimiziranje osobnih podataka 12 mjeseci nakon termina.',
      },
      {
        h: 'Vaša prava',
        p: 'Možete zatražiti uvid, ispravak ili brisanje podataka te uložiti prigovor nadzornom tijelu (AZOP).',
      },
      { h: 'Kolačići', p: 'Ne koristimo analitičke ni marketinške kolačiće.' },
      {
        h: 'Pravila rezervacije',
        p: 'Termin je moguće rezervirati najmanje 12 sati i najviše 60 dana unaprijed. Otkazati ga možete najkasnije 24 sata prije početka.',
      },
    ],
  },
  notFound: {
    title: 'Stranica nije pronađena',
    text: 'Tražena stranica ne postoji ili je premještena.',
  },
};

export type Dictionary = typeof hr;
