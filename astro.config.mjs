import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import assistantDevServer from './scripts/assistant-dev-server.mjs';

export default defineConfig({
  site: 'https://modemechanical.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [react(), sitemap(), assistantDevServer()],
});
