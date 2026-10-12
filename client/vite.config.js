import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        fileURLToPath(new URL('.', import.meta.url)),
        fileURLToPath(new URL('../server/src/services/', import.meta.url)),
        fileURLToPath(new URL('../server/database/deployment_catalogue.json', import.meta.url)),
        fileURLToPath(new URL('../server/database/twenty_more_foods.json', import.meta.url)),
      ],
    },
  },
})
