import solid from '@astrojs/solid-js';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://xtreemze.github.io',
  base: '/booking',
  output: 'static',
  integrations: [solid()],
});
