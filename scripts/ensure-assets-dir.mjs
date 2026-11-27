// wrangler dev requires the assets folder to exist, even before the first build.
import { mkdirSync } from 'node:fs';

mkdirSync('dist/relax-beauty-spa/browser', { recursive: true });
