import vercel from '@astrojs/vercel/serverless';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [],
  output: 'static',
  adapter: vercel({
    edgeMiddleware: true,
  }),

  vite: {
    plugins: [tailwindcss()],
  },
});