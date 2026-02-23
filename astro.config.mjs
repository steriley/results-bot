import vercel from '@astrojs/vercel/serverless';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

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
