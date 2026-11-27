// SAMPLE DATA: replace with the studio's real services before launch.
// This is the only source of names, durations and prices. The API never trusts the browser's copy.
import { LOCALES, type Lang, type Localized } from './lang';

export interface Category {
  id: string;
  name: Localized;
  summary: Localized;
}

export interface Service {
  id: string;
  categoryId: string;
  name: Localized;
  description: Localized;
  /** Must be a multiple of the 15-minute grid. */
  durationMin: number;
  priceCents: number;
  active: boolean;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 'massage',
    name: { hr: 'Masaže', en: 'Massage', de: 'Massagen', it: 'Massaggi' },
    summary: {
      hr: 'Za opuštanje tijela i uma.',
      en: 'To relax body and mind.',
      de: 'Zur Entspannung von Körper und Geist.',
      it: 'Per rilassare corpo e mente.',
    },
  },
  {
    id: 'face',
    name: { hr: 'Njega lica', en: 'Facial care', de: 'Gesichtspflege', it: 'Cura del viso' },
    summary: {
      hr: 'Njega prilagođena vašoj koži.',
      en: 'Care matched to your skin.',
      de: 'Pflege, abgestimmt auf Ihre Haut.',
      it: 'Una cura su misura per la tua pelle.',
    },
  },
  {
    id: 'spa',
    name: { hr: 'Spa rituali', en: 'Spa rituals', de: 'Spa-Rituale', it: 'Rituali spa' },
    summary: {
      hr: 'Trenutak samo za vas.',
      en: 'A moment just for you.',
      de: 'Ein Moment nur für Sie.',
      it: 'Un momento solo per te.',
    },
  },
  {
    id: 'beauty',
    name: { hr: 'Ljepota', en: 'Beauty', de: 'Beauty', it: 'Bellezza' },
    summary: {
      hr: 'Mali detalji, velika razlika.',
      en: 'Small details, big difference.',
      de: 'Kleine Details, große Wirkung.',
      it: 'Piccoli dettagli, grande differenza.',
    },
  },
];

const SAMPLE_DESCRIPTION: Localized = {
  hr: 'Primjer opisa tretmana. Ovdje dolazi stvarni opis.',
  en: 'Sample treatment description. The real description goes here.',
  de: 'Beispielbeschreibung der Behandlung. Hier steht später die echte Beschreibung.',
  it: 'Descrizione di esempio del trattamento. Qui andrà la descrizione reale.',
};

function sample(
  id: string,
  categoryId: string,
  name: Localized,
  durationMin: number,
  priceEur: number,
): Service {
  return {
    id,
    categoryId,
    name,
    description: SAMPLE_DESCRIPTION,
    durationMin,
    priceCents: priceEur * 100,
    active: true,
  };
}

export const SERVICES: readonly Service[] = [
  sample(
    'relax-massage-60',
    'massage',
    { hr: 'Relax masaža', en: 'Relax massage', de: 'Entspannungsmassage', it: 'Massaggio rilassante' },
    60,
    45,
  ),
  sample(
    'relax-massage-90',
    'massage',
    {
      hr: 'Relax masaža, produžena',
      en: 'Extended relax massage',
      de: 'Entspannungsmassage, verlängert',
      it: 'Massaggio rilassante, lungo',
    },
    90,
    65,
  ),
  sample(
    'back-massage-30',
    'massage',
    { hr: 'Masaža leđa', en: 'Back massage', de: 'Rückenmassage', it: 'Massaggio alla schiena' },
    30,
    25,
  ),
  sample(
    'facial-classic',
    'face',
    {
      hr: 'Klasični tretman lica',
      en: 'Classic facial',
      de: 'Klassische Gesichtsbehandlung',
      it: 'Trattamento viso classico',
    },
    60,
    50,
  ),
  sample(
    'facial-express',
    'face',
    {
      hr: 'Brza njega lica',
      en: 'Express facial',
      de: 'Express-Gesichtspflege',
      it: 'Trattamento viso express',
    },
    30,
    30,
  ),
  sample(
    'head-spa',
    'spa',
    { hr: 'Head spa ritual', en: 'Head spa ritual', de: 'Head-Spa-Ritual', it: 'Rituale head spa' },
    60,
    55,
  ),
  sample(
    'spa-ritual',
    'spa',
    {
      hr: 'Spa ritual za tijelo',
      en: 'Body spa ritual',
      de: 'Spa-Ritual für den Körper',
      it: 'Rituale spa per il corpo',
    },
    120,
    95,
  ),
  sample(
    'brow-shaping',
    'beauty',
    {
      hr: 'Oblikovanje obrva',
      en: 'Brow shaping',
      de: 'Augenbrauen formen',
      it: 'Modellatura sopracciglia',
    },
    30,
    15,
  ),
  sample(
    'pedicure',
    'beauty',
    { hr: 'Spa pedikura', en: 'Spa pedicure', de: 'Spa-Pediküre', it: 'Pedicure spa' },
    75,
    45,
  ),
];

export function findService(id: string): Service | undefined {
  return SERVICES.find((service) => service.id === id && service.active);
}

export function activeServices(categoryId?: string): Service[] {
  return SERVICES.filter((s) => s.active && (!categoryId || s.categoryId === categoryId));
}

export function formatPrice(priceCents: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
  }).format(priceCents / 100);
}
