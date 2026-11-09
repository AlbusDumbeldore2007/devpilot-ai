import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SSR: read the index.html template and inject the app root
const indexHtmlPath = path.resolve(__dirname, 'index.html');
const indexHtml = fs.existsSync(indexHtmlPath) ? fs.readFileSync(indexHtmlPath, 'utf-8') : '';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  ssr: {
    noExternal: ['lucide-react'],
  },
});

// Provide the pre-rendered HTML for the homepage
export function renderReactApp(app) {
  // This will be called from the server side
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevPilot AI</title>
  <link rel="stylesheet" href="/assets/index.css" />
</head>
<body>
  <div id="root">${app}</div>
  <script type="module" src="/assets/index.js"></script>
</body>
</html>`;
}
