import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'bundle.js',
        assetFileNames: (info) => info.name?.endsWith('.css') ? 'bundle.css' : (info.name ?? 'asset'),
      },
    },
  },
});
