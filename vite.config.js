import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'bundle.js',
        assetFileNames: (info) => info.name?.endsWith('.css') ? 'bundle.css' : (info.name ?? 'asset'),
      },
    },
  },
});
