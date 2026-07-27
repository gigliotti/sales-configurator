import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Redirect Vite dependency cache outside the Dropbox directory to avoid EBUSY sync locks
  cacheDir: path.join(os.tmpdir(), 'vite-cache-3d-sales'),
  build: {
    emptyOutDir: false,
    modulePreload: {
      // Por defecto Vite agrega <link rel="modulepreload"> para TODO chunk
      // alcanzable transitivamente desde el entry, incluidos los detrás de
      // import() dinámico — eso hace que el navegador descargue igual, en
      // cada visita, el peso de /docs (react-markdown, mermaid y sus
      // dependencias internas de katex/html2canvas) aunque nunca se ejecute.
      // Se filtran esos chunks para que solo se pidan al navegar a /docs.
      resolveDependencies: (_filename, deps) =>
        deps.filter(
          (d) => !/vendor-mermaid|katex|html2canvas|DocsViewer/.test(d)
        ),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('three') || id.includes('@react-three')) {
            return 'vendor-3d';
          }
          if (id.includes('jspdf')) {
            return 'vendor-pdf';
          }
          if (id.includes('mermaid')) {
            return 'vendor-mermaid';
          }
          // El resto (react, zustand, react-router-dom, supabase-js, y
          // también react-markdown/remark-gfm) queda SIN nombre forzado a
          // propósito: si se lo nombrara igual que las libs siempre-eager,
          // Rollup fusionaría todo en un único chunk síncrono, arrastrando
          // al bundle principal cosas que solo se cargan bajo demanda (como
          // react-markdown, usado únicamente por /docs vía React.lazy). Sin
          // manualChunks, Rollup decide la división según cómo se alcanza
          // cada módulo: lo siempre-eager cae junto al entrypoint, lo que
          // solo llega por import() dinámico se separa en su propio chunk.
          return undefined;
        }
      }
    }
  }
})
