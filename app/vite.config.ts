import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 4280, host: true, strictPort: true },
  // react-leaflet v4 trips Vite's pre-bundler into shipping a second copy of
  // React, which triggers "Invalid hook call" warnings. Dedupe + force a
  // single optimised React build to avoid that.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'leaflet', 'react-leaflet'],
  },
});
