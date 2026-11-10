import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import assistantDevServer from './scripts/assistant-dev-server.mjs';

export default defineConfig({
  site: 'https://modemechanical.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [react(), assistantDevServer()],
});
