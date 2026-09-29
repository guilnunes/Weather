import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Relative base so the build works from any sub-path (GitHub Pages serves it
// from /Weather/). Routing uses the URL hash, so no server rewrites are needed.
// `npm run build` also copies the result to the repo root (scripts/publish-site.mjs).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      // The built index.html is copied to the repo root for GitHub Pages;
      // say so at the top, so nobody edits the generated copy by mistake.
      name: 'mark-generated',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace(
          '<!doctype html>',
          '<!doctype html>\n<!-- Generated from web/index.html by `npm run build` (in web/). Edit the source there, not this copy. -->',
        ),
    },
  ],
  test: {
    environment: 'jsdom',
  },
})
