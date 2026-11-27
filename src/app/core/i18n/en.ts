import type { Dictionary } from './hr';

export const en: Dictionary = {
  meta: {
    home: {
      title: 'Dijana Savanović – Relax, Beauty and Spa Studio',
      description:
        'Massage, facial care and spa rituals. Book your appointment online, no account needed.',
    },
    services: {
      title: 'Services and prices – Relax, Beauty and Spa Studio',
      description: 'Treatments, durations and prices.',
    },
    booking: {
      title: 'Book an appointment – Relax, Beauty and Spa Studio',
      description: 'Choose a treatment, date and time. No account needed.',
    },
    privacy: {
      title: 'Privacy and booking rules – Relax, Beauty and Spa Studio',
      description: 'How we handle your data, and our booking rules.',
    },
    notFound: { title: 'Page not found', description: 'The requested page does not exist.' },
  },
  common: {
    book: 'Book an appointment',
    bookShort: 'Book',
    minutes: 'min',
    skipToContent: 'Skip to content',
    comingSoon: 'Coming soon',
    sampleNotice: 'Preview version: services, prices, opening hours and texts are samples.',
  },
  nav: {
    home: 'Home',
    services: 'Services',
    about: 'About',
    contact: 'Contact',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    main: 'Main navigation',
    language: 'Language',
  },
  home: {
    eyebrow: 'Relax · Beauty · Spa',
    title: 'Your moment of calm and care',
    lead: 'Slow down, rest and let yourself be looked after. Book online in a few steps.',
    explore: 'View services',
    servicesTitle: 'Our services',
    servicesLead: 'Choose what you need today.',
    allServices: 'All services and prices',
    aboutTitle: 'About the studio',
    aboutText:
      'Sample text. The studio story goes here: how it began, the experience it offers and what makes it special.',
    ownerText:
      'Sample text. A short introduction to Dijana, with experience and training, goes here.',
    galleryTitle: 'Gallery',
    galleryLead: 'Studio photos are coming soon.',
    galleryPlaceholder: 'Space for a studio photo',
    showAll: 'Show all',
    showLess: 'Show less',
    faqTitle: 'Frequently asked questions',
    faq: [
      {
        q: 'Do I need an account?',
        a: 'No. A booking needs only your name, email address and phone number.',
      },
      {
        q: 'How do I know my appointment is booked?',
        a: 'After you confirm, a unique booking number is shown and a confirmation is sent to your email. Please keep the booking number.',
      },
      {
        q: 'Can I cancel?',
        a: 'Yes. Contact the studio at least 24 hours before your appointment and give your booking number.',
      },
    ],
    contactTitle: 'Contact',
  },
  contact: {
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    hours: 'Opening hours',
    closed: 'Closed',
    map: 'Open map',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  services: {
    title: 'Services and prices',
    lead: 'Prices are in euros.',
    filterLabel: 'Filter by category',
    all: 'All',
    details: 'Details',
  },
  booking: {
    title: 'Book an appointment',
    lead: 'No account needed. It takes four steps.',
    steps: {
      service: 'Treatment',
      time: 'Date and time',
      details: 'Your details',
      confirm: 'Confirm',
    },
    chooseDate: 'Choose a date',
    chooseTime: 'Available times',
    loadingTimes: 'Loading times…',
    noTimes: 'There are no free times on this date. Please choose another day.',
    timesError: 'Times cannot be loaded right now.',
    retry: 'Try again',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone number',
    note: 'Note (optional)',
    noteHint: 'Please do not enter health information. We will discuss that in person.',
    privacyAck: 'I have read the privacy notice and booking rules.',
    privacyLink: 'Open the notice (new tab)',
    requiredNote: 'Fields marked with an asterisk (*) are required.',
    errors: {
      nameRequired: 'Enter your full name.',
      name: 'Your name must have at least 2 characters.',
      emailRequired: 'Enter your email address.',
      email: 'Enter a valid email address, for example ana@example.com.',
      phoneRequired: 'Enter your phone number.',
      phone: 'Enter a valid phone number (6 to 15 digits), for example +385 91 123 4567.',
      note: 'The note can be at most 500 characters.',
      privacyAck: 'Please confirm that you have read the notice.',
    },
    back: 'Back',
    next: 'Next',
    confirm: 'Confirm booking',
    sending: 'Saving…',
    summary: 'Your selection',
    service: 'Treatment',
    date: 'Date',
    time: 'Time',
    duration: 'Duration',
    price: 'Price',
    submitErrors: {
      SLOT_TAKEN:
        'That time has just been taken. Your details are saved. Please choose another time.',
      LIMIT_REACHED:
        'This email address already has the maximum number of upcoming bookings. Please contact the studio.',
      INVALID: 'Please check your details and try again.',
      SERVER_ERROR:
        'We could not confirm the booking. Please try again; you will not be booked twice.',
    },
    successTitle: 'Your appointment is booked',
    reference: 'Booking number',
    emailQueued:
      "We are sending a confirmation to your email address. If you don't see it within a few minutes, please check your spam folder.",
    saveReference:
      'Write down or screenshot this number. Confirmation emails are not being sent at the moment.',
    another: 'New booking',
    backHome: 'Back to home',
    noscript: 'Please enable JavaScript to book online.',
  },
  privacy: {
    title: 'Privacy and booking rules',
    draft: 'Draft. The studio owner or a legal adviser must review this text before publication.',
    sections: [
      {
        h: 'What we collect',
        p: 'Your name, email address, phone number, chosen treatment and time, and an optional note. Please do not enter health information.',
      },
      {
        h: 'Why we use it',
        p: 'Only to book, deliver and cancel appointments, and to contact you about them.',
      },
      {
        h: 'Who processes it',
        p: 'Cloudflare (website hosting and database) and Resend (email delivery), as service providers.',
      },
      {
        h: 'How long we keep it',
        p: 'We plan to anonymize personal data 12 months after the appointment.',
      },
      {
        h: 'Your rights',
        p: 'You may ask to see, correct or delete your data, and complain to the supervisory authority (AZOP).',
      },
      { h: 'Cookies', p: 'We use no analytics or marketing cookies.' },
      {
        h: 'Booking rules',
        p: 'Appointments can be booked from 12 hours to 60 days ahead. You may cancel up to 24 hours before the start.',
      },
    ],
  },
  notFound: {
    title: 'Page not found',
    text: 'The page you asked for does not exist or has moved.',
  },
};
