import type { Dictionary } from './hr';

export const de: Dictionary = {
  meta: {
    home: {
      title: 'Dijana Savanović – Relax, Beauty and Spa Studio',
      description:
        'Massagen, Gesichtspflege und Spa-Rituale. Buchen Sie Ihren Termin online, ohne Registrierung.',
    },
    services: {
      title: 'Leistungen und Preise – Relax, Beauty and Spa Studio',
      description: 'Behandlungen, Dauer und Preise im Überblick.',
    },
    booking: {
      title: 'Termin buchen – Relax, Beauty and Spa Studio',
      description: 'Wählen Sie Behandlung, Datum und Uhrzeit. Keine Registrierung nötig.',
    },
    privacy: {
      title: 'Datenschutz und Buchungsregeln – Relax, Beauty and Spa Studio',
      description: 'Wie wir Ihre Daten verarbeiten, und unsere Buchungsregeln.',
    },
    notFound: {
      title: 'Seite nicht gefunden',
      description: 'Die angeforderte Seite existiert nicht.',
    },
  },
  common: {
    book: 'Termin buchen',
    bookShort: 'Buchen',
    minutes: 'Min.',
    skipToContent: 'Zum Inhalt springen',
    comingSoon: 'Demnächst',
    sampleNotice: 'Vorschauversion: Leistungen, Preise, Öffnungszeiten und Texte sind Beispiele.',
  },
  nav: {
    home: 'Startseite',
    services: 'Leistungen',
    about: 'Über uns',
    contact: 'Kontakt',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    main: 'Hauptnavigation',
    language: 'Sprache',
  },
  home: {
    eyebrow: 'Relax · Beauty · Spa',
    title: 'Ihr Moment der Ruhe und Pflege',
    lead: 'Kommen Sie zur Ruhe und lassen Sie sich verwöhnen. Ihren Termin buchen Sie online in wenigen Schritten.',
    explore: 'Leistungen ansehen',
    servicesTitle: 'Unsere Leistungen',
    servicesLead: 'Wählen Sie, was Ihnen heute guttut.',
    allServices: 'Alle Leistungen und Preise',
    aboutTitle: 'Über das Studio',
    aboutText:
      'Beispieltext. Hier steht die Geschichte des Studios: wie es entstand, welches Erlebnis es bietet und was es besonders macht.',
    ownerText:
      'Beispieltext. Hier folgt eine kurze Vorstellung von Dijana, mit Erfahrung und Ausbildung.',
    galleryTitle: 'Galerie',
    galleryLead: 'Fotos des Studios folgen in Kürze.',
    galleryPlaceholder: 'Platz für ein Foto des Studios',
    showAll: 'Alle anzeigen',
    showLess: 'Weniger anzeigen',
    faqTitle: 'Häufige Fragen',
    faq: [
      {
        q: 'Brauche ich ein Benutzerkonto?',
        a: 'Nein. Für eine Buchung genügen Name, E-Mail-Adresse und Telefonnummer.',
      },
      {
        q: 'Woran erkenne ich, dass mein Termin gebucht ist?',
        a: 'Nach der Bestätigung wird eine eindeutige Buchungsnummer angezeigt, und Sie erhalten eine Bestätigung per E-Mail. Bitte bewahren Sie die Buchungsnummer auf.',
      },
      {
        q: 'Kann ich stornieren?',
        a: 'Ja. Melden Sie sich spätestens 24 Stunden vor Ihrem Termin beim Studio und nennen Sie Ihre Buchungsnummer.',
      },
    ],
    contactTitle: 'Kontakt',
  },
  contact: {
    address: 'Adresse',
    phone: 'Telefon',
    email: 'E-Mail',
    hours: 'Öffnungszeiten',
    closed: 'Geschlossen',
    map: 'Karte öffnen',
    mapTitle: 'Lage des Studios auf Google Maps',
    days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  },
  cookies: {
    label: 'Cookies',
    text: 'Für die Karte nutzen wir Google Maps. Google setzt eigene Cookies und erhält Ihre IP-Adresse. Analyse- oder Marketing-Cookies verwenden wir nicht.',
    accept: 'Akzeptieren',
    reject: 'Ablehnen',
    more: 'Mehr zum Datenschutz',
    settings: 'Cookie-Einstellungen',
    mapBlocked: 'Die Karte wird angezeigt, sobald Sie die Cookies von Google Maps akzeptieren.',
  },
  services: {
    title: 'Leistungen und Preise',
    lead: 'Alle Preise in Euro.',
    filterLabel: 'Nach Kategorie filtern',
    all: 'Alle',
    details: 'Details',
  },
  booking: {
    title: 'Termin buchen',
    lead: 'Ohne Registrierung. Es sind nur vier Schritte.',
    steps: {
      service: 'Behandlung',
      time: 'Datum und Uhrzeit',
      details: 'Ihre Angaben',
      confirm: 'Bestätigen',
    },
    chooseDate: 'Datum wählen',
    chooseTime: 'Freie Uhrzeiten',
    loadingTimes: 'Uhrzeiten werden geladen…',
    noTimes: 'An diesem Tag gibt es keine freien Termine. Bitte wählen Sie einen anderen Tag.',
    timesError: 'Die Uhrzeiten können gerade nicht geladen werden.',
    retry: 'Erneut versuchen',
    name: 'Vor- und Nachname',
    email: 'E-Mail-Adresse',
    phone: 'Telefonnummer',
    note: 'Anmerkung (optional)',
    noteHint: 'Bitte geben Sie keine Gesundheitsdaten ein. Darüber sprechen wir persönlich.',
    privacyAck: 'Ich habe die Datenschutzhinweise und Buchungsregeln gelesen.',
    privacyLink: 'Hinweise öffnen (neuer Tab)',
    requiredNote: 'Mit einem Sternchen (*) markierte Felder sind Pflichtfelder.',
    errors: {
      nameRequired: 'Geben Sie Ihren Vor- und Nachnamen ein.',
      name: 'Der Name muss mindestens 2 Zeichen lang sein.',
      emailRequired: 'Geben Sie Ihre E-Mail-Adresse ein.',
      email: 'Geben Sie eine gültige E-Mail-Adresse ein, z. B. ana@beispiel.de.',
      phoneRequired: 'Geben Sie Ihre Telefonnummer ein.',
      phone: 'Geben Sie eine gültige Telefonnummer ein (6 bis 15 Ziffern), z. B. +385 91 123 4567.',
      note: 'Die Anmerkung darf höchstens 500 Zeichen lang sein.',
      privacyAck: 'Bitte bestätigen Sie, dass Sie die Hinweise gelesen haben.',
    },
    back: 'Zurück',
    next: 'Weiter',
    confirm: 'Buchung bestätigen',
    sending: 'Wird gespeichert…',
    summary: 'Ihre Auswahl',
    service: 'Behandlung',
    date: 'Datum',
    time: 'Uhrzeit',
    duration: 'Dauer',
    price: 'Preis',
    submitErrors: {
      SLOT_TAKEN:
        'Diese Uhrzeit wurde gerade vergeben. Ihre Angaben bleiben erhalten. Bitte wählen Sie eine andere Uhrzeit.',
      LIMIT_REACHED:
        'Für diese E-Mail-Adresse besteht bereits die maximale Anzahl kommender Buchungen. Bitte wenden Sie sich an das Studio.',
      INVALID: 'Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.',
      SERVER_ERROR:
        'Die Buchung konnte nicht bestätigt werden. Bitte versuchen Sie es erneut; Sie werden nicht doppelt gebucht.',
    },
    successTitle: 'Ihr Termin ist gebucht',
    reference: 'Buchungsnummer',
    emailQueued:
      'Wir senden eine Bestätigung an Ihre E-Mail-Adresse. Falls sie nach einigen Minuten nicht da ist, sehen Sie bitte im Spam-Ordner nach.',
    saveReference:
      'Notieren Sie diese Nummer oder machen Sie einen Screenshot. Bestätigungs-E-Mails werden derzeit nicht versendet.',
    another: 'Neue Buchung',
    backHome: 'Zur Startseite',
    noscript: 'Bitte aktivieren Sie JavaScript, um online zu buchen.',
  },
  privacy: {
    title: 'Datenschutz und Buchungsregeln',
    draft:
      'Entwurf. Die Inhaberin des Studios oder eine Rechtsberatung muss diesen Text vor der Veröffentlichung prüfen.',
    sections: [
      {
        h: 'Welche Daten wir erheben',
        p: 'Ihren Namen, Ihre E-Mail-Adresse, Telefonnummer, die gewählte Behandlung und Uhrzeit sowie eine optionale Anmerkung. Bitte geben Sie keine Gesundheitsdaten ein.',
      },
      {
        h: 'Wofür wir sie nutzen',
        p: 'Ausschließlich, um Termine zu buchen, durchzuführen und zu stornieren, und um Sie dazu zu kontaktieren.',
      },
      {
        h: 'Wer sie verarbeitet',
        p: 'Cloudflare (Hosting der Website und Datenbank) und Resend (E-Mail-Versand) als Dienstleister.',
      },
      {
        h: 'Wie lange wir sie speichern',
        p: 'Wir planen, personenbezogene Daten 12 Monate nach dem Termin zu anonymisieren.',
      },
      {
        h: 'Ihre Rechte',
        p: 'Sie können Auskunft, Berichtigung oder Löschung Ihrer Daten verlangen und sich bei der kroatischen Datenschutzbehörde (AZOP) beschweren.',
      },
      {
        h: 'Cookies und Karte',
        p: 'Wir verwenden keine Analyse- oder Marketing-Cookies. Die Karte auf der Startseite stammt von Google Maps (Google Ireland Ltd.) und wird nur geladen, wenn Sie im Cookie-Hinweis zustimmen. Google verarbeitet dann Ihre IP-Adresse und kann eigene Cookies setzen. Ihre Wahl speichern wir nur in Ihrem Browser; Sie können sie jederzeit über „Cookie-Einstellungen“ unten auf der Seite ändern.',
      },
      {
        h: 'Buchungsregeln',
        p: 'Termine können frühestens 12 Stunden und höchstens 60 Tage im Voraus gebucht werden. Eine Stornierung ist bis 24 Stunden vor Beginn möglich.',
      },
    ],
  },
  notFound: {
    title: 'Seite nicht gefunden',
    text: 'Die gesuchte Seite existiert nicht oder wurde verschoben.',
  },
};
