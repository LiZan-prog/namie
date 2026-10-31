import { defineConfig } from 'vite';

// Plain Vite setup: no plugins needed. Vercel detects Vite automatically
// and runs "npm run build", serving the "dist" folder.
export default defineConfig({
  build: { outDir: 'dist' },
  });
  