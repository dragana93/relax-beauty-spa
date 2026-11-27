import type { Route, Routes } from '@angular/router';
import { LANGS } from '../../shared/lang';
import { PATHS, type PageId } from './core/pages';

const LOADERS: Record<PageId, NonNullable<Route['loadComponent']>> = {
  home: () => import('./features/home/home').then((m) => m.Home),
  services: () => import('./features/services/services').then((m) => m.ServicesPage),
  booking: () => import('./features/booking/booking').then((m) => m.BookingPage),
  privacy: () => import('./features/legal/privacy').then((m) => m.Privacy),
};

const notFound = () => import('./features/not-found/not-found').then((m) => m.NotFound);

export const routes: Routes = [
  ...(Object.keys(PATHS) as PageId[]).flatMap((page) =>
    LANGS.map((lang) => ({
      path: PATHS[page][lang].slice(1),
      pathMatch: 'full' as const,
      loadComponent: LOADERS[page],
      data: { lang, page },
    })),
  ),
  // Prerendered to a static file that is served for unknown URLs.
  { path: '404', loadComponent: notFound, data: { lang: 'hr', page: 'notFound' } },
  { path: '**', loadComponent: notFound, data: { lang: 'hr', page: 'notFound' } },
];
