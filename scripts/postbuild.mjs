// Cloudflare serves /404.html (with status 404) for unknown URLs.
import { copyFileSync } from 'node:fs';

const root = 'dist/relax-beauty-spa/browser';
copyFileSync(`${root}/404/index.html`, `${root}/404.html`);
