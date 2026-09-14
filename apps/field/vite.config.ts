import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The collectors' app. Not a PWA in the traveller's sense — no offline pack, no service worker
 * — but everything it captures is held on the device until the upload succeeds, because a
 * collector in a basement in Deira is the normal case and losing a morning's visits is how a
 * collector stops trusting the tool.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
