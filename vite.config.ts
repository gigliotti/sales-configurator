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
  }
})
