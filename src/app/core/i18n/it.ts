import type { Dictionary } from './hr';

export const it: Dictionary = {
  meta: {
    home: {
      title: 'Dijana Savanović – Relax, Beauty and Spa Studio',
      description:
        'Massaggi, cura del viso e rituali spa. Prenota il tuo appuntamento online, senza registrazione.',
    },
    services: {
      title: 'Servizi e prezzi – Relax, Beauty and Spa Studio',
      description: 'Trattamenti, durate e prezzi.',
    },
    booking: {
      title: 'Prenota un appuntamento – Relax, Beauty and Spa Studio',
      description: 'Scegli trattamento, data e ora. Nessuna registrazione necessaria.',
    },
    privacy: {
      title: 'Privacy e regole di prenotazione – Relax, Beauty and Spa Studio',
      description: 'Come trattiamo i tuoi dati e le nostre regole di prenotazione.',
    },
    notFound: {
      title: 'Pagina non trovata',
      description: 'La pagina richiesta non esiste.',
    },
  },
  common: {
    book: 'Prenota un appuntamento',
    bookShort: 'Prenota',
    minutes: 'min',
    skipToContent: 'Vai al contenuto',
    comingSoon: 'Prossimamente',
    sampleNotice: 'Versione di anteprima: servizi, prezzi, orari e testi sono esempi.',
  },
  nav: {
    home: 'Home',
    services: 'Servizi',
    about: 'Chi siamo',
    contact: 'Contatti',
    openMenu: 'Apri il menu',
    closeMenu: 'Chiudi il menu',
    main: 'Navigazione principale',
    language: 'Lingua',
  },
  home: {
    eyebrow: 'Relax · Beauty · Spa',
    title: 'Il tuo momento di calma e cura',
    lead: 'Rallenta, riposa e lasciati coccolare. Prenoti online in pochi passaggi.',
    explore: 'Scopri i servizi',
    servicesTitle: 'I nostri servizi',
    servicesLead: 'Scegli ciò di cui hai bisogno oggi.',
    allServices: 'Tutti i servizi e i prezzi',
    aboutTitle: 'Lo studio',
    aboutText:
      "Testo di esempio. Qui andrà la storia dello studio: com'è nato, l'esperienza che offre e cosa lo rende speciale.",
    ownerText:
      'Testo di esempio. Qui andrà una breve presentazione di Dijana, con esperienza e formazione.',
    galleryTitle: 'Galleria',
    galleryLead: 'Le foto dello studio arriveranno presto.',
    galleryPlaceholder: 'Spazio per una foto dello studio',
    showAll: 'Mostra tutto',
    showLess: 'Mostra meno',
    faqTitle: 'Domande frequenti',
    faq: [
      {
        q: 'Serve un account?',
        a: 'No. Per prenotare bastano nome, indirizzo email e numero di telefono.',
      },
      {
        q: "Come so che l'appuntamento è prenotato?",
        a: 'Dopo la conferma viene mostrato un numero di prenotazione unico e ricevi una conferma via email. Conserva il numero di prenotazione.',
      },
      {
        q: 'Posso disdire?',
        a: "Sì. Contatta lo studio almeno 24 ore prima dell'appuntamento e indica il numero di prenotazione.",
      },
    ],
    contactTitle: 'Contatti',
  },
  contact: {
    address: 'Indirizzo',
    phone: 'Telefono',
    email: 'Email',
    hours: 'Orari di apertura',
    closed: 'Chiuso',
    map: 'Apri la mappa',
    days: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
  },
  services: {
    title: 'Servizi e prezzi',
    lead: 'I prezzi sono in euro.',
    filterLabel: 'Filtra per categoria',
    all: 'Tutti',
    details: 'Dettagli',
  },
  booking: {
    title: 'Prenota un appuntamento',
    lead: 'Senza registrazione. Bastano quattro passaggi.',
    steps: {
      service: 'Trattamento',
      time: 'Data e ora',
      details: 'I tuoi dati',
      confirm: 'Conferma',
    },
    chooseDate: 'Scegli una data',
    chooseTime: 'Orari disponibili',
    loadingTimes: 'Caricamento orari…',
    noTimes: 'Non ci sono orari liberi in questa data. Scegli un altro giorno.',
    timesError: 'Al momento non è possibile caricare gli orari.',
    retry: 'Riprova',
    name: 'Nome e cognome',
    email: 'Indirizzo email',
    phone: 'Numero di telefono',
    note: 'Nota (facoltativa)',
    noteHint: 'Non inserire dati sulla salute. Ne parleremo di persona.',
    privacyAck: "Ho letto l'informativa sulla privacy e le regole di prenotazione.",
    privacyLink: "Apri l'informativa (nuova scheda)",
    requiredNote: 'I campi contrassegnati con un asterisco (*) sono obbligatori.',
    errors: {
      nameRequired: 'Inserisci nome e cognome.',
      name: 'Il nome deve avere almeno 2 caratteri.',
      emailRequired: 'Inserisci il tuo indirizzo email.',
      email: 'Inserisci un indirizzo email valido, ad esempio ana@esempio.it.',
      phoneRequired: 'Inserisci il tuo numero di telefono.',
      phone: 'Inserisci un numero di telefono valido (da 6 a 15 cifre), ad esempio +385 91 123 4567.',
      note: 'La nota può contenere al massimo 500 caratteri.',
      privacyAck: "Conferma di aver letto l'informativa.",
    },
    back: 'Indietro',
    next: 'Avanti',
    confirm: 'Conferma la prenotazione',
    sending: 'Salvataggio…',
    summary: 'La tua scelta',
    service: 'Trattamento',
    date: 'Data',
    time: 'Ora',
    duration: 'Durata',
    price: 'Prezzo',
    submitErrors: {
      SLOT_TAKEN:
        "Quest'orario è appena stato prenotato. I tuoi dati sono salvati. Scegli un altro orario.",
      LIMIT_REACHED:
        'Questo indirizzo email ha già il numero massimo di prenotazioni future. Contatta lo studio.',
      INVALID: 'Controlla i tuoi dati e riprova.',
      SERVER_ERROR: 'Non è stato possibile confermare la prenotazione. Riprova: la prenotazione non verrà duplicata.',
    },
    successTitle: 'Il tuo appuntamento è prenotato',
    reference: 'Numero di prenotazione',
    emailQueued:
      'Ti stiamo inviando una conferma via email. Se non la vedi entro qualche minuto, controlla la cartella spam.',
    saveReference:
      'Annota questo numero o fai uno screenshot. Al momento le email di conferma non vengono inviate.',
    another: 'Nuova prenotazione',
    backHome: 'Torna alla home',
    noscript: 'Attiva JavaScript per prenotare online.',
  },
  privacy: {
    title: 'Privacy e regole di prenotazione',
    draft:
      'Bozza. La titolare dello studio o un consulente legale deve rivedere questo testo prima della pubblicazione.',
    sections: [
      {
        h: 'Quali dati raccogliamo',
        p: 'Nome, indirizzo email, numero di telefono, trattamento e orario scelti e una nota facoltativa. Non inserire dati sulla salute.',
      },
      {
        h: 'Perché li usiamo',
        p: 'Solo per prenotare, svolgere e disdire gli appuntamenti e per contattarti al riguardo.',
      },
      {
        h: 'Chi li tratta',
        p: 'Cloudflare (hosting del sito e database) e Resend (invio email), come fornitori di servizi.',
      },
      {
        h: 'Per quanto tempo li conserviamo',
        p: "Prevediamo di anonimizzare i dati personali 12 mesi dopo l'appuntamento.",
      },
      {
        h: 'I tuoi diritti',
        p: "Puoi chiedere di accedere ai tuoi dati, correggerli o cancellarli, e presentare reclamo all'autorità croata per la protezione dei dati (AZOP).",
      },
      { h: 'Cookie', p: 'Non usiamo cookie analitici né di marketing.' },
      {
        h: 'Regole di prenotazione',
        p: "Gli appuntamenti si possono prenotare da 12 ore a 60 giorni prima. Puoi disdire fino a 24 ore prima dell'inizio.",
      },
    ],
  },
  notFound: {
    title: 'Pagina non trovata',
    text: 'La pagina richiesta non esiste o è stata spostata.',
  },
};
