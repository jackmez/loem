import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        brandStory: resolve(__dirname, 'brand-story.html'),
        app: resolve(__dirname, 'app.html'),
      },
    },
  },
});
