import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
