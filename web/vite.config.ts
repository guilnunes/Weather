import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Relative base so the build works from any sub-path (GitHub Pages serves it
// from /Weather/). Routing uses the URL hash, so no server rewrites are needed.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
